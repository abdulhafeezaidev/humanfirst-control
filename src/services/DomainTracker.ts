/**
 * Domain Tracker for Assignment Mode WebView2
 *
 * Part of Architecture: WebView2 Navigation → Domain Detection → AI Check
 *
 * Responsibilities (AI Check Phase):
 * - Extract and normalize domains from WebView2 navigation events
 * - Analyze domains against known AI platforms (ChatGPT, Claude, Gemini, etc.)
 * - Query Supabase ai_services table for extended platform database
 * - Cache results in-memory (1-hour TTL) for performance
 * - Report domain visits to assignment_risk_events table
 * - Trigger warning/alert on AI platform detection
 *
 * Known AI Platforms (13+):
 * OpenAI, Anthropic, Google, Microsoft, Perplexity, HuggingFace, and more
 */

import { supabase } from '@/integrations/supabase/client';

export interface DomainAnalysisResult {
  domain: string;
  category: 'ai' | 'research' | 'unknown';
  risk: 'high' | 'medium' | 'low';
  source: 'known_list' | 'ai_services' | 'db_error';
  details?: string;
}

export interface AssignmentDomainEvent {
  assignmentId?: string;
  domain: string;
  category: string;
  risk: string;
  eventType: string;
  url?: string;
  timestamp?: Date;
}

// Known AI service domains (regularly updated)
const KNOWN_AI_DOMAINS = new Set([
  'openai.com',
  'chat.openai.com',
  'chatgpt.openai.com',
  'claude.ai',
  'claude.anthropic.com',
  'gemini.google.com',
  'bard.google.com',
  'perplexity.ai',
  'copilot.microsoft.com',
  'bing.com/chat',
  'huggingface.co',
  'playground.openai.com',
]);

export class DomainTracker {
  private cache: Map<string, DomainAnalysisResult> = new Map();
  private reportQueue: AssignmentDomainEvent[] = [];
  private reportingEnabled = true;
  private readonly CACHE_TTL = 3600000; // 1 hour
  private cacheTimestamps: Map<string, number> = new Map();

  constructor() {
    // Initialize
    this.setupReportingInterval();
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase().replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Normalize domain for comparison
   */
  private normalizeDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace('www.', '')
      .trim();
  }

  /**
   * Check if domain is in known AI services list
   */
  private checkKnownAIDomains(normalizedDomain: string): boolean {
    // Direct match
    if (KNOWN_AI_DOMAINS.has(normalizedDomain)) {
      return true;
    }

    // Subdomain match
    for (const aiDomain of KNOWN_AI_DOMAINS) {
      if (normalizedDomain.endsWith(aiDomain) || aiDomain.includes(normalizedDomain)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check cache validity
   */
  private isCacheValid(domain: string): boolean {
    const timestamp = this.cacheTimestamps.get(domain);
    if (!timestamp) return false;
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Analyze domain against AI database
   */
  async analyzeDomain(url: string): Promise<DomainAnalysisResult> {
    const domain = this.extractDomain(url);
    const normalizedDomain = this.normalizeDomain(domain);

    if (!normalizedDomain) {
      return {
        domain,
        category: 'unknown',
        risk: 'low',
        source: 'db_error',
        details: 'Invalid domain',
      };
    }

    // Check cache first
    if (this.cache.has(normalizedDomain) && this.isCacheValid(normalizedDomain)) {
      return this.cache.get(normalizedDomain)!;
    }

    // Check known AI domains
    if (this.checkKnownAIDomains(normalizedDomain)) {
      const result: DomainAnalysisResult = {
        domain: normalizedDomain,
        category: 'ai',
        risk: 'high',
        source: 'known_list',
        details: 'Known AI content generation platform',
      };
      this.cacheResult(normalizedDomain, result);
      return result;
    }

    // Query Supabase for additional AI services
    try {
      const { data: aiServices, error } = await supabase
        .from('ai_services')
        .select('domains, category')
        .limit(100);

      if (!error && aiServices) {
        for (const service of aiServices) {
          const domains = service.domains || [];
          if (Array.isArray(domains)) {
            const serviceDomains = (domains as string[]).map(d =>
              this.normalizeDomain(d),
            );
            if (serviceDomains.includes(normalizedDomain)) {
              const result: DomainAnalysisResult = {
                domain: normalizedDomain,
                category: 'ai',
                risk: 'high',
                source: 'ai_services',
                details: `AI service: ${service.category}`,
              };
              this.cacheResult(normalizedDomain, result);
              return result;
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to query AI services table:', err);
    }

    // Not detected as AI - neutral category
    const result: DomainAnalysisResult = {
      domain: normalizedDomain,
      category: 'research',
      risk: 'low',
      source: 'db_error',
      details: 'Normal research domain',
    };
    this.cacheResult(normalizedDomain, result);
    return result;
  }

  /**
   * Cache analysis result
   */
  private cacheResult(domain: string, result: DomainAnalysisResult): void {
    this.cache.set(domain, result);
    this.cacheTimestamps.set(domain, Date.now());
  }

  /**
   * Report domain visit to backend
   */
  async reportDomainVisit(event: AssignmentDomainEvent): Promise<void> {
    if (!this.reportingEnabled) return;

    this.reportQueue.push({
      ...event,
      timestamp: event.timestamp || new Date(),
    });

    // Report immediately if high risk
    if (event.risk === 'high') {
      await this.flushReports();
    }
  }

  /**
   * Flush queued reports to backend
   */
  private async flushReports(): Promise<void> {
    if (this.reportQueue.length === 0) return;

    try {
      const currentUser = (await supabase.auth.getUser()).data?.user;
      if (!currentUser) return;

      const reportsToSend = this.reportQueue.map(event => ({
        user_id: currentUser.id,
        assignment_id: event.assignmentId,
        domain: event.domain,
        category: event.category,
        risk: event.risk,
        event_type: event.eventType,
        url: event.url,
        timestamp: event.timestamp,
      }));

      // Type cast for assignment_risk_events table
      const { error } = await (supabase
        .from('assignment_risk_events' as any)
        .insert(reportsToSend) as any);

      if (error) {
        console.error('Failed to report domain visits:', error);
        return;
      }

      // Clear queue only on success
      this.reportQueue = [];
    } catch (err) {
      console.error('Error flushing reports:', err);
    }
  }

  /**
   * Setup periodic reporting
   */
  private setupReportingInterval(): void {
    // Report every 30 seconds or when queue reaches threshold
    setInterval(() => {
      if (this.reportQueue.length > 0) {
        this.flushReports();
      }
    }, 30000);
  }

  /**
   * Disable reporting temporarily
   */
  disableReporting(): void {
    this.reportingEnabled = false;
  }

  /**
   * Enable reporting
   */
  enableReporting(): void {
    this.reportingEnabled = true;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export default DomainTracker;
