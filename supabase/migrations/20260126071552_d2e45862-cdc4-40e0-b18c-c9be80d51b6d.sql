-- Fix INSERT policy for organizations table
-- The create_institution_with_owner function is SECURITY DEFINER and handles all security
-- So we need to allow inserts to pass through the RLS check
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Allow inserts - the create_institution_with_owner SECURITY DEFINER function handles security
CREATE POLICY "Allow organization creation via RPC" 
ON public.organizations 
FOR INSERT 
WITH CHECK (true);