-- Create enforcement status enum
CREATE TYPE public.enforcement_status AS ENUM ('not_connected', 'connected_simulated', 'active');

-- Create enforcement_config table for system-wide enforcement settings
CREATE TABLE public.enforcement_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status enforcement_status NOT NULL DEFAULT 'not_connected',
  status_message text,
  last_updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enforcement_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage enforcement config
CREATE POLICY "Admins can manage enforcement config"
ON public.enforcement_config
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Students can view enforcement config
CREATE POLICY "Students can view enforcement config"
ON public.enforcement_config
FOR SELECT
USING (has_role(auth.uid(), 'student'));

-- Trigger for updated_at
CREATE TRIGGER update_enforcement_config_updated_at
BEFORE UPDATE ON public.enforcement_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default enforcement config (not connected)
INSERT INTO public.enforcement_config (status, status_message) VALUES
  ('not_connected', 'Device enforcement is not yet configured. Policies are informational only.');