namespace ControlPlane.Agent.Models;

/// <summary>
/// Represents a detected large-paste clipboard event (text > 400 characters).
/// </summary>
public sealed class LargePasteEvent
{
    public string Event { get; init; } = "large_paste";
    public DateTime Timestamp { get; init; }
    public int CharacterCount { get; init; }
}
