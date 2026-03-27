namespace ControlPlane.Agent.Models;

public sealed class AssignmentRiskLogEvent
{
    public string StudentId { get; init; } = string.Empty;
    public string SessionId { get; init; } = string.Empty;
    public string Domain { get; init; } = string.Empty;
    public string ProcessName { get; init; } = string.Empty;
    public DateTime TimestampUtc { get; init; }
    public string SeverityLevel { get; init; } = "LOW";
    public string EventType { get; init; } = "ai_domain_visit";
}
