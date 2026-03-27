using ControlPlane.Agent.Models;
using Microsoft.Extensions.Logging;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Monitors the system clipboard for large text paste events (> 400 characters).
/// Uses AddClipboardFormatListener with a hidden message-only window on a
/// dedicated STA thread for minimal overhead. Never blocks or modifies the clipboard.
/// </summary>
public sealed class ClipboardMonitorService : IDisposable
{
    // ── Win32 interop ──────────────────────────────────────────────────
    private const int WM_CLIPBOARDUPDATE = 0x031D;
    private const uint CF_UNICODETEXT = 13;
    private const int HWND_MESSAGE = -3;

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AddClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool OpenClipboard(IntPtr hWndNewOwner);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseClipboard();

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsClipboardFormatAvailable(uint format);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr GetClipboardData(uint uFormat);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GlobalLock(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GlobalUnlock(IntPtr hMem);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern UIntPtr GlobalSize(IntPtr hMem);

    // Hidden window via RegisterClass + CreateWindowEx
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern ushort RegisterClassW(ref WNDCLASS lpWndClass);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateWindowExW(
        uint dwExStyle, string lpClassName, string lpWindowName,
        uint dwStyle, int x, int y, int nWidth, int nHeight,
        IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DestroyWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern IntPtr DefWindowProcW(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetMessageW(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    private static extern IntPtr DispatchMessageW(ref MSG lpmsg);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool TranslateMessage(ref MSG lpMsg);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool PostMessageW(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetModuleHandleW(string? lpModuleName);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct WNDCLASS
    {
        public uint style;
        public WndProc lpfnWndProc;
        public int cbClsExtra;
        public int cbWndExtra;
        public IntPtr hInstance;
        public IntPtr hIcon;
        public IntPtr hCursor;
        public IntPtr hbrBackground;
        public string? lpszMenuName;
        public string lpszClassName;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr hwnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public int pt_x;
        public int pt_y;
    }

    private delegate IntPtr WndProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    private const uint WM_QUIT = 0x0012;

    // ── Constants ──────────────────────────────────────────────────────
    private const int LargePasteThreshold = 400;
    private const string DataDirectory = @"C:\ProgramData\ControlPlane";
    private const string LogFileName = "assignment_session_log.json";
    private static readonly string LogFilePath = Path.Combine(DataDirectory, LogFileName);

    // ── Fields ─────────────────────────────────────────────────────────
    private readonly ILogger<ClipboardMonitorService> _logger;
    private readonly List<LargePasteEvent> _events = new();
    private readonly object _eventsLock = new();
    private readonly JsonSerializerOptions _jsonOptions;

    private Thread? _messageThread;
    private IntPtr _hwnd;
    private volatile bool _isRunning;
    private volatile bool _disposed;

    // Must prevent GC of the delegate while the window is alive
    private WndProc? _wndProcDelegate;

    public bool IsRunning => _isRunning;

    public ClipboardMonitorService(ILogger<ClipboardMonitorService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    // ── Lifecycle ──────────────────────────────────────────────────────

    public Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (_isRunning)
        {
            _logger.LogWarning("ClipboardMonitorService already running");
            return Task.CompletedTask;
        }

        _logger.LogInformation("ClipboardMonitorService starting (detect-only, no blocking)");

        var ready = new ManualResetEventSlim(false);
        Exception? startError = null;

        _messageThread = new Thread(() =>
        {
            try
            {
                CreateMessageWindow();
                _isRunning = true;
                ready.Set();
                RunMessageLoop();
            }
            catch (Exception ex)
            {
                startError = ex;
                ready.Set();
            }
        })
        {
            Name = "ClipboardMonitor",
            IsBackground = true
        };
        _messageThread.SetApartmentState(ApartmentState.STA);
        _messageThread.Start();

        // Wait for the window to be created (bounded)
        ready.Wait(TimeSpan.FromSeconds(5));

        if (startError is not null)
        {
            _logger.LogError(startError, "ClipboardMonitorService failed to start");
            return Task.CompletedTask;
        }

        _logger.LogInformation("ClipboardMonitorService started. Threshold={Threshold} chars", LargePasteThreshold);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken = default)
    {
        if (!_isRunning) return Task.CompletedTask;

        _logger.LogInformation("ClipboardMonitorService stopping");

        // Post WM_QUIT to the message loop to unblock GetMessage
        if (_hwnd != IntPtr.Zero)
        {
            PostMessageW(_hwnd, WM_QUIT, IntPtr.Zero, IntPtr.Zero);
        }

        // Wait for the thread to exit
        _messageThread?.Join(TimeSpan.FromSeconds(3));

        _isRunning = false;
        _logger.LogInformation("ClipboardMonitorService stopped");

        return Task.CompletedTask;
    }

    // ── Hidden message-only window ─────────────────────────────────────

    private void CreateMessageWindow()
    {
        var hInstance = GetModuleHandleW(null);
        var className = "ControlPlane_ClipboardListener_" + Environment.ProcessId;

        _wndProcDelegate = WndProcHandler;

        var wc = new WNDCLASS
        {
            lpfnWndProc = _wndProcDelegate,
            hInstance = hInstance,
            lpszClassName = className
        };

        var atom = RegisterClassW(ref wc);
        if (atom == 0)
        {
            throw new InvalidOperationException(
                $"RegisterClass failed: {Marshal.GetLastWin32Error()}");
        }

        _hwnd = CreateWindowExW(
            0, className, "ControlPlane Clipboard Monitor", 0,
            0, 0, 0, 0,
            (IntPtr)HWND_MESSAGE, // message-only window
            IntPtr.Zero, hInstance, IntPtr.Zero);

        if (_hwnd == IntPtr.Zero)
        {
            throw new InvalidOperationException(
                $"CreateWindowEx failed: {Marshal.GetLastWin32Error()}");
        }

        if (!AddClipboardFormatListener(_hwnd))
        {
            DestroyWindow(_hwnd);
            _hwnd = IntPtr.Zero;
            throw new InvalidOperationException(
                $"AddClipboardFormatListener failed: {Marshal.GetLastWin32Error()}");
        }

        _logger.LogDebug("ClipboardMonitor: Hidden listener window created. HWND={Hwnd}", _hwnd);
    }

    private void RunMessageLoop()
    {
        try
        {
            while (GetMessageW(out MSG msg, IntPtr.Zero, 0, 0))
            {
                TranslateMessage(ref msg);
                DispatchMessageW(ref msg);
            }
        }
        finally
        {
            if (_hwnd != IntPtr.Zero)
            {
                RemoveClipboardFormatListener(_hwnd);
                DestroyWindow(_hwnd);
                _hwnd = IntPtr.Zero;
            }
        }
    }

    private IntPtr WndProcHandler(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam)
    {
        if (msg == WM_CLIPBOARDUPDATE)
        {
            OnClipboardChanged();
            return IntPtr.Zero;
        }

        return DefWindowProcW(hWnd, msg, wParam, lParam);
    }

    // ── Clipboard inspection ───────────────────────────────────────────

    private void OnClipboardChanged()
    {
        try
        {
            if (!IsClipboardFormatAvailable(CF_UNICODETEXT))
                return;

            int charCount = GetClipboardTextLength();
            if (charCount <= LargePasteThreshold)
                return;

            var pasteEvent = new LargePasteEvent
            {
                Timestamp = DateTime.UtcNow,
                CharacterCount = charCount
            };

            lock (_eventsLock)
            {
                _events.Add(pasteEvent);
            }

            _logger.LogInformation(
                "LargePasteDetected: Timestamp={Timestamp}, CharacterCount={CharacterCount}",
                pasteEvent.Timestamp, pasteEvent.CharacterCount);

            // Fire-and-forget append to log file (non-blocking)
            _ = Task.Run(() => AppendEventToLogAsync(pasteEvent));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "ClipboardMonitor: Error inspecting clipboard change");
        }
    }

    /// <summary>
    /// Opens the clipboard read-only to measure text length without copying the full string.
    /// Returns 0 on failure (clipboard busy or no text). Never blocks.
    /// </summary>
    private int GetClipboardTextLength()
    {
        if (!OpenClipboard(IntPtr.Zero))
            return 0;

        try
        {
            IntPtr hData = GetClipboardData(CF_UNICODETEXT);
            if (hData == IntPtr.Zero)
                return 0;

            IntPtr locked = GlobalLock(hData);
            if (locked == IntPtr.Zero)
                return 0;

            try
            {
                // GlobalSize gives bytes; for Unicode, each char = 2 bytes
                var sizeBytes = (long)GlobalSize(hData);
                if (sizeBytes <= 0)
                    return 0;

                // Calculate string length from the null-terminated Unicode string
                // Use a safe upper bound based on the allocation size
                int maxChars = (int)(sizeBytes / 2);
                int length = 0;
                unsafe
                {
                    char* ptr = (char*)locked;
                    while (length < maxChars && ptr[length] != '\0')
                        length++;
                }
                return length;
            }
            finally
            {
                GlobalUnlock(hData);
            }
        }
        finally
        {
            CloseClipboard();
        }
    }

    // ── Persistence ────────────────────────────────────────────────────

    /// <summary>
    /// Appends a large-paste event to assignment_session_log.json.
    /// Reads the existing file, adds the event to a "clipboardEvents" array, and rewrites.
    /// </summary>
    private async Task AppendEventToLogAsync(LargePasteEvent pasteEvent)
    {
        try
        {
            Directory.CreateDirectory(DataDirectory);

            Dictionary<string, JsonElement>? existing = null;

            if (File.Exists(LogFilePath))
            {
                var json = await File.ReadAllTextAsync(LogFilePath);
                if (!string.IsNullOrWhiteSpace(json))
                {
                    existing = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
                }
            }

            existing ??= new Dictionary<string, JsonElement>();

            // Extract or create clipboard events list
            var clipboardEvents = new List<LargePasteEvent>();
            if (existing.TryGetValue("clipboardEvents", out var existingEvents))
            {
                var parsed = existingEvents.Deserialize<List<LargePasteEvent>>(_jsonOptions);
                if (parsed is not null)
                    clipboardEvents = parsed;
            }

            clipboardEvents.Add(pasteEvent);

            // Re-serialize with the updated clipboard events
            existing["clipboardEvents"] = JsonSerializer.SerializeToElement(clipboardEvents, _jsonOptions);

            var output = JsonSerializer.Serialize(existing, _jsonOptions);
            await File.WriteAllTextAsync(LogFilePath, output);

            _logger.LogDebug("ClipboardMonitor: Appended large_paste event to {Path}", LogFilePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ClipboardMonitor: Failed to append event to {Path}", LogFilePath);
        }
    }

    // ── Public accessors ───────────────────────────────────────────────

    /// <summary>
    /// Returns a snapshot of all large-paste events detected so far.
    /// </summary>
    public List<LargePasteEvent> GetEventsSnapshot()
    {
        lock (_eventsLock)
        {
            return new List<LargePasteEvent>(_events);
        }
    }

    // ── Disposal ───────────────────────────────────────────────────────

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        if (_isRunning)
        {
            StopAsync(CancellationToken.None).GetAwaiter().GetResult();
        }
    }
}
