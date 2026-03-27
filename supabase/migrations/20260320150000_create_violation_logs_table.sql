-- Create violation_logs table with lean schema
-- Stores only policy violations and session anchors

CREATE TABLE violation_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  policy_id      UUID NOT NULL REFERENCES exam_policies(id) ON DELETE CASCADE,
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  event_type     TEXT NOT NULL CHECK (event_type IN (
    'session_start',
    'session_end',
    'assignment_submitted',
    'blocked_app_killed',
    'blocked_domain_attempt',
    'large_paste_detected',
    'paste_acknowledged',
    'app_focus_lost',
    'tamper_attempt',
    'external_browser_attempt'
  )),
  
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB DEFAULT '{}',
  session_id     UUID DEFAULT NULL,
  
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_violation_logs_student_policy_date 
  ON violation_logs(student_id, policy_id, occurred_at DESC);

CREATE INDEX idx_violation_logs_org_date 
  ON violation_logs(org_id, occurred_at DESC);

CREATE INDEX idx_violation_logs_session 
  ON violation_logs(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX idx_violation_logs_event_type 
  ON violation_logs(event_type);

-- Row Level Security Policies

-- Students cannot read their own violation logs
CREATE POLICY violation_logs_student_deny ON violation_logs
  FOR SELECT
  USING (
    auth.uid() = student_id AND 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  )
  WITH CHECK (false);

-- Teachers/admins can only see violations in their org
CREATE POLICY violation_logs_teacher_access ON violation_logs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    ) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin', 'super_admin')
  );

-- Super admin can see everything
CREATE POLICY violation_logs_super_admin_access ON violation_logs
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Only authenticated users can insert
CREATE POLICY violation_logs_insert_authenticated ON violation_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS
ALTER TABLE violation_logs ENABLE ROW LEVEL SECURITY;

-- Create comment documenting the table
COMMENT ON TABLE violation_logs IS 'Lean violation-only logging for assignment integrity. Only violations and session anchors are stored. No file/editor content. All PII removed. Used for audit trails and admin reporting.';
