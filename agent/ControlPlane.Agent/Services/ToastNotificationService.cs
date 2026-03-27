using Microsoft.Extensions.Logging;

namespace ControlPlane.Agent.Services;

/// <summary>
/// Service for sending Windows toast notifications to the user.
/// Used for real-time feedback during enforcement (e.g., when apps are blocked).
/// </summary>
public sealed class ToastNotificationService : IDisposable
{
    private readonly ILogger<ToastNotificationService> _logger;

    public ToastNotificationService(ILogger<ToastNotificationService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Sends a Windows toast notification asynchronously.
    /// </summary>
    /// <param name="title">Toast title (e.g., "HumanFirst")</param>
    /// <param name="message">Toast message body</param>
    /// <param name="cancellationToken">Cancellation token</param>
    public async Task SendToastNotificationAsync(string title, string message, CancellationToken cancellationToken = default)
    {
        try
        {
            var toastXml = BuildToastXml(title, message);

            // Use PowerShell to send toast (works even without UWP app registration)
            var psCommand = $@"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null

$APP_ID = 'HumanFirst.ControlPlane'
$xml_str = @'''{toastXml}'''

$doc = New-Object Windows.Data.Xml.Dom.XmlDocument
$doc.LoadXml($xml_str)
$toast = New-Object Windows.UI.Notifications.ToastNotification $doc
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID).Show($toast)
";

            var psCommandEscaped = psCommand.Replace("\"", "\\\"");

            var processInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -Command \"{psCommandEscaped}\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using var process = System.Diagnostics.Process.Start(processInfo);
            if (process != null)
            {
                // Don't wait for completion - fire and forget
                _ = process.WaitForExitAsync(cancellationToken).ConfigureAwait(false);

                _logger.LogInformation(
                    "Toast notification queued. Title={Title}, Message={MessageSnippet}",
                    title,
                    message.Length > 50 ? message.Substring(0, 50) + "..." : message);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send toast notification. Title={Title}", title);
        }
    }

    private static string BuildToastXml(string title, string message)
    {
        // Escape XML special characters
        var escapedTitle = System.Security.SecurityElement.Escape(title);
        var escapedMessage = System.Security.SecurityElement.Escape(message);

        return $@"
<toast>
    <visual>
        <binding template=""ToastText02"">
            <text id=""1"">{escapedTitle}</text>
            <text id=""2"">{escapedMessage}</text>
        </binding>
    </visual>
    <audio silent=""true"" />
</toast>
".Trim();
    }

    public void Dispose()
    {
        // No resources to clean up
    }
}
