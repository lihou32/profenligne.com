
-- Room chat messages
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Anyone in the room can see messages
CREATE POLICY "Users can view room messages"
ON public.room_messages FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON public.room_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- WebRTC signaling table
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals in room"
ON public.webrtc_signals FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send signals"
ON public.webrtc_signals FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own signals"
ON public.webrtc_signals FOR DELETE
USING (auth.uid() = sender_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;
