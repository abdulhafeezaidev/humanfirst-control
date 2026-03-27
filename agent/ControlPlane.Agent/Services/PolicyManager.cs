using ControlPlane.Agent.Models;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Manages local policy caching using SQLite.
/// Provides thread-safe access to cached policies with database persistence.
/// </summary>
public sealed class PolicyManager : IPolicyManager, IDisposable
{
    private const string DataDirectory = @"C:\ProgramData\ControlPlane";
    private const string DatabaseFileName = "policies.db";
    private static readonly string DatabasePath = Path.Combine(DataDirectory, DatabaseFileName);
    private static readonly string ConnectionString = $"Data Source={DatabasePath};Mode=ReadWriteCreate;Cache=Shared";

    private readonly ILogger<PolicyManager> _logger;
    private readonly object _policiesLock = new();
    private readonly JsonSerializerOptions _jsonOptions;

    private List<Policy> _policies = new();
    private bool _isInitialized;
    private bool _disposed;

    public int PolicyCount => _policies.Count;
    public bool IsInitialized => _isInitialized;

    public PolicyManager(ILogger<PolicyManager> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (_isInitialized)
        {
            _logger.LogWarning("PolicyManager already initialized");
            return;
        }

        _logger.LogInformation("Initializing PolicyManager. DatabasePath={DatabasePath}", DatabasePath);

        try
        {
            // Ensure data directory exists
            EnsureDataDirectoryExists();

            // Create or migrate database schema
            await CreateDatabaseSchemaAsync(cancellationToken);

            // Load existing policies from database
            await LoadPoliciesFromDatabaseAsync(cancellationToken);

            _isInitialized = true;

            _logger.LogInformation(
                "PolicyManager initialized successfully. LoadedPolicies={PolicyCount}",
                _policies.Count);

            // Log each loaded policy for debugging
            foreach (var policy in _policies)
            {
                LogPolicy(policy);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize PolicyManager");
            throw;
        }
    }

    public IReadOnlyList<Policy> GetAllPolicies()
    {
        ThrowIfNotInitialized();

        lock (_policiesLock)
        {
            return _policies.ToList().AsReadOnly();
        }
    }

    public IReadOnlyList<Policy> GetActivePolicies()
    {
        ThrowIfNotInitialized();

        var now = DateTime.UtcNow;

        lock (_policiesLock)
        {
            return _policies
                .Where(p => p.ShouldEnforce(now))
                .ToList()
                .AsReadOnly();
        }
    }

    public Policy? GetPolicyById(Guid id)
    {
        ThrowIfNotInitialized();

        lock (_policiesLock)
        {
            return _policies.FirstOrDefault(p => p.Id == id);
        }
    }

    public Policy? GetPolicyByName(string name)
    {
        ThrowIfNotInitialized();

        if (string.IsNullOrWhiteSpace(name))
            return null;

        lock (_policiesLock)
        {
            return _policies.FirstOrDefault(p =>
                string.Equals(p.PolicyName, name, StringComparison.OrdinalIgnoreCase));
        }
    }

    public async Task SavePolicyAsync(Policy policy, CancellationToken cancellationToken = default)
    {
        ThrowIfNotInitialized();

        if (policy == null)
            throw new ArgumentNullException(nameof(policy));

        policy.UpdatedAt = DateTime.UtcNow;

        _logger.LogDebug("Saving policy. PolicyId={PolicyId}, PolicyName={PolicyName}",
            policy.Id, policy.PolicyName);

        await using var connection = new SqliteConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await UpsertPolicyAsync(connection, policy, cancellationToken);

        // Update in-memory cache
        lock (_policiesLock)
        {
            var existingIndex = _policies.FindIndex(p => p.Id == policy.Id);
            if (existingIndex >= 0)
            {
                _policies[existingIndex] = policy;
            }
            else
            {
                _policies.Add(policy);
            }
        }

        _logger.LogInformation("Policy saved. PolicyId={PolicyId}, PolicyName={PolicyName}",
            policy.Id, policy.PolicyName);

        LogPolicy(policy);
    }

    public async Task SavePoliciesAsync(IEnumerable<Policy> policies, CancellationToken cancellationToken = default)
    {
        ThrowIfNotInitialized();

        var policyList = policies?.ToList() ?? throw new ArgumentNullException(nameof(policies));

        if (policyList.Count == 0)
            return;

        _logger.LogInformation("Saving {Count} policies", policyList.Count);

        await using var connection = new SqliteConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        try
        {
            foreach (var policy in policyList)
            {
                policy.UpdatedAt = DateTime.UtcNow;
                await UpsertPolicyAsync(connection, policy, cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);

            // Update in-memory cache
            lock (_policiesLock)
            {
                foreach (var policy in policyList)
                {
                    var existingIndex = _policies.FindIndex(p => p.Id == policy.Id);
                    if (existingIndex >= 0)
                    {
                        _policies[existingIndex] = policy;
                    }
                    else
                    {
                        _policies.Add(policy);
                    }
                }
            }

            _logger.LogInformation("Saved {Count} policies successfully", policyList.Count);

            foreach (var policy in policyList)
            {
                LogPolicy(policy);
            }
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task DeletePolicyAsync(Guid id, CancellationToken cancellationToken = default)
    {
        ThrowIfNotInitialized();

        _logger.LogInformation("Deleting policy. PolicyId={PolicyId}", id);

        await using var connection = new SqliteConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM policies WHERE id = @id";
        command.Parameters.AddWithValue("@id", id.ToString());

        var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);

        // Update in-memory cache
        lock (_policiesLock)
        {
            _policies.RemoveAll(p => p.Id == id);
        }

        _logger.LogInformation("Policy deleted. PolicyId={PolicyId}, RowsAffected={RowsAffected}",
            id, rowsAffected);
    }

    public async Task ReloadPoliciesAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfNotInitialized();

        _logger.LogInformation("Reloading policies from database");

        await LoadPoliciesFromDatabaseAsync(cancellationToken);

        _logger.LogInformation("Policies reloaded. PolicyCount={PolicyCount}", _policies.Count);
    }

    private void EnsureDataDirectoryExists()
    {
        if (!Directory.Exists(DataDirectory))
        {
            _logger.LogInformation("Creating data directory: {DataDirectory}", DataDirectory);
            Directory.CreateDirectory(DataDirectory);
        }
    }

    private async Task CreateDatabaseSchemaAsync(CancellationToken cancellationToken)
    {
        _logger.LogDebug("Creating/verifying database schema");

        await using var connection = new SqliteConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS policies (
                id TEXT PRIMARY KEY NOT NULL,
                policy_name TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                allowed_domains TEXT NOT NULL DEFAULT '[]',
                blocked_apps TEXT NOT NULL DEFAULT '[]',
                allowed_apps TEXT NOT NULL DEFAULT '[]',
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                exam_mode INTEGER NOT NULL DEFAULT 0,
                last_synced_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_policies_name ON policies(policy_name);
            CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(is_active);
        ";

        await command.ExecuteNonQueryAsync(cancellationToken);

        // Migration: Add allowed_apps column if it doesn't exist (for existing databases)
        await using var migrateCommand = connection.CreateCommand();
        migrateCommand.CommandText = @"
            SELECT COUNT(*) FROM pragma_table_info('policies') WHERE name='allowed_apps'
        ";
        var hasAllowedApps = Convert.ToInt32(await migrateCommand.ExecuteScalarAsync(cancellationToken));
        if (hasAllowedApps == 0)
        {
            _logger.LogInformation("Migrating database: adding allowed_apps column");
            await using var alterCommand = connection.CreateCommand();
            alterCommand.CommandText = "ALTER TABLE policies ADD COLUMN allowed_apps TEXT NOT NULL DEFAULT '[]'";
            await alterCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        _logger.LogDebug("Database schema ready");
    }

    private async Task LoadPoliciesFromDatabaseAsync(CancellationToken cancellationToken)
    {
        var loadedPolicies = new List<Policy>();

        await using var connection = new SqliteConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT id, policy_name, is_active, allowed_domains, blocked_apps, allowed_apps,
                   start_time, end_time, exam_mode, last_synced_at, created_at, updated_at
            FROM policies
            ORDER BY policy_name
        ";

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            try
            {
                var policy = new Policy
                {
                    Id = Guid.Parse(reader.GetString(0)),
                    PolicyName = reader.GetString(1),
                    IsActive = reader.GetInt32(2) == 1,
                    AllowedDomains = DeserializeList(reader.GetString(3)),
                    BlockedApps = DeserializeList(reader.GetString(4)),
                    AllowedApps = DeserializeList(reader.GetString(5)),
                    StartTime = DateTime.Parse(reader.GetString(6)),
                    EndTime = DateTime.Parse(reader.GetString(7)),
                    ExamMode = reader.GetInt32(8) == 1,
                    LastSyncedAt = DateTime.Parse(reader.GetString(9)),
                    CreatedAt = DateTime.Parse(reader.GetString(10)),
                    UpdatedAt = DateTime.Parse(reader.GetString(11))
                };

                loadedPolicies.Add(policy);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse policy row, skipping");
            }
        }

        lock (_policiesLock)
        {
            _policies = loadedPolicies;
        }

        _logger.LogDebug("Loaded {Count} policies from database", loadedPolicies.Count);
    }

    private async Task UpsertPolicyAsync(SqliteConnection connection, Policy policy, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO policies (
                id, policy_name, is_active, allowed_domains, blocked_apps, allowed_apps,
                start_time, end_time, exam_mode, last_synced_at, created_at, updated_at
            ) VALUES (
                @id, @policy_name, @is_active, @allowed_domains, @blocked_apps, @allowed_apps,
                @start_time, @end_time, @exam_mode, @last_synced_at, @created_at, @updated_at
            )
            ON CONFLICT(id) DO UPDATE SET
                policy_name = excluded.policy_name,
                is_active = excluded.is_active,
                allowed_domains = excluded.allowed_domains,
                blocked_apps = excluded.blocked_apps,
                allowed_apps = excluded.allowed_apps,
                start_time = excluded.start_time,
                end_time = excluded.end_time,
                exam_mode = excluded.exam_mode,
                last_synced_at = excluded.last_synced_at,
                updated_at = excluded.updated_at
        ";

        command.Parameters.AddWithValue("@id", policy.Id.ToString());
        command.Parameters.AddWithValue("@policy_name", policy.PolicyName);
        command.Parameters.AddWithValue("@is_active", policy.IsActive ? 1 : 0);
        command.Parameters.AddWithValue("@allowed_domains", SerializeList(policy.AllowedDomains));
        command.Parameters.AddWithValue("@blocked_apps", SerializeList(policy.BlockedApps));
        command.Parameters.AddWithValue("@allowed_apps", SerializeList(policy.AllowedApps));
        command.Parameters.AddWithValue("@start_time", policy.StartTime.ToString("O"));
        command.Parameters.AddWithValue("@end_time", policy.EndTime.ToString("O"));
        command.Parameters.AddWithValue("@exam_mode", policy.ExamMode ? 1 : 0);
        command.Parameters.AddWithValue("@last_synced_at", policy.LastSyncedAt.ToString("O"));
        command.Parameters.AddWithValue("@created_at", policy.CreatedAt.ToString("O"));
        command.Parameters.AddWithValue("@updated_at", policy.UpdatedAt.ToString("O"));

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private string SerializeList(List<string> list)
    {
        return JsonSerializer.Serialize(list, _jsonOptions);
    }

    private List<string> DeserializeList(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, _jsonOptions) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private void LogPolicy(Policy policy)
    {
        _logger.LogInformation(
            "Policy: {PolicyName} | Id={PolicyId}, Active={IsActive}, ExamMode={ExamMode}, " +
            "AllowedDomains={AllowedDomainsCount}, BlockedApps={BlockedAppsCount}, AllowedApps={AllowedAppsCount}, " +
            "Schedule={StartTime} to {EndTime}",
            policy.PolicyName,
            policy.Id,
            policy.IsActive,
            policy.ExamMode,
            policy.AllowedDomains.Count,
            policy.BlockedApps.Count,
            policy.AllowedApps.Count,
            policy.StartTime.ToString("u"),
            policy.EndTime.ToString("u"));
    }

    private void ThrowIfNotInitialized()
    {
        if (!_isInitialized)
        {
            throw new InvalidOperationException("PolicyManager has not been initialized. Call InitializeAsync first.");
        }
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _logger.LogDebug("PolicyManager disposed");
    }
}
