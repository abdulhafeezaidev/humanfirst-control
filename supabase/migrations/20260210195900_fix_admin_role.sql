-- Fix: Set specific user to super_admin
-- This migration sets azmirza4533@gmail.com to super_admin role

UPDATE public.user_roles
SET role = 'super_admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'azmirza4533@gmail.com'
);

-- Also ensure they have a profile entry
INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data ->> 'full_name', 'Admin'), email
FROM auth.users
WHERE email = 'azmirza4533@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Confirm with a comment (visible in migration history)
COMMENT ON TABLE public.user_roles IS 'User roles - azmirza4533@gmail.com set to super_admin';
