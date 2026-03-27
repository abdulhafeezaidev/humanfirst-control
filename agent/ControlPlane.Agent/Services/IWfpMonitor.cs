namespace ControlPlane.Agent.Services;

/// <summary>
/// Interface for Windows Filtering Platform monitoring.
/// </summary>
public interface IWfpMonitor
{
    /// <summary>
    /// Whether the WFP monitor is currently running.
    /// </summary>
    bool IsRunning { get; }

    /// <summary>
    /// Starts monitoring outbound network connections.
    /// </summary>
    Task StartAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Stops monitoring and cleans up resources.
    /// </summary>
    Task StopAsync(CancellationToken cancellationToken = default);
}
