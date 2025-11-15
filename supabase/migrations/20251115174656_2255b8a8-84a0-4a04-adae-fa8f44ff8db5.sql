-- Add message_reads table for read receipts
CREATE TABLE public.message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Users can view read receipts in their conversations
CREATE POLICY "Users can view read receipts in their conversations"
ON public.message_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.id = message_reads.message_id AND cp.user_id = auth.uid()
  )
);

-- Users can insert their own read receipts
CREATE POLICY "Users can insert their own read receipts"
ON public.message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add group_admins table for group chat admin controls
CREATE TABLE public.group_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on group_admins
ALTER TABLE public.group_admins ENABLE ROW LEVEL SECURITY;

-- Users can view group admins in their conversations
CREATE POLICY "Users can view group admins in their conversations"
ON public.group_admins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = group_admins.conversation_id AND cp.user_id = auth.uid()
  )
);

-- Only group admins can insert new admins
CREATE POLICY "Group admins can insert new admins"
ON public.group_admins
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_admins ga
    WHERE ga.conversation_id = group_admins.conversation_id AND ga.user_id = auth.uid()
  )
);

-- Only group admins can remove admins
CREATE POLICY "Group admins can delete admins"
ON public.group_admins
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM group_admins ga
    WHERE ga.conversation_id = group_admins.conversation_id AND ga.user_id = auth.uid()
  )
);

-- Enable realtime for message_reads
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;