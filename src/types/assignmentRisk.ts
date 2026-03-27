export interface AssignmentRiskEvent {
  type: "editor_large_paste" | "suspicious_insert" | "ai_domain_visit" | "extended_research_no_typing";
  length?: number;
  domain?: string;
  assignment_id?: string;
  session_id?: string;
  process_name?: string;
  severity_level?: "LOW" | "MEDIUM" | "HIGH";
  timestamp: number;
}

export interface AssignmentRiskScore {
  student_id: string;
  assignment_id: string;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}
