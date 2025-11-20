
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;

-- Create a new policy that allows users to add themselves AND other users when creating conversations
CREATE POLICY "Users can insert participations" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  -- User can always add themselves
  auth.uid() = user_id 
  OR
  -- User can add others to a conversation they're also joining
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = conversation_participants.conversation_id 
    AND user_id = auth.uid()
  )
);
