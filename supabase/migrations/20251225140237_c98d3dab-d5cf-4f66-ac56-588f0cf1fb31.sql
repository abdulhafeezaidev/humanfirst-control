-- Create tamper_events table
CREATE TABLE public.tamper_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  event_type text NOT NULL,
  exam_policy_id uuid REFERENCES public.exam_policies(id),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.tamper_events ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all tamper events
CREATE POLICY "Admins can manage tamper events"
  ON public.tamper_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can view their own tamper events
CREATE POLICY "Students can view own tamper events"
  ON public.tamper_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Students can insert their own tamper events
CREATE POLICY "Students can insert own tamper events"
  ON public.tamper_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_tamper_events_user ON public.tamper_events(user_id);
CREATE INDEX idx_tamper_events_timestamp ON public.tamper_events(timestamp DESC);
CREATE INDEX idx_tamper_events_resolved ON public.tamper_events(resolved) WHERE NOT resolved;

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.tamper_events;

-- Add device_id to profiles for tracking
ALTER TABLE public.profiles 
ADD COLUMN device_id text;