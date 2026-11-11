-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — refonte sécurité, crédits et cycle de vie des cours
-- 2026-11-11
--
-- Idempotente : peut être rejouée sans erreur.
--
-- Corrige :
--   1. Escalade de privilèges : un utilisateur pouvait s'inscrire avec role=admin
--   2. Les crédits n'étaient jamais débités à la réservation (modèle économique cassé)
--   3. Les cours ne passaient jamais en "in_progress" / "completed"
--      → pas d'XP, pas de gains prof, pas d'avis, pas de certificats
--   4. RPC appelées par le front mais inexistantes : add_credits, become_tutor
--   5. Table "reviews" utilisée par le front mais inexistante
--   6. Table "referrals" utilisée par le front mais jamais créée en migration
--   7. N'importe qui pouvait s'ajouter de l'XP, des gains, des demandes de retrait
--   8. Les participants pouvaient modifier n'importe quelle colonne d'un cours
--      (tutor_id, student_id, statut arbitraire…)
--   9. Les profs pouvaient modifier leur propre note / nombre d'avis
--  10. La marketplace (/tutors) est publique mais les tuteurs n'étaient lisibles
--      qu'une fois connecté
--  11. room_id jamais renseigné → le chat de la salle de cours était bloqué par RLS
--  12. N'importe quel utilisateur pouvait écrire dans le chat / la signalisation
--      WebRTC de n'importe quelle salle
--  13. notifications.link utilisé par le front mais absent du schéma
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. Réconciliation avec la base de production ──────────────────────────
-- La base de prod a dérivé du repo (objets créés hors migrations) :
-- table reviews existante, become_tutor/add_credits en void, complete_referral
-- (SECURITY DEFINER appelable par tous : crédits gratuits), policies d'écriture
-- côté client. On aligne avant d'appliquer le reste.

DROP FUNCTION IF EXISTS public.become_tutor(TEXT[], NUMERIC);
DROP FUNCTION IF EXISTS public.complete_referral(TEXT, UUID);
DROP TRIGGER IF EXISTS trg_sync_lesson_rating ON public.reviews;
DROP FUNCTION IF EXISTS public.sync_lesson_rating();

-- reviews existante : lesson_id facultatif (avis historiques), un avis par cours
DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    ALTER TABLE public.reviews ALTER COLUMN lesson_id DROP NOT NULL;
    ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE public.reviews ALTER COLUMN created_at SET DEFAULT now();
    UPDATE public.reviews SET created_at = now() WHERE created_at IS NULL;
    ALTER TABLE public.reviews ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_comment_length;
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_length
      CHECK (comment IS NULL OR char_length(comment) <= 2000);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_lesson ON public.reviews(lesson_id);
  END IF;
END $$;

-- Toutes les policies d'écriture côté client sur les tables sensibles :
-- l'écriture passe désormais exclusivement par les RPC / triggers ci-dessous.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('INSERT', 'UPDATE', 'ALL')
      AND policyname NOT ILIKE '%admin%'
      AND tablename IN ('reviews', 'referrals', 'user_xp', 'xp_transactions', 'tutor_earnings',
                        'withdrawal_requests', 'credit_transactions', 'user_credits', 'user_roles',
                        'tutor_reviews')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ─── Constantes métier (modifiables en un seul endroit) ─────────────────────
-- 1 crédit = 5 € de valeur faciale. Coût d'un cours = prix du prof × durée / 5 €,
-- arrondi au crédit supérieur. Le prof touche (1 - commission) du prix du cours.
CREATE OR REPLACE FUNCTION public.app_setting(_key TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _key
    WHEN 'credit_value_eur'         THEN 5::numeric
    WHEN 'platform_commission'      THEN 0.20::numeric
    WHEN 'referral_bonus_credits'   THEN 2::numeric
    WHEN 'referral_max_per_user'    THEN 20::numeric
    WHEN 'min_hourly_rate'          THEN 10::numeric
    WHEN 'max_hourly_rate'          THEN 150::numeric
    WHEN 'free_cancel_hours'        THEN 24::numeric
    WHEN 'room_open_minutes_before' THEN 15::numeric
    WHEN 'min_withdrawal_eur'       THEN 20::numeric
  END
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. SCHÉMA
-- ════════════════════════════════════════════════════════════════════════════

-- Lessons : coût en crédits + room_id systématique
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS credits_cost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS cancelled_by UUID;

UPDATE public.lessons SET room_id = id::text WHERE room_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_lesson_room_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.room_id := NEW.id::text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lesson_room_id ON public.lessons;
CREATE TRIGGER trg_set_lesson_room_id
  BEFORE INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_lesson_room_id();

-- Notifications : colonne link + types élargis
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'lesson', 'live', 'ai', 'system', 'payment', 'review', 'referral'));

-- Credit transactions : idempotence Stripe
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_stripe
  ON public.credit_transactions(stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;
-- Montant réellement encaissé (achats Stripe) : les packs sont remisés, donc ≠ crédits × 5 €
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS amount_paid_eur NUMERIC(10,2);

-- Tutor earnings : un seul gain par cours
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_earnings_lesson
  ON public.tutor_earnings(lesson_id)
  WHERE lesson_id IS NOT NULL;

-- Garde-fous de cohérence
ALTER TABLE public.user_credits DROP CONSTRAINT IF EXISTS user_credits_balance_nonneg;
ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_balance_nonneg CHECK (balance >= 0);

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_duration_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_duration_check
  CHECK (duration_minutes IN (20, 30, 45, 60, 90, 120));

ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));
ALTER TABLE public.withdrawal_requests DROP CONSTRAINT IF EXISTS withdrawal_requests_amount_check;
ALTER TABLE public.withdrawal_requests ADD CONSTRAINT withdrawal_requests_amount_check CHECK (amount > 0);

ALTER TABLE public.preregistrations DROP CONSTRAINT IF EXISTS preregistrations_email_format;
ALTER TABLE public.preregistrations ADD CONSTRAINT preregistrations_email_format
  CHECK (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
ALTER TABLE public.preregistrations DROP CONSTRAINT IF EXISTS preregistrations_role_check;
ALTER TABLE public.preregistrations ADD CONSTRAINT preregistrations_role_check
  CHECK (role IN ('student', 'tutor'));

-- ─── Reviews (avis vérifiés, liés à un cours terminé) ───────────────────────
-- tutor_id = auth user id du prof (même convention que lessons.tutor_id)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID UNIQUE REFERENCES public.lessons(id) ON DELETE SET NULL,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_tutor ON public.reviews(tutor_id, created_at DESC);

-- Reprise des anciens avis (tutor_reviews.tutor_id = tutors.id)
INSERT INTO public.reviews (tutor_id, student_id, rating, comment, created_at)
SELECT t.user_id, tr.student_id, tr.rating, tr.comment, tr.created_at
FROM public.tutor_reviews tr
JOIN public.tutors t ON t.id = tr.tutor_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.reviews r
  WHERE r.tutor_id = t.user_id AND r.student_id = tr.student_id AND r.created_at = tr.created_at
);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Referrals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('pending', 'completed', 'rejected'));
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_not_self;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_not_self CHECK (referrer_id <> referred_user_id);

DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Code de parrainage = 8 premiers caractères de l'user_id (convention existante du front)
CREATE OR REPLACE FUNCTION public.referral_code_for(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT upper(left(replace(_user_id::text, '-', ''), 8)) $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. FONCTIONS UTILITAIRES (SECURITY DEFINER, non exposées)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._notify(
  _user_id UUID, _title TEXT, _message TEXT, _type TEXT DEFAULT 'info', _link TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_user_id, _title, _message, _type, _link);
$$;

CREATE OR REPLACE FUNCTION public._credit(
  _user_id UUID, _amount INTEGER, _type TEXT, _description TEXT,
  _stripe_id TEXT DEFAULT NULL, _lesson_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO current_balance
  FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;

  IF current_balance + _amount < 0 THEN
    RAISE EXCEPTION 'Crédits insuffisants : il vous faut % crédit(s), vous en avez %',
      -_amount, current_balance USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.user_credits
     SET balance = balance + _amount
   WHERE user_id = _user_id
  RETURNING balance INTO new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, type, description, stripe_payment_id, lesson_id)
  VALUES (_user_id, _amount, _type, _description, _stripe_id, _lesson_id);

  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.lesson_price_eur(_tutor_id UUID, _duration INTEGER)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(COALESCE(t.hourly_rate, 0) * _duration / 60.0, 2)
  FROM public.tutors t WHERE t.user_id = _tutor_id
$$;

CREATE OR REPLACE FUNCTION public.lesson_credit_cost(_tutor_id UUID, _duration INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(1, ceil(public.lesson_price_eur(_tutor_id, _duration) / public.app_setting('credit_value_eur'))::integer)
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. INSCRIPTION — plus jamais de rôle admin via les métadonnées
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT := NEW.raw_user_meta_data ->> 'role';
  safe_role app_role := 'student';
  ref_code TEXT := upper(trim(NEW.raw_user_meta_data ->> 'referral_code'));
  referrer UUID;
  birth INTEGER;
BEGIN
  -- Seuls student/tutor peuvent être demandés à l'inscription
  IF requested_role = 'tutor' THEN
    safe_role := 'tutor';
  END IF;

  BEGIN
    birth := (NEW.raw_user_meta_data ->> 'birth_year')::integer;
  EXCEPTION WHEN others THEN
    birth := NULL;
  END;

  INSERT INTO public.profiles (user_id, first_name, last_name, grade_level, birth_year, school_type)
  VALUES (
    NEW.id,
    left(COALESCE(NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'given_name', ''), 100),
    left(COALESCE(NEW.raw_user_meta_data ->> 'last_name', NEW.raw_user_meta_data ->> 'family_name', ''), 100),
    NEW.raw_user_meta_data ->> 'grade_level',
    birth,
    NEW.raw_user_meta_data ->> 'school_type'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Parrainage : le code est passé dans les métadonnées à l'inscription
  IF ref_code IS NOT NULL AND char_length(ref_code) = 8 THEN
    SELECT p.user_id INTO referrer
    FROM public.profiles p
    WHERE public.referral_code_for(p.user_id) = ref_code
      AND p.user_id <> NEW.id
    LIMIT 1;

    IF referrer IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_user_id, referral_code, status)
      VALUES (referrer, NEW.id, ref_code, 'pending')
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Comptes existants : s'assurer qu'ils ont un solde
INSERT INTO public.user_credits (user_id, balance)
SELECT p.user_id, 0 FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. RPC PUBLIQUES (appelées par le front, authentifiées)
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Devenir prof ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.become_tutor(p_subjects TEXT[], p_hourly_rate NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  tutor_row_id UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '28000';
  END IF;
  IF p_subjects IS NULL OR cardinality(p_subjects) = 0 OR cardinality(p_subjects) > 6 THEN
    RAISE EXCEPTION 'Choisissez entre 1 et 6 matières' USING ERRCODE = '22023';
  END IF;
  IF p_hourly_rate IS NULL
     OR p_hourly_rate < public.app_setting('min_hourly_rate')
     OR p_hourly_rate > public.app_setting('max_hourly_rate') THEN
    RAISE EXCEPTION 'Le tarif horaire doit être compris entre % € et % €',
      public.app_setting('min_hourly_rate'), public.app_setting('max_hourly_rate')
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tutors (user_id, subjects, hourly_rate, status)
  VALUES (uid, p_subjects, round(p_hourly_rate, 2), 'offline')
  ON CONFLICT (user_id) DO UPDATE
    SET subjects = EXCLUDED.subjects,
        hourly_rate = EXCLUDED.hourly_rate
  RETURNING id INTO tutor_row_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'tutor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN tutor_row_id;
END;
$$;

-- ─── Réserver un cours (débite les crédits de façon atomique) ───────────────
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
  cost INTEGER;
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
  IF p_duration_minutes NOT IN (20, 30, 45, 60, 90, 120) THEN
    RAISE EXCEPTION 'Durée invalide' USING ERRCODE = '22023';
  END IF;

  -- Sérialise les réservations d'un même prof : sans ce verrou, deux élèves
  -- pourraient réserver le même créneau en même temps.
  PERFORM pg_advisory_xact_lock(hashtext('book_lesson:' || p_tutor_id::text));

  -- Pas de double réservation du prof sur un créneau qui se chevauche
  IF EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.tutor_id = p_tutor_id
      AND l.status IN ('pending', 'confirmed', 'in_progress')
      AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
          && tstzrange(p_scheduled_at, p_scheduled_at + make_interval(mins => p_duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Ce professeur a déjà un cours sur ce créneau' USING ERRCODE = '23P01';
  END IF;

  cost := public.lesson_credit_cost(p_tutor_id, p_duration_minutes);

  INSERT INTO public.lessons (student_id, tutor_id, subject, topic, scheduled_at, duration_minutes, status, credits_cost)
  VALUES (uid, p_tutor_id, trim(p_subject), NULLIF(trim(p_topic), ''), p_scheduled_at, p_duration_minutes, 'pending', cost)
  RETURNING * INTO new_lesson;

  -- Débit (lève 'Crédits insuffisants' et annule tout si le solde ne suffit pas)
  PERFORM public._credit(uid, -cost, 'lesson_booking',
    'Réservation : ' || new_lesson.subject, NULL, new_lesson.id);

  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Un élève') INTO student_name
  FROM public.profiles WHERE user_id = uid;

  PERFORM public._notify(p_tutor_id, 'Nouvelle demande de cours',
    student_name || ' souhaite un cours de ' || new_lesson.subject || ' le '
      || to_char(p_scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI') || '.',
    'lesson', '/lessons');

  RETURN new_lesson;
END;
$$;

-- ─── Confirmer (prof) ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_lesson(p_lesson_id UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  l public.lessons;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR l.tutor_id <> uid THEN
    RAISE EXCEPTION 'Cours introuvable' USING ERRCODE = '42501';
  END IF;
  IF l.status <> 'pending' THEN
    RAISE EXCEPTION 'Seul un cours en attente peut être confirmé' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lessons SET status = 'confirmed' WHERE id = p_lesson_id RETURNING * INTO l;

  PERFORM public._notify(l.student_id, 'Cours confirmé ✅',
    'Votre cours de ' || l.subject || ' du '
      || to_char(l.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI') || ' est confirmé.',
    'lesson', '/lessons');
  RETURN l;
END;
$$;

-- ─── Annuler (élève ou prof) — remboursement automatique ────────────────────
-- Règle : refus/annulation par le prof → remboursement total.
--         Annulation par l'élève > 24 h avant → remboursement total,
--         sinon (cours confirmé, < 24 h) → pas de remboursement.
CREATE OR REPLACE FUNCTION public.cancel_lesson(p_lesson_id UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  l public.lessons;
  refund INTEGER := 0;
  other UUID;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR (uid <> l.student_id AND uid <> l.tutor_id AND NOT public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'Cours introuvable' USING ERRCODE = '42501';
  END IF;
  IF l.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Ce cours ne peut plus être annulé' USING ERRCODE = '22023';
  END IF;

  IF uid = l.tutor_id OR public.has_role(uid, 'admin') OR l.status = 'pending'
     OR l.scheduled_at > now() + make_interval(hours => public.app_setting('free_cancel_hours')::int) THEN
    refund := l.credits_cost;
  END IF;

  UPDATE public.lessons
     SET status = 'cancelled', cancelled_by = uid
   WHERE id = p_lesson_id
  RETURNING * INTO l;

  IF refund > 0 THEN
    PERFORM public._credit(l.student_id, refund, 'refund',
      'Remboursement : ' || l.subject, NULL, l.id);
  END IF;

  other := CASE WHEN uid = l.student_id THEN l.tutor_id ELSE l.student_id END;
  PERFORM public._notify(other, 'Cours annulé',
    'Le cours de ' || l.subject || ' du '
      || to_char(l.scheduled_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI') || ' a été annulé.'
      || CASE WHEN other = l.student_id AND refund > 0
              THEN ' ' || refund || ' crédit(s) vous ont été remboursés.' ELSE '' END,
    'lesson', '/lessons');
  RETURN l;
END;
$$;

-- ─── Démarrer (ouverture de la salle) ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_lesson(p_lesson_id UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  l public.lessons;
  caller_name TEXT;
  other UUID;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR (uid <> l.student_id AND uid <> l.tutor_id) THEN
    RAISE EXCEPTION 'Cours introuvable' USING ERRCODE = '42501';
  END IF;
  IF l.status = 'in_progress' THEN
    RETURN l;
  END IF;
  IF l.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Le cours doit être confirmé par le professeur avant de commencer' USING ERRCODE = '22023';
  END IF;
  IF now() < l.scheduled_at - make_interval(mins => public.app_setting('room_open_minutes_before')::int) THEN
    RAISE EXCEPTION 'La salle ouvre % minutes avant le début du cours',
      public.app_setting('room_open_minutes_before') USING ERRCODE = '22023';
  END IF;

  UPDATE public.lessons SET status = 'in_progress', started_at = now()
   WHERE id = p_lesson_id RETURNING * INTO l;

  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Votre interlocuteur') INTO caller_name
  FROM public.profiles WHERE user_id = uid;
  other := CASE WHEN uid = l.student_id THEN l.tutor_id ELSE l.student_id END;
  PERFORM public._notify(other, 'Cours en cours',
    caller_name || ' vous attend dans la salle (' || l.subject || ').',
    'live', '/room/' || l.id);
  RETURN l;
END;
$$;

-- ─── Terminer (prof uniquement) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  l public.lessons;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR (l.tutor_id <> uid AND NOT public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'Seul le professeur peut terminer le cours' USING ERRCODE = '42501';
  END IF;
  IF l.status = 'completed' THEN
    RETURN l;
  END IF;
  IF l.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Le cours n''a pas commencé' USING ERRCODE = '22023';
  END IF;

  -- Les effets (XP, gains prof, parrainage) sont gérés par trigger
  UPDATE public.lessons SET status = 'completed', completed_at = now()
   WHERE id = p_lesson_id RETURNING * INTO l;

  PERFORM public._notify(l.student_id, 'Cours terminé 🎉',
    'Donnez votre avis sur votre cours de ' || l.subject || ' et révisez avec le quiz.',
    'review', '/report/' || l.id);
  RETURN l;
END;
$$;

-- ─── Avis vérifié (élève, cours terminé) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_review(p_lesson_id UUID, p_rating INTEGER, p_comment TEXT)
RETURNS public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  l public.lessons;
  r public.reviews;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id;
  IF NOT FOUND OR l.student_id <> uid THEN
    RAISE EXCEPTION 'Cours introuvable' USING ERRCODE = '42501';
  END IF;
  IF l.status <> 'completed' THEN
    RAISE EXCEPTION 'Vous pourrez noter ce cours une fois terminé' USING ERRCODE = '22023';
  END IF;
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Note invalide' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.reviews (lesson_id, tutor_id, student_id, rating, comment)
  VALUES (p_lesson_id, l.tutor_id, uid, p_rating, NULLIF(left(trim(p_comment), 2000), ''))
  ON CONFLICT (lesson_id) DO UPDATE
    SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
  RETURNING * INTO r;

  PERFORM public._notify(l.tutor_id, 'Nouvel avis ⭐',
    'Vous avez reçu une note de ' || p_rating || '/5 pour votre cours de ' || l.subject || '.',
    'review', '/reviews');
  RETURN r;
END;
$$;

-- ─── Demande de retrait (prof) ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tutor_available_balance(_tutor_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Un prof ne peut consulter que son propre solde
  IF _tutor_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN
    COALESCE((SELECT sum(amount) FROM public.tutor_earnings WHERE tutor_id = _tutor_id), 0)
    - COALESCE((SELECT sum(amount) FROM public.withdrawal_requests
                WHERE tutor_id = _tutor_id AND status <> 'rejected'), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount NUMERIC)
RETURNS public.withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  available NUMERIC;
  w public.withdrawal_requests;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'tutor') THEN
    RAISE EXCEPTION 'Réservé aux professeurs' USING ERRCODE = '42501';
  END IF;
  -- Verrou par prof pour éviter deux retraits simultanés
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || uid::text));

  available := public.tutor_available_balance(uid);
  IF p_amount IS NULL OR p_amount < public.app_setting('min_withdrawal_eur') THEN
    RAISE EXCEPTION 'Montant minimum de retrait : % €', public.app_setting('min_withdrawal_eur') USING ERRCODE = '22023';
  END IF;
  IF p_amount > available THEN
    RAISE EXCEPTION 'Solde disponible insuffisant (% €)', round(available, 2) USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.withdrawal_requests (tutor_id, amount, status)
  VALUES (uid, round(p_amount, 2), 'pending')
  RETURNING * INTO w;
  RETURN w;
END;
$$;

-- ─── Ajout de crédits (Stripe webhook uniquement — service_role) ────────────
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID, p_credits INTEGER, p_description TEXT, p_stripe_session_id TEXT,
  p_amount_paid_eur NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal INTEGER;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'Nombre de crédits invalide' USING ERRCODE = '22023';
  END IF;

  -- Idempotence : Stripe peut renvoyer le même événement plusieurs fois
  IF p_stripe_session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions WHERE stripe_payment_id = p_stripe_session_id
  ) THEN
    SELECT balance INTO bal FROM public.user_credits WHERE user_id = p_user_id;
    RETURN bal;
  END IF;

  bal := public._credit(p_user_id, p_credits, 'purchase', p_description, p_stripe_session_id, NULL);
  UPDATE public.credit_transactions SET amount_paid_eur = p_amount_paid_eur
   WHERE stripe_payment_id = p_stripe_session_id AND p_stripe_session_id IS NOT NULL;
  PERFORM public._notify(p_user_id, 'Paiement reçu 💳',
    p_credits || ' crédits ont été ajoutés à votre compte.', 'payment', '/credits');
  RETURN bal;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGERS DE PROTECTION ET D'EFFETS
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Protection des colonnes sensibles d'un cours ───────────────────────────
-- Les changements de statut passent par les RPC ci-dessus. Un participant ne
-- peut modifier directement que les notes (notes) — rien d'autre.
CREATE OR REPLACE FUNCTION public.guard_lesson_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Appels internes (RPC SECURITY DEFINER, service_role) : current_user = owner
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

DROP TRIGGER IF EXISTS trg_guard_lesson_update ON public.lessons;
CREATE TRIGGER trg_guard_lesson_update
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.guard_lesson_update();

-- ─── Effets de fin de cours : XP + gains prof + parrainage ──────────────────
CREATE OR REPLACE FUNCTION public.on_lesson_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_xp INTEGER := 100;
  tutor_xp   INTEGER := 50;
  gross NUMERIC;
  ref public.referrals;
  bonus INTEGER := public.app_setting('referral_bonus_credits')::int;
  completed_refs INTEGER;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- XP
  INSERT INTO public.xp_transactions (user_id, amount, reason, lesson_id)
  VALUES (NEW.student_id, student_xp, 'Cours complété : ' || NEW.subject, NEW.id),
         (NEW.tutor_id,   tutor_xp,   'Cours enseigné : ' || NEW.subject, NEW.id);

  INSERT INTO public.user_xp (user_id, total_xp) VALUES (NEW.student_id, student_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = public.user_xp.total_xp + student_xp;
  INSERT INTO public.user_xp (user_id, total_xp) VALUES (NEW.tutor_id, tutor_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = public.user_xp.total_xp + tutor_xp;

  -- Gains prof = valeur des crédits payés × (1 − commission)
  gross := NEW.credits_cost * public.app_setting('credit_value_eur');
  INSERT INTO public.tutor_earnings (tutor_id, lesson_id, amount, status)
  VALUES (NEW.tutor_id, NEW.id, round(gross * (1 - public.app_setting('platform_commission')), 2), 'pending')
  ON CONFLICT (lesson_id) WHERE lesson_id IS NOT NULL DO NOTHING;

  -- Parrainage : validé au premier cours terminé du filleul
  SELECT * INTO ref FROM public.referrals
  WHERE referred_user_id = NEW.student_id AND status = 'pending'
  FOR UPDATE;

  IF FOUND THEN
    SELECT count(*) INTO completed_refs FROM public.referrals
    WHERE referrer_id = ref.referrer_id AND status = 'completed';

    IF completed_refs >= public.app_setting('referral_max_per_user') THEN
      UPDATE public.referrals SET status = 'rejected' WHERE id = ref.id;
    ELSE
      UPDATE public.referrals SET status = 'completed', credits_awarded = bonus WHERE id = ref.id;
      PERFORM public._credit(ref.referrer_id, bonus, 'referral', 'Bonus parrainage', NULL, NEW.id);
      PERFORM public._credit(ref.referred_user_id, bonus, 'referral', 'Bonus de bienvenue (parrainage)', NULL, NEW.id);
      PERFORM public._notify(ref.referrer_id, 'Parrainage validé 🎁',
        'Votre filleul a terminé son premier cours : +' || bonus || ' crédits !', 'referral', '/referral');
      PERFORM public._notify(ref.referred_user_id, 'Bonus parrainage 🎁',
        '+' || bonus || ' crédits offerts pour votre premier cours !', 'referral', '/credits');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Remplace l'ancien trigger XP (désormais inclus ci-dessus)
DROP TRIGGER IF EXISTS trg_award_xp_on_lesson_complete ON public.lessons;
DROP TRIGGER IF EXISTS trg_on_lesson_completed ON public.lessons;
CREATE TRIGGER trg_on_lesson_completed
  AFTER UPDATE OF status ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.on_lesson_completed();

-- ─── Protection des colonnes calculées d'un prof ────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_tutor_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
  OR NEW.rating IS DISTINCT FROM OLD.rating
  OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  IF NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
     AND (NEW.hourly_rate < public.app_setting('min_hourly_rate')
          OR NEW.hourly_rate > public.app_setting('max_hourly_rate')) THEN
    RAISE EXCEPTION 'Le tarif horaire doit être compris entre % € et % €',
      public.app_setting('min_hourly_rate'), public.app_setting('max_hourly_rate') USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tutor_update ON public.tutors;
CREATE TRIGGER trg_guard_tutor_update
  BEFORE UPDATE ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.guard_tutor_update();

-- ─── Note moyenne recalculée à chaque avis ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_tutor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target UUID := COALESCE(NEW.tutor_id, OLD.tutor_id);
BEGIN
  UPDATE public.tutors t
     SET rating = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.reviews WHERE tutor_id = target), 0),
         total_reviews = (SELECT count(*) FROM public.reviews WHERE tutor_id = target)
   WHERE t.user_id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_tutor_rating ON public.reviews;
CREATE TRIGGER trg_refresh_tutor_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_tutor_rating();

-- Recalcul initial
UPDATE public.tutors t
   SET rating = COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.reviews r WHERE r.tutor_id = t.user_id), 0),
       total_reviews = (SELECT count(*) FROM public.reviews r WHERE r.tutor_id = t.user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. RLS
-- ════════════════════════════════════════════════════════════════════════════

-- Lessons : plus d'insertion directe (→ book_lesson)
DROP POLICY IF EXISTS "Students can create lessons" ON public.lessons;

-- Tutors : marketplace publique
DROP POLICY IF EXISTS "Anyone can view tutors" ON public.tutors;
CREATE POLICY "Anyone can view tutors" ON public.tutors
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Tutors can insert own info" ON public.tutors;  -- → become_tutor

-- Profiles : les profils de profs sont publics (nom, avatar, bio)
DROP POLICY IF EXISTS "Public can view tutor profiles" ON public.profiles;
CREATE POLICY "Public can view tutor profiles" ON public.profiles
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.tutors WHERE tutors.user_id = profiles.user_id));
-- La policy filtre les lignes ; les droits de colonnes limitent ce qu'un visiteur
-- voit à la partie publique (pas d'année de naissance, de préférences, etc.)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (user_id, first_name, last_name, avatar_url, bio) ON public.profiles TO anon;

-- User roles : un utilisateur ne peut jamais s'attribuer un rôle
-- ("Admins can manage roles" reste la seule policy d'écriture)

-- Notifications : plus d'insertion côté client (tout passe par _notify / edge functions)
DROP POLICY IF EXISTS "Users can receive notifications" ON public.notifications;

-- XP : plus d'écriture côté client (seuls les triggers écrivent)
DROP POLICY IF EXISTS "Service can insert XP" ON public.user_xp;
DROP POLICY IF EXISTS "Service can update XP" ON public.user_xp;
DROP POLICY IF EXISTS "Service can insert XP transactions" ON public.xp_transactions;

-- Gains / retraits : plus d'écriture côté client
DROP POLICY IF EXISTS "Tutors can insert own earnings" ON public.tutor_earnings;
DROP POLICY IF EXISTS "Tutors can insert own withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage earnings" ON public.tutor_earnings;
CREATE POLICY "Admins can manage earnings" ON public.tutor_earnings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view all credits" ON public.user_credits;
CREATE POLICY "Admins can view all credits" ON public.user_credits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.credit_transactions;
CREATE POLICY "Admins can view all transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Chat & signalisation : réservés aux participants du cours
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.room_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.room_messages;
CREATE POLICY "Participants can send messages" ON public.room_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND char_length(content) BETWEEN 1 AND 2000
    AND EXISTS (
      SELECT 1 FROM public.lessons
      WHERE lessons.room_id = room_messages.room_id
        AND (lessons.student_id = auth.uid() OR lessons.tutor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can send signals" ON public.webrtc_signals;
DROP POLICY IF EXISTS "Participants can send signals" ON public.webrtc_signals;
CREATE POLICY "Participants can send signals" ON public.webrtc_signals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.lessons
      WHERE lessons.room_id = webrtc_signals.room_id
        AND (lessons.student_id = auth.uid() OR lessons.tutor_id = auth.uid())
    )
  );

-- Pré-inscriptions : formulaire public (anon + connectés)
DROP POLICY IF EXISTS "Anyone can pre-register" ON public.preregistrations;
CREATE POLICY "Anyone can pre-register" ON public.preregistrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Students can delete own reviews" ON public.reviews;
CREATE POLICY "Students can delete own reviews" ON public.reviews
  FOR DELETE TO authenticated USING (auth.uid() = student_id);
-- Insertion / modification → submit_review uniquement

-- Ancienne table d'avis : lecture seule (données reprises dans reviews)
DROP POLICY IF EXISTS "Students can create reviews" ON public.tutor_reviews;
DROP POLICY IF EXISTS "Students can update own reviews" ON public.tutor_reviews;

-- Referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Insertion → handle_new_user uniquement
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. DROITS D'EXÉCUTION
-- ════════════════════════════════════════════════════════════════════════════

-- Fonctions internes : jamais appelables depuis le client
REVOKE ALL ON FUNCTION public._notify(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._credit(UUID, INTEGER, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT, NUMERIC) TO service_role;
REVOKE ALL ON FUNCTION public.tutor_available_balance(UUID) FROM PUBLIC, anon;

-- RPC utilisateur : connectés uniquement
REVOKE ALL ON FUNCTION public.become_tutor(TEXT[], NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_lesson(UUID, TEXT, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_withdrawal(NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_tutor(TEXT[], NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_lesson(UUID, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_lesson(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_lesson(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_lesson(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_lesson(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_available_balance(UUID) TO authenticated;

-- Fonctions publiques en lecture (affichage du prix avant réservation)
GRANT EXECUTE ON FUNCTION public.lesson_credit_cost(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lesson_price_eur(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.referral_code_for(UUID) TO authenticated;

-- Realtime : notifications en direct
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
