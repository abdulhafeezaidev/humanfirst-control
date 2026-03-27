using System.Text.Json.Serialization;

namespace ControlPlane.Agent.Models;

/// <summary>
/// Represents an IPC message sent to the agent via Named Pipe.
/// </summary>
public sealed class IpcRequest
{
    /// <summary>
    /// The command to execute: "status", "reload", or custom.
    /// </summary>
    [JsonPropertyName("command")]
    public string Command { get; set; } = string.Empty;

    /// <summary>
    /// Optional payload for commands that need additional data.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; set; }

    /// <summary>
    /// Request ID for correlation (optional).
    /// </summary>
    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }
}

/// <summary>
/// Represents an IPC response from the agent via Named Pipe.
/// </summary>
public sealed class IpcResponse
{
    /// <summary>
    /// Whether the command succeeded.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// Human-readable message.
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Response data (JSON-serializable).
    /// </summary>
    [JsonPropertyName("data")]
    public object? Data { get; set; }

    /// <summary>
    /// Request ID for correlation (echoed from request).
    /// </summary>
    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    /// <summary>
    /// Timestamp of the response.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public static IpcResponse Ok(string message, object? data = null, string? requestId = null) =>
        new() { Success = true, Message = message, Data = data, RequestId = requestId };

    public static IpcResponse Error(string message, string? requestId = null) =>
        new() { Success = false, Message = message, RequestId = requestId };
}

/// <summary>
/// Status response data returned by the "status" command.
/// </summary>
public sealed class AgentStatusData
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = string.Empty;

    [JsonPropertyName("machineName")]
    public string MachineName { get; set; } = string.Empty;

    [JsonPropertyName("serviceStatus")]
    public string ServiceStatus { get; set; } = "Running";

    [JsonPropertyName("uptime")]
    public string Uptime { get; set; } = string.Empty;

    [JsonPropertyName("startedAt")]
    public DateTime StartedAt { get; set; }

    [JsonPropertyName("policyCount")]
    public int PolicyCount { get; set; }

    [JsonPropertyName("activePolicyCount")]
    public int ActivePolicyCount { get; set; }

    [JsonPropertyName("lastPolicyLoadTime")]
    public DateTime? LastPolicyLoadTime { get; set; }

    [JsonPropertyName("namedPipeConnections")]
    public int NamedPipeConnections { get; set; }
}

/// <summary>
/// Payload for the push_policies IPC command.
/// Sent by Electron when syncing Supabase policies to the local agent.
/// </summary>
public sealed class PushPoliciesPayload
{
    [JsonPropertyName("policies")]
    public List<PushPolicyItem> Policies { get; set; } = new();
}

public sealed class PushPolicyItem
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("examMode")]
    public bool ExamMode { get; set; }

    [JsonPropertyName("startTime")]
    public string? StartTime { get; set; }

    [JsonPropertyName("endTime")]
    public string? EndTime { get; set; }

    [JsonPropertyName("allowedApps")]
    public List<string>? AllowedApps { get; set; }

    [JsonPropertyName("blockedApps")]
    public List<string>? BlockedApps { get; set; }

    [JsonPropertyName("allowedDomains")]
    public List<string>? AllowedDomains { get; set; }
}
