namespace ControlPlane.Agent.Services;

/// <summary>
/// Interface for the Named Pipe server that handles local IPC with the UI.
/// </summary>
public interface INamedPipeServer
{
    /// <summary>
    /// Starts the Named Pipe server and begins accepting connections.
    /// </summary>
    Task StartAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Stops the Named Pipe server gracefully.
    /// </summary>
    Task StopAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Gets whether the server is currently running.
    /// </summary>
    bool IsRunning { get; }

    /// <summary>
    /// Gets the number of active client connections.
    /// </summary>
    int ActiveConnectionCount { get; }
}
