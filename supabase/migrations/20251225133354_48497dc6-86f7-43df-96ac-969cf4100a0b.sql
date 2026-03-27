-- Create ai_services table
CREATE TABLE public.ai_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  domains text[] NOT NULL DEFAULT '{}',
  is_blocked_during_exam boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_services ENABLE ROW LEVEL SECURITY;

-- Admins can manage AI services
CREATE POLICY "Admins can manage AI services"
ON public.ai_services
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Students can view AI services
CREATE POLICY "Students can view AI services"
ON public.ai_services
FOR SELECT
USING (has_role(auth.uid(), 'student'));

-- Trigger for updated_at
CREATE TRIGGER update_ai_services_updated_at
BEFORE UPDATE ON public.ai_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI services
INSERT INTO public.ai_services (name, category, domains, is_blocked_during_exam) VALUES
  ('ChatGPT', 'AI Chatbot', ARRAY['chat.openai.com', 'chatgpt.com'], true),
  ('Claude', 'AI Chatbot', ARRAY['claude.ai', 'anthropic.com'], true),
  ('Google Gemini', 'AI Chatbot', ARRAY['gemini.google.com', 'bard.google.com'], true),
  ('Perplexity', 'AI Search', ARRAY['perplexity.ai'], true),
  ('GitHub Copilot', 'AI Coding', ARRAY['github.com/features/copilot'], true),
  ('Grammarly AI', 'AI Writing', ARRAY['grammarly.com'], true),
  ('Quillbot', 'AI Writing', ARRAY['quillbot.com'], true),
  ('Wolfram Alpha', 'AI Math', ARRAY['wolframalpha.com'], false),
  ('Photomath', 'AI Math', ARRAY['photomath.com'], true);