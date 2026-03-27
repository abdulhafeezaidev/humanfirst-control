import { supabase } from "@/integrations/supabase/client";
import type { AssignmentRiskEvent, AssignmentRiskScore } from "@/types/assignmentRisk";

const FUNCTION_NAME = "assignment-risk-event";
const VERIFY_DOMAIN_FUNCTION = "assignment-verify-domain";

export interface DomainVerificationResult {
  domain: string;
  category: "ai" | "safe" | "unknown";
  risk: "low" | "medium" | "high";
  source?: string;
}

/**
 * Sends an assignment risk event to the backend.
 * Uses the Supabase Edge Function endpoint for secure, authenticated delivery.
 */
export async function sendRiskEvent(event: AssignmentRiskEvent): Promise<AssignmentRiskScore | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const url = `${baseUrl}/functions/v1/${FUNCTION_NAME}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify(event),
    });

    if (res.ok) {
      return (await res.json()) as AssignmentRiskScore;
    }
    return null;
  } catch {
    // Fire-and-forget — never block the editor for telemetry failures
    return null;
  }
}

export async function verifyDomain(domain: string): Promise<DomainVerificationResult | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const url = `${baseUrl}/functions/v1/${VERIFY_DOMAIN_FUNCTION}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ domain }),
    });

    if (!res.ok) return null;
    return (await res.json()) as DomainVerificationResult;
  } catch {
    return null;
  }
}

export async function reportDomainVisit(params: {
  domain: string;
  assignmentId?: string;
  sessionId?: string;
  processName?: string;
}): Promise<AssignmentRiskScore | null> {
  const verification = await verifyDomain(params.domain);
  if (!verification || verification.category !== "ai") {
    return null;
  }

  return sendRiskEvent({
    type: "ai_domain_visit",
    domain: verification.domain,
    assignment_id: params.assignmentId,
    session_id: params.sessionId,
    process_name: params.processName,
    severity_level: "HIGH",
    timestamp: Date.now(),
  });
}
