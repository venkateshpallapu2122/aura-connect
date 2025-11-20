
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;

-- Create a better policy that allows:
-- 1. Users to add themselves
-- 2. Users to add others to conversations with no participants yet (new conversation)
-- 3. Users to add others to conversations they're already in
CREATE POLICY "Users can insert participations" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  -- User can always add themselves
  auth.uid() = user_id 
  OR
  -- Or user can add others to a new conversation (no participants yet)
  NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
  )
  OR
  -- Or user can add others to a conversation they're in
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id 
    AND cp.user_id = auth.uid()
  )
);
