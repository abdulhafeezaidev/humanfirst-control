using ControlPlane.Agent.Models;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Monitors when the application loses foreground focus (Layer 2).
/// 
/// Every 3 seconds:
/// - Checks if foreground window is our Electron app
/// - If NOT in allowed list: logs app_focus_lost event
/// - After 60 seconds out: sends Windows toast notification
/// 
/// Whitelisted processes (never logged):
/// explorer.exe, dwm.exe, taskhostw.exe, svchost.exe, ShellExperienceHost.exe,
/// RuntimeBroker.exe, SearchHost.exe, TextInputHost.exe
/// </summary>
public sealed class ForegroundWindowMonitorService : IDisposable
{
    // Win32 interop
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    // Constants
    private const int PollIntervalSeconds = 3;
    private const int ToastNotificationThresholdSeconds = 60;
    private static readonly HashSet<string> WhitelistedProcesses = new(StringComparer.OrdinalIgnoreCase)
    {
        "explorer",          // Windows Explorer
        "dwm",               // Desktop Window Manager
        "taskhostw",         // Windows Task Host
        "svchost",           // Service Host
        "ShellExperienceHost", // Shell Experience Host
        "RuntimeBroker",     // Runtime Broker
        "SearchHost",        // Windows Search
        "TextInputHost",     // Text Input Host
        "LogonUI",           // Windows Logon
        "LockApp",           // Windows Lock Screen
        "Taskmgr",           // Task Manager
        "mmc",               // Microsoft Management Console
        "ctfmon",            // IME context
        "conhost",           // Console Host
        "ApplicationFrameHost" // UWP App Host
    };

    private readonly ILogger<ForegroundWindowMonitorService> _logger;
    private readonly IPolicyManager _policyManager;
    private readonly SessionLogger _sessionLogger;

    private CancellationTokenSource? _cts;
    private Task? _monitorTask;
    private bool _isRunning;
    private bool _disposed;

    // Track app focus state
    private DateTime? _focusLostTime;
    private string? _focusLostProcessName;
    private bool _hasShownToastFor60Seconds;

    public bool IsRunning => _isRunning;

    public ForegroundWindowMonitorService(
        ILogger<ForegroundWindowMonitorService> logger,
        IPolicyManager policyManager,
        SessionLogger sessionLogger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _policyManager = policyManager ?? throw new ArgumentNullException(nameof(policyManager));
        _sessionLogger = sessionLogger ?? throw new ArgumentNullException(nameof(sessionLogger));
    }

    public Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isRunning)
        {
            _logger.LogWarning("ForegroundWindowMonitorService already running");
            return Task.CompletedTask;
        }

        _logger.LogInformation("ForegroundWindowMonitorService starting (check every {Interval}s, toast after {Threshold}s)",
            PollIntervalSeconds, ToastNotificationThresholdSeconds);

        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _monitorTask = RunMonitorLoopAsync(_cts.Token);
        _isRunning = true;

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        if (!_isRunning) return;

        _logger.LogInformation("ForegroundWindowMonitorService stopping");

        _cts?.Cancel();

        if (_monitorTask is not null)
        {
            try
            {
                await _monitorTask.WaitAsync(cancellationToken);
            }
            catch (OperationCanceledException) { }
        }

        // Log final focus loss if still out
        if (_focusLostTime.HasValue)
        {
            await LogFocusLossAsync();
        }

        _isRunning = false;
        _logger.LogInformation("ForegroundWindowMonitorService stopped");
    }

    private async Task RunMonitorLoopAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    // Only monitor during active assignment mode
                    if (HasActiveAssignmentPolicy())
                    {
                        await CheckAppFocusAsync(ct);
                    }
                    else
                    {
                        // Reset focus tracking when no policy active
                        if (_focusLostTime.HasValue)
                        {
                            await LogFocusLossAsync();
                        }
                        _focusLostTime = null;
                        _focusLostProcessName = null;
                        _hasShownToastFor60Seconds = false;
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogDebug(ex, "ForegroundWindowMonitor: Error during poll");
                }

                await Task.Delay(TimeSpan.FromSeconds(PollIntervalSeconds), ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
    }

    private bool HasActiveAssignmentPolicy()
    {
        var active = _policyManager.GetActivePolicies();
        return active.Any(p => p.IsActive && !p.ExamMode && p.IsWithinSchedule());
    }

    private async Task CheckAppFocusAsync(CancellationToken ct)
    {
        try
        {
            var foregroundProcess = GetForegroundWindowProcess();

            // Check if it's our Electron app (HumanFirst)
            bool isOurApp = foregroundProcess?.ProcessName.Contains("electron", StringComparison.OrdinalIgnoreCase) == true ||
                           foregroundProcess?.ProcessName.Contains("HumanFirst", StringComparison.OrdinalIgnoreCase) == true;

            // Check if it's a whitelisted system process
            bool isWhitelisted = foregroundProcess != null &&
                                WhitelistedProcesses.Contains(foregroundProcess.ProcessName);

            if (isOurApp || isWhitelisted)
            {
                // App regained focus
                if (_focusLostTime.HasValue)
                {
                    await LogFocusLossAsync();
                }

                _focusLostTime = null;
                _focusLostProcessName = null;
                _hasShownToastFor60Seconds = false;
            }
            else if (foregroundProcess != null)
            {
                // App lost focus to non-whitelisted process
                if (!_focusLostTime.HasValue)
                {
                    _focusLostTime = DateTime.UtcNow;
                    _focusLostProcessName = foregroundProcess.ProcessName;

                    _logger.LogInformation(
                        "ForegroundWindowMonitor: App lost focus to {ProcessName}",
                        _focusLostProcessName);
                }
                else
                {
                    // Already tracking focus loss
                    var duration = DateTime.UtcNow - _focusLostTime.Value;

                    // Send toast notification after 60 seconds
                    if (!_hasShownToastFor60Seconds && duration.TotalSeconds >= ToastNotificationThresholdSeconds)
                    {
                        _hasShownToastFor60Seconds = true;
                        await SendToastNotificationAsync();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "ForegroundWindowMonitor: Error checking app focus");
        }
    }

    private async Task LogFocusLossAsync()
    {
        if (!_focusLostTime.HasValue || string.IsNullOrEmpty(_focusLostProcessName))
            return;

        var duration = DateTime.UtcNow - _focusLostTime.Value;
        var durationSeconds = (int)duration.TotalSeconds;

        _logger.LogInformation(
            "ForegroundWindowMonitor: Logging app focus loss - Process={ProcessName}, Duration={DurationSeconds}s",
            _focusLostProcessName, durationSeconds);

        // Log to assignment_session_log
        await _sessionLogger.AppendRiskEventAsync(new AssignmentRiskLogEvent
        {
            StudentId = Environment.UserName,
            SessionId = Guid.NewGuid().ToString("N"),
            Domain = string.Empty,
            ProcessName = _focusLostProcessName,
            TimestampUtc = DateTime.UtcNow,
            SeverityLevel = durationSeconds > 300 ? "HIGH" : durationSeconds > 60 ? "MEDIUM" : "LOW",
            EventType = "app_focus_lost"
        });
    }

    private async Task SendToastNotificationAsync()
    {
        try
        {
            _logger.LogInformation("ForegroundWindowMonitor: Sending 60-second focus loss notification");

            // On Windows, send a toast notification via PowerShell
            // This prevents blocking UI and shows a system toast
            string psCommand = @"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null

$APP_ID = 'HumanFirst.ControlPlane'
$xml = '
<toast>
    <visual>
        <binding template=""ToastText02"">
            <text id=""1"">HumanFirst: Please Return</text>
            <text id=""2"">Please return to complete your assignment</text>
        </binding>
    </visual>
</toast>
'

$doc = New-Object Windows.Data.Xml.Dom.XmlDocument
$doc.LoadXml($xml)
$toast = New-Object Windows.UI.Notifications.ToastNotification $doc
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID).Show($toast)
";

            // Execute PowerShell asynchronously
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -Command \"{psCommand}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true
            };

            using (var process = Process.Start(psi))
            {
                if (process != null)
                {
                    // Don't wait for completion - run async and fire-and-forget
                    _ = process.WaitForExitAsync().ConfigureAwait(false);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ForegroundWindowMonitor: Failed to send toast notification");
        }
    }

    private ProcessInfo? GetForegroundWindowProcess()
    {
        try
        {
            var hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return null;

            GetWindowThreadProcessId(hwnd, out uint pid);
            if (pid == 0) return null;

            try
            {
                using var proc = Process.GetProcessById((int)pid);
                var title = GetWindowTitle(hwnd);
                return new ProcessInfo
                {
                    ProcessName = proc.ProcessName,
                    ProcessId = proc.Id,
                    WindowTitle = title
                };
            }
            catch
            {
                return null;
            }
        }
        catch
        {
            return null;
        }
    }

    private string GetWindowTitle(IntPtr hwnd)
    {
        try
        {
            var sb = new StringBuilder(1024);
            int len = GetWindowText(hwnd, sb, sb.Capacity);
            return len > 0 ? sb.ToString() : string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        _cts?.Dispose();
        _disposed = true;
    }

    private class ProcessInfo
    {
        public string ProcessName { get; set; } = string.Empty;
        public int ProcessId { get; set; }
        public string WindowTitle { get; set; } = string.Empty;
    }
}
