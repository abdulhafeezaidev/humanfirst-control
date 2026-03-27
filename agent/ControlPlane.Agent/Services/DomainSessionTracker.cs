using Microsoft.Extensions.Logging;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Tracks time spent on each domain during an assignment monitoring session.
/// Thread-safe. Does NOT block any site — monitoring only.
/// </summary>
public sealed class DomainSessionTracker
{
    private readonly ILogger _logger;
    private readonly object _lock = new();

    private readonly Dictionary<string, TimeSpan> _domainTimeSpent = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<DomainVisitEntry> _visitLog = new();

    private string? _currentDomain;
    private DateTime _currentDomainStart;

    public DomainSessionTracker(ILogger logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Called periodically with the domain the student is currently viewing.
    /// Pass null when no browser is in the foreground.
    /// </summary>
    public void Tick(string? domain)
    {
        var now = DateTime.UtcNow;

        lock (_lock)
        {
            // Normalise: treat empty as null
            if (string.IsNullOrWhiteSpace(domain))
                domain = null;

            // Same domain as last tick — nothing to do
            if (string.Equals(_currentDomain, domain, StringComparison.OrdinalIgnoreCase))
                return;

            // Close the previous domain session
            CloseCurrent(now);

            // Open a new domain session (if any)
            if (domain is not null)
            {
                _currentDomain = domain;
                _currentDomainStart = now;

                _logger.LogDebug("DomainTracker: Switched to {Domain}", domain);
            }
        }
    }

    /// <summary>
    /// Returns a snapshot of accumulated time per domain.
    /// </summary>
    public Dictionary<string, TimeSpan> GetTimeSpentSnapshot()
    {
        lock (_lock)
        {
            // Include time for the domain currently being viewed
            var snapshot = new Dictionary<string, TimeSpan>(_domainTimeSpent, StringComparer.OrdinalIgnoreCase);

            if (_currentDomain is not null)
            {
                var elapsed = DateTime.UtcNow - _currentDomainStart;
                if (snapshot.TryGetValue(_currentDomain, out var existing))
                    snapshot[_currentDomain] = existing + elapsed;
                else
                    snapshot[_currentDomain] = elapsed;
            }

            return snapshot;
        }
    }

    /// <summary>
    /// Returns a snapshot of all individual domain visit entries.
    /// </summary>
    public List<DomainVisitEntry> GetVisitLogSnapshot()
    {
        lock (_lock)
        {
            var list = new List<DomainVisitEntry>(_visitLog);

            // Include the currently open visit (still in progress)
            if (_currentDomain is not null)
            {
                list.Add(new DomainVisitEntry
                {
                    Domain = _currentDomain,
                    StartTimeUtc = _currentDomainStart,
                    EndTimeUtc = DateTime.UtcNow,
                    Duration = DateTime.UtcNow - _currentDomainStart
                });
            }

            return list;
        }
    }

    /// <summary>
    /// Flushes the current domain session (call on stop).
    /// </summary>
    public void Flush()
    {
        lock (_lock)
        {
            CloseCurrent(DateTime.UtcNow);
        }
    }

    /// <summary>
    /// Resets all accumulated data for a new session.
    /// </summary>
    public void Reset()
    {
        lock (_lock)
        {
            CloseCurrent(DateTime.UtcNow);
            _domainTimeSpent.Clear();
            _visitLog.Clear();
        }
    }

    private void CloseCurrent(DateTime now)
    {
        if (_currentDomain is null)
            return;

        var elapsed = now - _currentDomainStart;

        // Accumulate total time
        if (_domainTimeSpent.TryGetValue(_currentDomain, out var existing))
            _domainTimeSpent[_currentDomain] = existing + elapsed;
        else
            _domainTimeSpent[_currentDomain] = elapsed;

        // Record individual visit
        _visitLog.Add(new DomainVisitEntry
        {
            Domain = _currentDomain,
            StartTimeUtc = _currentDomainStart,
            EndTimeUtc = now,
            Duration = elapsed
        });

        _logger.LogInformation(
            "DomainTracker: Closed session. Domain={Domain}, Duration={Duration}",
            _currentDomain, elapsed);

        _currentDomain = null;
    }
}

/// <summary>
/// A single timestamped visit to a domain.
/// </summary>
public sealed class DomainVisitEntry
{
    public string Domain { get; init; } = string.Empty;
    public DateTime StartTimeUtc { get; init; }
    public DateTime EndTimeUtc { get; init; }
    public TimeSpan Duration { get; init; }
}
