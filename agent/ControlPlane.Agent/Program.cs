using ControlPlane.Agent;
using ControlPlane.Agent.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using System.Reflection;

namespace ControlPlane.Agent;

public static class Program
{
    private const string LogDirectory = @"C:\ProgramData\ControlPlane";
    private const string LogFilePath = @"C:\ProgramData\ControlPlane\agent.log";

    public static async Task<int> Main(string[] args)
    {
        // Ensure log directory exists before configuring Serilog
        EnsureLogDirectoryExists();

        // Configure Serilog with structured logging
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("System", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .Enrich.WithThreadId()
            .WriteTo.Console(new CompactJsonFormatter())
            .WriteTo.File(
                formatter: new CompactJsonFormatter(),
                path: LogFilePath,
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                fileSizeLimitBytes: 50 * 1024 * 1024, // 50 MB
                rollOnFileSizeLimit: true,
                shared: true,
                flushToDiskInterval: TimeSpan.FromSeconds(1))
            .CreateLogger();

        try
        {
            var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
            var machineName = Environment.MachineName;
            var startupTime = DateTimeOffset.UtcNow;

            Log.Information(
                "ControlPlane.Agent starting. Version={Version}, MachineName={MachineName}, StartupTime={StartupTime}",
                version,
                machineName,
                startupTime);

            var host = CreateHostBuilder(args).Build();
            await host.RunAsync();

            return 0;
        }
        catch (Exception ex)
        {
            Log.Fatal(ex, "ControlPlane.Agent terminated unexpectedly");
            return 1;
        }
        finally
        {
            Log.Information("ControlPlane.Agent shutting down");
            await Log.CloseAndFlushAsync();
        }
    }

    private static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .UseWindowsService(options =>
            {
                options.ServiceName = "ControlPlane.Agent";
            })
            .UseSerilog()
            .ConfigureServices((hostContext, services) =>
            {
                // Register Named Pipe server as a singleton
                services.AddSingleton<INamedPipeServer, NamedPipeServer>();

                // Register Policy Manager for local caching
                services.AddSingleton<IPolicyManager, PolicyManager>();

                // Register WFP Monitor for network connection monitoring
                services.AddSingleton<IWfpMonitor, WfpMonitor>();

                // Register Enforcement Engine for policy enforcement
                services.AddSingleton<IEnforcementEngine, EnforcementEngine>();

                // Register Activity Monitor for assignment-mode domain tracking (monitor-only, no blocking)
                services.AddSingleton<ActivityMonitorService>();

                // Register domain classifier for AI/unknown domain classification
                services.AddHttpClient();
                services.AddSingleton<IDomainClassifierService, DomainClassifierService>();

                // Register Clipboard Monitor for large-paste detection (detect-only, no blocking)
                services.AddSingleton<ClipboardMonitorService>();

                // Register Session Logger for persisting session data
                services.AddSingleton<SessionLogger>();

                // Register Foreground Window Monitor for focus loss detection (Layer 2)
                services.AddSingleton<ForegroundWindowMonitorService>();

                // Register Toast Notification Service for app blocking feedback
                services.AddSingleton<ToastNotificationService>();

                // Register the main worker service
                services.AddHostedService<AgentWorker>();
            });

    private static void EnsureLogDirectoryExists()
    {
        try
        {
            if (!Directory.Exists(LogDirectory))
            {
                Directory.CreateDirectory(LogDirectory);
            }
        }
        catch (Exception ex)
        {
            // Fallback to console if we can't create log directory
            Console.Error.WriteLine($"Failed to create log directory: {ex.Message}");
        }
    }
}
