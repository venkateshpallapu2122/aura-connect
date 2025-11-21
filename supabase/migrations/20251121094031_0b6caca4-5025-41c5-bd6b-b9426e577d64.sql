-- Add created_by column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Update the RLS policy to check the created_by column
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
TO public
WITH CHECK (auth.uid() = created_by);

-- Also ensure users can see conversations they created (update SELECT policy)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in" 
ON public.conversations 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
  OR auth.uid() = created_by
);