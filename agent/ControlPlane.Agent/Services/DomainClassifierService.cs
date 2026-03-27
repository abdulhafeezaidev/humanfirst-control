using ControlPlane.Agent.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace ControlPlane.Agent.Services;

public sealed class DomainClassifierService : IDomainClassifierService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(30);

    private static readonly HashSet<string> KnownAiDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "chat.openai.com",
        "openai.com",
        "claude.ai",
        "anthropic.com",
        "copilot.microsoft.com",
        "bard.google.com",
        "gemini.google.com",
        "perplexity.ai",
        "you.com",
        "poe.com",
        "huggingface.co",
        "chat.mistral.ai",
        "deepseek.com"
    };

    private readonly ILogger<DomainClassifierService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string? _verificationEndpoint;
    private readonly string? _verificationApiKey;

    private readonly ConcurrentDictionary<string, CacheEntry> _cache =
        new(StringComparer.OrdinalIgnoreCase);

    public DomainClassifierService(
        ILogger<DomainClassifierService> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _verificationEndpoint = configuration["Agent:AssignmentMode:DomainVerificationEndpoint"];
        _verificationApiKey = configuration["Agent:AssignmentMode:DomainVerificationApiKey"];
    }

    public string NormalizeDomain(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var value = input.Trim().ToLowerInvariant();

        value = value
            .Replace("https://", string.Empty, StringComparison.OrdinalIgnoreCase)
            .Replace("http://", string.Empty, StringComparison.OrdinalIgnoreCase);

        var slashIndex = value.IndexOf('/');
        if (slashIndex >= 0) value = value[..slashIndex];

        var colonIndex = value.IndexOf(':');
        if (colonIndex >= 0) value = value[..colonIndex];

        if (value.StartsWith("www.")) value = value[4..];

        return value;
    }

    public async Task<DomainClassificationResult> ClassifyAsync(string domain, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeDomain(domain);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return new DomainClassificationResult
            {
                Domain = string.Empty,
                Category = "unknown",
                Risk = "low",
                Source = "local"
            };
        }

        if (_cache.TryGetValue(normalized, out var cached) && cached.ExpiresAtUtc > DateTime.UtcNow)
        {
            return cached.Result;
        }

        if (IsKnownAiDomain(normalized))
        {
            var known = new DomainClassificationResult
            {
                Domain = normalized,
                IsAiDomain = true,
                Category = "ai",
                Risk = "high",
                Source = "local"
            };
            _cache[normalized] = new CacheEntry(known, DateTime.UtcNow.Add(CacheTtl));
            return known;
        }

        var verified = await VerifyUnknownDomainAsync(normalized, cancellationToken);
        _cache[normalized] = new CacheEntry(verified, DateTime.UtcNow.Add(CacheTtl));
        return verified;
    }

    private bool IsKnownAiDomain(string domain)
    {
        if (KnownAiDomains.Contains(domain)) return true;

        return KnownAiDomains.Any(known => domain.EndsWith($".{known}", StringComparison.OrdinalIgnoreCase));
    }

    private async Task<DomainClassificationResult> VerifyUnknownDomainAsync(string domain, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_verificationEndpoint))
        {
            return new DomainClassificationResult
            {
                Domain = domain,
                IsAiDomain = false,
                Category = "unknown",
                Risk = "low",
                Source = "local"
            };
        }

        try
        {
            var client = _httpClientFactory.CreateClient(nameof(DomainClassifierService));
            var request = new HttpRequestMessage(HttpMethod.Post, _verificationEndpoint)
            {
                Content = JsonContent.Create(new { domain })
            };

            if (!string.IsNullOrWhiteSpace(_verificationApiKey))
            {
                request.Headers.Add("x-agent-api-key", _verificationApiKey);
            }

            var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Domain verification failed for {Domain} with status {StatusCode}",
                    domain,
                    (int)response.StatusCode);

                return new DomainClassificationResult
                {
                    Domain = domain,
                    IsAiDomain = false,
                    Category = "unknown",
                    Risk = "low",
                    Source = "remote"
                };
            }

            var payload = await response.Content.ReadFromJsonAsync<DomainVerificationResponse>(cancellationToken: cancellationToken);
            var category = payload?.Category?.Trim().ToLowerInvariant() ?? "unknown";
            var isAi = category == "ai";

            return new DomainClassificationResult
            {
                Domain = domain,
                IsAiDomain = isAi,
                Category = category,
                Risk = payload?.Risk?.Trim().ToLowerInvariant() ?? (isAi ? "high" : "low"),
                Source = "remote"
            };
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Domain verification request failed for {Domain}", domain);
            return new DomainClassificationResult
            {
                Domain = domain,
                IsAiDomain = false,
                Category = "unknown",
                Risk = "low",
                Source = "remote"
            };
        }
    }

    private readonly record struct CacheEntry(DomainClassificationResult Result, DateTime ExpiresAtUtc);

    private sealed class DomainVerificationResponse
    {
        [JsonPropertyName("category")]
        public string? Category { get; init; }

        [JsonPropertyName("risk")]
        public string? Risk { get; init; }
    }
}
