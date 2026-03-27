namespace ControlPlane.Agent.Models;

public sealed class DomainClassificationResult
{
    public string Domain { get; init; } = string.Empty;
    public bool IsAiDomain { get; init; }
    public string Category { get; init; } = "unknown";
    public string Risk { get; init; } = "low";
    public string Source { get; init; } = "local";
}
