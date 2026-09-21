/// <reference path="../esm.d.ts" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

type VerifyInput = {
  export_id?: string
  pdf_text?: string
}

function extractTagValue(text: string, tagName: string): string {
  const regex = new RegExp(`<humanfirst:${tagName}>([\\s\\S]*?)<\\/humanfirst:${tagName}>`, 'i')
  const match = text.match(regex)
  return match?.[1]?.trim() || ''
}

function hmacSHA256(secret: string, payload: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret)
  const bodyData = new TextEncoder().encode(payload)
  return crypto.subtle
    .importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then((key) => crypto.subtle.sign('HMAC', key, bodyData))
    .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const signingSecret = Deno.env.get('EXPORT_SIGNING_SECRET')
    if (!signingSecret) {
      return new Response(JSON.stringify({ error: 'Missing EXPORT_SIGNING_SECRET' }), {
        status: 500,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const { data: roleRows } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    const roleSet = new Set((roleRows || []).map((r: any) => r.role))
    if (!roleSet.has('admin') && !roleSet.has('super_admin') && !roleSet.has('viewer')) {
      return new Response(JSON.stringify({ error: 'Only teachers/admins may verify exports' }), {
        status: 403,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as VerifyInput
    const pdfText = String(body.pdf_text || '')
    const fromPdfExportId = extractTagValue(pdfText, 'export_id')
    const fromPdfContentHash = extractTagValue(pdfText, 'content_hash')
    const fromPdfSignature = extractTagValue(pdfText, 'signature')
    const exportId = String(body.export_id || fromPdfExportId || '')

    if (!exportId) {
      return new Response(JSON.stringify({ error: 'export_id or PDF metadata is required' }), {
        status: 400,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const { data: exportRow, error: exportError } = await serviceClient
      .from('assignment_exports')
      .select('*')
      .eq('export_id', exportId)
      .maybeSingle()

    if (exportError || !exportRow) {
      return new Response(JSON.stringify({
        verified: false,
        tampered: true,
        message: 'Verification failed: export record not found.',
      }), {
        status: 200,
        headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
      })
    }

    const signaturePayload = JSON.stringify({
      export_id: exportRow.export_id,
      session_id: exportRow.session_id,
      student_id: exportRow.student_id,
      content_hash: exportRow.content_hash,
      export_timestamp: exportRow.exported_at,
    })
    const recomputedSignature = await hmacSHA256(signingSecret, signaturePayload)

    const pdfSignature = fromPdfSignature || exportRow.signature
    const signatureMatches = recomputedSignature === pdfSignature && exportRow.signature === pdfSignature
    const hashMatches = fromPdfContentHash ? fromPdfContentHash === exportRow.content_hash : true
    const verified = signatureMatches && hashMatches
    const tampered = !verified

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name')
      .eq('id', exportRow.student_id)
      .maybeSingle()

    const { data: assignmentSession } = await serviceClient
      .from('assignment_sessions')
      .select('assignment_id, started_at, submitted_at')
      .eq('id', exportRow.session_id)
      .maybeSingle()

    const { data: assignment } = assignmentSession?.assignment_id
      ? await serviceClient.from('assignments').select('title').eq('id', assignmentSession.assignment_id).maybeSingle()
      : { data: null }

    const { count: violationCount } = await serviceClient
      .from('violation_logs')
      .select('*', { head: true, count: 'exact' })
      .eq('student_id', exportRow.student_id)
      .eq('session_id', exportRow.session_id)

    const vCount = Number(violationCount || 0)
    const sessionIntegrity = vCount === 0 ? 'Clean' : vCount <= 3 ? 'Suspicious' : 'High Risk'

    const submittedDuringWindow =
      !!assignmentSession?.submitted_at &&
      !!assignmentSession?.started_at &&
      new Date(assignmentSession.submitted_at).getTime() >= new Date(assignmentSession.started_at).getTime()

    return new Response(JSON.stringify({
      verified,
      tampered,
      student_name: profile?.full_name || 'Unknown Student',
      assignment_name: assignment?.title || 'Assignment',
      exported_at: exportRow.exported_at,
      session_integrity: sessionIntegrity,
      violation_count: vCount,
      submitted_during_window: submittedDuringWindow,
      message: verified
        ? (sessionIntegrity === 'Clean'
          ? 'Verified: Authentic HumanFirst export with clean session integrity.'
          : `Verified: Authentic HumanFirst export, but session had ${vCount} violation signals.`)
        : 'Verification failed: document appears tampered or not generated by HumanFirst.',
    }), {
      status: 200,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    })
  }
})
