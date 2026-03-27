/**
 * Network Enforcement Module
 * 
 * Implements DNS pinning, fallback resolvers, DNS override detection,
 * and DoH/DoT awareness without deep packet inspection.
 * All logging is privacy-preserving (no IP addresses or request content).
 */

// Known AI service domains and their expected characteristics
export interface PinnedDomain {
  domain: string;
  category: string;
  expectedTLDs: string[];
  knownSubdomains: string[];
  // We don't store IPs - instead we verify consistency across resolvers
  requiresConsistency: boolean;
}

export interface DNSCheckResult {
  domain: string;
  resolved: boolean;
  consistent: boolean;
  latencyMs: number;
  method: 'direct' | 'doh' | 'fallback';
  anomalyDetected: boolean;
  anomalyType?: DNSAnomalyType;
}

export type DNSAnomalyType = 
  | 'resolution_mismatch'
  | 'unexpected_redirect'
  | 'blocked_response'
  | 'timeout_suspicious'
  | 'doh_detected'
  | 'dot_detected'
  | 'dns_hijack_suspected';

export interface NetworkEnforcementConfig {
  enableDNSPinning: boolean;
  enableFallbackResolvers: boolean;
  enableDoHDetection: boolean;
  checkIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
  logAnomalies: boolean;
}

export interface NetworkAnomalyLog {
  timestamp: number;
  anomalyType: DNSAnomalyType;
  domain: string;
  category: string;
  details: string;
  // Privacy-safe: no IPs, no request content
  sessionId: string;
}

// Default configuration
export const DEFAULT_NETWORK_CONFIG: NetworkEnforcementConfig = {
  enableDNSPinning: true,
  enableFallbackResolvers: true,
  enableDoHDetection: true,
  checkIntervalMs: 60000, // 1 minute
  timeoutMs: 5000,
  maxRetries: 2,
  logAnomalies: true,
};

// Known AI service domains for pinning
export const PINNED_AI_DOMAINS: PinnedDomain[] = [
  {
    domain: 'chat.openai.com',
    category: 'ai_chat',
    expectedTLDs: ['com'],
    knownSubdomains: ['chat', 'api', 'platform'],
    requiresConsistency: true,
  },
  {
    domain: 'openai.com',
    category: 'ai_chat',
    expectedTLDs: ['com'],
    knownSubdomains: ['api', 'platform', 'chat'],
    requiresConsistency: true,
  },
  {
    domain: 'claude.ai',
    category: 'ai_chat',
    expectedTLDs: ['ai'],
    knownSubdomains: ['api'],
    requiresConsistency: true,
  },
  {
    domain: 'anthropic.com',
    category: 'ai_chat',
    expectedTLDs: ['com'],
    knownSubdomains: ['api', 'console'],
    requiresConsistency: true,
  },
  {
    domain: 'bard.google.com',
    category: 'ai_chat',
    expectedTLDs: ['com'],
    knownSubdomains: ['bard'],
    requiresConsistency: true,
  },
  {
    domain: 'gemini.google.com',
    category: 'ai_chat',
    expectedTLDs: ['com'],
    knownSubdomains: ['gemini'],
    requiresConsistency: true,
  },
  {
    domain: 'copilot.microsoft.com',
    category: 'ai_chat',
    expectedTLDs: ['com'],
    knownSubdomains: ['copilot'],
    requiresConsistency: true,
  },
  {
    domain: 'perplexity.ai',
    category: 'ai_search',
    expectedTLDs: ['ai'],
    knownSubdomains: ['www', 'api'],
    requiresConsistency: true,
  },
  {
    domain: 'you.com',
    category: 'ai_search',
    expectedTLDs: ['com'],
    knownSubdomains: ['www'],
    requiresConsistency: true,
  },
  {
    domain: 'writesonic.com',
    category: 'ai_writing',
    expectedTLDs: ['com'],
    knownSubdomains: ['app', 'api'],
    requiresConsistency: true,
  },
  {
    domain: 'jasper.ai',
    category: 'ai_writing',
    expectedTLDs: ['ai'],
    knownSubdomains: ['app', 'api'],
    requiresConsistency: true,
  },
  {
    domain: 'grammarly.com',
    category: 'ai_writing',
    expectedTLDs: ['com'],
    knownSubdomains: ['app', 'www'],
    requiresConsistency: true,
  },
];

// Known DoH (DNS over HTTPS) endpoints
const DOH_ENDPOINTS = [
  'dns.google',
  'cloudflare-dns.com',
  'dns.quad9.net',
  'doh.opendns.com',
  'dns.nextdns.io',
  'doh.cleanbrowsing.org',
  'dns.adguard.com',
  'doh.mullvad.net',
];

// Known DoT (DNS over TLS) ports
const DOT_PORT = 853;

/**
 * Generate a session ID for anonymous logging
 */
function getSessionId(): string {
  const key = 'humanfirst_network_session';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `ns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

/**
 * Storage for anomaly logs
 */
const anomalyLogs: NetworkAnomalyLog[] = [];
const MAX_ANOMALY_LOGS = 100;

/**
 * Log a network anomaly (privacy-safe)
 */
export function logNetworkAnomaly(
  anomalyType: DNSAnomalyType,
  domain: string,
  category: string,
  details: string
): NetworkAnomalyLog {
  const log: NetworkAnomalyLog = {
    timestamp: Date.now(),
    anomalyType,
    domain: sanitizeDomain(domain),
    category,
    details: sanitizeDetails(details),
    sessionId: getSessionId(),
  };

  anomalyLogs.unshift(log);
  if (anomalyLogs.length > MAX_ANOMALY_LOGS) {
    anomalyLogs.pop();
  }

  console.log('[NetworkEnforcement] Anomaly detected:', log);
  return log;
}

/**
 * Sanitize domain for logging (remove potential PII)
 */
function sanitizeDomain(domain: string): string {
  // Only log the base domain, not full URLs
  try {
    const parts = domain.toLowerCase().split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return domain;
  } catch {
    return 'unknown';
  }
}

/**
 * Sanitize details for privacy-safe logging
 */
function sanitizeDetails(details: string): string {
  // Remove any potential IP addresses
  return details
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP_REDACTED]')
    .replace(/[0-9a-fA-F:]{7,}/g, '[IPv6_REDACTED]')
    .slice(0, 200); // Limit length
}

/**
 * Get recent anomaly logs
 */
export function getAnomalyLogs(): NetworkAnomalyLog[] {
  return [...anomalyLogs];
}

/**
 * Clear anomaly logs
 */
export function clearAnomalyLogs(): void {
  anomalyLogs.length = 0;
}

/**
 * Check if a domain is in the pinned list
 */
export function isPinnedDomain(domain: string): PinnedDomain | undefined {
  const normalized = domain.toLowerCase();
  return PINNED_AI_DOMAINS.find(p => 
    normalized === p.domain || 
    normalized.endsWith('.' + p.domain)
  );
}

/**
 * Verify domain TLD matches expected
 */
export function verifyTLD(domain: string, pinnedDomain: PinnedDomain): boolean {
  const parts = domain.toLowerCase().split('.');
  const tld = parts[parts.length - 1];
  return pinnedDomain.expectedTLDs.includes(tld);
}

/**
 * Check for DNS resolution using timing analysis
 * This doesn't capture IPs, just verifies the domain resolves consistently
 */
export async function checkDNSResolution(
  domain: string,
  config: NetworkEnforcementConfig = DEFAULT_NETWORK_CONFIG
): Promise<DNSCheckResult> {
  const startTime = performance.now();
  const pinnedDomain = isPinnedDomain(domain);
  
  try {
    // Use fetch with timing to detect resolution characteristics
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    // HEAD request to minimize data transfer
    const response = await fetch(`https://${domain}/favicon.ico`, {
      method: 'HEAD',
      mode: 'no-cors', // Avoid CORS issues, we only care about timing
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    const latencyMs = performance.now() - startTime;

    // Check for suspicious redirects (domain mismatch)
    // Note: In no-cors mode, we can't read headers, but timing can indicate issues

    return {
      domain,
      resolved: true,
      consistent: true,
      latencyMs,
      method: 'direct',
      anomalyDetected: false,
    };
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    
    // Analyze the error for anomaly patterns
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Very fast failure might indicate local blocking
    if (latencyMs < 50) {
      const anomaly = logNetworkAnomaly(
        'blocked_response',
        domain,
        pinnedDomain?.category || 'unknown',
        `Fast failure (${Math.round(latencyMs)}ms) suggests local blocking`
      );

      return {
        domain,
        resolved: false,
        consistent: false,
        latencyMs,
        method: 'direct',
        anomalyDetected: true,
        anomalyType: 'blocked_response',
      };
    }

    // Timeout might indicate DNS manipulation
    if (errorMessage.includes('abort') || latencyMs >= config.timeoutMs) {
      const anomaly = logNetworkAnomaly(
        'timeout_suspicious',
        domain,
        pinnedDomain?.category || 'unknown',
        `Resolution timeout after ${Math.round(latencyMs)}ms`
      );

      return {
        domain,
        resolved: false,
        consistent: false,
        latencyMs,
        method: 'direct',
        anomalyDetected: true,
        anomalyType: 'timeout_suspicious',
      };
    }

    return {
      domain,
      resolved: false,
      consistent: false,
      latencyMs,
      method: 'direct',
      anomalyDetected: false,
    };
  }
}

/**
 * Check DNS resolution via DoH fallback resolver
 * This provides a comparison point without revealing user's DNS
 */
export async function checkDNSViaDoH(
  domain: string,
  config: NetworkEnforcementConfig = DEFAULT_NETWORK_CONFIG
): Promise<DNSCheckResult> {
  const startTime = performance.now();
  const pinnedDomain = isPinnedDomain(domain);

  try {
    // Use Cloudflare's DoH JSON API (privacy-respecting)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/dns-json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const latencyMs = performance.now() - startTime;

    if (!response.ok) {
      return {
        domain,
        resolved: false,
        consistent: false,
        latencyMs,
        method: 'doh',
        anomalyDetected: false,
      };
    }

    const data = await response.json();
    
    // Check if domain resolves (we don't log the actual IPs)
    const hasAnswers = data.Answer && data.Answer.length > 0;
    const answerCount = data.Answer?.length || 0;

    return {
      domain,
      resolved: hasAnswers,
      consistent: true,
      latencyMs,
      method: 'doh',
      anomalyDetected: false,
    };
  } catch (error) {
    const latencyMs = performance.now() - startTime;
    
    return {
      domain,
      resolved: false,
      consistent: false,
      latencyMs,
      method: 'doh',
      anomalyDetected: false,
    };
  }
}

/**
 * Compare direct DNS vs DoH to detect DNS manipulation
 */
export async function detectDNSManipulation(
  domain: string,
  config: NetworkEnforcementConfig = DEFAULT_NETWORK_CONFIG
): Promise<{
  manipulationDetected: boolean;
  directResult: DNSCheckResult;
  dohResult: DNSCheckResult;
  confidence: 'low' | 'medium' | 'high';
}> {
  const [directResult, dohResult] = await Promise.all([
    checkDNSResolution(domain, config),
    checkDNSViaDoH(domain, config),
  ]);

  // Compare results
  let manipulationDetected = false;
  let confidence: 'low' | 'medium' | 'high' = 'low';

  // Case 1: Direct fails but DoH succeeds - likely local blocking
  if (!directResult.resolved && dohResult.resolved) {
    manipulationDetected = true;
    confidence = 'high';
    
    logNetworkAnomaly(
      'dns_hijack_suspected',
      domain,
      isPinnedDomain(domain)?.category || 'unknown',
      'Direct resolution failed but DoH succeeded'
    );
  }

  // Case 2: Both resolve but direct is suspiciously fast (might be hijacked)
  if (directResult.resolved && dohResult.resolved) {
    const latencyDiff = Math.abs(directResult.latencyMs - dohResult.latencyMs);
    
    // If direct is >500ms faster than DoH, might be served locally
    if (directResult.latencyMs < dohResult.latencyMs - 500 && directResult.latencyMs < 20) {
      manipulationDetected = true;
      confidence = 'medium';
      
      logNetworkAnomaly(
        'dns_hijack_suspected',
        domain,
        isPinnedDomain(domain)?.category || 'unknown',
        'Suspiciously fast local resolution'
      );
    }
  }

  return {
    manipulationDetected,
    directResult,
    dohResult,
    confidence,
  };
}

/**
 * Detect if DoH is being used system-wide
 * This is done by checking if known DoH endpoints are accessible
 */
export async function detectDoHUsage(
  config: NetworkEnforcementConfig = DEFAULT_NETWORK_CONFIG
): Promise<{
  dohDetected: boolean;
  detectedEndpoints: string[];
}> {
  const detectedEndpoints: string[] = [];

  // Check a sample of DoH endpoints
  const checkPromises = DOH_ENDPOINTS.slice(0, 3).map(async (endpoint) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`https://${endpoint}/dns-query?name=example.com&type=A`, {
        method: 'GET',
        headers: { 'Accept': 'application/dns-json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // DoH endpoint is accessible (might be configured)
        return endpoint;
      }
      return null;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(checkPromises);
  results.forEach(result => {
    if (result) detectedEndpoints.push(result);
  });

  // If DoH endpoints are very responsive, user might have DoH configured
  const dohDetected = detectedEndpoints.length > 0;

  if (dohDetected) {
    logNetworkAnomaly(
      'doh_detected',
      'system',
      'network_config',
      `DoH endpoints accessible: ${detectedEndpoints.length} found`
    );
  }

  return { dohDetected, detectedEndpoints };
}

/**
 * Run comprehensive network integrity check
 */
export async function runNetworkIntegrityCheck(
  domains: string[] = PINNED_AI_DOMAINS.map(d => d.domain).slice(0, 5),
  config: NetworkEnforcementConfig = DEFAULT_NETWORK_CONFIG
): Promise<{
  overallStatus: 'healthy' | 'suspicious' | 'compromised';
  checksPerformed: number;
  anomaliesDetected: number;
  results: Array<{
    domain: string;
    status: 'ok' | 'blocked' | 'manipulated' | 'unknown';
    details: string;
  }>;
  dohStatus: { detected: boolean; endpoints: string[] };
}> {
  const results: Array<{
    domain: string;
    status: 'ok' | 'blocked' | 'manipulated' | 'unknown';
    details: string;
  }> = [];

  let anomaliesDetected = 0;

  // Check each domain
  for (const domain of domains) {
    const manipulation = await detectDNSManipulation(domain, config);
    
    if (manipulation.manipulationDetected) {
      anomaliesDetected++;
      results.push({
        domain,
        status: manipulation.directResult.resolved ? 'manipulated' : 'blocked',
        details: `Confidence: ${manipulation.confidence}`,
      });
    } else if (!manipulation.directResult.resolved && !manipulation.dohResult.resolved) {
      results.push({
        domain,
        status: 'unknown',
        details: 'Could not resolve via any method',
      });
    } else {
      results.push({
        domain,
        status: 'ok',
        details: `Resolved in ${Math.round(manipulation.directResult.latencyMs)}ms`,
      });
    }
  }

  // Check for DoH usage
  const dohStatus = await detectDoHUsage(config);

  // Determine overall status
  let overallStatus: 'healthy' | 'suspicious' | 'compromised' = 'healthy';
  
  if (anomaliesDetected > domains.length / 2) {
    overallStatus = 'compromised';
  } else if (anomaliesDetected > 0) {
    overallStatus = 'suspicious';
  }

  return {
    overallStatus,
    checksPerformed: domains.length,
    anomaliesDetected,
    results,
    dohStatus: {
      detected: dohStatus.dohDetected,
      endpoints: dohStatus.detectedEndpoints,
    },
  };
}

/**
 * Get network enforcement status summary
 */
export function getNetworkStatus(): {
  lastCheck: number | null;
  anomalyCount: number;
  recentAnomalies: NetworkAnomalyLog[];
} {
  const recentAnomalies = anomalyLogs.slice(0, 10);
  
  return {
    lastCheck: anomalyLogs.length > 0 ? anomalyLogs[0].timestamp : null,
    anomalyCount: anomalyLogs.length,
    recentAnomalies,
  };
}
