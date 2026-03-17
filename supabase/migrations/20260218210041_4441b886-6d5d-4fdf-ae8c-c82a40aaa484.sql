
-- ─── XP system ───────────────────────────────────────────────────────────────

-- Table: cumulative XP per user
CREATE TABLE public.user_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP"
  ON public.user_xp FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all XP for leaderboard"
  ON public.user_xp FOR SELECT
  USING (true);

CREATE POLICY "Service can insert XP"
  ON public.user_xp FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update XP"
  ON public.user_xp FOR UPDATE
  USING (true);

-- Table: XP transaction history
CREATE TABLE public.xp_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert XP transactions"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (true);

-- ─── Trigger: award XP when lesson is marked completed ───────────────────────

CREATE OR REPLACE FUNCTION public.award_xp_on_lesson_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_xp INTEGER := 100;
  tutor_xp   INTEGER := 50;
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    -- Award XP to student
    INSERT INTO public.xp_transactions (user_id, amount, reason, lesson_id)
    VALUES (NEW.student_id, student_xp, 'Cours complété : ' || NEW.subject, NEW.id);

    INSERT INTO public.user_xp (user_id, total_xp)
    VALUES (NEW.student_id, student_xp)
    ON CONFLICT (user_id)
    DO UPDATE SET total_xp = public.user_xp.total_xp + student_xp,
                  updated_at = now();

    -- Award XP to tutor
    INSERT INTO public.xp_transactions (user_id, amount, reason, lesson_id)
    VALUES (NEW.tutor_id, tutor_xp, 'Cours enseigné : ' || NEW.subject, NEW.id);

    INSERT INTO public.user_xp (user_id, total_xp)
    VALUES (NEW.tutor_id, tutor_xp)
    ON CONFLICT (user_id)
    DO UPDATE SET total_xp = public.user_xp.total_xp + tutor_xp,
                  updated_at = now();

  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_xp_on_lesson_complete
  AFTER UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.award_xp_on_lesson_complete();

-- Trigger for updated_at on user_xp
CREATE TRIGGER update_user_xp_updated_at
  BEFORE UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
