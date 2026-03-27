-- Create student invitations table
CREATE TABLE public.student_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on token
ALTER TABLE public.student_invitations ADD CONSTRAINT student_invitations_token_unique UNIQUE (token);

-- Enable RLS
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;

-- Admins and super admins can manage student invitations in their org
CREATE POLICY "Admins can manage student invitations"
ON public.student_invitations
FOR ALL
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
  AND organization_id = get_user_organization(auth.uid())
);

-- Create index for token lookups
CREATE INDEX idx_student_invitations_token ON public.student_invitations(token);
CREATE INDEX idx_student_invitations_org ON public.student_invitations(organization_id);