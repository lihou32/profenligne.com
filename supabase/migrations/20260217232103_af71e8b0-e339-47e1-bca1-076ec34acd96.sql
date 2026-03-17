-- Add DELETE policies for user-owned data (non-financial)

-- Notifications: users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Room messages: users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.room_messages FOR DELETE
USING (auth.uid() = user_id);

-- AI messages: users can delete messages in their own conversations
CREATE POLICY "Users can delete own ai messages"
ON public.ai_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM ai_conversations
  WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
));