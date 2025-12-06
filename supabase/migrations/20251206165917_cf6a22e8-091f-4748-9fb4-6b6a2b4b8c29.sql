-- Drop existing INSERT policy on conversation_participants
DROP POLICY IF EXISTS "Users can insert participations" ON public.conversation_participants;

-- Create a more permissive policy that allows:
-- 1. Users to add themselves to a conversation
-- 2. Conversation creators to add other users (when they created the conversation)
CREATE POLICY "Users can insert participations" 
ON public.conversation_participants 
FOR INSERT 
TO public
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- User can add themselves
    auth.uid() = user_id 
    OR 
    -- User can add others if they created the conversation
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_id 
      AND c.created_by = auth.uid()
    )
  )
);

-- Also add DELETE policy so users can leave conversations
DROP POLICY IF EXISTS "Users can delete their participations" ON public.conversation_participants;
CREATE POLICY "Users can delete their participations" 
ON public.conversation_participants 
FOR DELETE 
TO public
USING (auth.uid() = user_id);