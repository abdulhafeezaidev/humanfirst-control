using ControlPlane.Agent.Models;
using Microsoft.Extensions.Logging;
using System.IO.Pipes;
using System.Reflection;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.Json;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Named Pipe server for local IPC communication with the Electron UI and other clients.
/// Handles commands: status, reload, ping, and general messages.
/// </summary>
public sealed class NamedPipeServer : INamedPipeServer, IDisposable
{
    private const string PipeName = "ControlPlaneAgentPipe";
    private const int MaxConcurrentConnections = 10;
    private const int BufferSize = 8192;

    private readonly ILogger<NamedPipeServer> _logger;
    private readonly IPolicyManager _policyManager;
    private readonly IEnforcementEngine _enforcementEngine;
    private readonly CancellationTokenSource _shutdownCts;
    private readonly SemaphoreSlim _connectionSemaphore;
    private readonly List<Task> _activeConnections;
    private readonly object _connectionLock = new();
    private readonly JsonSerializerOptions _jsonOptions;

    private Task? _listenerTask;
    private volatile bool _isRunning;
    private volatile int _activeConnectionCount;
    private DateTime _startedAt;
    private DateTime _lastPolicyLoadTime;

    public bool IsRunning => _isRunning;
    public int ActiveConnectionCount => _activeConnectionCount;

    public NamedPipeServer(ILogger<NamedPipeServer> logger, IPolicyManager policyManager, IEnforcementEngine enforcementEngine)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _policyManager = policyManager ?? throw new ArgumentNullException(nameof(policyManager));
        _enforcementEngine = enforcementEngine ?? throw new ArgumentNullException(nameof(enforcementEngine));
        _shutdownCts = new CancellationTokenSource();
        _connectionSemaphore = new SemaphoreSlim(MaxConcurrentConnections, MaxConcurrentConnections);
        _activeConnections = new List<Task>();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (_isRunning)
        {
            _logger.LogWarning("NamedPipeServer is already running");
            return Task.CompletedTask;
        }

        _startedAt = DateTime.UtcNow;
        _lastPolicyLoadTime = DateTime.UtcNow;

        _logger.LogInformation(
            "NamedPipeServer starting. PipeName={PipeName}, MaxConnections={MaxConnections}",
            PipeName,
            MaxConcurrentConnections);

        _isRunning = true;

        // Start the listener loop in a background task
        _listenerTask = Task.Run(() => ListenerLoopAsync(_shutdownCts.Token), cancellationToken);

        _logger.LogInformation("NamedPipeServer started successfully");

        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (!_isRunning)
        {
            return;
        }

        _logger.LogInformation("NamedPipeServer stopping");

        _isRunning = false;

        // Signal shutdown
        try
        {
            await _shutdownCts.CancelAsync();
        }
        catch (ObjectDisposedException)
        {
            // Already disposed
        }

        // Wait for listener to complete
        if (_listenerTask != null)
        {
            try
            {
                await _listenerTask.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken);
            }
            catch (TimeoutException)
            {
                _logger.LogWarning("NamedPipeServer listener did not stop within timeout");
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
        }

        // Wait for active connections to complete
        Task[] connectionsSnapshot;
        lock (_connectionLock)
        {
            connectionsSnapshot = _activeConnections.ToArray();
        }

        if (connectionsSnapshot.Length > 0)
        {
            _logger.LogInformation(
                "Waiting for {Count} active connections to close",
                connectionsSnapshot.Length);

            try
            {
                await Task.WhenAll(connectionsSnapshot).WaitAsync(TimeSpan.FromSeconds(5), cancellationToken);
            }
            catch (TimeoutException)
            {
                _logger.LogWarning("Some connections did not close within timeout");
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
        }

        _logger.LogInformation("NamedPipeServer stopped");
    }

    private async Task ListenerLoopAsync(CancellationToken cancellationToken)
    {
        _logger.LogDebug("NamedPipeServer listener loop started");

        while (!cancellationToken.IsCancellationRequested && _isRunning)
        {
            NamedPipeServerStream? pipeServer = null;

            try
            {
                // Wait for connection slot
                await _connectionSemaphore.WaitAsync(cancellationToken);

                // Create pipe server with security settings
                pipeServer = CreateSecurePipeServer();

                _logger.LogDebug("Waiting for client connection on pipe {PipeName}", PipeName);

                // Wait for a client to connect
                await pipeServer.WaitForConnectionAsync(cancellationToken);

                var clientId = GetClientIdentifier(pipeServer);
                _logger.LogInformation(
                    "Client connected to pipe. ClientId={ClientId}, ActiveConnections={ActiveConnections}",
                    clientId,
                    Interlocked.Increment(ref _activeConnectionCount));

                // Handle the connection in a background task
                var connectionTask = HandleConnectionAsync(pipeServer, clientId, cancellationToken);

                lock (_connectionLock)
                {
                    _activeConnections.Add(connectionTask);
                }

                // Clean up completed connections
                CleanupCompletedConnections();
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                _logger.LogDebug("Listener loop cancelled");
                pipeServer?.Dispose();
                _connectionSemaphore.Release();
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in listener loop");
                pipeServer?.Dispose();
                _connectionSemaphore.Release();

                // Brief delay before retrying
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        _logger.LogDebug("NamedPipeServer listener loop exited");
    }

    private NamedPipeServerStream CreateSecurePipeServer()
    {
        var pipeSecurity = new PipeSecurity();

        // Allow authenticated users to read/write
        pipeSecurity.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.AuthenticatedUserSid, null),
            PipeAccessRights.ReadWrite,
            AccessControlType.Allow));

        // Allow SYSTEM full control
        pipeSecurity.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
            PipeAccessRights.FullControl,
            AccessControlType.Allow));

        // Allow Administrators full control
        pipeSecurity.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null),
            PipeAccessRights.FullControl,
            AccessControlType.Allow));

        return NamedPipeServerStreamAcl.Create(
            pipeName: PipeName,
            direction: PipeDirection.InOut,
            maxNumberOfServerInstances: MaxConcurrentConnections,
            transmissionMode: PipeTransmissionMode.Byte,
            options: PipeOptions.Asynchronous | PipeOptions.WriteThrough,
            inBufferSize: BufferSize,
            outBufferSize: BufferSize,
            pipeSecurity: pipeSecurity);
    }

    private async Task HandleConnectionAsync(NamedPipeServerStream pipeServer, string clientId, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Handling connection from client {ClientId}", clientId);

            var utf8NoBom = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
            using var reader = new StreamReader(pipeServer, utf8NoBom, leaveOpen: true);
            using var writer = new StreamWriter(pipeServer, utf8NoBom, leaveOpen: true) { AutoFlush = true };

            while (pipeServer.IsConnected && !cancellationToken.IsCancellationRequested)
            {
                try
                {
                    // Read message (one line = one message)
                    var message = await reader.ReadLineAsync(cancellationToken);

                    if (string.IsNullOrEmpty(message))
                    {
                        _logger.LogDebug("Client {ClientId} disconnected (empty message)", clientId);
                        break;
                    }

                    _logger.LogDebug("Received message from {ClientId}: {Message}", clientId, message);

                    // Process the message and get response
                    var response = await ProcessMessageAsync(message, clientId, cancellationToken);

                    // Send response as JSON
                    var responseJson = JsonSerializer.Serialize(response, _jsonOptions);
                    await writer.WriteLineAsync(responseJson);

                    _logger.LogDebug("Sent response to {ClientId}: {Response}", clientId, responseJson);
                }
                catch (IOException ex) when (ex.Message.Contains("pipe has been ended") || ex.Message.Contains("broken"))
                {
                    _logger.LogDebug("Client {ClientId} closed the pipe", clientId);
                    break;
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            _logger.LogDebug("Connection to client {ClientId} cancelled", clientId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling connection from client {ClientId}", clientId);
        }
        finally
        {
            Interlocked.Decrement(ref _activeConnectionCount);
            _connectionSemaphore.Release();

            try
            {
                if (pipeServer.IsConnected)
                {
                    pipeServer.Disconnect();
                }
            }
            catch
            {
                // Ignore disconnect errors
            }

            pipeServer.Dispose();

            _logger.LogDebug("Connection to client {ClientId} closed. ActiveConnections={ActiveConnections}",
                clientId,
                _activeConnectionCount);
        }
    }

    private async Task<IpcResponse> ProcessMessageAsync(string message, string clientId, CancellationToken cancellationToken)
    {
        // Try to parse as JSON first
        IpcRequest? request = null;
        string command;
        string? requestId = null;

        try
        {
            request = JsonSerializer.Deserialize<IpcRequest>(message, _jsonOptions);
            command = request?.Command?.ToLowerInvariant()?.Trim() ?? message.ToLowerInvariant().Trim();
            requestId = request?.RequestId;
        }
        catch
        {
            // Not JSON, treat the whole message as the command
            command = message.ToLowerInvariant().Trim();
        }

        _logger.LogInformation("Processing command: {Command} from client {ClientId}", command, clientId);

        try
        {
            return command switch
            {
                "status" => await HandleStatusCommandAsync(requestId, cancellationToken),
                "reload" => await HandleReloadCommandAsync(requestId, cancellationToken),
                "push_policies" => await HandlePushPoliciesCommandAsync(request?.Payload, requestId, cancellationToken),
                "start_session" => HandleStartSessionCommand(request?.Payload, requestId),
                "end_session" => HandleEndSessionCommand(request?.Payload, requestId),
                "ping" => IpcResponse.Ok("pong", null, requestId),
                _ => HandleUnknownCommand(command, requestId)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing command: {Command}", command);
            return IpcResponse.Error($"Error processing command: {ex.Message}", requestId);
        }
    }

    private Task<IpcResponse> HandleStatusCommandAsync(string? requestId, CancellationToken cancellationToken)
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
        var uptime = DateTime.UtcNow - _startedAt;

        var policies = _policyManager.GetAllPolicies();
        var activePolicies = _policyManager.GetActivePolicies();

        var statusData = new AgentStatusData
        {
            Version = version,
            MachineName = Environment.MachineName,
            ServiceStatus = "Running",
            Uptime = $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s",
            StartedAt = _startedAt,
            PolicyCount = policies.Count,
            ActivePolicyCount = activePolicies.Count,
            LastPolicyLoadTime = _lastPolicyLoadTime,
            NamedPipeConnections = _activeConnectionCount
        };

        _logger.LogInformation(
            "Status requested. Version={Version}, Uptime={Uptime}, PolicyCount={PolicyCount}, ActivePolicies={ActivePolicies}",
            statusData.Version,
            statusData.Uptime,
            statusData.PolicyCount,
            statusData.ActivePolicyCount);

        return Task.FromResult(IpcResponse.Ok("Agent status retrieved", statusData, requestId));
    }

    private async Task<IpcResponse> HandleReloadCommandAsync(string? requestId, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Reload command received. Reloading policies from SQLite cache...");

        await _policyManager.ReloadPoliciesAsync(cancellationToken);

        _lastPolicyLoadTime = DateTime.UtcNow;

        var policies = _policyManager.GetAllPolicies();

        _logger.LogInformation("Policies reloaded. PolicyCount={PolicyCount}", policies.Count);

        // Log each policy
        foreach (var policy in policies)
        {
            _logger.LogInformation(
                "Policy loaded: {PolicyName} | Id={PolicyId}, Active={IsActive}, ExamMode={ExamMode}, " +
                "AllowedDomains={AllowedDomainsCount}, BlockedApps={BlockedAppsCount}",
                policy.PolicyName,
                policy.Id,
                policy.IsActive,
                policy.ExamMode,
                policy.AllowedDomains.Count,
                policy.BlockedApps.Count);
        }

        var reloadData = new
        {
            policyCount = policies.Count,
            activePolicyCount = _policyManager.GetActivePolicies().Count,
            reloadedAt = _lastPolicyLoadTime,
            policies = policies.Select(p => new
            {
                id = p.Id,
                name = p.PolicyName,
                isActive = p.IsActive,
                examMode = p.ExamMode
            }).ToList()
        };

        return IpcResponse.Ok($"Reloaded {policies.Count} policies", reloadData, requestId);
    }

    private IpcResponse HandleUnknownCommand(string command, string? requestId)
    {
        _logger.LogInformation("Unknown command received: {Command}. Sending ACK.", command);
        return IpcResponse.Ok("ACK", new { receivedCommand = command }, requestId);
    }

    private IpcResponse HandleStartSessionCommand(JsonElement? payload, string requestId)
    {
        try
        {
            if (payload == null)
            {
                return IpcResponse.Error("No payload provided for start_session", requestId);
            }

            var session = JsonSerializer.Deserialize<EnforcementSession>(payload.Value.GetRawText());
            if (session == null)
            {
                return IpcResponse.Error("Failed to deserialize EnforcementSession", requestId);
            }

            _enforcementEngine.StartEnforcementSession(session);
            _logger.LogInformation("Started enforcement session for policy {PolicyId}", session.PolicyId);
            return IpcResponse.Ok("Session started", null, requestId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting enforcement session");
            return IpcResponse.Error($"Error starting session: {ex.Message}", requestId);
        }
    }

    private IpcResponse HandleEndSessionCommand(JsonElement? payload, string requestId)
    {
        try
        {
            if (payload == null)
            {
                return IpcResponse.Error("No payload provided for end_session", requestId);
            }

            // Extract policy_id from payload
            string policyId = "";
            if (payload.Value.TryGetProperty("policy_id", out var policyIdElement))
            {
                policyId = policyIdElement.GetString() ?? "";
            }

            if (string.IsNullOrEmpty(policyId))
            {
                return IpcResponse.Error("policy_id is required for end_session", requestId);
            }

            _enforcementEngine.EndEnforcementSession(policyId);
            _logger.LogInformation("Ended enforcement session for policy {PolicyId}", policyId);
            return IpcResponse.Ok("Session ended", null, requestId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ending enforcement session");
            return IpcResponse.Error($"Error ending session: {ex.Message}", requestId);
        }
    }

    private async Task<IpcResponse> HandlePushPoliciesCommandAsync(string? payload, string? requestId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return IpcResponse.Error("push_policies requires a JSON payload with a 'policies' array", requestId);
        }

        _logger.LogInformation("push_policies command received. Parsing policies from Electron...");

        try
        {
            var pushData = JsonSerializer.Deserialize<PushPoliciesPayload>(payload, _jsonOptions);
            if (pushData?.Policies == null || pushData.Policies.Count == 0)
            {
                return IpcResponse.Error("No policies found in payload", requestId);
            }

            var agentPolicies = new List<Policy>();
            foreach (var p in pushData.Policies)
            {
                var policy = new Policy
                {
                    Id = Guid.TryParse(p.Id, out var gid) ? gid : Guid.NewGuid(),
                    PolicyName = p.Title ?? "Untitled Policy",
                    IsActive = p.IsActive,
                    ExamMode = p.ExamMode,
                    StartTime = DateTime.TryParse(p.StartTime, out var st) ? st.ToUniversalTime() : DateTime.MinValue,
                    EndTime = DateTime.TryParse(p.EndTime, out var et) ? et.ToUniversalTime() : DateTime.MaxValue,
                    AllowedApps = p.AllowedApps ?? new List<string>(),
                    BlockedApps = p.BlockedApps ?? new List<string>(),
                    AllowedDomains = p.AllowedDomains ?? new List<string>(),
                    LastSyncedAt = DateTime.UtcNow,
                };
                agentPolicies.Add(policy);
            }

            await _policyManager.SavePoliciesAsync(agentPolicies, cancellationToken);
            _lastPolicyLoadTime = DateTime.UtcNow;

            // Trigger immediate enforcement with new policies
            try
            {
                await _enforcementEngine.EnforceNowAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Immediate enforcement after push_policies failed (non-fatal)");
            }

            _logger.LogInformation("push_policies complete. Saved {Count} policies, enforcement triggered.",
                agentPolicies.Count);

            return IpcResponse.Ok($"Saved {agentPolicies.Count} policies", new
            {
                savedCount = agentPolicies.Count,
                syncedAt = _lastPolicyLoadTime,
                policies = agentPolicies.Select(p => new { id = p.Id, name = p.PolicyName, isActive = p.IsActive }).ToList()
            }, requestId);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse push_policies payload");
            return IpcResponse.Error($"Invalid JSON payload: {ex.Message}", requestId);
        }
    }

    private static string GetClientIdentifier(NamedPipeServerStream pipeServer)
    {
        try
        {
            return pipeServer.GetImpersonationUserName() ?? $"client-{Guid.NewGuid():N}";
        }
        catch
        {
            return $"client-{Guid.NewGuid():N}";
        }
    }

    private void CleanupCompletedConnections()
    {
        lock (_connectionLock)
        {
            _activeConnections.RemoveAll(t => t.IsCompleted);
        }
    }

    public void Dispose()
    {
        _shutdownCts.Cancel();
        _shutdownCts.Dispose();
        _connectionSemaphore.Dispose();

        _logger.LogDebug("NamedPipeServer disposed");
    }
}
