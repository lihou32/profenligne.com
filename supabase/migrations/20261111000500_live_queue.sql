-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — « Rejoindre un cours » : mise en relation immédiate + file d'attente
-- 2026-11-11
--
-- L'idée de Lihou : l'« ubérisation » des profs. Il est 23 h, un DM pour demain :
-- l'élève choisit sa matière et sa durée (dès 20 min), clique « Rejoindre », et se
-- retrouve en cours dans la minute avec un prof en ligne. S'il n'y a aucun prof
-- libre, il passe en file d'attente : le premier prof qui se libère (ou se met en
-- ligne, ou accepte depuis sa liste) le prend.
--
--   • Un prof « en ligne » (tutors.status = 'online') accepte les élèves de la file :
--     la mise en relation est automatique, le cours est créé déjà confirmé et le
--     prof passe « occupé » ('busy') ; il redevient « en ligne » à la fin du cours.
--   • Le prix est celui de la grille + le supplément de 5 € entre 21 h et 6 h
--     (cours en direct, migration 0400). Il est débité au moment de la mise en
--     relation ; à l'entrée dans la file on vérifie seulement que le solde suffit.
--   • Une demande attend 30 minutes au plus, puis expire.
-- Idempotent. À exécuter après 20261111000400_live_lessons_late_surcharge.sql.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.live_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 100),
  topic TEXT CHECK (topic IS NULL OR char_length(topic) <= 200),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (20, 30, 45, 60, 90, 120)),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled', 'expired')),
  tutor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_live_requests_waiting ON public.live_requests (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_live_requests_one_waiting ON public.live_requests (student_id) WHERE status = 'waiting';

ALTER TABLE public.live_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "live_requests_read_own" ON public.live_requests;
CREATE POLICY "live_requests_read_own" ON public.live_requests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.live_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.live_requests FROM authenticated;

CREATE OR REPLACE FUNCTION public.app_setting_live(_key TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _key WHEN 'queue_timeout_minutes' THEN 30::numeric END
$$;

-- ─── Créer le cours pour une demande et un prof donnés (interne) ────────────
CREATE OR REPLACE FUNCTION public._start_live_lesson(_req public.live_requests, _tutor UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extra INTEGER := public.late_surcharge_cents(now(), true);
  total INTEGER := public.lesson_price_cents(_req.duration_minutes) + extra;
  l public.lessons;
  tutor_name TEXT;
  student_name TEXT;
BEGIN
  INSERT INTO public.lessons (student_id, tutor_id, subject, topic, scheduled_at, duration_minutes, status,
                              credits_cost, price_cents, surcharge_cents, is_instant)
  VALUES (_req.student_id, _tutor, _req.subject, _req.topic, now(), _req.duration_minutes, 'confirmed',
          0, total, extra, true)
  RETURNING * INTO l;

  -- Débit (lève « Solde insuffisant » si l'élève a dépensé son solde entre-temps)
  PERFORM public._credit(_req.student_id, -total, 'lesson_booking',
    'Cours en direct : ' || _req.subject
      || CASE WHEN extra > 0 THEN ' (dont ' || public._eur(extra) || ' après 21 h)' ELSE '' END,
    NULL, l.id);

  UPDATE public.live_requests
     SET status = 'matched', tutor_id = _tutor, lesson_id = l.id, matched_at = now()
   WHERE id = _req.id;
  UPDATE public.tutors SET status = 'busy' WHERE user_id = _tutor;

  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Ton prof') INTO tutor_name FROM public.profiles WHERE user_id = _tutor;
  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Un élève') INTO student_name FROM public.profiles WHERE user_id = _req.student_id;
  PERFORM public._notify(_req.student_id, 'C''est parti ⚡',
    tutor_name || ' t''attend pour ton cours de ' || _req.subject || '.', 'live', '/room/' || l.id);
  PERFORM public._notify(_tutor, 'Nouvel élève en direct ⚡',
    student_name || ' te rejoint pour ' || _req.subject || ' (' || _req.duration_minutes || ' min).', 'live', '/room/' || l.id);
  RETURN l;
END;
$$;

-- ─── Mise en relation : vide la file autant que possible (interne) ─────────
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
  -- Les demandes trop anciennes expirent
  UPDATE public.live_requests SET status = 'expired', note = 'Aucun prof libre à temps'
   WHERE status = 'waiting'
     AND created_at < now() - make_interval(mins => public.app_setting_live('queue_timeout_minutes')::int);

  FOR r IN
    SELECT * FROM public.live_requests WHERE status = 'waiting' ORDER BY created_at FOR UPDATE SKIP LOCKED
  LOOP
    SELECT tu.user_id INTO t
      FROM public.tutors tu
     WHERE tu.status = 'online'
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

-- ─── Élève : rejoindre un cours ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_live_queue(p_subject TEXT, p_topic TEXT, p_duration_minutes INTEGER)
RETURNS public.live_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  need INTEGER;
  bal INTEGER;
  r public.live_requests;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_subject IS NULL OR char_length(trim(p_subject)) = 0 OR char_length(p_subject) > 100 THEN
    RAISE EXCEPTION 'Choisis une matière' USING ERRCODE = '22023';
  END IF;
  IF public.lesson_price_cents(p_duration_minutes) IS NULL THEN
    RAISE EXCEPTION 'Durée invalide' USING ERRCODE = '22023';
  END IF;

  need := public.lesson_price_cents(p_duration_minutes) + public.late_surcharge_cents(now(), true);
  SELECT COALESCE(balance, 0) INTO bal FROM public.user_credits WHERE user_id = uid;
  IF COALESCE(bal, 0) < need THEN
    RAISE EXCEPTION 'Solde insuffisant : ce cours coûte %, ton solde est de %. Recharge ton solde pour rejoindre un cours.',
      public._eur(need), public._eur(COALESCE(bal, 0)) USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('live_queue:' || uid::text));
  IF EXISTS (SELECT 1 FROM public.live_requests WHERE student_id = uid AND status = 'waiting') THEN
    RAISE EXCEPTION 'Tu es déjà dans la file d''attente' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.live_requests (student_id, subject, topic, duration_minutes)
  VALUES (uid, trim(p_subject), NULLIF(trim(COALESCE(p_topic, '')), ''), p_duration_minutes)
  RETURNING * INTO r;

  PERFORM public._match_live_queue();
  SELECT * INTO r FROM public.live_requests WHERE id = r.id;
  RETURN r;
END;
$$;

-- ─── Élève : quitter la file ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_live_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_requests SET status = 'cancelled', note = 'Annulée par l''élève'
   WHERE id = p_request_id AND student_id = auth.uid() AND status = 'waiting';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable ou déjà traitée' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- ─── Élève : où j'en suis dans la file ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_live_request()
RETURNS TABLE (id UUID, status TEXT, subject TEXT, duration_minutes INTEGER, lesson_id UUID, note TEXT,
               created_at TIMESTAMPTZ, queue_position INTEGER, tutors_online INTEGER)
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
  -- Retente une mise en relation à chaque consultation (un prof a pu se libérer)
  PERFORM public._match_live_queue();
  RETURN QUERY
  SELECT r.id, r.status, r.subject, r.duration_minutes, r.lesson_id, r.note, r.created_at,
         (SELECT count(*)::int + 1 FROM public.live_requests o
           WHERE o.status = 'waiting' AND o.created_at < r.created_at),
         (SELECT count(*)::int FROM public.tutors tu
           WHERE tu.status = 'online' AND NOT COALESCE(tu.is_suspended, false)
             AND (cardinality(tu.subjects) = 0 OR r.subject = ANY (tu.subjects)))
    FROM public.live_requests r
   WHERE r.student_id = uid
   ORDER BY r.created_at DESC
   LIMIT 1;
END;
$$;

-- ─── Public : profs en ligne et élèves en attente (pour l'accueil) ──────────
CREATE OR REPLACE FUNCTION public.live_stats()
RETURNS TABLE (tutors_online INTEGER, students_waiting INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT count(*)::int FROM public.tutors WHERE status = 'online' AND NOT COALESCE(is_suspended, false)),
         (SELECT count(*)::int FROM public.live_requests WHERE status = 'waiting'
            AND created_at >= now() - make_interval(mins => public.app_setting_live('queue_timeout_minutes')::int))
$$;

-- ─── Prof : voir la file et prendre un élève ────────────────────────────────
CREATE OR REPLACE FUNCTION public.tutor_live_queue()
RETURNS TABLE (id UUID, subject TEXT, topic TEXT, duration_minutes INTEGER, student_first_name TEXT,
               created_at TIMESTAMPTZ, price_eur NUMERIC, mine BOOLEAN)
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
         round((public.lesson_price_cents(r.duration_minutes) + public.late_surcharge_cents(now(), true)) / 100.0, 2),
         (cardinality(COALESCE(subj, '{}')) = 0 OR r.subject = ANY (subj))
    FROM public.live_requests r
    LEFT JOIN public.profiles p ON p.user_id = r.student_id
   WHERE r.status = 'waiting' AND r.student_id <> uid
     AND r.created_at >= now() - make_interval(mins => public.app_setting_live('queue_timeout_minutes')::int)
   ORDER BY r.created_at
   LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.tutor_accept_live_request(p_request_id UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r public.live_requests;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'tutor') THEN
    RAISE EXCEPTION 'Réservé aux professeurs' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tutors WHERE user_id = uid AND is_suspended) THEN
    RAISE EXCEPTION 'Ton profil est suspendu' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.live_requests WHERE id = p_request_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND OR r.status <> 'waiting' THEN
    RAISE EXCEPTION 'Un autre prof a déjà pris cet élève' USING ERRCODE = '22023';
  END IF;
  IF r.student_id = uid THEN
    RAISE EXCEPTION 'Tu ne peux pas te donner cours à toi-même' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lessons l
     WHERE l.tutor_id = uid AND l.status IN ('pending', 'confirmed', 'in_progress')
       AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
           && tstzrange(now(), now() + make_interval(mins => r.duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Tu as déjà un cours sur ce créneau' USING ERRCODE = '23P01';
  END IF;
  RETURN public._start_live_lesson(r, uid);
END;
$$;

-- ─── Automatismes ───────────────────────────────────────────────────────────
-- Un prof qui se met « en ligne » prend aussitôt le premier élève de la file
CREATE OR REPLACE FUNCTION public.on_tutor_online()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'online' AND OLD.status IS DISTINCT FROM 'online' THEN
    PERFORM public._match_live_queue();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_on_tutor_online ON public.tutors;
CREATE TRIGGER trg_on_tutor_online
  AFTER UPDATE OF status ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.on_tutor_online();

-- À la fin d'un cours en direct, le prof redevient « en ligne » (et reprend la file)
CREATE OR REPLACE FUNCTION public.on_live_lesson_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_instant AND NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.tutors SET status = 'online' WHERE user_id = NEW.tutor_id AND status = 'busy';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_on_live_lesson_end ON public.lessons;
CREATE TRIGGER trg_on_live_lesson_end
  AFTER UPDATE OF status ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.on_live_lesson_end();

-- ─── Droits ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public._start_live_lesson(public.live_requests, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._match_live_queue() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_live_queue(TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_live_request(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_live_request() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tutor_live_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tutor_accept_live_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_live_queue(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_live_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_live_request() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_live_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tutor_accept_live_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.live_stats() TO anon, authenticated;
