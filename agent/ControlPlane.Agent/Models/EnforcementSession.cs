using System.Text.Json.Serialization;

namespace ControlPlane.Agent.Models;

/// <summary>
/// Represents an active enforcement session that requires hard app blocking.
/// Sent from Electron when assignment starts, cleared when assignment ends.
/// </summary>
public sealed class EnforcementSession
{
    /// <summary>
    /// Unique policy session ID from Electron.
    /// </summary>
    [JsonPropertyName("policyId")]
    public string PolicyId { get; set; } = string.Empty;

    /// <summary>
    /// Assignment mode: 'assignment' or 'exam'.
    /// </summary>
    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "assignment";

    /// <summary>
    /// List of process names that are allowed to run.
    /// Process names should be case-insensitive (e.g., "emu8086.exe", "code.exe").
    /// </summary>
    [JsonPropertyName("allowedApps")]
    public List<string> AllowedApps { get; set; } = new();

    /// <summary>
    /// Process ID of the Electron app instance running the assignment.
    /// This process will NEVER be killed, even if not in allowed_apps.
    /// </summary>
    [JsonPropertyName("electronPid")]
    public int ElectronPid { get; set; }

    /// <summary>
    /// Timestamp when the session was created.
    /// </summary>
    [JsonPropertyName("startedAt")]
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public override string ToString() =>
        $"EnforcementSession[Mode={Mode}, PolicyId={PolicyId}, ProcessAllowed={AllowedApps.Count}, ElectronPid={ElectronPid}]";
}

/// <summary>
/// Represents an app that was blocked and killed during enforcement.
/// Sent from Agent to Electron via Named Pipe for logging.
/// </summary>
public sealed class BlockedAppEvent
{
    /// <summary>
    /// Always "blocked_app_killed" for this event type.
    /// </summary>
    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "blocked_app_killed";

    /// <summary>
    /// Metadata about the blocked app.
    /// </summary>
    [JsonPropertyName("metadata")]
    public BlockedAppMetadata Metadata { get; set; } = new();
}

/// <summary>
/// Metadata for a blocked app event.
/// </summary>
public sealed class BlockedAppMetadata
{
    /// <summary>
    /// Process name of the blocked app (e.g., "discord.exe").
    /// </summary>
    [JsonPropertyName("processName")]
    public string ProcessName { get; set; } = string.Empty;

    /// <summary>
    /// Process ID of the blocked app.
    /// </summary>
    [JsonPropertyName("processId")]
    public int ProcessId { get; set; }

    /// <summary>
    /// ISO 8601 timestamp when the app was killed.
    /// </summary>
    [JsonPropertyName("killedAt")]
    public string KilledAt { get; set; } = DateTime.UtcNow.ToString("O");

    /// <summary>
    /// Window title of the blocked app, if available.
    /// </summary>
    [JsonPropertyName("windowTitle")]
    public string? WindowTitle { get; set; }
}
