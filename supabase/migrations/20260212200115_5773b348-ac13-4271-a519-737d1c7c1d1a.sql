
-- Fix overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Only allow inserting notifications for the authenticated user (or via service role for system notifications)
CREATE POLICY "Users can receive notifications" ON public.notifications
FOR INSERT WITH CHECK (auth.uid() = user_id);
