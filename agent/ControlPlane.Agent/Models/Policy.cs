namespace ControlPlane.Agent.Models;

/// <summary>
/// Represents a policy that defines access rules, scheduling, and enforcement settings.
/// This is the local cached representation synced from the cloud control plane.
/// </summary>
public sealed class Policy
{
    /// <summary>
    /// Unique identifier for the policy.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Human-readable name for the policy.
    /// </summary>
    public string PolicyName { get; set; } = string.Empty;

    /// <summary>
    /// Whether the policy is currently active and should be enforced.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// List of domains/URLs that are allowed under this policy.
    /// Stored as JSON in SQLite.
    /// </summary>
    public List<string> AllowedDomains { get; set; } = new();

    /// <summary>
    /// List of application names/paths that are blocked under this policy.
    /// Stored as JSON in SQLite.
    /// </summary>
    public List<string> BlockedApps { get; set; } = new();

    /// <summary>
    /// List of application names (without .exe) that are allowed when enforcement is active.
    /// Any running process not in this list will be terminated.
    /// Stored as JSON in SQLite.
    /// </summary>
    public List<string> AllowedApps { get; set; } = new();

    /// <summary>
    /// When this policy becomes active (UTC).
    /// </summary>
    public DateTime StartTime { get; set; } = DateTime.MinValue;

    /// <summary>
    /// When this policy expires (UTC).
    /// </summary>
    public DateTime EndTime { get; set; } = DateTime.MaxValue;

    /// <summary>
    /// Whether this policy enables exam/kiosk mode restrictions.
    /// </summary>
    public bool ExamMode { get; set; } = false;

    /// <summary>
    /// When this policy was last synced from the cloud.
    /// </summary>
    public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this policy was created locally.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this policy was last modified.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Checks if the policy is currently within its active time window.
    /// </summary>
    public bool IsWithinSchedule(DateTime? utcNow = null)
    {
        var now = utcNow ?? DateTime.UtcNow;
        return now >= StartTime && now <= EndTime;
    }

    /// <summary>
    /// Checks if the policy should be enforced right now.
    /// </summary>
    public bool ShouldEnforce(DateTime? utcNow = null)
    {
        return IsActive && IsWithinSchedule(utcNow);
    }

    public override string ToString()
    {
        return $"Policy[{PolicyName}] Active={IsActive}, ExamMode={ExamMode}, " +
               $"AllowedDomains={AllowedDomains.Count}, BlockedApps={BlockedApps.Count}, " +
               $"AllowedApps={AllowedApps.Count}, Schedule={StartTime:u} to {EndTime:u}";
    }
}
