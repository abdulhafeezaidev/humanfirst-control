using ControlPlane.Agent.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Reflection;

namespace ControlPlane.Agent;

/// <summary>
/// Main worker service that coordinates agent lifecycle and subsystems.
/// Runs as a Windows Service with auto-start capability.
/// </summary>
public sealed class AgentWorker : BackgroundService
{
    private readonly ILogger<AgentWorker> _logger;
    private readonly INamedPipeServer _namedPipeServer;
    private readonly IPolicyManager _policyManager;
    private readonly IEnforcementEngine _enforcementEngine;
    private readonly ActivityMonitorService _activityMonitor;
    private readonly ClipboardMonitorService _clipboardMonitor;
    private readonly ForegroundWindowMonitorService _foregroundWindowMonitor;
    private readonly IHostApplicationLifetime _appLifetime;

    public AgentWorker(
        ILogger<AgentWorker> logger,
        INamedPipeServer namedPipeServer,
        IPolicyManager policyManager,
        IEnforcementEngine enforcementEngine,
        ActivityMonitorService activityMonitor,
        ClipboardMonitorService clipboardMonitor,
        ForegroundWindowMonitorService foregroundWindowMonitor,
        IHostApplicationLifetime appLifetime)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _namedPipeServer = namedPipeServer ?? throw new ArgumentNullException(nameof(namedPipeServer));
        _policyManager = policyManager ?? throw new ArgumentNullException(nameof(policyManager));
        _enforcementEngine = enforcementEngine ?? throw new ArgumentNullException(nameof(enforcementEngine));
        _activityMonitor = activityMonitor ?? throw new ArgumentNullException(nameof(activityMonitor));
        _clipboardMonitor = clipboardMonitor ?? throw new ArgumentNullException(nameof(clipboardMonitor));
        _foregroundWindowMonitor = foregroundWindowMonitor ?? throw new ArgumentNullException(nameof(foregroundWindowMonitor));
        _appLifetime = appLifetime ?? throw new ArgumentNullException(nameof(appLifetime));
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";

        _logger.LogInformation(
            "AgentWorker starting. Version={Version}, MachineName={MachineName}, StartupTime={StartupTime}, ProcessId={ProcessId}",
            version,
            Environment.MachineName,
            DateTimeOffset.UtcNow,
            Environment.ProcessId);

        // Initialize the Policy Manager (creates SQLite DB if needed, loads cached policies)
        _logger.LogInformation("Initializing PolicyManager...");
        await _policyManager.InitializeAsync(cancellationToken);

        var policies = _policyManager.GetAllPolicies();
        _logger.LogInformation("PolicyManager ready. CachedPolicies={PolicyCount}", policies.Count);

        // Log summary of active policies
        var activePolicies = _policyManager.GetActivePolicies();
        _logger.LogInformation("ActivePolicies={ActiveCount} of {TotalCount} policies",
            activePolicies.Count, policies.Count);

        // Start the Enforcement Engine
        _logger.LogInformation("Starting EnforcementEngine...");
        await _enforcementEngine.StartAsync(cancellationToken);
        _logger.LogInformation("EnforcementEngine started. IsRunning={IsRunning}", _enforcementEngine.IsRunning);

        // Start the Activity Monitor (assignment-mode domain tracking, no blocking)
        _logger.LogInformation("Starting ActivityMonitorService...");
        await _activityMonitor.StartAsync(cancellationToken);
        _logger.LogInformation("ActivityMonitorService started. IsRunning={IsRunning}", _activityMonitor.IsRunning);

        // Start the Clipboard Monitor (large-paste detection, no blocking)
        _logger.LogInformation("Starting ClipboardMonitorService...");
        await _clipboardMonitor.StartAsync(cancellationToken);
        _logger.LogInformation("ClipboardMonitorService started. IsRunning={IsRunning}", _clipboardMonitor.IsRunning);

        // Start the Foreground Window Monitor (focus loss detection, Layer 2)
        _logger.LogInformation("Starting ForegroundWindowMonitorService...");
        await _foregroundWindowMonitor.StartAsync(cancellationToken);
        _logger.LogInformation("ForegroundWindowMonitorService started. IsRunning={IsRunning}", _foregroundWindowMonitor.IsRunning);

        // Start the Named Pipe server
        await _namedPipeServer.StartAsync(cancellationToken);

        _logger.LogInformation("AgentWorker started successfully");

        await base.StartAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AgentWorker executing main loop");

        try
        {
            // Main service loop - keep running until shutdown requested
            while (!stoppingToken.IsCancellationRequested)
            {
                // Heartbeat log every 60 seconds (for monitoring/debugging)
                _logger.LogDebug("AgentWorker heartbeat at {Timestamp}", DateTimeOffset.UtcNow);

                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Expected during shutdown - not an error
            _logger.LogInformation("AgentWorker received shutdown signal");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AgentWorker encountered an unhandled exception");
            throw;
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("AgentWorker stopping. ShutdownTime={ShutdownTime}", DateTimeOffset.UtcNow);

        try
        {
            // Stop the Enforcement Engine
            _logger.LogInformation("Stopping EnforcementEngine...");
            await _enforcementEngine.StopAsync(cancellationToken);
            _logger.LogInformation("EnforcementEngine stopped");

            // Stop the Activity Monitor
            _logger.LogInformation("Stopping ActivityMonitorService...");
            await _activityMonitor.StopAsync(cancellationToken);
            _logger.LogInformation("ActivityMonitorService stopped");

            // Stop the Clipboard Monitor
            _logger.LogInformation("Stopping ClipboardMonitorService...");
            await _clipboardMonitor.StopAsync(cancellationToken);
            _logger.LogInformation("ClipboardMonitorService stopped");

            // Stop the Foreground Window Monitor
            _logger.LogInformation("Stopping ForegroundWindowMonitorService...");
            await _foregroundWindowMonitor.StopAsync(cancellationToken);
            _logger.LogInformation("ForegroundWindowMonitorService stopped");

            // Stop the Named Pipe server gracefully
            await _namedPipeServer.StopAsync(cancellationToken);

            _logger.LogInformation("AgentWorker stopped gracefully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during AgentWorker shutdown");
        }

        await base.StopAsync(cancellationToken);
    }

    public override void Dispose()
    {
        _logger.LogDebug("AgentWorker disposing");
        base.Dispose();
    }
}
