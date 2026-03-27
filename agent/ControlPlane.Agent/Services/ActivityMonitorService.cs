using ControlPlane.Agent.Models;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Background service that monitors which domains the student visits in a browser
/// during non-exam (assignment / focus / custom) policy windows.
///
/// Design:
///   - Every 2 seconds: detect the foreground window, check if it is a browser,
///     extract the domain from the title bar.
///   - Every 30 seconds: persist accumulated data to assignment_session_log.json.
///   - Does NOT block any site � monitoring and logging only.
///   - Automatically starts/stops when a qualifying policy becomes active/expires.
///   - Has NO effect on exam-mode (strict) policies.
/// </summary>
public sealed class ActivityMonitorService : IDisposable
{
    // ?? Win32 interop ??????????????????????????????????????????????????
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    // ?? Constants ??????????????????????????????????????????????????????
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan PersistInterval = TimeSpan.FromSeconds(30);

    private static readonly HashSet<string> BrowserProcessNames =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "chrome",
            "msedge",
            "firefox",
            "brave",
            "opera",
            "vivaldi",
            "iexplore"
        };

    // Common browser title separators: " - ", " � ", " � ", " | "
    // The domain is usually the last segment.
    private static readonly Regex TitleSeparator =
        new(@"\s[-��|]\s", RegexOptions.Compiled);

    // Lightweight domain-like check (word.word with optional port)
    private static readonly Regex DomainPattern =
        new(@"^([a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?$",
            RegexOptions.Compiled);

    // ?? Fields ?????????????????????????????????????????????????????????
    private readonly ILogger<ActivityMonitorService> _logger;
    private readonly IPolicyManager _policyManager;
    private readonly IDomainClassifierService _domainClassifier;
    private readonly DomainSessionTracker _tracker;
    private readonly SessionLogger _sessionLogger;

    private CancellationTokenSource? _cts;
    private Task? _pollTask;
    private Task? _persistTask;
    private bool _isRunning;
    private bool _disposed;
    private string? _lastEvaluatedDomain;
    private readonly string _sessionId = Guid.NewGuid().ToString("N");

    public bool IsRunning => _isRunning;

    public ActivityMonitorService(
        ILogger<ActivityMonitorService> logger,
        IPolicyManager policyManager,
        IDomainClassifierService domainClassifier)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _policyManager = policyManager ?? throw new ArgumentNullException(nameof(policyManager));
        _domainClassifier = domainClassifier ?? throw new ArgumentNullException(nameof(domainClassifier));
        _tracker = new DomainSessionTracker(logger);
        _sessionLogger = new SessionLogger(logger);
    }

    // ?? Lifecycle ??????????????????????????????????????????????????????

    public Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isRunning)
        {
            _logger.LogWarning("ActivityMonitorService already running");
            return Task.CompletedTask;
        }

        _logger.LogInformation("ActivityMonitorService starting (monitor-only, no blocking)");

        _tracker.Reset();
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        _pollTask = RunPollLoopAsync(_cts.Token);
        _persistTask = RunPersistLoopAsync(_cts.Token);

        _isRunning = true;

        _logger.LogInformation("ActivityMonitorService started. PollInterval={Poll}s, PersistInterval={Persist}s",
            PollInterval.TotalSeconds, PersistInterval.TotalSeconds);

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        if (!_isRunning) return;

        _logger.LogInformation("ActivityMonitorService stopping");

        _cts?.Cancel();

        // Wait for loops to finish
        var tasks = new List<Task>(2);
        if (_pollTask is not null) tasks.Add(_pollTask);
        if (_persistTask is not null) tasks.Add(_persistTask);

        try
        {
            await Task.WhenAll(tasks).WaitAsync(cancellationToken);
        }
        catch (OperationCanceledException) { /* expected */ }

        // Final flush & persist
        _tracker.Flush();
        await PersistSnapshotAsync(CancellationToken.None);

        _isRunning = false;
        _logger.LogInformation("ActivityMonitorService stopped");
    }

    // ?? Poll loop (every 2 s) ??????????????????????????????????????????

    private async Task RunPollLoopAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                try
                {
                    // Only monitor if a non-exam policy is currently active
                    if (HasActiveAssignmentPolicy())
                    {
                        var browserContext = DetectForegroundBrowserContext();
                        _tracker.Tick(browserContext?.Domain);

                        if (browserContext?.Domain is not null &&
                            !string.Equals(_lastEvaluatedDomain, browserContext.Domain, StringComparison.OrdinalIgnoreCase))
                        {
                            _lastEvaluatedDomain = browserContext.Domain;
                            await EvaluateDomainRiskAsync(browserContext, ct);
                        }
                    }
                    else
                    {
                        // No qualifying policy � treat as "no domain"
                        _tracker.Tick(null);
                        _lastEvaluatedDomain = null;
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogDebug(ex, "ActivityMonitor: Error during poll tick");
                }

                await Task.Delay(PollInterval, ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
    }

    // ?? Persist loop (every 30 s) ??????????????????????????????????????

    private async Task RunPersistLoopAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                await Task.Delay(PersistInterval, ct);

                await PersistSnapshotAsync(ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
    }

    private async Task PersistSnapshotAsync(CancellationToken ct)
    {
        var timeSpent = _tracker.GetTimeSpentSnapshot();
        var visits = _tracker.GetVisitLogSnapshot();

        if (timeSpent.Count == 0 && visits.Count == 0)
            return;

        await _sessionLogger.PersistAsync(timeSpent, visits, ct);
    }

    // ?? Policy check ???????????????????????????????????????????????????

    /// <summary>
    /// Returns true when at least one active, non-exam policy is within its schedule.
    /// Exam-mode (strict) policies are intentionally excluded � those use
    /// the existing EnforcementEngine with app-kill + kiosk lockdown.
    /// </summary>
    private bool HasActiveAssignmentPolicy()
    {
        var active = _policyManager.GetActivePolicies();
        return active.Any(p => p.IsActive && !p.ExamMode && p.IsWithinSchedule());
    }

    // ?? Foreground-window domain detection ?????????????????????????????

    /// <summary>
    /// Gets the domain currently shown in the foreground browser window.
    /// Returns null if the foreground app is not a recognised browser
    /// or the domain cannot be parsed from the title.
    /// </summary>
    private BrowserContext? DetectForegroundBrowserContext()
    {
        try
        {
            var hwnd = GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return null;

            // Identify the owning process
            GetWindowThreadProcessId(hwnd, out uint pid);
            if (pid == 0) return null;

            string processName;
            try
            {
                using var proc = Process.GetProcessById((int)pid);
                processName = proc.ProcessName;
            }
            catch
            {
                return null; // process exited
            }

            if (!BrowserProcessNames.Contains(processName))
                return null;

            // Read window title
            var sb = new StringBuilder(1024);
            int len = GetWindowText(hwnd, sb, sb.Capacity);
            if (len <= 0) return null;

            var title = sb.ToString();
            var extracted = ExtractDomainFromTitle(title);
            if (string.IsNullOrWhiteSpace(extracted)) return null;

            var normalized = _domainClassifier.NormalizeDomain(extracted);
            if (string.IsNullOrWhiteSpace(normalized)) return null;

            return new BrowserContext
            {
                Domain = normalized,
                ProcessName = processName
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "ActivityMonitor: Error detecting foreground browser domain");
            return null;
        }
    }

    private async Task EvaluateDomainRiskAsync(BrowserContext context, CancellationToken ct)
    {
        var classification = await _domainClassifier.ClassifyAsync(context.Domain, ct);

        if (classification.IsAiDomain)
        {
            _logger.LogWarning(
                "AssignmentModeAiDomainDetected: Domain={Domain}, ProcessName={ProcessName}, Source={Source}",
                classification.Domain,
                context.ProcessName,
                classification.Source);

            await _sessionLogger.AppendRiskEventAsync(new AssignmentRiskLogEvent
            {
                StudentId = Environment.UserName,
                SessionId = _sessionId,
                Domain = classification.Domain,
                ProcessName = context.ProcessName,
                TimestampUtc = DateTime.UtcNow,
                SeverityLevel = "HIGH",
                EventType = "ai_domain_visit"
            }, ct);
            return;
        }

        if (classification.Category == "unknown")
        {
            _logger.LogDebug(
                "AssignmentModeUnknownDomainObserved: Domain={Domain}, ProcessName={ProcessName}",
                classification.Domain,
                context.ProcessName);

            await _sessionLogger.AppendRiskEventAsync(new AssignmentRiskLogEvent
            {
                StudentId = Environment.UserName,
                SessionId = _sessionId,
                Domain = classification.Domain,
                ProcessName = context.ProcessName,
                TimestampUtc = DateTime.UtcNow,
                SeverityLevel = "LOW",
                EventType = "unknown_domain_observed"
            }, ct);
        }
    }

    /// <summary>
    /// Parses a domain from a browser window title.
    /// Standard browser titles look like:
    ///   "Page Title - domain.com"           (Chrome/Edge)
    ///   "Page Title � Mozilla Firefox"      (Firefox appends browser name)
    ///   "domain.com"                        (sometimes on new tabs)
    /// </summary>
    internal static string? ExtractDomainFromTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return null;

        var segments = TitleSeparator.Split(title);

        // Walk segments right-to-left � the domain is usually the last
        // meaningful segment before the browser name.
        for (int i = segments.Length - 1; i >= 0; i--)
        {
            var candidate = segments[i].Trim();

            // Skip common browser-name suffixes
            if (IsBrowserName(candidate))
                continue;

            // Check if it looks like a domain
            if (DomainPattern.IsMatch(candidate))
                return candidate.ToLowerInvariant();

            // Sometimes the title is "Page Title - sub.domain.com - SomeExtra"
            // Try extracting embedded domain from the segment
            var embedded = TryExtractEmbeddedDomain(candidate);
            if (embedded is not null)
                return embedded;
        }

        // Last resort: check the entire title
        var trimmed = title.Trim();
        if (DomainPattern.IsMatch(trimmed))
            return trimmed.ToLowerInvariant();

        return null;
    }

    private static bool IsBrowserName(string segment)
    {
        var names = new[]
        {
            "Google Chrome", "Mozilla Firefox", "Microsoft Edge",
            "Brave", "Opera", "Vivaldi", "Internet Explorer",
            "Chrome", "Firefox", "Edge"
        };

        return names.Any(n => segment.Equals(n, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Tries to find a domain-like substring within a text segment.
    /// </summary>
    private static string? TryExtractEmbeddedDomain(string text)
    {
        // Split on whitespace and check each token
        var tokens = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        foreach (var token in tokens)
        {
            if (DomainPattern.IsMatch(token))
                return token.ToLowerInvariant();
        }
        return null;
    }

    // ?? IDisposable ????????????????????????????????????????????????????

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _cts?.Cancel();
        _cts?.Dispose();
    }

    private sealed class BrowserContext
    {
        public string Domain { get; init; } = string.Empty;
        public string ProcessName { get; init; } = string.Empty;
    }
}
