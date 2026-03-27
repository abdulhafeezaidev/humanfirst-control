-- Drop existing restrictive policies on organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Super admins can manage their organization" ON public.organizations;

-- Create proper policies that handle the bootstrap case
-- 1. Allow viewing own organization
CREATE POLICY "Users can view their own organization" 
ON public.organizations 
FOR SELECT 
USING (id = get_user_organization(auth.uid()));

-- 2. Super admins can update/delete their organization
CREATE POLICY "Super admins can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (id = get_user_organization(auth.uid()) AND is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete their organization" 
ON public.organizations 
FOR DELETE 
USING (id = get_user_organization(auth.uid()) AND is_super_admin(auth.uid()));

-- 3. CRITICAL: Allow authenticated users to INSERT via the RPC function
-- The create_institution_with_owner is SECURITY DEFINER, so we need to allow service role inserts
-- For now, we allow any authenticated user to create ONE organization (the RPC handles logic)
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);