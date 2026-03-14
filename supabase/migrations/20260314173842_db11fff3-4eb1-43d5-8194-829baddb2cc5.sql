
-- 1. Fix profiles RLS: require authentication for SELECT
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 2. Make chat-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

-- 3. Add INSERT policy for message_edit_history (currently missing, causes edit failures)
CREATE POLICY "Users can insert edit history for their messages"
  ON public.message_edit_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = edited_by
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_edit_history.message_id
      AND m.sender_id = auth.uid()
    )
  );

-- 4. Add UPDATE policy for conversation_participants (needed for last_read_at)
CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Fix conversation_participants SELECT to see other participants in shared conversations
DROP POLICY IF EXISTS "Users can view their own participations" ON public.conversation_participants;
CREATE POLICY "Users can view participations in their conversations"
  ON public.conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );
