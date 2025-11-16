-- Create scheduled messages table
CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled messages
CREATE POLICY "Users can view their scheduled messages"
  ON public.scheduled_messages
  FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can create scheduled messages"
  ON public.scheduled_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their scheduled messages"
  ON public.scheduled_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their scheduled messages"
  ON public.scheduled_messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- Create theme preferences in profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'theme_color'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN theme_color TEXT DEFAULT '#2dd4bf';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'theme_background'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN theme_background TEXT;
  END IF;
END $$;

-- Enable realtime for scheduled messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_messages;