using ControlPlane.Agent.Models;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Interface for managing local policy cache.
/// </summary>
public interface IPolicyManager
{
    /// <summary>
    /// Initializes the policy database and loads cached policies.
    /// </summary>
    Task InitializeAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all cached policies.
    /// </summary>
    IReadOnlyList<Policy> GetAllPolicies();

    /// <summary>
    /// Gets all active policies that should currently be enforced.
    /// </summary>
    IReadOnlyList<Policy> GetActivePolicies();

    /// <summary>
    /// Gets a specific policy by ID.
    /// </summary>
    Policy? GetPolicyById(Guid id);

    /// <summary>
    /// Gets a specific policy by name.
    /// </summary>
    Policy? GetPolicyByName(string name);

    /// <summary>
    /// Saves a policy to the local cache.
    /// </summary>
    Task SavePolicyAsync(Policy policy, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves multiple policies to the local cache (batch operation).
    /// </summary>
    Task SavePoliciesAsync(IEnumerable<Policy> policies, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a policy from the local cache.
    /// </summary>
    Task DeletePolicyAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reloads all policies from the database.
    /// </summary>
    Task ReloadPoliciesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the count of cached policies.
    /// </summary>
    int PolicyCount { get; }

    /// <summary>
    /// Gets whether the policy manager has been initialized.
    /// </summary>
    bool IsInitialized { get; }
}
