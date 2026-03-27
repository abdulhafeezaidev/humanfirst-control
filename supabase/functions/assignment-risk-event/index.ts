/**
 * Assignment Risk Event Edge Function
 *
 * POST  — Receives risk events from the editor, stores them, and recomputes
 *         the risk score for the student+assignment pair.
 *
 * Inputs accepted:
 *   - editor_large_paste   (from RichTextEditor paste detection)
 *   - suspicious_insert    (from typing speed monitor)
 *   - ai_domain_visit      (from domain logs / session log)
 *   - extended_research_no_typing (from activity monitor)
 *
 * Scoring weights (capped at 100):
 *   AI domain visit (known AI sites)          +40
 *   Large paste (>400 chars)                  +20
 *   More than 3 paste events                  +30
 *   Suspicious rapid insert                   +25
 *   Extended research without editor typing   +15
 *
 * Thresholds:
 *   0–30  = LOW
 *   31–60 = MEDIUM
 *   61+   = HIGH
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Known AI domains ───────────────────────────────────────────────

const AI_DOMAINS: ReadonlySet<string> = new Set([
  'chat.openai.com',
  'openai.com',
  'bard.google.com',
  'gemini.google.com',
  'claude.ai',
  'copilot.microsoft.com',
  'perplexity.ai',
  'you.com',
  'poe.com',
  'huggingface.co',
  'chat.mistral.ai',
  'deepseek.com',
])

// ── Scoring constants ──────────────────────────────────────────────

const SCORE_AI_DOMAIN_VISIT = 40
const SCORE_LARGE_PASTE = 20
const SCORE_MULTIPLE_PASTES = 30  // >3 paste events
const SCORE_SUSPICIOUS_INSERT = 25
const SCORE_EXTENDED_RESEARCH = 15
const MULTIPLE_PASTE_THRESHOLD = 3
const MAX_SCORE = 100

// ── Types ──────────────────────────────────────────────────────────

interface RiskEventPayload {
  type: 'editor_large_paste' | 'suspicious_insert' | 'ai_domain_visit' | 'extended_research_no_typing'
  length?: number
  domain?: string
  assignment_id?: string
  session_id?: string
  process_name?: string
  severity_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp?: number
}

interface ScoreBreakdown {
  ai_domain_visits: number
  large_paste_count: number
  suspicious_insert_count: number
  extended_research_count: number
  total_paste_characters: number
}

// ── Score computation ──────────────────────────────────────────────

function computeRiskScore(breakdown: ScoreBreakdown): { score: number; level: string } {
  let score = 0

  if (breakdown.ai_domain_visits > 0)           score += SCORE_AI_DOMAIN_VISIT
  if (breakdown.large_paste_count > 0)           score += SCORE_LARGE_PASTE
  if (breakdown.large_paste_count > MULTIPLE_PASTE_THRESHOLD) score += SCORE_MULTIPLE_PASTES
  if (breakdown.suspicious_insert_count > 0)     score += SCORE_SUSPICIOUS_INSERT
  if (breakdown.extended_research_count > 0)     score += SCORE_EXTENDED_RESEARCH

  score = Math.min(score, MAX_SCORE)

  let level: string
  if (score <= 30) level = 'LOW'
  else if (score <= 60) level = 'MEDIUM'
  else level = 'HIGH'

  return { score, level }
}

function normalizeDomain(input?: string): string {
  const raw = String(input ?? '').trim().toLowerCase()
  if (!raw) return ''

  let domain = raw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')

  const slashIndex = domain.indexOf('/')
  if (slashIndex >= 0) domain = domain.slice(0, slashIndex)

  const colonIndex = domain.indexOf(':')
  if (colonIndex >= 0) domain = domain.slice(0, colonIndex)

  return domain
}

function matchesKnownAiDomain(domain: string): boolean {
  if (AI_DOMAINS.has(domain)) return true
  for (const known of AI_DOMAINS) {
    if (domain.endsWith(`.${known}`)) return true
  }
  return false
}

async function verifyDomainWithCatalog(
  serviceClient: ReturnType<typeof createClient>,
  domain: string,
): Promise<{ isAi: boolean; normalized: string }> {
  const normalized = normalizeDomain(domain)
  if (!normalized) return { isAi: false, normalized }

  if (matchesKnownAiDomain(normalized)) {
    return { isAi: true, normalized }
  }

  const { data: aiServices, error } = await serviceClient
    .from('ai_services')
    .select('domains')

  if (error) {
    console.error('Failed to fetch ai_services for domain verification:', error)
    return { isAi: false, normalized }
  }

  const catalogDomains = (aiServices || [])
    .flatMap((row) => row.domains || [])
    .map((d: string) => normalizeDomain(d))
    .filter(Boolean)

  const isAi = catalogDomains.some((known) => known === normalized || normalized.endsWith(`.${known}`))
  return { isAi, normalized }
}

// ── Main handler ───────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // User-scoped client (respects RLS)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify JWT
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = user.id

    // Fetch organization
    const { data: profile } = await userClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle()

    const organizationId = profile?.organization_id ?? null

    // ── Parse payload ──────────────────────────────────────────────

    const body: RiskEventPayload = await req.json()

    const eventType = body.type
    if (!eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const validTypes = [
      'editor_large_paste',
      'suspicious_insert',
      'ai_domain_visit',
      'extended_research_no_typing',
    ]
    if (!validTypes.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: `Invalid event type: ${eventType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const assignmentId = body.assignment_id || 'default'

    // ── Store event (service role for cross-table writes) ──────────

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    let normalizedDomain: string | null = null
    let verifiedAiVisit = false
    if (eventType === 'ai_domain_visit' && body.domain) {
      const verification = await verifyDomainWithCatalog(serviceClient, body.domain)
      normalizedDomain = verification.normalized || null
      verifiedAiVisit = verification.isAi
    }

    const { error: insertError } = await serviceClient
      .from('assignment_risk_events')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        assignment_id: assignmentId,
        event_type: eventType,
        character_count: body.length ?? null,
        domain: normalizedDomain ?? body.domain ?? null,
        session_id: body.session_id ?? null,
        process_name: body.process_name ?? null,
        severity_level: body.severity_level ?? (eventType === 'ai_domain_visit' ? 'HIGH' : 'LOW'),
        metadata: {
          timestamp: body.timestamp ?? Date.now(),
          session_id: body.session_id ?? null,
          process_name: body.process_name ?? null,
          severity_level: body.severity_level ?? (eventType === 'ai_domain_visit' ? 'HIGH' : 'LOW'),
          domain_verified_as_ai: eventType === 'ai_domain_visit' ? verifiedAiVisit : null,
        },
      })

    if (insertError) {
      console.error('Failed to insert risk event:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store risk event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Recompute score ────────────────────────────────────────────

    const { data: events, error: fetchError } = await serviceClient
      .from('assignment_risk_events')
      .select('event_type, character_count, domain')
      .eq('user_id', userId)
      .eq('assignment_id', assignmentId)

    if (fetchError) {
      console.error('Failed to fetch events for scoring:', fetchError)
      // Event was stored — return success even if scoring fails
      return new Response(
        JSON.stringify({ success: true, scoring: 'deferred' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Build breakdown
    const breakdown: ScoreBreakdown = {
      ai_domain_visits: 0,
      large_paste_count: 0,
      suspicious_insert_count: 0,
      extended_research_count: 0,
      total_paste_characters: 0,
    }

    for (const evt of events ?? []) {
      switch (evt.event_type) {
        case 'ai_domain_visit':
          if (evt.domain && matchesKnownAiDomain(normalizeDomain(evt.domain))) {
            breakdown.ai_domain_visits++
          }
          break
        case 'editor_large_paste':
          breakdown.large_paste_count++
          breakdown.total_paste_characters += evt.character_count ?? 0
          break
        case 'suspicious_insert':
          breakdown.suspicious_insert_count++
          break
        case 'extended_research_no_typing':
          breakdown.extended_research_count++
          break
      }
    }

    const { score, level } = computeRiskScore(breakdown)

    // Upsert score
    const { error: upsertError } = await serviceClient
      .from('assignment_risk_scores')
      .upsert(
        {
          user_id: userId,
          organization_id: organizationId,
          assignment_id: assignmentId,
          risk_score: score,
          risk_level: level,
          ai_domain_visits: breakdown.ai_domain_visits,
          large_paste_count: breakdown.large_paste_count,
          suspicious_insert_count: breakdown.suspicious_insert_count,
          extended_research_count: breakdown.extended_research_count,
          total_paste_characters: breakdown.total_paste_characters,
          computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,assignment_id' },
      )

    if (upsertError) {
      console.error('Failed to upsert risk score:', upsertError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        student_id: userId,
        assignment_id: assignmentId,
        risk_score: score,
        risk_level: level,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unhandled error in assignment-risk-event:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
