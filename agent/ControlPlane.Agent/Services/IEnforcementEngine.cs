namespace ControlPlane.Agent.Services;

/// <summary>
/// Interface for the enforcement engine that applies policy restrictions.
/// </summary>
public interface IEnforcementEngine
{
    /// <summary>
    /// Whether the enforcement loop is currently running.
    /// </summary>
    bool IsRunning { get; }

    /// <summary>
    /// Whether a hard app blocking session is currently active.
    /// </summary>
    bool HasActiveSession { get; }

    /// <summary>
    /// Starts the background enforcement loop.
    /// </summary>
    Task StartAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Stops the background enforcement loop.
    /// </summary>
    Task StopAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Triggers an immediate enforcement cycle (e.g., after policy reload).
    /// </summary>
    Task EnforceNowAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Starts a hard app blocking enforcement session.
    /// Called when an assignment begins.
    /// </summary>
    void StartEnforcementSession(Models.EnforcementSession session);

    /// <summary>
    /// Ends the current hard app blocking enforcement session.
    /// Called when assignment ends or submission is complete.
    /// </summary>
    void EndEnforcementSession(string policyId);
}
