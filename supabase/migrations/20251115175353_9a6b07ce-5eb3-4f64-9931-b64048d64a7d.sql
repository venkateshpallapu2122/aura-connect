-- Add message_edit_history table for tracking edits
CREATE TABLE public.message_edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_by UUID NOT NULL
);

-- Enable RLS on message_edit_history
ALTER TABLE public.message_edit_history ENABLE ROW LEVEL SECURITY;

-- Users can view edit history in their conversations
CREATE POLICY "Users can view edit history in their conversations"
ON public.message_edit_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.id = message_edit_history.message_id AND cp.user_id = auth.uid()
  )
);

-- Add notification_token to profiles for push notifications
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;

-- Add voice_sessions table for group voice chat
CREATE TABLE public.voice_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on voice_sessions
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view voice sessions in their conversations
CREATE POLICY "Users can view voice sessions in their conversations"
ON public.voice_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = voice_sessions.conversation_id AND cp.user_id = auth.uid()
  )
);

-- Users can create voice sessions in their conversations
CREATE POLICY "Users can create voice sessions in their conversations"
ON public.voice_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = voice_sessions.conversation_id AND cp.user_id = auth.uid()
  )
);

-- Users can update voice sessions they created
CREATE POLICY "Users can update their voice sessions"
ON public.voice_sessions
FOR UPDATE
USING (created_by = auth.uid());

-- Add voice_participants table
CREATE TABLE public.voice_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id)
);

-- Enable RLS on voice_participants
ALTER TABLE public.voice_participants ENABLE ROW LEVEL SECURITY;

-- Users can view participants in sessions they're part of
CREATE POLICY "Users can view voice participants"
ON public.voice_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM voice_sessions vs
    JOIN conversation_participants cp ON vs.conversation_id = cp.conversation_id
    WHERE vs.id = voice_participants.session_id AND cp.user_id = auth.uid()
  )
);

-- Users can insert themselves as participants
CREATE POLICY "Users can join voice sessions"
ON public.voice_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
CREATE POLICY "Users can update their participation"
ON public.voice_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_edit_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_participants;