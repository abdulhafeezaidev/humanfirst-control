/// <reference path="../esm.d.ts" />
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-ignore Deno edge runtime URL import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-api-key',
  };
}

const KNOWN_AI_DOMAINS: ReadonlySet<string> = new Set([
  'chat.openai.com',
  'openai.com',
  'claude.ai',
  'anthropic.com',
  'copilot.microsoft.com',
  'bard.google.com',
  'gemini.google.com',
  'perplexity.ai',
  'you.com',
  'poe.com',
  'huggingface.co',
  'chat.mistral.ai',
  'deepseek.com',
])

function normalizeDomain(input: string): string {
  const raw = String(input || '').trim().toLowerCase()
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

function isKnownAiDomain(domain: string): boolean {
  if (KNOWN_AI_DOMAINS.has(domain)) return true
  for (const known of KNOWN_AI_DOMAINS) {
    if (domain.endsWith(`.${known}`)) return true
  }
  return false
}

type AiServiceRow = { domains: string[] | null }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const normalized = normalizeDomain(body?.domain ?? '')

    if (!normalized) {
      return new Response(
        JSON.stringify({ error: 'Missing domain' }),
        { status: 400, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } },
      )
    }

    if (isKnownAiDomain(normalized)) {
      return new Response(
        JSON.stringify({ domain: normalized, category: 'ai', risk: 'high', source: 'known_list' }),
        { status: 200, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } },
      )
    }

    // Check dynamically maintained AI service domains from DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: aiServices, error } = await serviceClient
      .from('ai_services')
      .select('domains')

    if (error) {
      console.error('ai_services lookup failed:', error)
      return new Response(
        JSON.stringify({ domain: normalized, category: 'unknown', risk: 'low', source: 'db_error' }),
        { status: 200, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } },
      )
    }

    const flattened = ((aiServices || []) as AiServiceRow[])
      .flatMap((service: AiServiceRow) => service.domains || [])
      .map((d: string) => normalizeDomain(d))
      .filter(Boolean)

    const matchesAiCatalog = flattened.some((known: string) => known === normalized || normalized.endsWith(`.${known}`))

    return new Response(
      JSON.stringify({
        domain: normalized,
        category: matchesAiCatalog ? 'ai' : 'unknown',
        risk: matchesAiCatalog ? 'high' : 'low',
        source: 'ai_services',
      }),
      { status: 200, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Unhandled error in assignment-verify-domain:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' } },
    )
  }
})
