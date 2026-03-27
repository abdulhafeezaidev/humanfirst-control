-- Add ethics_accepted_at timestamp to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ethics_accepted_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient querying
CREATE INDEX idx_profiles_ethics_accepted ON public.profiles(ethics_accepted_at);
