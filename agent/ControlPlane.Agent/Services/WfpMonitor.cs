using ControlPlane.Agent.Services.Wfp;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Monitors outbound network connections using Windows Filtering Platform (WFP).
/// Currently only logs connections - does NOT block traffic.
/// Requires Administrator privileges to run.
/// </summary>
public sealed class WfpMonitor : IWfpMonitor, IDisposable
{
    private const uint RPC_C_AUTHN_WINNT = 10;
    private const int ProcessCacheTimeoutSeconds = 60;

    private readonly ILogger<WfpMonitor> _logger;
    private readonly ConcurrentDictionary<int, CachedProcessInfo> _processCache = new();

    private IntPtr _engineHandle = IntPtr.Zero;
    private IntPtr _subscriptionHandle = IntPtr.Zero;

    // IMPORTANT: Keep delegate reference alive to prevent GC collection
    private WfpNativeMethods.FWPM_NET_EVENT_CALLBACK0? _callbackDelegate;

    private bool _isRunning;
    private bool _disposed;
    private readonly object _syncLock = new();

    public bool IsRunning => _isRunning;

    public WfpMonitor(ILogger<WfpMonitor> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task StartAsync(CancellationToken cancellationToken = default)
    {
        lock (_syncLock)
        {
            if (_isRunning)
            {
                _logger.LogWarning("WfpMonitor already running");
                return Task.CompletedTask;
            }

            _logger.LogInformation("WfpMonitor starting - opening WFP engine session");

            try
            {
                // Open WFP engine session
                var result = WfpNativeMethods.FwpmEngineOpen0(
                    null,
                    RPC_C_AUTHN_WINNT,
                    IntPtr.Zero,
                    IntPtr.Zero,
                    out _engineHandle);

                if (result != WfpNativeMethods.ERROR_SUCCESS)
                {
                    _logger.LogError("Failed to open WFP engine. ErrorCode={ErrorCode}", result);
                    throw new InvalidOperationException($"FwpmEngineOpen0 failed with error code {result}");
                }

                _logger.LogDebug("WFP engine opened successfully. Handle={Handle}", _engineHandle);

                // Subscribe to network events
                SubscribeToNetworkEvents();

                _isRunning = true;
                _logger.LogInformation("WfpMonitor started successfully - monitoring outbound connections");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start WfpMonitor");
                CleanupResources();
                throw;
            }
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken = default)
    {
        lock (_syncLock)
        {
            if (!_isRunning)
            {
                return Task.CompletedTask;
            }

            _logger.LogInformation("WfpMonitor stopping");

            CleanupResources();

            _isRunning = false;
            _logger.LogInformation("WfpMonitor stopped");
        }

        return Task.CompletedTask;
    }

    private void SubscribeToNetworkEvents()
    {
        // Create callback delegate and keep reference to prevent GC
        _callbackDelegate = new WfpNativeMethods.FWPM_NET_EVENT_CALLBACK0(OnNetworkEvent);

        // Create subscription with no filter (receive all events)
        var subscription = new WfpNativeMethods.FWPM_NET_EVENT_SUBSCRIPTION0
        {
            enumTemplate = IntPtr.Zero, // No filter - receive all events
            flags = 0,
            sessionKey = Guid.Empty
        };

        var result = WfpNativeMethods.FwpmNetEventSubscribe0(
            _engineHandle,
            ref subscription,
            _callbackDelegate,
            IntPtr.Zero,
            out _subscriptionHandle);

        if (result != WfpNativeMethods.ERROR_SUCCESS)
        {
            _logger.LogError("Failed to subscribe to network events. ErrorCode={ErrorCode}", result);
            throw new InvalidOperationException($"FwpmNetEventSubscribe0 failed with error code {result}");
        }

        _logger.LogDebug("Subscribed to WFP network events. SubscriptionHandle={Handle}", _subscriptionHandle);
    }

    /// <summary>
    /// Callback invoked by WFP when a network event occurs.
    /// </summary>
    private void OnNetworkEvent(IntPtr context, IntPtr netEventPtr)
    {
        if (netEventPtr == IntPtr.Zero)
        {
            return;
        }

        try
        {
            // Marshal the event structure
            var netEvent = Marshal.PtrToStructure<WfpNativeMethods.FWPM_NET_EVENT0>(netEventPtr);
            
            // Only log TCP/UDP outbound connections
            if (netEvent.header.ipProtocol != 6 && netEvent.header.ipProtocol != 17)
            {
                return;
            }

            // Skip internal/loopback traffic
            if (netEvent.header.remoteAddrV4 == 0 || netEvent.header.remoteAddrV4 == 0x0100007F) // 127.0.0.1
            {
                return;
            }

            // Skip multicast (224.0.0.0 - 239.255.255.255)
            byte firstOctet = (byte)(netEvent.header.remoteAddrV4 & 0xFF);
            if (firstOctet >= 224 && firstOctet <= 239)
            {
                return;
            }

            // Extract connection details
            var timestamp = netEvent.header.timeStamp.ToDateTime();
            var destIp = WfpNativeMethods.IPv4ToString(netEvent.header.remoteAddrV4);
            var destPort = ReverseBytes(netEvent.header.remotePort);
            var localPort = ReverseBytes(netEvent.header.localPort);
            var protocol = WfpNativeMethods.GetProtocolName(netEvent.header.ipProtocol);
            var eventType = netEvent.type.ToString();

            // Get process info from app ID if available
            var processInfo = GetProcessInfoFromAppId(netEvent.header.appId);

            // Log the connection (monitoring only - NOT blocking)
            _logger.LogInformation(
                "OutboundConnection: Timestamp={Timestamp}, ProcessName={ProcessName}, PID={ProcessId}, " +
                "Protocol={Protocol}, DestIP={DestIP}, DestPort={DestPort}, LocalPort={LocalPort}, EventType={EventType}",
                timestamp.ToString("yyyy-MM-dd HH:mm:ss.fff"),
                processInfo.ProcessName,
                processInfo.ProcessId,
                protocol,
                destIp,
                destPort,
                localPort,
                eventType);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error processing network event");
        }
    }

    /// <summary>
    /// Extracts process information from the WFP app ID blob.
    /// </summary>
    private (string ProcessName, int ProcessId) GetProcessInfoFromAppId(WfpNativeMethods.FWP_BYTE_BLOB appId)
    {
        if (appId.data == IntPtr.Zero || appId.size == 0)
        {
            return ("Unknown", 0);
        }

        try
        {
            // App ID is the full path as a wide string (with device path prefix)
            // e.g., \device\harddiskvolume3\windows\system32\svchost.exe
            var pathBytes = new byte[appId.size];
            Marshal.Copy(appId.data, pathBytes, 0, (int)appId.size);
            var appPath = System.Text.Encoding.Unicode.GetString(pathBytes).TrimEnd('\0');

            // Extract just the executable name
            var processName = Path.GetFileNameWithoutExtension(appPath);
            if (string.IsNullOrEmpty(processName))
            {
                processName = appPath;
            }

            // Try to find the process ID by matching the executable name
            var processId = FindProcessIdByName(processName);

            return (processName, processId);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to extract process info from app ID");
            return ("Unknown", 0);
        }
    }

    /// <summary>
    /// Attempts to find a process ID by executable name.
    /// Uses a cache to reduce Process.GetProcesses() calls.
    /// </summary>
    private int FindProcessIdByName(string processName)
    {
        // Check cache first
        var now = DateTime.UtcNow;
        foreach (var kvp in _processCache)
        {
            if (string.Equals(kvp.Value.Name, processName, StringComparison.OrdinalIgnoreCase) &&
                (now - kvp.Value.CachedAt).TotalSeconds < ProcessCacheTimeoutSeconds)
            {
                return kvp.Key;
            }
        }

        // Refresh cache
        try
        {
            var processes = Process.GetProcessesByName(processName);
            if (processes.Length > 0)
            {
                var process = processes[0];
                var pid = process.Id;

                _processCache[pid] = new CachedProcessInfo
                {
                    Name = processName,
                    CachedAt = now
                };

                foreach (var p in processes)
                {
                    p.Dispose();
                }

                return pid;
            }
        }
        catch
        {
            // Ignore - process may have exited
        }

        return 0;
    }

    /// <summary>
    /// Reverses bytes for port numbers (network to host byte order).
    /// </summary>
    private static ushort ReverseBytes(ushort value)
    {
        return (ushort)((value >> 8) | (value << 8));
    }

    private void CleanupResources()
    {
        try
        {
            // Unsubscribe from events
            if (_subscriptionHandle != IntPtr.Zero && _engineHandle != IntPtr.Zero)
            {
                _logger.LogDebug("Unsubscribing from WFP network events");
                WfpNativeMethods.FwpmNetEventUnsubscribe0(_engineHandle, _subscriptionHandle);
                _subscriptionHandle = IntPtr.Zero;
            }

            // Close engine
            if (_engineHandle != IntPtr.Zero)
            {
                _logger.LogDebug("Closing WFP engine");
                WfpNativeMethods.FwpmEngineClose0(_engineHandle);
                _engineHandle = IntPtr.Zero;
            }

            _callbackDelegate = null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during WFP cleanup");
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        CleanupResources();
        _disposed = true;

        _logger.LogDebug("WfpMonitor disposed");
    }

    private class CachedProcessInfo
    {
        public string Name { get; set; } = string.Empty;
        public DateTime CachedAt { get; set; }
    }
}
