-- Create blocked_urls table for per-policy URL blocking
CREATE TABLE public.blocked_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.exam_policies(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  description text,
  enforcement_mode text NOT NULL DEFAULT 'active' CHECK (enforcement_mode IN ('log_only', 'active')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_urls ENABLE ROW LEVEL SECURITY;

-- Admins can manage blocked URLs in their org
CREATE POLICY "Org admins can manage blocked URLs"
ON public.blocked_urls
FOR ALL
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
  AND organization_id = get_user_organization(auth.uid())
);

-- Students can view blocked URLs for policies assigned to them
CREATE POLICY "Students can view blocked URLs for their policies"
ON public.blocked_urls
FOR SELECT
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND organization_id = get_user_organization(auth.uid())
);

-- Viewers can view blocked URLs
CREATE POLICY "Viewers can view blocked URLs"
ON public.blocked_urls
FOR SELECT
USING (
  has_role(auth.uid(), 'viewer'::app_role)
  AND organization_id = get_user_organization(auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_blocked_urls_policy ON public.blocked_urls(policy_id);
CREATE INDEX idx_blocked_urls_org ON public.blocked_urls(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_blocked_urls_updated_at
  BEFORE UPDATE ON public.blocked_urls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();