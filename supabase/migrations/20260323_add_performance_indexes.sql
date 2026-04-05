-- Performance indexes for Prof en Ligne
-- Created: 2026-03-23
-- Purpose: Optimize frequently queried tables

-- Lessons: student/tutor dashboards, calendar views
CREATE INDEX IF NOT EXISTS idx_lessons_student_scheduled ON public.lessons(student_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_tutor_scheduled ON public.lessons(tutor_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_room_id ON public.lessons(room_id);

-- Notifications: user notification list (unread first)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- Room messages: chat in lesson room
CREATE INDEX IF NOT EXISTS idx_room_messages_room_created ON public.room_messages(room_id, created_at DESC);

-- WebRTC signals: real-time signaling
CREATE INDEX IF NOT EXISTS idx_webrtc_signals_room ON public.webrtc_signals(room_id, created_at DESC);

-- AI conversations & messages
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id, created_at);

-- Tutor reviews: profile page
CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor ON public.tutor_reviews(tutor_id, created_at DESC);

-- XP transactions: gamification history
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON public.xp_transactions(user_id, created_at DESC);

-- Referrals: check if user was referred
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON public.referrals(referred_user_id);
