-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — Abonnements élèves « Plus » (9,99 €) et « Bac » (15,99 €)
-- 2026-11-12
--
--   Plus  : priorité dans la file « Rejoindre un cours », annulation gratuite
--           jusqu'à 2 h avant (au lieu de 24 h), offres réservées aux membres,
--           nouveautés en avant-première.
--   Bac   : tout Plus + priorité maximale + pendant les semaines de révision
--           (bac, brevet, partiels… dates fixées par l'admin) : une « question
--           express » gratuite par jour, 10 min avec un prof de permanence, à
--           toute heure. Le prof est payé 5 € par question par la plateforme.
--
--   Paiement depuis le solde en euros, pour 30 jours, SANS renouvellement
--   automatique. Renouveler ajoute 30 jours ; passer de Plus à Bac coûte la
--   différence (6 €) et garde la même date de fin.
-- Idempotent. À exécuter après 20261111000600_agenda_presence.sql.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.app_setting_member(_key TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _key
    WHEN 'plus_price_cents'        THEN 999::numeric
    WHEN 'bac_price_cents'         THEN 1599::numeric
    WHEN 'period_days'             THEN 30::numeric
    WHEN 'max_days_ahead'          THEN 60::numeric   -- on peut payer au plus 2 mois d'avance
    WHEN 'member_cancel_hours'     THEN 2::numeric
    WHEN 'express_minutes'         THEN 10::numeric
    WHEN 'express_per_day'         THEN 1::numeric
    WHEN 'express_payout_cents'    THEN 500::numeric
  END
$$;

-- ─── Tables ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('plus', 'bac')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_user ON public.subscriptions (user_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_read_own" ON public.subscriptions;
CREATE POLICY "subscriptions_read_own" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.subscriptions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;

-- Semaines de révision (bac, brevet, partiels…) : publiques
CREATE TABLE IF NOT EXISTS public.revision_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 2 AND 80),
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on AND ends_on - starts_on <= 31)
);
ALTER TABLE public.revision_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revision_periods_public_read" ON public.revision_periods;
CREATE POLICY "revision_periods_public_read" ON public.revision_periods FOR SELECT USING (true);
DROP POLICY IF EXISTS "revision_periods_admin_write" ON public.revision_periods;
CREATE POLICY "revision_periods_admin_write" ON public.revision_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.revision_periods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.revision_periods TO authenticated;

-- Offres réservées aux membres (publiées par l'admin)
CREATE TABLE IF NOT EXISTS public.member_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 600),
  code TEXT CHECK (code IS NULL OR char_length(code) <= 40),
  plans TEXT[] NOT NULL DEFAULT ARRAY['plus', 'bac'] CHECK (plans <@ ARRAY['plus', 'bac']::text[]),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_offers ENABLE ROW LEVEL SECURITY;

-- ─── Abonnement actif ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._member_plan(_uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT plan FROM public.subscriptions WHERE user_id = _uid AND ends_at > now()
$$;
REVOKE ALL ON FUNCTION public._member_plan(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._revision_period_now()
RETURNS public.revision_periods LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.revision_periods
   WHERE (now() AT TIME ZONE 'Europe/Paris')::date BETWEEN starts_on AND ends_on
   ORDER BY starts_on LIMIT 1
$$;

-- Ma formule active (pour les règles d'accès)
CREATE OR REPLACE FUNCTION public.my_plan()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public._member_plan(auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.my_plan() TO authenticated;

DROP POLICY IF EXISTS "member_offers_members_read" ON public.member_offers;
CREATE POLICY "member_offers_members_read" ON public.member_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin')
         OR (public.my_plan() = ANY (plans) AND (ends_at IS NULL OR ends_at > now())));
DROP POLICY IF EXISTS "member_offers_admin_write" ON public.member_offers;
CREATE POLICY "member_offers_admin_write" ON public.member_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.member_offers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_offers TO authenticated;

-- ─── Élève : où en est mon abonnement ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_membership()
RETURNS TABLE (plan TEXT, ends_at TIMESTAMPTZ, active BOOLEAN, revision_label TEXT, revision_ends_on DATE,
               express_left_today INTEGER, cancel_hours INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  s public.subscriptions;
  rp public.revision_periods;
  used INTEGER;
  on_plan TEXT;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT * INTO s FROM public.subscriptions WHERE user_id = uid;
  rp := public._revision_period_now();
  on_plan := public._member_plan(uid);
  SELECT count(*)::int INTO used FROM public.lessons l
   WHERE l.student_id = uid AND l.is_express AND l.status <> 'cancelled'
     AND (l.scheduled_at AT TIME ZONE 'Europe/Paris')::date = (now() AT TIME ZONE 'Europe/Paris')::date;
  RETURN QUERY SELECT s.plan, s.ends_at, on_plan IS NOT NULL, rp.label, rp.ends_on,
    CASE WHEN on_plan = 'bac' AND rp.id IS NOT NULL
         THEN GREATEST(public.app_setting_member('express_per_day')::int - used, 0) ELSE 0 END,
    CASE WHEN on_plan IS NOT NULL THEN public.app_setting_member('member_cancel_hours')::int
         ELSE public.app_setting('free_cancel_hours')::int END;
END;
$$;
GRANT EXECUTE ON FUNCTION public.my_membership() TO authenticated;

-- ─── Élève : s'abonner, renouveler, passer à Bac ────────────────────────────
CREATE OR REPLACE FUNCTION public.subscribe(p_plan TEXT)
RETURNS public.subscriptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  s public.subscriptions;
  current_plan TEXT;
  price INTEGER;
  period INTERVAL := make_interval(days => public.app_setting_member('period_days')::int);
  label TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_plan NOT IN ('plus', 'bac') THEN
    RAISE EXCEPTION 'Formule inconnue' USING ERRCODE = '22023';
  END IF;
  IF public.has_role(uid, 'tutor') AND NOT public.has_role(uid, 'student') THEN
    RAISE EXCEPTION 'L''abonnement est réservé aux élèves' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('subscribe:' || uid::text));
  SELECT * INTO s FROM public.subscriptions WHERE user_id = uid FOR UPDATE;
  current_plan := CASE WHEN FOUND AND s.ends_at > now() THEN s.plan END;
  label := CASE p_plan WHEN 'plus' THEN 'Plus' ELSE 'Bac' END;

  IF current_plan = 'bac' AND p_plan = 'plus' THEN
    RAISE EXCEPTION 'Tu as déjà l''abonnement Bac : il comprend tout Plus' USING ERRCODE = '22023';
  END IF;

  IF current_plan = 'plus' AND p_plan = 'bac' THEN
    -- Passage à Bac : on paie la différence, la date de fin ne change pas
    price := public.app_setting_member('bac_price_cents')::int - public.app_setting_member('plus_price_cents')::int;
    PERFORM public._credit(uid, -price, 'subscription', 'Abonnement : passage de Plus à Bac', NULL, NULL);
    UPDATE public.subscriptions SET plan = 'bac', updated_at = now() WHERE id = s.id RETURNING * INTO s;
  ELSE
    price := public.app_setting_member(p_plan || '_price_cents')::int;
    IF current_plan IS NOT NULL
       AND s.ends_at + period > now() + make_interval(days => public.app_setting_member('max_days_ahead')::int) THEN
      RAISE EXCEPTION 'Ton abonnement court déjà jusqu''au % : tu pourras le prolonger plus tard',
        to_char(s.ends_at AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY') USING ERRCODE = '22023';
    END IF;
    PERFORM public._credit(uid, -price, 'subscription',
      'Abonnement ' || label || ' : 30 jours' || CASE WHEN current_plan IS NOT NULL THEN ' de plus' ELSE '' END, NULL, NULL);
    IF s.id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, plan, starts_at, ends_at)
      VALUES (uid, p_plan, now(), now() + period) RETURNING * INTO s;
    ELSIF current_plan IS NULL THEN
      UPDATE public.subscriptions SET plan = p_plan, starts_at = now(), ends_at = now() + period, updated_at = now()
       WHERE id = s.id RETURNING * INTO s;
    ELSE
      UPDATE public.subscriptions SET ends_at = s.ends_at + period, updated_at = now()
       WHERE id = s.id RETURNING * INTO s;
    END IF;
  END IF;

  PERFORM public._notify(uid, 'Abonnement ' || CASE s.plan WHEN 'plus' THEN 'Plus' ELSE 'Bac' END || ' actif ⭐',
    'Il court jusqu''au ' || to_char(s.ends_at AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY')
      || '. Il ne se renouvelle pas tout seul.', 'payment', '/abonnement');
  RETURN s;
END;
$$;
REVOKE ALL ON FUNCTION public.subscribe(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe(TEXT) TO authenticated;

-- ─── File d'attente : priorité des membres, questions express ───────────────
ALTER TABLE public.live_requests ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE public.live_requests ADD COLUMN IF NOT EXISTS is_express BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.live_requests DROP CONSTRAINT IF EXISTS live_requests_duration_minutes_check;
ALTER TABLE public.live_requests DROP CONSTRAINT IF EXISTS live_requests_duration_check;
ALTER TABLE public.live_requests ADD CONSTRAINT live_requests_duration_check
  CHECK (duration_minutes IN (20, 30, 45, 60, 90, 120) OR (is_express AND duration_minutes = 10));
DROP INDEX IF EXISTS idx_live_requests_waiting;
CREATE INDEX IF NOT EXISTS idx_live_requests_waiting ON public.live_requests (status, priority DESC, created_at);

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_express BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS tutor_payout_cents INTEGER CHECK (tutor_payout_cents IS NULL OR tutor_payout_cents >= 0);
ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_duration_check;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_duration_check
  CHECK (duration_minutes IN (20, 30, 45, 60, 90, 120) OR (is_express AND duration_minutes = 10));

-- La priorité se fixe à l'entrée dans la file : Bac 2, Plus 1, sans abonnement 0, express 3
CREATE OR REPLACE FUNCTION public.set_live_request_priority()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.priority := CASE WHEN NEW.is_express THEN 3
                       ELSE CASE public._member_plan(NEW.student_id) WHEN 'bac' THEN 2 WHEN 'plus' THEN 1 ELSE 0 END END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_live_request_priority ON public.live_requests;
CREATE TRIGGER trg_live_request_priority BEFORE INSERT ON public.live_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_live_request_priority();

-- Créer le cours d'une demande (express : gratuit pour l'élève, prof payé 5 €)
CREATE OR REPLACE FUNCTION public._start_live_lesson(_req public.live_requests, _tutor UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extra INTEGER := CASE WHEN _req.is_express THEN 0 ELSE public.late_surcharge_cents(now(), true) END;
  total INTEGER := CASE WHEN _req.is_express THEN 0 ELSE public.lesson_price_cents(_req.duration_minutes) + extra END;
  l public.lessons;
  tutor_name TEXT;
  student_name TEXT;
BEGIN
  INSERT INTO public.lessons (student_id, tutor_id, subject, topic, scheduled_at, duration_minutes, status,
                              credits_cost, price_cents, surcharge_cents, is_instant, is_express, tutor_payout_cents)
  VALUES (_req.student_id, _tutor, _req.subject, _req.topic, now(), _req.duration_minutes, 'confirmed',
          0, total, extra, true, _req.is_express,
          CASE WHEN _req.is_express THEN public.app_setting_member('express_payout_cents')::int END)
  RETURNING * INTO l;

  IF total > 0 THEN
    PERFORM public._credit(_req.student_id, -total, 'lesson_booking',
      'Cours en direct : ' || _req.subject
        || CASE WHEN extra > 0 THEN ' (dont ' || public._eur(extra) || ' après 21 h)' ELSE '' END,
      NULL, l.id);
  END IF;

  UPDATE public.live_requests
     SET status = 'matched', tutor_id = _tutor, lesson_id = l.id, matched_at = now()
   WHERE id = _req.id;
  UPDATE public.tutors SET status = 'busy' WHERE user_id = _tutor;

  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Ton prof') INTO tutor_name FROM public.profiles WHERE user_id = _tutor;
  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Un élève') INTO student_name FROM public.profiles WHERE user_id = _req.student_id;
  PERFORM public._notify(_req.student_id, 'C''est parti ⚡',
    tutor_name || ' t''attend pour ' || CASE WHEN _req.is_express THEN 'ta question express' ELSE 'ton cours' END
      || ' de ' || _req.subject || '.', 'live', '/room/' || l.id);
  PERFORM public._notify(_tutor, CASE WHEN _req.is_express THEN 'Question express ⚡' ELSE 'Nouvel élève en direct ⚡' END,
    student_name || ' te rejoint pour ' || _req.subject || ' (' || _req.duration_minutes || ' min'
      || CASE WHEN _req.is_express THEN ', payée ' || public._eur(public.app_setting_member('express_payout_cents')::int) ELSE '' END
      || ').', 'live', '/room/' || l.id);
  RETURN l;
END;
$$;
REVOKE ALL ON FUNCTION public._start_live_lesson(public.live_requests, UUID) FROM PUBLIC, anon, authenticated;

-- Mise en relation : les plus prioritaires d'abord
CREATE OR REPLACE FUNCTION public._match_live_queue()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.live_requests;
  t UUID;
  n INTEGER := 0;
BEGIN
  PERFORM public._sweep_presence();

  UPDATE public.live_requests SET status = 'expired', note = 'Aucun prof libre à temps'
   WHERE status = 'waiting'
     AND created_at < now() - make_interval(mins => public.app_setting_live('queue_timeout_minutes')::int);

  FOR r IN
    SELECT * FROM public.live_requests WHERE status = 'waiting' ORDER BY priority DESC, created_at FOR UPDATE SKIP LOCKED
  LOOP
    SELECT tu.user_id INTO t
      FROM public.tutors tu
     WHERE tu.status = 'online'
       AND tu.last_seen_at >= now() - make_interval(secs => public.app_setting_agenda('presence_timeout_seconds')::int)
       AND NOT COALESCE(tu.is_suspended, false)
       AND tu.user_id <> r.student_id
       AND (cardinality(tu.subjects) = 0 OR r.subject = ANY (tu.subjects))
       AND NOT EXISTS (
         SELECT 1 FROM public.lessons l
          WHERE l.tutor_id = tu.user_id AND l.status IN ('pending', 'confirmed', 'in_progress')
            AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
                && tstzrange(now(), now() + make_interval(mins => r.duration_minutes)))
     ORDER BY tu.rating DESC NULLS LAST, random()
     LIMIT 1
     FOR UPDATE OF tu SKIP LOCKED;

    CONTINUE WHEN t IS NULL;

    BEGIN
      PERFORM public._start_live_lesson(r, t);
      n := n + 1;
    EXCEPTION WHEN raise_exception OR check_violation THEN
      UPDATE public.live_requests SET status = 'cancelled', note = left(SQLERRM, 300) WHERE id = r.id;
      PERFORM public._notify(r.student_id, 'Demande annulée', SQLERRM, 'live', '/credits');
    END;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public._match_live_queue() FROM PUBLIC, anon, authenticated;

-- Position dans la file : comptée par priorité
DROP FUNCTION IF EXISTS public.my_live_request();
CREATE FUNCTION public.my_live_request()
RETURNS TABLE (id UUID, status TEXT, subject TEXT, duration_minutes INTEGER, lesson_id UUID, note TEXT,
               created_at TIMESTAMPTZ, queue_position INTEGER, tutors_online INTEGER, priority SMALLINT, is_express BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  PERFORM public._match_live_queue();
  RETURN QUERY
  SELECT r.id, r.status, r.subject, r.duration_minutes, r.lesson_id, r.note, r.created_at,
         (SELECT count(*)::int + 1 FROM public.live_requests o
           WHERE o.status = 'waiting' AND o.id <> r.id
             AND (o.priority > r.priority OR (o.priority = r.priority AND o.created_at < r.created_at))),
         (SELECT count(*)::int FROM public.tutors tu
           WHERE tu.status = 'online' AND NOT COALESCE(tu.is_suspended, false)
             AND (cardinality(tu.subjects) = 0 OR r.subject = ANY (tu.subjects))),
         r.priority, r.is_express
    FROM public.live_requests r
   WHERE r.student_id = uid
   ORDER BY r.created_at DESC
   LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.my_live_request() TO authenticated;

-- Abonné Bac, semaine de révision : question express gratuite (10 min)
CREATE OR REPLACE FUNCTION public.join_express_queue(p_subject TEXT, p_topic TEXT)
RETURNS public.live_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r public.live_requests;
  left_today INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF public._member_plan(uid) IS DISTINCT FROM 'bac' THEN
    RAISE EXCEPTION 'Les questions express sont réservées à l''abonnement Bac' USING ERRCODE = '42501';
  END IF;
  IF (public._revision_period_now()).id IS NULL THEN
    RAISE EXCEPTION 'Les questions express sont ouvertes pendant les semaines de révision' USING ERRCODE = '22023';
  END IF;
  IF p_subject IS NULL OR char_length(trim(p_subject)) = 0 OR char_length(p_subject) > 100 THEN
    RAISE EXCEPTION 'Choisis une matière' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('live_queue:' || uid::text));
  SELECT express_left_today INTO left_today FROM public.my_membership();
  IF COALESCE(left_today, 0) <= 0
     OR EXISTS (SELECT 1 FROM public.live_requests WHERE student_id = uid AND is_express AND status = 'waiting') THEN
    RAISE EXCEPTION 'Tu as déjà utilisé ta question express du jour : reviens demain, ou rejoins un cours normal' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.live_requests WHERE student_id = uid AND status = 'waiting') THEN
    RAISE EXCEPTION 'Tu es déjà dans la file d''attente' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.live_requests (student_id, subject, topic, duration_minutes, is_express)
  VALUES (uid, trim(p_subject), NULLIF(trim(COALESCE(p_topic, '')), ''),
          public.app_setting_member('express_minutes')::int, true)
  RETURNING * INTO r;

  PERFORM public._match_live_queue();
  SELECT * INTO r FROM public.live_requests WHERE id = r.id;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.join_express_queue(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_express_queue(TEXT, TEXT) TO authenticated;

-- Liste vue par les profs : express en premier, avec ce qu'ils touchent
DROP FUNCTION IF EXISTS public.tutor_live_queue();
CREATE FUNCTION public.tutor_live_queue()
RETURNS TABLE (id UUID, subject TEXT, topic TEXT, duration_minutes INTEGER, student_first_name TEXT,
               created_at TIMESTAMPTZ, price_eur NUMERIC, mine BOOLEAN, is_express BOOLEAN, payout_eur NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  subj TEXT[];
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'tutor') THEN
    RAISE EXCEPTION 'Réservé aux professeurs' USING ERRCODE = '42501';
  END IF;
  SELECT subjects INTO subj FROM public.tutors WHERE user_id = uid;
  RETURN QUERY
  SELECT r.id, r.subject, r.topic, r.duration_minutes, COALESCE(NULLIF(trim(p.first_name), ''), 'Élève'),
         r.created_at,
         CASE WHEN r.is_express THEN 0::numeric
              ELSE round((public.lesson_price_cents(r.duration_minutes) + public.late_surcharge_cents(now(), true)) / 100.0, 2) END,
         (cardinality(COALESCE(subj, '{}')) = 0 OR r.subject = ANY (subj)),
         r.is_express,
         CASE WHEN r.is_express THEN round(public.app_setting_member('express_payout_cents') / 100.0, 2)
              ELSE round((public.lesson_price_cents(r.duration_minutes) + public.late_surcharge_cents(now(), true)) / 100.0
                         * (1 - public.app_setting('platform_commission')), 2) END
    FROM public.live_requests r
    LEFT JOIN public.profiles p ON p.user_id = r.student_id
   WHERE r.status = 'waiting' AND r.student_id <> uid
     AND r.created_at >= now() - make_interval(mins => public.app_setting_live('queue_timeout_minutes')::int)
   ORDER BY r.priority DESC, r.created_at
   LIMIT 50;
END;
$$;
REVOKE ALL ON FUNCTION public.tutor_live_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tutor_live_queue() TO authenticated;

-- Gains du prof pour une question express : montant fixe payé par la plateforme
CREATE OR REPLACE FUNCTION public.fix_express_payout()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.tutor_payout_cents IS NOT NULL THEN
    INSERT INTO public.tutor_earnings (tutor_id, lesson_id, amount, status)
    VALUES (NEW.tutor_id, NEW.id, round(NEW.tutor_payout_cents / 100.0, 2), 'pending')
    ON CONFLICT (lesson_id) WHERE lesson_id IS NOT NULL
    DO UPDATE SET amount = EXCLUDED.amount;
  END IF;
  RETURN NEW;
END;
$$;
-- Nommé pour passer après trg_on_lesson_completed (ordre alphabétique)
DROP TRIGGER IF EXISTS trg_zz_express_payout ON public.lessons;
CREATE TRIGGER trg_zz_express_payout AFTER UPDATE OF status ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.fix_express_payout();

-- Protection : ces colonnes ne se modifient pas à la main
CREATE OR REPLACE FUNCTION public.guard_lesson_member_columns()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.is_express IS DISTINCT FROM OLD.is_express OR NEW.tutor_payout_cents IS DISTINCT FROM OLD.tutor_payout_cents THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_lesson_member_columns ON public.lessons;
CREATE TRIGGER trg_guard_lesson_member_columns BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.guard_lesson_member_columns();

-- ─── Annuler : membres remboursés jusqu'à 2 h avant ─────────────────────────
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
  free_hours INTEGER;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR (uid <> l.student_id AND uid <> l.tutor_id AND NOT public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'Cours introuvable' USING ERRCODE = '42501';
  END IF;
  IF l.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Ce cours ne peut plus être annulé' USING ERRCODE = '22023';
  END IF;

  free_hours := CASE WHEN public._member_plan(l.student_id) IS NOT NULL
                     THEN public.app_setting_member('member_cancel_hours')::int
                     ELSE public.app_setting('free_cancel_hours')::int END;

  IF uid = l.tutor_id OR public.has_role(uid, 'admin') OR l.status = 'pending'
     OR l.scheduled_at > now() + make_interval(hours => free_hours) THEN
    refund := l.price_cents;
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
              THEN ' ' || public._eur(refund) || ' ont été remis sur votre solde.' ELSE '' END,
    'lesson', '/lessons');
  RETURN l;
END;
$$;

-- ─── Admin : chiffres des abonnements ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_membership_stats()
RETURNS TABLE (plus_active INTEGER, bac_active INTEGER, ending_7d INTEGER, express_this_month INTEGER,
               express_cost_eur NUMERIC, revenue_30d_eur NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    (SELECT count(*)::int FROM public.subscriptions WHERE plan = 'plus' AND ends_at > now()),
    (SELECT count(*)::int FROM public.subscriptions WHERE plan = 'bac' AND ends_at > now()),
    (SELECT count(*)::int FROM public.subscriptions WHERE ends_at > now() AND ends_at < now() + interval '7 days'),
    (SELECT count(*)::int FROM public.lessons WHERE is_express AND status = 'completed'
       AND scheduled_at >= date_trunc('month', now())),
    (SELECT COALESCE(sum(tutor_payout_cents), 0) / 100.0 FROM public.lessons WHERE is_express AND status = 'completed'
       AND scheduled_at >= date_trunc('month', now())),
    (SELECT COALESCE(-sum(amount), 0) / 100.0 FROM public.credit_transactions
      WHERE type = 'subscription' AND created_at >= now() - interval '30 days');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_membership_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_membership_stats() TO authenticated;
