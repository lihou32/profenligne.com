-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — Agenda des profs, présence réelle, réservation confirmée
-- 2026-11-11 (audit inspiré de Superprof / Preply)
--
--   1. Agenda : chaque prof publie ses disponibilités de la semaine (heure de
--      Paris, par tranches de 30 min). L'élève voit les créneaux libres et en
--      choisit un : le cours est CONFIRMÉ tout de suite, sans attendre le prof
--      (comme Preply). Un prof sans agenda reçoit encore des demandes, qu'il
--      confirme à la main.
--   2. Présence réelle : « en ligne » ne compte que si l'appli du prof est
--      ouverte (signal toutes les ~50 s). Sans signal depuis 3 min, le prof
--      repasse hors ligne : un élève n'est plus jamais envoyé vers un prof parti.
--   3. Cours en direct depuis le profil : confirmé tout de suite, salle ouverte.
--   4. Plus d'argent bloqué : une demande que le prof n'a pas confirmée avant
--      l'heure du cours est annulée et remboursée automatiquement.
--   5. Profil prof : niveaux enseignés (collège, lycée, supérieur…) et phrase
--      d'accroche, pour filtrer et comparer comme sur Superprof.
-- Idempotent. À exécuter après 20261111000500_live_queue.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Colonnes ───────────────────────────────────────────────────────────────
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS levels TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS headline TEXT;
DO $c$ BEGIN
  ALTER TABLE public.tutors ADD CONSTRAINT tutors_headline_len CHECK (headline IS NULL OR char_length(headline) <= 120);
EXCEPTION WHEN duplicate_object THEN NULL; END $c$;
DO $c$ BEGIN
  ALTER TABLE public.tutors ADD CONSTRAINT tutors_levels_valid
    CHECK (levels <@ ARRAY['Primaire','Collège','Lycée','Supérieur','Adulte']::text[]);
EXCEPTION WHEN duplicate_object THEN NULL; END $c$;

-- Les profs déjà « en ligne » au moment de la mise à jour gardent 3 minutes
UPDATE public.tutors SET last_seen_at = now() WHERE status IN ('online', 'busy') AND last_seen_at IS NULL;

CREATE OR REPLACE FUNCTION public.app_setting_agenda(_key TEXT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _key
    WHEN 'presence_timeout_seconds' THEN 180::numeric  -- sans signal depuis 3 min : hors ligne
    WHEN 'min_notice_minutes'       THEN 60::numeric   -- un créneau se réserve au moins 1 h avant
    WHEN 'slot_step_minutes'        THEN 30::numeric
    WHEN 'agenda_days'              THEN 28::numeric   -- créneaux visibles sur 4 semaines
  END
$$;

-- ─── Présence ───────────────────────────────────────────────────────────────
-- Quand un prof se met en ligne, on note l'heure : il est vu tout de suite
CREATE OR REPLACE FUNCTION public.touch_tutor_presence()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('online', 'busy') AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.last_seen_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_tutor_presence ON public.tutors;
CREATE TRIGGER trg_touch_tutor_presence BEFORE UPDATE OF status ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.touch_tutor_presence();

-- Les profs « en ligne » sans signal récent repassent hors ligne
CREATE OR REPLACE FUNCTION public._sweep_presence()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE public.tutors SET status = 'offline'
   WHERE status = 'online'
     AND (last_seen_at IS NULL
          OR last_seen_at < now() - make_interval(secs => public.app_setting_agenda('presence_timeout_seconds')::int));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public._sweep_presence() FROM PUBLIC, anon, authenticated;

-- Signal envoyé par l'appli du prof tant qu'elle est ouverte
CREATE OR REPLACE FUNCTION public.tutor_heartbeat()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  UPDATE public.tutors SET last_seen_at = now() WHERE user_id = auth.uid() RETURNING status INTO s;
  IF s = 'online' THEN PERFORM public._match_live_queue(); END IF;
  RETURN s;
END;
$$;
GRANT EXECUTE ON FUNCTION public.tutor_heartbeat() TO authenticated;

-- ─── Demandes jamais confirmées : annulées et remboursées ───────────────────
CREATE OR REPLACE FUNCTION public._expire_stale_lessons()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.lessons;
  n INTEGER := 0;
BEGIN
  FOR l IN
    SELECT * FROM public.lessons
     WHERE status = 'pending'
       AND (scheduled_at < now() OR (is_instant AND created_at < now() - interval '10 minutes'))
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.lessons SET status = 'cancelled', cancelled_by = NULL WHERE id = l.id;
    IF COALESCE(l.price_cents, 0) > 0 THEN
      PERFORM public._credit(l.student_id, l.price_cents, 'refund',
        'Remboursement : le prof n''a pas confirmé à temps (' || l.subject || ')', NULL, l.id);
    END IF;
    PERFORM public._notify(l.student_id, 'Cours non confirmé : remboursé',
      'Le prof n''a pas confirmé ton cours de ' || l.subject || ' à temps. '
        || public._eur(COALESCE(l.price_cents, 0)) || ' ont été remis sur ton solde.',
      'lesson', '/tutors');
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public._expire_stale_lessons() FROM PUBLIC, anon, authenticated;

-- Appelé par l'appli à l'ouverture des cours et du tableau de bord
CREATE OR REPLACE FUNCTION public.refresh_lessons()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  PERFORM public._sweep_presence();
  RETURN public._expire_stale_lessons();
END;
$$;
GRANT EXECUTE ON FUNCTION public.refresh_lessons() TO authenticated;

-- ─── Agenda ─────────────────────────────────────────────────────────────────
-- weekday : 1 = lundi … 7 = dimanche ; minutes depuis minuit, heure de Paris
CREATE TABLE IF NOT EXISTS public.tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1410 AND start_minute % 30 = 0),
  end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 30 AND 1440 AND end_minute % 30 = 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_minute > start_minute)
);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor ON public.tutor_availability (tutor_id, weekday);

ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tutor_availability_public_read" ON public.tutor_availability;
CREATE POLICY "tutor_availability_public_read" ON public.tutor_availability FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.tutor_availability FROM anon, authenticated;
GRANT SELECT ON public.tutor_availability TO anon, authenticated;

-- Remplace tout l'agenda du prof : [{"weekday":1,"start":1020,"end":1200}, …]
-- Les plages qui se chevauchent ou se touchent sont fusionnées.
CREATE OR REPLACE FUNCTION public.set_my_availability(p_ranges JSONB)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  e JSONB;
  n INTEGER;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.tutors WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Réservé aux professeurs' USING ERRCODE = '42501';
  END IF;
  IF p_ranges IS NULL OR jsonb_typeof(p_ranges) <> 'array' OR jsonb_array_length(p_ranges) > 100 THEN
    RAISE EXCEPTION 'Agenda invalide' USING ERRCODE = '22023';
  END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(p_ranges) LOOP
    IF (e->>'weekday') IS NULL OR (e->>'start') IS NULL OR (e->>'end') IS NULL
       OR (e->>'weekday')::int NOT BETWEEN 1 AND 7
       OR (e->>'start')::int NOT BETWEEN 0 AND 1410 OR (e->>'end')::int NOT BETWEEN 30 AND 1440
       OR (e->>'start')::int % 30 <> 0 OR (e->>'end')::int % 30 <> 0
       OR (e->>'end')::int <= (e->>'start')::int THEN
      RAISE EXCEPTION 'Plage horaire invalide : %', e::text USING ERRCODE = '22023';
    END IF;
  END LOOP;

  DELETE FROM public.tutor_availability WHERE tutor_id = uid;

  -- Fusion des plages par jour (îlots de plages qui se chevauchent ou se touchent)
  INSERT INTO public.tutor_availability (tutor_id, weekday, start_minute, end_minute)
  SELECT uid, weekday, min(s), max(en)
    FROM (
      SELECT weekday, s, en, sum(brk) OVER (PARTITION BY weekday ORDER BY s, en) AS grp
        FROM (
          SELECT weekday, s, en,
                 CASE WHEN s <= max(en) OVER (PARTITION BY weekday ORDER BY s, en
                                               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
                      THEN 0 ELSE 1 END AS brk
            FROM (SELECT (x->>'weekday')::smallint AS weekday, (x->>'start')::int AS s, (x->>'end')::int AS en
                    FROM jsonb_array_elements(p_ranges) x) raw
        ) marked
    ) grouped
   GROUP BY weekday, grp;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_my_availability(JSONB) TO authenticated;

-- Le créneau [_start, _start + _dur] tient-il dans une plage de l'agenda ?
CREATE OR REPLACE FUNCTION public._slot_in_availability(_tutor UUID, _start TIMESTAMPTZ, _dur INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tutor_availability a,
      LATERAL (SELECT (_start AT TIME ZONE 'Europe/Paris') AS loc) p
     WHERE a.tutor_id = _tutor
       AND a.weekday = extract(isodow FROM p.loc)::int
       AND extract(hour FROM p.loc) * 60 + extract(minute FROM p.loc) >= a.start_minute
       AND extract(hour FROM p.loc) * 60 + extract(minute FROM p.loc) + _dur <= a.end_minute
  )
$$;

-- Créneaux libres d'un prof (public : sert à afficher le calendrier)
CREATE OR REPLACE FUNCTION public.tutor_open_slots(p_tutor UUID, p_from DATE, p_days INTEGER, p_duration INTEGER)
RETURNS TABLE (starts_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.ts
    FROM generate_series(GREATEST(p_from, (now() AT TIME ZONE 'Europe/Paris')::date),
                         LEAST(p_from + GREATEST(LEAST(COALESCE(p_days, 7), 31), 1) - 1,
                               (now() AT TIME ZONE 'Europe/Paris')::date + public.app_setting_agenda('agenda_days')::int),
                         interval '1 day') AS d(day)
    JOIN public.tutor_availability a
      ON a.tutor_id = p_tutor AND a.weekday = extract(isodow FROM d.day)::int
    CROSS JOIN LATERAL generate_series(
      (d.day::date::timestamp + make_interval(mins => a.start_minute)) AT TIME ZONE 'Europe/Paris',
      (d.day::date::timestamp + make_interval(mins => a.end_minute - COALESCE(p_duration, 60))) AT TIME ZONE 'Europe/Paris',
      make_interval(mins => public.app_setting_agenda('slot_step_minutes')::int)) AS s(ts)
   WHERE public.lesson_price_cents(COALESCE(p_duration, 60)) IS NOT NULL
     AND s.ts >= now() + make_interval(mins => public.app_setting_agenda('min_notice_minutes')::int)
     AND EXISTS (SELECT 1 FROM public.tutors t WHERE t.user_id = p_tutor AND NOT COALESCE(t.is_suspended, false))
     AND NOT EXISTS (
       SELECT 1 FROM public.lessons l
        WHERE l.tutor_id = p_tutor AND l.status IN ('pending', 'confirmed', 'in_progress')
          AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
              && tstzrange(s.ts, s.ts + make_interval(mins => COALESCE(p_duration, 60))))
   ORDER BY s.ts
$$;
GRANT EXECUTE ON FUNCTION public.tutor_open_slots(UUID, DATE, INTEGER, INTEGER) TO anon, authenticated;

-- Prochain créneau libre de chaque prof (pour la liste des profs)
CREATE OR REPLACE FUNCTION public.tutors_next_slot(p_duration INTEGER DEFAULT 60)
RETURNS TABLE (tutor_id UUID, next_slot TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.user_id,
         (SELECT s.starts_at FROM public.tutor_open_slots(t.user_id, (now() AT TIME ZONE 'Europe/Paris')::date, 14, p_duration) s LIMIT 1)
    FROM public.tutors t
   WHERE NOT COALESCE(t.is_suspended, false)
     AND EXISTS (SELECT 1 FROM public.tutor_availability a WHERE a.tutor_id = t.user_id)
$$;
GRANT EXECUTE ON FUNCTION public.tutors_next_slot(INTEGER) TO anon, authenticated;

-- ─── Mise en relation (file) : seulement les profs vraiment présents ────────
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
    SELECT * FROM public.live_requests WHERE status = 'waiting' ORDER BY created_at FOR UPDATE SKIP LOCKED
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

-- Compteur public : profs réellement présents
DROP FUNCTION IF EXISTS public.live_stats();
CREATE FUNCTION public.live_stats()
RETURNS TABLE (tutors_online INTEGER, students_waiting INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._sweep_presence();
  RETURN QUERY
  SELECT (SELECT count(*)::int FROM public.tutors WHERE status = 'online' AND NOT COALESCE(is_suspended, false)),
         (SELECT count(*)::int FROM public.live_requests WHERE status = 'waiting'
            AND created_at >= now() - make_interval(mins => public.app_setting_live('queue_timeout_minutes')::int));
END;
$$;
GRANT EXECUTE ON FUNCTION public.live_stats() TO anon, authenticated;

-- ─── Réserver : créneau de l'agenda = confirmé ; direct = confirmé + salle ───
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
  has_agenda BOOLEAN;
  new_status TEXT := 'pending';
  starts_at TIMESTAMPTZ;
  new_lesson public.lessons;
  student_name TEXT;
  tutor_name TEXT;
  when_txt TEXT;
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

  PERFORM public._sweep_presence();
  PERFORM public._expire_stale_lessons();

  instant := p_scheduled_at <= now() + make_interval(mins => public.app_setting('instant_window_minutes')::int);
  starts_at := GREATEST(p_scheduled_at, now());
  has_agenda := EXISTS (SELECT 1 FROM public.tutor_availability WHERE tutor_id = p_tutor_id);

  IF instant THEN
    IF NOT EXISTS (SELECT 1 FROM public.tutors WHERE user_id = p_tutor_id AND status = 'online') THEN
      RAISE EXCEPTION 'Ce prof n''est pas en ligne : réserve un créneau plus tard' USING ERRCODE = '22023';
    END IF;
    extra := public.late_surcharge_cents(starts_at, true);
    new_status := 'confirmed';
  ELSIF has_agenda THEN
    IF NOT public._slot_in_availability(p_tutor_id, p_scheduled_at, p_duration_minutes) THEN
      RAISE EXCEPTION 'Ce créneau n''est pas dans les disponibilités du prof' USING ERRCODE = '22023';
    END IF;
    IF p_scheduled_at < now() + make_interval(mins => public.app_setting_agenda('min_notice_minutes')::int) THEN
      RAISE EXCEPTION 'Ce créneau est trop proche : réserve au moins 1 h à l''avance, ou rejoins un cours en direct' USING ERRCODE = '22023';
    END IF;
    new_status := 'confirmed';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('book_lesson:' || p_tutor_id::text));

  IF EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.tutor_id = p_tutor_id
      AND l.status IN ('pending', 'confirmed', 'in_progress')
      AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
          && tstzrange(starts_at, starts_at + make_interval(mins => p_duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Ce créneau vient d''être pris : choisis-en un autre' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.lessons (student_id, tutor_id, subject, topic, scheduled_at, duration_minutes, status,
                              credits_cost, price_cents, surcharge_cents, is_instant)
  VALUES (uid, p_tutor_id, trim(p_subject), NULLIF(trim(p_topic), ''), starts_at, p_duration_minutes, new_status,
          0, base + extra, extra, instant)
  RETURNING * INTO new_lesson;

  PERFORM public._credit(uid, -(base + extra), 'lesson_booking',
    CASE WHEN instant THEN 'Cours en direct : ' ELSE 'Réservation : ' END || new_lesson.subject
      || CASE WHEN extra > 0 THEN ' (dont ' || public._eur(extra) || ' après 21 h)' ELSE '' END,
    NULL, new_lesson.id);

  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Un élève') INTO student_name FROM public.profiles WHERE user_id = uid;
  SELECT COALESCE(NULLIF(trim(first_name), ''), 'Ton prof') INTO tutor_name FROM public.profiles WHERE user_id = p_tutor_id;
  when_txt := to_char(starts_at AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24:MI');

  IF instant THEN
    UPDATE public.tutors SET status = 'busy' WHERE user_id = p_tutor_id;
    PERFORM public._notify(p_tutor_id, 'Cours en direct : un élève t''attend ⚡',
      student_name || ' a lancé un cours de ' || new_lesson.subject || '. Rejoins la salle maintenant.',
      'live', '/room/' || new_lesson.id);
    PERFORM public._notify(uid, 'C''est parti ⚡',
      tutor_name || ' te rejoint dans la salle pour ton cours de ' || new_lesson.subject || '.',
      'live', '/room/' || new_lesson.id);
  ELSIF new_status = 'confirmed' THEN
    PERFORM public._notify(p_tutor_id, 'Nouveau cours réservé',
      student_name || ' a réservé un cours de ' || new_lesson.subject || ' le ' || when_txt || '.',
      'lesson', '/lessons');
    PERFORM public._notify(uid, 'Cours confirmé ✅',
      'Ton cours de ' || new_lesson.subject || ' avec ' || tutor_name || ' est confirmé pour le ' || when_txt || '.',
      'lesson', '/lessons');
  ELSE
    PERFORM public._notify(p_tutor_id, 'Nouvelle demande de cours',
      student_name || ' souhaite un cours de ' || new_lesson.subject || ' le ' || when_txt
        || '. Confirme-la avant l''heure du cours, sinon l''élève est remboursé.',
      'lesson', '/lessons');
  END IF;

  RETURN new_lesson;
END;
$$;
GRANT EXECUTE ON FUNCTION public.book_lesson(UUID, TEXT, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
