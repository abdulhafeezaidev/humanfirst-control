/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: { get: (name: string) => string | undefined }
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ExportMetadata = {
  session_id: string
  student_id: string
  policy_id: string
  org_id: string
  export_timestamp: string
  content_hash: string
  app_version: string
  signature: string | null
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
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const signingSecret = Deno.env.get('EXPORT_SIGNING_SECRET')
    if (!signingSecret) {
      return new Response(JSON.stringify({ error: 'Missing EXPORT_SIGNING_SECRET' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const metadata: ExportMetadata | undefined = body?.metadata
    if (!metadata?.session_id || !metadata?.student_id || !metadata?.policy_id || !metadata?.org_id || !metadata?.content_hash || !metadata?.export_timestamp) {
      return new Response(JSON.stringify({ error: 'Invalid metadata payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (metadata.student_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Student mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: sessionRow, error: sessionError } = await serviceClient
      .from('assignment_sessions')
      .select('id,status,student_id')
      .eq('id', metadata.session_id)
      .eq('student_id', metadata.student_id)
      .eq('status', 'active')
      .maybeSingle()

    if (sessionError || !sessionRow) {
      return new Response(JSON.stringify({ error: 'Session is not active for this student' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const exportId = crypto.randomUUID()
    const signaturePayload = JSON.stringify({
      export_id: exportId,
      session_id: metadata.session_id,
      student_id: metadata.student_id,
      content_hash: metadata.content_hash,
      export_timestamp: metadata.export_timestamp,
    })
    const signature = await hmacSHA256(signingSecret, signaturePayload)

    const { error: insertError } = await serviceClient.from('assignment_exports').insert({
      export_id: exportId,
      session_id: metadata.session_id,
      student_id: metadata.student_id,
      policy_id: metadata.policy_id,
      org_id: metadata.org_id,
      content_hash: metadata.content_hash,
      signature: signature,
      file_name: 'pending.pdf',
      file_size_kb: null,
      verified: false,
    })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ signature, export_id: exportId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
