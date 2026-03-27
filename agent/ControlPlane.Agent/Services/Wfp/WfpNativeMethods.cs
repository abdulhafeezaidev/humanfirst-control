using System.Runtime.InteropServices;

namespace ControlPlane.Agent.Services.Wfp;

/// <summary>
/// P/Invoke definitions for Windows Filtering Platform (WFP) APIs.
/// Used for monitoring outbound network connections.
/// </summary>
internal static class WfpNativeMethods
{
    private const string FwpuclntDll = "fwpuclnt.dll";

    #region Error Codes

    public const uint ERROR_SUCCESS = 0;
    public const uint FWP_E_ALREADY_EXISTS = 0x80320009;
    public const uint ERROR_INVALID_PARAMETER = 87;

    #endregion

    #region GUIDs

    /// <summary>
    /// FWPM_LAYER_OUTBOUND_IPPACKET_V4
    /// </summary>
    public static readonly Guid FWPM_LAYER_OUTBOUND_IPPACKET_V4 = 
        new("1e5c9fae-8a84-4135-a331-950b54229ecd");

    /// <summary>
    /// FWPM_LAYER_OUTBOUND_TRANSPORT_V4
    /// </summary>
    public static readonly Guid FWPM_LAYER_OUTBOUND_TRANSPORT_V4 = 
        new("09e61aea-d214-46e2-9b21-b26b0b2f28c8");

    /// <summary>
    /// FWPM_LAYER_ALE_AUTH_CONNECT_V4
    /// </summary>
    public static readonly Guid FWPM_LAYER_ALE_AUTH_CONNECT_V4 = 
        new("c38d57d1-05a7-4c33-904f-7fbceee60e82");

    #endregion

    #region Enums

    /// <summary>
    /// Types of network events that can be monitored.
    /// </summary>
    public enum FWPM_NET_EVENT_TYPE : uint
    {
        FWPM_NET_EVENT_TYPE_IKEEXT_MM_FAILURE = 0,
        FWPM_NET_EVENT_TYPE_IKEEXT_QM_FAILURE = 1,
        FWPM_NET_EVENT_TYPE_IKEEXT_EM_FAILURE = 2,
        FWPM_NET_EVENT_TYPE_CLASSIFY_DROP = 3,
        FWPM_NET_EVENT_TYPE_IPSEC_KERNEL_DROP = 4,
        FWPM_NET_EVENT_TYPE_IPSEC_DOSP_DROP = 5,
        FWPM_NET_EVENT_TYPE_CLASSIFY_ALLOW = 6,
        FWPM_NET_EVENT_TYPE_CAPABILITY_DROP = 7,
        FWPM_NET_EVENT_TYPE_CAPABILITY_ALLOW = 8,
        FWPM_NET_EVENT_TYPE_CLASSIFY_DROP_MAC = 9,
        FWPM_NET_EVENT_TYPE_LPM_PACKET_ARRIVAL = 10,
        FWPM_NET_EVENT_TYPE_MAX = 11
    }

    /// <summary>
    /// IP protocol types.
    /// </summary>
    public enum IPPROTO : byte
    {
        IPPROTO_TCP = 6,
        IPPROTO_UDP = 17
    }

    /// <summary>
    /// Address family.
    /// </summary>
    public enum FWP_AF : ushort
    {
        FWP_AF_INET = 0,  // IPv4
        FWP_AF_INET6 = 1  // IPv6
    }

    #endregion

    #region Structures

    /// <summary>
    /// Represents an IPv4 or IPv6 address.
    /// </summary>
    [StructLayout(LayoutKind.Explicit)]
    public struct FWP_IP_ADDRESS
    {
        [FieldOffset(0)]
        public uint ipv4;

        [FieldOffset(0)]
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 16)]
        public byte[] ipv6;
    }

    /// <summary>
    /// Header information for a network event.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT_HEADER0
    {
        public FILETIME timeStamp;
        public uint flags;
        public FWP_AF ipVersion;
        public byte ipProtocol;
        public uint localAddrV4;
        public uint remoteAddrV4;
        public ushort localPort;
        public ushort remotePort;
        public uint scopeId;
        public FWP_BYTE_BLOB appId;
        public IntPtr userId;
    }

    /// <summary>
    /// Extended header for network events (version 1).
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT_HEADER1
    {
        public FILETIME timeStamp;
        public uint flags;
        public FWP_AF ipVersion;
        public byte ipProtocol;
        public uint localAddrV4;
        public uint remoteAddrV4;
        public ushort localPort;
        public ushort remotePort;
        public uint scopeId;
        public FWP_BYTE_BLOB appId;
        public IntPtr userId;
        public FWP_AF addressFamily;
        public IntPtr packageSid;
    }

    /// <summary>
    /// Extended header for network events (version 2).
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT_HEADER2
    {
        public FILETIME timeStamp;
        public uint flags;
        public FWP_AF ipVersion;
        public byte ipProtocol;
        public uint localAddrV4;
        public uint remoteAddrV4;
        public ushort localPort;
        public ushort remotePort;
        public uint scopeId;
        public FWP_BYTE_BLOB appId;
        public IntPtr userId;
        public FWP_AF addressFamily;
        public IntPtr packageSid;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string enterpriseId;
        public ulong policyFlags;
        public FWP_BYTE_BLOB effectiveName;
    }

    /// <summary>
    /// FILETIME structure for timestamps.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FILETIME
    {
        public uint dwLowDateTime;
        public uint dwHighDateTime;

        public DateTime ToDateTime()
        {
            long fileTime = ((long)dwHighDateTime << 32) | dwLowDateTime;
            return DateTime.FromFileTimeUtc(fileTime);
        }
    }

    /// <summary>
    /// Byte blob for variable-length data.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWP_BYTE_BLOB
    {
        public uint size;
        public IntPtr data;
    }

    /// <summary>
    /// Network event structure (version 0).
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT0
    {
        public FWPM_NET_EVENT_HEADER0 header;
        public FWPM_NET_EVENT_TYPE type;
        public IntPtr eventData;
    }

    /// <summary>
    /// Network event structure (version 1).
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT1
    {
        public FWPM_NET_EVENT_HEADER1 header;
        public FWPM_NET_EVENT_TYPE type;
        public IntPtr eventData;
    }

    /// <summary>
    /// Network event structure (version 2).
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT2
    {
        public FWPM_NET_EVENT_HEADER2 header;
        public FWPM_NET_EVENT_TYPE type;
        public IntPtr eventData;
    }

    /// <summary>
    /// Classify allow event data.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT_CLASSIFY_ALLOW0
    {
        public ulong filterId;
        public ushort layerId;
        public uint reauthReason;
        public uint originalProfile;
        public uint currentProfile;
        public uint msFwpDirection;
        public bool isLoopback;
    }

    /// <summary>
    /// Session flags for engine open.
    /// </summary>
    [Flags]
    public enum FWPM_SESSION_FLAGS : uint
    {
        FWPM_SESSION_FLAG_DYNAMIC = 0x00000001,
        FWPM_SESSION_FLAG_RESERVED = 0x10000000
    }

    /// <summary>
    /// Session information for opening the WFP engine.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_SESSION0
    {
        public Guid sessionKey;
        public FWPM_DISPLAY_DATA0 displayData;
        public FWPM_SESSION_FLAGS flags;
        public uint txnWaitTimeoutInMSec;
        public uint processId;
        public IntPtr sid;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string username;
        public bool kernelMode;
    }

    /// <summary>
    /// Display data for WFP objects.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_DISPLAY_DATA0
    {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string name;
        [MarshalAs(UnmanagedType.LPWStr)]
        public string description;
    }

    /// <summary>
    /// Network event subscription template.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT_ENUM_TEMPLATE0
    {
        public FILETIME startTime;
        public FILETIME endTime;
        public uint numFilterConditions;
        public IntPtr filterCondition;
    }

    /// <summary>
    /// Network event subscription.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct FWPM_NET_EVENT_SUBSCRIPTION0
    {
        public IntPtr enumTemplate;
        public uint flags;
        public Guid sessionKey;
    }

    #endregion

    #region Callbacks

    /// <summary>
    /// Callback for network events (version 0).
    /// </summary>
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate void FWPM_NET_EVENT_CALLBACK0(
        IntPtr context,
        IntPtr netEvent);

    /// <summary>
    /// Callback for network events (version 1).
    /// </summary>
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate void FWPM_NET_EVENT_CALLBACK1(
        IntPtr context,
        IntPtr netEvent);

    /// <summary>
    /// Callback for network events (version 2).
    /// </summary>
    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    public delegate void FWPM_NET_EVENT_CALLBACK2(
        IntPtr context,
        IntPtr netEvent,
        uint count);

    #endregion

    #region Functions

    /// <summary>
    /// Opens a session to the filter engine.
    /// </summary>
    [DllImport(FwpuclntDll, EntryPoint = "FwpmEngineOpen0")]
    public static extern uint FwpmEngineOpen0(
        [MarshalAs(UnmanagedType.LPWStr)] string? serverName,
        uint authnService,
        IntPtr authIdentity,
        IntPtr session,
        out IntPtr engineHandle);

    /// <summary>
    /// Closes a session to the filter engine.
    /// </summary>
    [DllImport(FwpuclntDll, EntryPoint = "FwpmEngineClose0")]
    public static extern uint FwpmEngineClose0(IntPtr engineHandle);

    /// <summary>
    /// Subscribes to network events (version 0).
    /// </summary>
    [DllImport(FwpuclntDll, EntryPoint = "FwpmNetEventSubscribe0")]
    public static extern uint FwpmNetEventSubscribe0(
        IntPtr engineHandle,
        ref FWPM_NET_EVENT_SUBSCRIPTION0 subscription,
        FWPM_NET_EVENT_CALLBACK0 callback,
        IntPtr context,
        out IntPtr eventsHandle);

    /// <summary>
    /// Subscribes to network events (version 1).
    /// </summary>
    [DllImport(FwpuclntDll, EntryPoint = "FwpmNetEventSubscribe1")]
    public static extern uint FwpmNetEventSubscribe1(
        IntPtr engineHandle,
        ref FWPM_NET_EVENT_SUBSCRIPTION0 subscription,
        FWPM_NET_EVENT_CALLBACK1 callback,
        IntPtr context,
        out IntPtr eventsHandle);

    /// <summary>
    /// Unsubscribes from network events.
    /// </summary>
    [DllImport(FwpuclntDll, EntryPoint = "FwpmNetEventUnsubscribe0")]
    public static extern uint FwpmNetEventUnsubscribe0(
        IntPtr engineHandle,
        IntPtr eventsHandle);

    /// <summary>
    /// Frees memory allocated by WFP.
    /// </summary>
    [DllImport(FwpuclntDll, EntryPoint = "FwpmFreeMemory0")]
    public static extern void FwpmFreeMemory0(ref IntPtr p);

    #endregion

    #region Helper Methods

    /// <summary>
    /// Converts an IPv4 address from network byte order to string.
    /// </summary>
    public static string IPv4ToString(uint addr)
    {
        byte[] bytes = BitConverter.GetBytes(addr);
        return $"{bytes[0]}.{bytes[1]}.{bytes[2]}.{bytes[3]}";
    }

    /// <summary>
    /// Converts an IPv6 address to string.
    /// </summary>
    public static string IPv6ToString(byte[] addr)
    {
        if (addr == null || addr.Length != 16)
            return "::";

        return new System.Net.IPAddress(addr).ToString();
    }

    /// <summary>
    /// Gets the protocol name from protocol number.
    /// </summary>
    public static string GetProtocolName(byte protocol)
    {
        return protocol switch
        {
            6 => "TCP",
            17 => "UDP",
            1 => "ICMP",
            _ => $"Proto-{protocol}"
        };
    }

    #endregion
}
