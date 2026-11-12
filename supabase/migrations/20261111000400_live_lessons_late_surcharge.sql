-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — cours en direct et supplément de soirée
-- 2026-11-11
--
-- Décision de Lihou : un cours « en direct » (l'élève rejoint un prof en ligne
-- tout de suite, sans réserver à l'avance) coûte 5 € de plus s'il commence
-- après 21 h (heure de Paris), quelle que soit sa durée.
--   • Cours en direct = cours qui commence dans les 15 minutes, avec un prof en ligne.
--   • Plage du supplément : de 21 h à 6 h du matin (heure de Paris).
--   • Le supplément fait partie du prix payé : remboursé comme le reste en cas
--     d'annulation, et le prof en touche 80 % comme pour le reste du cours.
-- Idempotent. À exécuter après 20261111000300_fixed_prices_euro_wallet.sql.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_instant BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS surcharge_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_surcharge_nonneg;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_surcharge_nonneg CHECK (surcharge_cents >= 0);

-- Constantes (en plus de celles de 0300)
CREATE OR REPLACE FUNCTION public.app_setting(_key TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _key
    WHEN 'credit_value_eur'         THEN 5::numeric
    WHEN 'platform_commission'      THEN 0.20::numeric
    WHEN 'withdrawal_fee_rate'      THEN 0.02::numeric
    WHEN 'referral_bonus_cents'     THEN 1000::numeric
    WHEN 'referral_bonus_credits'   THEN 2::numeric
    WHEN 'referral_max_per_user'    THEN 20::numeric
    WHEN 'fixed_hourly_rate'        THEN 35::numeric
    WHEN 'min_hourly_rate'          THEN 10::numeric
    WHEN 'max_hourly_rate'          THEN 150::numeric
    WHEN 'free_cancel_hours'        THEN 24::numeric
    WHEN 'room_open_minutes_before' THEN 15::numeric
    WHEN 'min_withdrawal_eur'       THEN 20::numeric
    WHEN 'min_topup_eur'            THEN 15::numeric
    WHEN 'max_topup_eur'            THEN 500::numeric
    WHEN 'instant_window_minutes'   THEN 15::numeric
    WHEN 'late_surcharge_cents'     THEN 500::numeric
    WHEN 'late_start_hour'          THEN 21::numeric
    WHEN 'late_end_hour'            THEN 6::numeric
  END
$$;

-- Supplément d'un cours (0 sauf cours en direct entre 21 h et 6 h, heure de Paris)
CREATE OR REPLACE FUNCTION public.late_surcharge_cents(_starts_at TIMESTAMPTZ, _instant BOOLEAN)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN _instant AND (
      extract(hour FROM _starts_at AT TIME ZONE 'Europe/Paris') >= public.app_setting('late_start_hour')
      OR extract(hour FROM _starts_at AT TIME ZONE 'Europe/Paris') < public.app_setting('late_end_hour')
    ) THEN public.app_setting('late_surcharge_cents')::int
    ELSE 0
  END
$$;

-- ─── Réserver un cours (sur réservation ou en direct) ───────────────────────
CREATE OR REPLACE FUNCTION public.book_lesson(
  p_tutor_id UUID,
  p_subject TEXT,
  p_topic TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_duration_minutes INTEGER
)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  base INTEGER;
  extra INTEGER := 0;
  instant BOOLEAN;
  starts_at TIMESTAMPTZ;
  new_lesson public.lessons;
  student_name TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '28000';
  END IF;
  IF p_tutor_id = uid THEN
    RAISE EXCEPTION 'Vous ne pouvez pas réserver un cours avec vous-même' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tutors WHERE user_id = p_tutor_id) THEN
    RAISE EXCEPTION 'Professeur introuvable' USING ERRCODE = '22023';
  END IF;
  IF p_subject IS NULL OR char_length(trim(p_subject)) = 0 OR char_length(p_subject) > 100 THEN
    RAISE EXCEPTION 'Matière invalide' USING ERRCODE = '22023';
  END IF;
  IF p_topic IS NOT NULL AND char_length(p_topic) > 200 THEN
    RAISE EXCEPTION 'Sujet trop long (200 caractères max)' USING ERRCODE = '22023';
  END IF;
  IF p_scheduled_at IS NULL OR p_scheduled_at < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'La date du cours doit être dans le futur' USING ERRCODE = '22023';
  END IF;
  IF p_scheduled_at > now() + interval '90 days' THEN
    RAISE EXCEPTION 'Réservation possible jusqu''à 90 jours à l''avance' USING ERRCODE = '22023';
  END IF;
  base := public.lesson_price_cents(p_duration_minutes);
  IF base IS NULL THEN
    RAISE EXCEPTION 'Durée invalide' USING ERRCODE = '22023';
  END IF;

  -- Cours en direct : il commence dans les 15 minutes, avec un prof en ligne
  instant := p_scheduled_at <= now() + make_interval(mins => public.app_setting('instant_window_minutes')::int);
  starts_at := GREATEST(p_scheduled_at, now());
  IF instant THEN
    IF NOT EXISTS (SELECT 1 FROM public.tutors WHERE user_id = p_tutor_id AND status = 'online') THEN
      RAISE EXCEPTION 'Ce prof n''est pas en ligne : réserve un créneau plus tard' USING ERRCODE = '22023';
    END IF;
    extra := public.late_surcharge_cents(starts_at, true);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('book_lesson:' || p_tutor_id::text));

  IF EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.tutor_id = p_tutor_id
      AND l.status IN ('pending', 'confirmed', 'in_progress')
      AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
          && tstzrange(p_scheduled_at, p_scheduled_at + make_interval(mins => p_duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Ce professeur a déjà un cours sur ce créneau' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.lessons (student_id, tutor_id, subject, topic, scheduled_at, duration_minutes, status,
                              credits_cost, price_cents, surcharge_cents, is_instant)
  VALUES (uid, p_tutor_id, trim(p_subject), NULLIF(trim(p_topic), ''), p_scheduled_at, p_duration_minutes, 'pending',
          0, base + extra, extra, instant)
  RETURNING * INTO new_lesson;

  PERFORM public._credit(uid, -(base + extra), 'lesson_booking',
    CASE WHEN instant THEN 'Cours en direct : ' ELSE 'Réservation : ' END || new_lesson.subject
      || CASE WHEN extra > 0 THEN ' (dont ' || public._eur(extra) || ' après 21 h)' ELSE '' END,
    NULL, new_lesson.id);

  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Un élève') INTO student_name
  FROM public.profiles WHERE user_id = uid;

  IF instant THEN
    PERFORM public._notify(p_tutor_id, 'Cours en direct demandé ⚡',
      student_name || ' veut un cours de ' || new_lesson.subject || ' maintenant. Accepte-le pour ouvrir la salle.',
      'live', '/lessons');
  ELSE
    PERFORM public._notify(p_tutor_id, 'Nouvelle demande de cours',
      student_name || ' souhaite un cours de ' || new_lesson.subject || ' le '
        || to_char(p_scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI') || '.',
      'lesson', '/lessons');
  END IF;

  RETURN new_lesson;
END;
$$;

-- ─── Protection des colonnes d'un cours (ajoute is_instant, surcharge_cents) ─
CREATE OR REPLACE FUNCTION public.guard_lesson_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.student_id   IS DISTINCT FROM OLD.student_id
  OR NEW.tutor_id     IS DISTINCT FROM OLD.tutor_id
  OR NEW.status       IS DISTINCT FROM OLD.status
  OR NEW.subject      IS DISTINCT FROM OLD.subject
  OR NEW.topic        IS DISTINCT FROM OLD.topic
  OR NEW.credits_cost IS DISTINCT FROM OLD.credits_cost
  OR NEW.price_cents  IS DISTINCT FROM OLD.price_cents
  OR NEW.surcharge_cents IS DISTINCT FROM OLD.surcharge_cents
  OR NEW.is_instant   IS DISTINCT FROM OLD.is_instant
  OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
  OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
  OR NEW.room_id      IS DISTINCT FROM OLD.room_id
  OR NEW.rating       IS DISTINCT FROM OLD.rating
  OR NEW.started_at   IS DISTINCT FROM OLD.started_at
  OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
  OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by
  OR NEW.created_at   IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Modification non autorisée : utilisez les actions dédiées (confirmer, annuler, démarrer, terminer)'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.late_surcharge_cents(TIMESTAMPTZ, BOOLEAN) TO anon, authenticated;
