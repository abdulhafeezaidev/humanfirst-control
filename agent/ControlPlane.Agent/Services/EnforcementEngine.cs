using ControlPlane.Agent.Models;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Enforces policy restrictions by monitoring and terminating disallowed processes.
/// Layer: Hard App Blocking Outside Our App
/// 
/// Features:
/// - Session-based enforcement: Only blocks apps when assignment is active
/// - Scans running processes every 2 seconds during active session
/// - Kills processes not in whitelist or allowed_apps list
/// - Sends blocked_app_killed events to Electron via Named Pipe
/// - Shows Windows toast notifications for killed apps
/// </summary>
public sealed class EnforcementEngine : IEnforcementEngine, IDisposable
{
    // Win32 interop for window detection
    [DllImport("user32.dll")]
    private static extern IntPtr GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    private static extern int IsWindowVisible(IntPtr hWnd);

    private const int EnforcementIntervalSeconds = 2; // Scan every 2 seconds (was 5)

    /// <summary>
    /// System-critical processes that must NEVER be terminated.
    /// </summary>
    private static readonly HashSet<string> SystemCriticalProcesses = new(StringComparer.OrdinalIgnoreCase)
    {
        // Windows Core
        "System",
        "Idle",
        "Registry",
        "smss",
        "csrss",
        "wininit",
        "winlogon",
        "services",
        "lsass",
        "lsaiso",
        "svchost",
        "fontdrvhost",
        "dwm",
        "explorer",
        "sihost",
        "taskhostw",
        "ctfmon",
        "conhost",
        "dllhost",
        "WmiPrvSE",
        "RuntimeBroker",
        "SearchHost",
        "SearchIndexer",
        "StartMenuExperienceHost",
        "ShellExperienceHost",
        "TextInputHost",
        "SecurityHealthService",
        "SecurityHealthSystray",
        "MsMpEng",
        "NisSrv",
        "SgrmBroker",
        "spoolsv",
        "audiodg",
        "dasHost",

        // Our own agent
        "ControlPlane.Agent",

        // Common system utilities
        "LogonUI",
        "Taskmgr",
        "cmd",
        "powershell",
        "pwsh",
        "WindowsTerminal",
        "mmc",
        "regedit",
        "devenv",
        "Code"
    };

    private readonly ILogger<EnforcementEngine> _logger;
    private readonly IPolicyManager _policyManager;
    private readonly IWfpMonitor _wfpMonitor;
    private readonly ToastNotificationService? _toastService;
    private readonly INamedPipeServer? _namedPipeServer;

    private CancellationTokenSource? _enforcementCts;
    private Task? _enforcementTask;
    private bool _isRunning;
    private bool _disposed;

    // Session state for hard app blocking (Layer: Hard App Blocking Outside Our App)
    private EnforcementSession? _currentSession;
    private readonly object _sessionLock = new();
    private int _parentProcessId = Environment.ProcessId; // This service's process ID (to detect agent's own children)

    public bool IsRunning => _isRunning;

    public EnforcementEngine(
        ILogger<EnforcementEngine> logger,
        IPolicyManager policyManager,
        IWfpMonitor wfpMonitor,
        ToastNotificationService? toastService = null,
        INamedPipeServer? namedPipeServer = null)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _policyManager = policyManager ?? throw new ArgumentNullException(nameof(policyManager));
        _wfpMonitor = wfpMonitor ?? throw new ArgumentNullException(nameof(wfpMonitor));
        _toastService = toastService;
        _namedPipeServer = namedPipeServer;
    }

    public Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isRunning)
        {
            _logger.LogWarning("EnforcementEngine already running");
            return Task.CompletedTask;
        }

        _logger.LogInformation("EnforcementEngine starting. IntervalSeconds={IntervalSeconds}",
            EnforcementIntervalSeconds);

        // Start WFP monitoring for outbound connections
        try
        {
            _wfpMonitor.StartAsync(cancellationToken).GetAwaiter().GetResult();
            _logger.LogInformation("WFP network monitoring started");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "WFP monitoring failed to start - continuing without network monitoring. " +
                "This may be due to insufficient privileges (requires Administrator)");
        }

        _enforcementCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _enforcementTask = RunEnforcementLoopAsync(_enforcementCts.Token);
        _isRunning = true;

        _logger.LogInformation("EnforcementEngine started successfully");

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        if (!_isRunning)
        {
            return;
        }

        _logger.LogInformation("EnforcementEngine stopping");

        _enforcementCts?.Cancel();

        if (_enforcementTask != null)
        {
            try
            {
                await _enforcementTask.WaitAsync(cancellationToken);
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
        }

        // Stop WFP monitoring
        try
        {
            await _wfpMonitor.StopAsync(cancellationToken);
            _logger.LogInformation("WFP network monitoring stopped");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error stopping WFP monitoring");
        }

        _isRunning = false;
        _logger.LogInformation("EnforcementEngine stopped");
    }

    /// <summary>
    /// Starts a hard app blocking enforcement session.
    /// Called from NamedPipeServer when Electron begins an assignment.
    /// </summary>
    public void StartEnforcementSession(EnforcementSession session)
    {
        lock (_sessionLock)
        {
            _currentSession = session ?? throw new ArgumentNullException(nameof(session));
            
            _logger.LogInformation(
                "Hard app blocking session started. PolicyId={PolicyId}, Mode={Mode}, ElectronPid={ElectronPid}, AllowedAppsCount={AllowedAppsCount}",
                session.PolicyId,
                session.Mode,
                session.ElectronPid,
                session.AllowedApps.Count);
        }
    }

    /// <summary>
    /// Ends the current hard app blocking enforcement session.
    /// Called from NamedPipeServer when assignment submission confirmed.
    /// </summary>
    public void EndEnforcementSession(string policyId)
    {
        lock (_sessionLock)
        {
            if (_currentSession?.PolicyId == policyId)
            {
                _logger.LogInformation("Hard app blocking session ended. PolicyId={PolicyId}", policyId);
                _currentSession = null;
            }
            else if (_currentSession != null)
            {
                _logger.LogWarning(
                    "EndEnforcementSession called for different policy. Current={Current}, Requested={Requested}",
                    _currentSession.PolicyId,
                    policyId);
            }
        }
    }

    /// <summary>
    /// Gets whether a session is currently active.
    /// </summary>
    public bool HasActiveSession
    {
        get
        {
            lock (_sessionLock)
            {
                return _currentSession != null;
            }
        }
    }

    public async Task EnforceNowAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Immediate enforcement triggered");
        await EnforceSessionAsync(cancellationToken);
    }

    private async Task RunEnforcementLoopAsync(CancellationToken cancellationToken)
    {
        _logger.LogDebug("Enforcement loop started");

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    // Check for active session (Layer: Hard App Blocking Outside Our App)
                    EnforcementSession? session;
                    lock (_sessionLock)
                    {
                        session = _currentSession;
                    }

                    if (session != null)
                    {
                        await EnforceSessionAsync(cancellationToken);
                    }
                    else
                    {
                        // Fall back to policy-based enforcement
                        await EnforcePoliciesAsync(cancellationToken);
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Error during enforcement cycle - will retry next interval");
                }

                await Task.Delay(TimeSpan.FromSeconds(EnforcementIntervalSeconds), cancellationToken);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug("Enforcement loop cancelled");
        }
    }

    private async Task EnforceSessionAsync(CancellationToken cancellationToken)
    {
        EnforcementSession? session;
        lock (_sessionLock)
        {
            session = _currentSession;
        }

        if (session == null)
        {
            return;
        }

        try
        {
            var allowedAppsSet = new HashSet<string>(session.AllowedApps, StringComparer.OrdinalIgnoreCase);
            var processes = Process.GetProcesses();
            var killedCount = 0;

            foreach (var process in processes)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                try
                {
                    var processName = process.ProcessName;
                    var processId = process.Id;

                    // Never kill system-critical processes
                    if (SystemCriticalProcesses.Contains(processName))
                    {
                        continue;
                    }

                    // Never kill the Electron app itself (the one running the assignment)
                    if (processId == session.ElectronPid)
                    {
                        continue;
                    }

                    // Never kill our own agent or its children
                    if (processId == _parentProcessId || TryGetParentProcessId(processId) == _parentProcessId)
                    {
                        continue;
                    }

                    // Allow processes in the allowed_apps list
                    if (allowedAppsSet.Contains(processName))
                    {
                        continue;
                    }

                    // Edge case: Skip processes with no visible window (system background helpers)
                    if (!HasVisibleWindow(processId))
                    {
                        _logger.LogDebug("Skipping process with no visible window. ProcessName={ProcessName}, ProcessId={ProcessId}",
                            processName, processId);
                        continue;
                    }

                    // This process is not allowed — kill it and log the event
                    var windowTitle = TryGetWindowTitle(processId);
                    await KillProcessAndNotifyAsync(process, session.PolicyId, windowTitle, cancellationToken);
                    killedCount++;
                }
                catch (InvalidOperationException)
                {
                    // Process already exited — skip
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Error evaluating process during session enforcement");
                }
                finally
                {
                    process.Dispose();
                }
            }

            if (killedCount > 0)
            {
                _logger.LogInformation(
                    "Session enforcement cycle complete. ProcessesKilled={Count}, PolicyId={PolicyId}",
                    killedCount,
                    session.PolicyId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enumerating processes during session enforcement");
        }
    }

    /// <summary>
    /// Kills a process that violates the allowed apps list and sends event + notification.
    /// </summary>
    private async Task KillProcessAndNotifyAsync(Process process, string policyId, string? windowTitle, CancellationToken cancellationToken)
    {
        try
        {
            var processId = process.Id;
            var processName = process.ProcessName;
            var killedAt = DateTime.UtcNow;

            // Final safety check
            if (SystemCriticalProcesses.Contains(processName))
            {
                _logger.LogWarning("Prevented termination of system-critical process. ProcessName={ProcessName}",
                    processName);
                return;
            }

            // Kill the process
            process.Kill(entireProcessTree: false);

            _logger.LogWarning(
                "Process killed during session enforcement. ProcessName={ProcessName}, ProcessId={ProcessId}, " +
                "KilledAt={KilledAt}, PolicyId={PolicyId}, WindowTitle={WindowTitle}",
                processName,
                processId,
                killedAt,
                policyId,
                windowTitle ?? "<unknown>");

            // Send blocked_app_killed event to Electron via Named Pipe (if pipe server available)
            // In a real implementation, this would be sent via the Named Pipe
            // For now, just log the intent
            await SendBlockedAppEventAsync(processName, processId, killedAt, windowTitle, cancellationToken);

            // Show Windows toast notification to student
            await _toastService?.SendToastNotificationAsync(
                "HumanFirst — App Blocked",
                $"{processName} is not allowed during your assignment.",
                cancellationToken) ?? Task.CompletedTask;
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            // Access denied or process protected — add to runtime whitelist
            _logger.LogWarning(ex, "Cannot kill process - access denied or protected. ProcessName={ProcessName}",
                TryGetProcessName(process));
        }
        catch (InvalidOperationException)
        {
            // Process already exited — OK
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error killing process. ProcessName={ProcessName}",
                TryGetProcessName(process));
        }
    }

    /// <summary>
    /// Sends a blocked_app_killed event to Electron via Named Pipe for logging.
    /// Note: This is a placeholder for the actual Named Pipe communication.
    /// </summary>
    private async Task SendBlockedAppEventAsync(string processName, int processId, DateTime killedAt, string? windowTitle, CancellationToken cancellationToken)
    {
        try
        {
            // TODO: Implement proper Named Pipe communication to send this event back to Electron
            // For now, we just log that the event occurred
            // The actual implementation would serialize the BlockedAppEvent and send it
            // via the Named Pipe connection

            _logger.LogInformation(
                "Blocked app event created (Name={ProcessName}, PID={ProcessId}, KilledAt={KilledAt}, " +
                "WindowTitle={WindowTitle}) - would send to Electron via Named Pipe",
                processName,
                processId,
                killedAt,
                windowTitle ?? "<unknown>");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending blocked app event to Electron");
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Checks if a process has a visible window.
    /// </summary>
    private bool HasVisibleWindow(int processId)
    {
        try
        {
            var process = Process.GetProcessById(processId);
            // A process with a main window handle is likely to have a visible window
            return process.MainWindowHandle != IntPtr.Zero;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Gets the window title for a process if available.
    /// </summary>
    private string? TryGetWindowTitle(int processId)
    {
        try
        {
            var process = Process.GetProcessById(processId);
            var mainWindowTitle = process.MainWindowTitle;
            return !string.IsNullOrWhiteSpace(mainWindowTitle) ? mainWindowTitle : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Attempts to get the parent process ID of a given process.
    /// </summary>
    private int TryGetParentProcessId(int processId)
    {
        try
        {
            // Use WMI or Process API to get parent PID
            // This is a simplified approach — could use WMI for more info if needed
            var process = Process.GetProcessById(processId);
            // Note: .NET doesn't expose parent PID directly, so this is a placeholder
            // In a real implementation, you'd use WMI or Platform Invocation Services
            return -1;
        }
        catch
        {
            return -1;
        }
    }


    private async Task EnforcePoliciesAsync(CancellationToken cancellationToken)
    {
        var activePolicies = _policyManager.GetActivePolicies();

        if (activePolicies.Count == 0)
        {
            _logger.LogDebug("No active policies - skipping enforcement");
            return;
        }

        foreach (var policy in activePolicies)
        {
            if (!ShouldEnforcePolicy(policy))
            {
                continue;
            }

            _logger.LogDebug("Enforcing policy. PolicyName={PolicyName}, ExamMode={ExamMode}",
                policy.PolicyName, policy.ExamMode);

            // Apply app allowlist enforcement
            await ApplyAppAllowlistAsync(policy, cancellationToken);

            // Apply domain allowlist (placeholder for now)
            ApplyDomainAllowlist(policy);
        }
    }

    /// <summary>
    /// Checks if a policy should be enforced based on IsActive, time window, or ExamMode.
    /// </summary>
    private bool ShouldEnforcePolicy(Policy policy)
    {
        if (!policy.IsActive)
        {
            return false;
        }

        // ExamMode overrides time restrictions
        if (policy.ExamMode)
        {
            return true;
        }

        // Check time window
        var now = DateTime.UtcNow;
        return now >= policy.StartTime && now <= policy.EndTime;
    }

    /// <summary>
    /// Enforces the app allowlist by terminating processes not in the allowed list.
    /// </summary>
    private Task ApplyAppAllowlistAsync(Policy policy, CancellationToken cancellationToken)
    {
        if (policy.AllowedApps.Count == 0)
        {
            _logger.LogDebug("No allowed apps configured for policy {PolicyName} - skipping app enforcement",
                policy.PolicyName);
            return Task.CompletedTask;
        }

        var allowedAppsSet = new HashSet<string>(policy.AllowedApps, StringComparer.OrdinalIgnoreCase);

        _logger.LogDebug("Applying app allowlist. PolicyName={PolicyName}, AllowedAppsCount={Count}",
            policy.PolicyName, allowedAppsSet.Count);

        try
        {
            var processes = Process.GetProcesses();
            var terminatedCount = 0;

            foreach (var process in processes)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                try
                {
                    var processName = process.ProcessName;

                    // Skip system-critical processes
                    if (SystemCriticalProcesses.Contains(processName))
                    {
                        continue;
                    }

                    // Skip if in allowed list
                    if (allowedAppsSet.Contains(processName))
                    {
                        continue;
                    }

                    // Terminate disallowed process
                    TerminateProcess(process, policy.PolicyName);
                    terminatedCount++;
                }
                catch (InvalidOperationException)
                {
                    // Process already exited
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to evaluate process. ProcessName={ProcessName}",
                        TryGetProcessName(process));
                }
                finally
                {
                    process.Dispose();
                }
            }

            if (terminatedCount > 0)
            {
                _logger.LogInformation("Enforcement cycle complete. TerminatedProcesses={Count}",
                    terminatedCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enumerating processes during enforcement");
        }

        return Task.CompletedTask;
    }

    /// <summary>
    /// Safely terminates a process that is not in the allowlist.
    /// </summary>
    private void TerminateProcess(Process process, string policyName)
    {
        try
        {
            var processId = process.Id;
            var processName = process.ProcessName;
            var timestamp = DateTimeOffset.UtcNow;

            // Final safety check
            if (SystemCriticalProcesses.Contains(processName))
            {
                _logger.LogWarning("Prevented termination of system-critical process. ProcessName={ProcessName}",
                    processName);
                return;
            }

            process.Kill(entireProcessTree: false);

            _logger.LogWarning(
                "Process terminated by enforcement. Timestamp={Timestamp}, ProcessId={ProcessId}, ProcessName={ProcessName}, PolicyName={PolicyName}",
                timestamp,
                processId,
                processName,
                policyName);
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            // Access denied or process protected
            _logger.LogDebug(ex, "Cannot terminate process - access denied. ProcessName={ProcessName}",
                TryGetProcessName(process));
        }
        catch (InvalidOperationException)
        {
            // Process already exited
            _logger.LogDebug("Process already exited. ProcessName={ProcessName}", TryGetProcessName(process));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error terminating process. ProcessName={ProcessName}",
                TryGetProcessName(process));
        }
    }

    /// <summary>
    /// Applies domain allowlist enforcement.
    /// Currently only logs - WFP integration planned for future.
    /// </summary>
    private void ApplyDomainAllowlist(Policy policy)
    {
        if (policy.AllowedDomains.Count == 0)
        {
            _logger.LogDebug("No allowed domains configured for policy {PolicyName} - skipping domain enforcement",
                policy.PolicyName);
            return;
        }

        _logger.LogInformation(
            "Domain allowlist logged (WFP not yet implemented). PolicyName={PolicyName}, AllowedDomainsCount={Count}, Domains={Domains}",
            policy.PolicyName,
            policy.AllowedDomains.Count,
            string.Join(", ", policy.AllowedDomains.Take(10))); // Log first 10

        // Placeholder for future WFP integration
        ApplyDomainAllowlistViaWfp(policy.AllowedDomains);
    }

    /// <summary>
    /// Placeholder method for future Windows Filtering Platform (WFP) integration.
    /// Will implement network-level domain blocking.
    /// </summary>
    /// <param name="allowedDomains">List of domains to allow.</param>
    private void ApplyDomainAllowlistViaWfp(IReadOnlyList<string> allowedDomains)
    {
        // TODO: Implement WFP-based domain filtering
        // Steps for future implementation:
        // 1. Use FwpmEngineOpen to open WFP engine
        // 2. Create filter conditions for allowed domains
        // 3. Add permit filters for allowed domains
        // 4. Add block filter for all other traffic (lower weight)
        // 5. Handle DNS resolution for domain-to-IP mapping
        // 6. Consider using Windows DNS Client events for real-time domain detection

        _logger.LogDebug("WFP domain enforcement placeholder - not yet implemented");
    }

    private static string TryGetProcessName(Process process)
    {
        try
        {
            return process.ProcessName;
        }
        catch
        {
            return "<unknown>";
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _enforcementCts?.Cancel();
        _enforcementCts?.Dispose();
        _enforcementTask = null;
        _disposed = true;
    }
}
