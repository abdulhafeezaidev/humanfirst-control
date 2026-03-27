-- Assignment Sessions Table
-- Tracks session anchors and metadata for assignment submission integrity system.
-- Layer 1 & 5: Session start and submission anchoring.

CREATE TABLE IF NOT EXISTS public.assignment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.exam_policies(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'submitted', 'expired', 'abandoned')),
  
  -- Layer 2: Focus loss tracking
  focus_loss_count integer NOT NULL DEFAULT 0,
  focus_loss_seconds integer NOT NULL DEFAULT 0,
  
  -- Layer 3: Browser monitoring
  blocked_domain_count integer NOT NULL DEFAULT 0,
  ai_domain_visit_count integer NOT NULL DEFAULT 0,
  
  -- Layer 4: Paste detection
  large_paste_count integer NOT NULL DEFAULT 0,
  total_paste_characters integer NOT NULL DEFAULT 0,
  
  -- Layer 5: Submission metadata
  file_name text,
  file_size_kb integer,
  submission_url text,
  
  -- Metadata
  environment text DEFAULT 'web' CHECK (environment IN ('desktop', 'web')),
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignment_sessions_student
  ON public.assignment_sessions (student_id);

CREATE INDEX IF NOT EXISTS idx_assignment_sessions_policy
  ON public.assignment_sessions (policy_id);

CREATE INDEX IF NOT EXISTS idx_assignment_sessions_assignment
  ON public.assignment_sessions (assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_sessions_status
  ON public.assignment_sessions (status);

CREATE INDEX IF NOT EXISTS idx_assignment_sessions_started_at
  ON public.assignment_sessions (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignment_sessions_submitted_at
  ON public.assignment_sessions (submitted_at DESC);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE public.assignment_sessions ENABLE ROW LEVEL SECURITY;

-- Students can read their own sessions
CREATE POLICY "Students can read own sessions"
  ON public.assignment_sessions FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own sessions
CREATE POLICY "Students can insert own sessions"
  ON public.assignment_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can update their own sessions (status, metrics)
CREATE POLICY "Students can update own sessions"
  ON public.assignment_sessions FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Teachers/admins can read sessions for assignments in their organization
CREATE POLICY "Teachers can read org sessions"
  ON public.assignment_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      JOIN public.assignments a ON a.id = assignment_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'teacher', 'viewer')
        AND p.organization_id = a.organization_id
    )
  );

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role manages sessions"
  ON public.assignment_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
