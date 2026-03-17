
-- ═══ Fix 1: Room messages - restrict to room participants ═══
DROP POLICY IF EXISTS "Users can view room messages" ON public.room_messages;

CREATE POLICY "Users view messages in their rooms" ON public.room_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.room_id = room_messages.room_id
    AND (lessons.student_id = auth.uid() OR lessons.tutor_id = auth.uid())
  )
);

-- ═══ Fix 2: Profiles - restrict to own profile or tutors ═══
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view relevant profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.tutors WHERE tutors.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.lessons
    WHERE (lessons.student_id = auth.uid() AND lessons.tutor_id = profiles.user_id)
       OR (lessons.tutor_id = auth.uid() AND lessons.student_id = profiles.user_id)
  )
);

-- ═══ Fix 3: Notifications - add INSERT policy for service role / system ═══
-- Allow authenticated users to receive notifications (inserted by triggers/functions)
CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- ═══ Fix 4: WebRTC signals - restrict view to room participants ═══
DROP POLICY IF EXISTS "Users can view signals in room" ON public.webrtc_signals;

CREATE POLICY "Users view signals in their rooms" ON public.webrtc_signals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.room_id = webrtc_signals.room_id
    AND (lessons.student_id = auth.uid() OR lessons.tutor_id = auth.uid())
  )
);
