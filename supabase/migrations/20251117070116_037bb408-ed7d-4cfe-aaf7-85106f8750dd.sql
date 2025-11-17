-- Create pinned_messages table
CREATE TABLE public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = pinned_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can pin messages in their conversations"
  ON public.pinned_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = pinned_by
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = pinned_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unpin messages"
  ON public.pinned_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = pinned_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;