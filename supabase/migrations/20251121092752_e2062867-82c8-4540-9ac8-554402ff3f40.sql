-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create a new policy that explicitly allows authenticated users to insert
CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated
WITH CHECK (true);