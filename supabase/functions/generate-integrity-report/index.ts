import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateReportRequest {
  student_id: string
  policy_id: string
}

interface ViolationLog {
  id: string
  event_type: string
  occurred_at: string
  metadata: Record<string, any>
}

interface IntegrityReport {
  student_name: string
  assignment_name: string
  session_date: string
  submitted: boolean
  submitted_at: string | null
  session_duration_minutes: number
  verdict: 'Clean' | 'Suspicious' | 'High Risk'
  violations: string[]
  plain_summary: string
  risk_score: number
}

// Verdict calculation
function calculateVerdict(violations: ViolationLog[]): {
  score: number
  verdict: 'Clean' | 'Suspicious' | 'High Risk'
} {
  let score = 0

  violations.forEach((v) => {
    switch (v.event_type) {
      case 'blocked_app_killed':
        score += 3
        break
      case 'blocked_domain_attempt':
        score += 3
        break
      case 'app_focus_lost':
        if ((v.metadata.duration_seconds ?? 0) > 120) {
          score += 2
        }
        break
      case 'large_paste_detected':
        score += 2
        break
      case 'tamper_attempt':
        score += 5
        break
      case 'external_browser_attempt':
        score += 3
        break
    }
  })

  // Check if assignment was submitted
  const hasSubmission = violations.some((v) => v.event_type === 'assignment_submitted')
  if (!hasSubmission) {
    score += 4
  }

  return {
    score,
    verdict: score === 0 ? 'Clean' : score <= 5 ? 'Suspicious' : 'High Risk',
  }
}

// Convert violation to plain English
function violationToEnglish(v: ViolationLog): string {
  const time = new Date(v.occurred_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  switch (v.event_type) {
    case 'blocked_app_killed':
      return `Attempted to open ${v.metadata.process_name || 'an application'} at ${time} — blocked by HumanFirst`
    case 'blocked_domain_attempt':
      return `Tried to visit ${v.metadata.domain || 'a website'} at ${time} — access was blocked`
    case 'app_focus_lost':
      const mins = Math.round((v.metadata.duration_seconds ?? 0) / 60)
      return `Left the assignment app at ${time} for ${mins} minute${mins !== 1 ? 's' : ''}`
    case 'large_paste_detected':
      const chars = v.metadata.character_count ?? 0
      return `Pasted ${chars} characters at ${time} into the editor`
    case 'tamper_attempt':
      return `Attempted to close or disable HumanFirst at ${time}`
    case 'external_browser_attempt':
      return `Tried to open an external browser at ${time} — blocked`
    case 'assignment_submitted':
      return `Assignment submitted via LMS at ${time}`
    default:
      return `Event: ${v.event_type} at ${time}`
  }
}

export async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const body = (await req.json()) as GenerateReportRequest
    const { student_id, policy_id } = body

    if (!student_id || !policy_id) {
      return new Response(
        JSON.stringify({ error: 'Missing student_id or policy_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch student and assignment info
    const { data: student } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('id', student_id)
      .single()

    const { data: policy } = await supabase
      .from('exam_policies')
      .select('id, title, assignment_id')
      .eq('id', policy_id)
      .single()

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, title')
      .eq('id', policy?.assignment_id ?? '')
      .single()

    // Fetch all violation logs for this student + policy
    const { data: logs } = (await supabase
      .from('violation_logs')
      .select('*')
      .eq('student_id', student_id)
      .eq('policy_id', policy_id)
      .order('occurred_at', { ascending: true })) as { data: ViolationLog[] | null }

    const violations = logs ?? []

    // Get session date and duration
    const sessionStart = violations.find((v) => v.event_type === 'session_start')
    const sessionEnd = violations.find((v) => v.event_type === 'session_end')
    const submitted = violations.some((v) => v.event_type === 'assignment_submitted')
    const submittedLog = violations.find((v) => v.event_type === 'assignment_submitted')

    const startTime = sessionStart ? new Date(sessionStart.occurred_at) : new Date()
    const endTime = sessionEnd ? new Date(sessionEnd.occurred_at) : new Date()
    const sessionDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

    // Calculate verdict
    const { score: riskScore, verdict } = calculateVerdict(violations)

    // Filter violations for report (exclude session markers)
    const reportViolations = violations.filter(
      (v) => v.event_type !== 'session_start' && v.event_type !== 'session_end',
    )

    // Convert violations to plain English
    const violationSentences = reportViolations.map(violationToEnglish)

    // Build plain summary paragraph
    const studentName = `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim()
    const assignmentName = assignment?.title ?? 'Assignment'
    const sessionDate = startTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    let plainSummary = `${studentName} completed a ${sessionDurationMinutes} minute assignment session on ${sessionDate}. `

    if (verdict === 'Clean') {
      plainSummary += `No violations were detected. `
    } else {
      const violationCount = violationSentences.length
      const topViolations = violationSentences.slice(0, 3).join(' ')
      plainSummary += `During the session, ${violationCount} violation(s) were detected including: ${topViolations}. `
    }

    if (submitted && submittedLog) {
      const submittedTime = new Date(submittedLog.occurred_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
      plainSummary += `Assignment was submitted at ${submittedTime}.`
    } else {
      plainSummary += `Assignment was NOT submitted through HumanFirst.`
    }

    plainSummary += ` This report contains behavioral signals only. Final academic judgment remains with the instructor.`

    const report: IntegrityReport = {
      student_name: studentName,
      assignment_name: assignmentName,
      session_date: sessionDate,
      submitted,
      submitted_at: submittedLog
        ? new Date(submittedLog.occurred_at).toISOString()
        : null,
      session_duration_minutes: sessionDurationMinutes,
      verdict,
      violations: violationSentences,
      plain_summary: plainSummary,
      risk_score: riskScore,
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate report' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
