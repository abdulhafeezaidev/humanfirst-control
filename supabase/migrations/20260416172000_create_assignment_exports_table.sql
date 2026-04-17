CREATE TABLE IF NOT EXISTS public.assignment_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id text UNIQUE NOT NULL,
  session_id uuid NOT NULL REFERENCES public.assignment_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.exam_policies(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  signature text NOT NULL,
  file_name text NOT NULL DEFAULT 'pending.pdf',
  file_size_kb integer,
  exported_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  verified boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_assignment_exports_session_id ON public.assignment_exports(session_id);
CREATE INDEX IF NOT EXISTS idx_assignment_exports_student_id ON public.assignment_exports(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_exports_org_id ON public.assignment_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_assignment_exports_exported_at ON public.assignment_exports(exported_at DESC);

ALTER TABLE public.assignment_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignment_exports_students_insert_own
  ON public.assignment_exports
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = assignment_exports.org_id
    )
  );

CREATE POLICY assignment_exports_students_select_own_no_signature
  ON public.assignment_exports
  FOR SELECT
  USING (
    auth.uid() = student_id
  );

CREATE POLICY assignment_exports_teachers_admins_select_org
  ON public.assignment_exports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin', 'viewer')
        AND p.organization_id = assignment_exports.org_id
    )
  );

CREATE POLICY assignment_exports_students_update_own_submission
  ON public.assignment_exports
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY assignment_exports_service_role_full
  ON public.assignment_exports
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
