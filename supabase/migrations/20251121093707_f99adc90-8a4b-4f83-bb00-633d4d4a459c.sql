-- Drop the existing policy that uses authenticated role
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a new policy that uses public role (required for Supabase RLS)
-- The authentication is still enforced through the JWT token
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO public
WITH CHECK (auth.uid() IS NOT NULL);