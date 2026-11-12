-- ═══════════════════════════════════════════════════════════════════
-- Vie d'un cours : règles logiques
--  1. On note quand l'élève et le prof entrent dans la salle (start_lesson est
--     appelé par chacun en entrant).
--  2. « Terminer le cours » : seulement si le prof est venu, et pas avant la
--     moitié de la durée prévue (impossible d'être payé sans avoir fait cours).
--  3. Cours oubliés (30 min après l'heure de fin) :
--       - le prof est venu        → cours terminé, le prof est payé ;
--       - le prof n'est pas venu  → cours annulé, l'élève est remboursé.
--     Un élève absent alors que le prof était là paie donc le cours.
-- Rejouable sans erreur.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS student_joined_at timestamptz;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS tutor_joined_at timestamptz;

-- Ces dates ne se modifient que par les fonctions du site
CREATE OR REPLACE FUNCTION public.guard_lesson_join_columns()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.student_joined_at IS DISTINCT FROM OLD.student_joined_at
     OR NEW.tutor_joined_at IS DISTINCT FROM OLD.tutor_joined_at THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_lesson_join_columns ON public.lessons;
CREATE TRIGGER trg_guard_lesson_join_columns BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.guard_lesson_join_columns();

-- 1. Entrer dans la salle (démarre le cours si besoin, et note qui est venu)
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
  was_started BOOLEAN;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR (uid <> l.student_id AND uid <> l.tutor_id) THEN
    RAISE EXCEPTION 'Cours introuvable' USING ERRCODE = '42501';
  END IF;
  IF l.status NOT IN ('confirmed', 'in_progress') THEN
    RAISE EXCEPTION 'Le cours doit être confirmé par le professeur avant de commencer' USING ERRCODE = '22023';
  END IF;
  was_started := l.status = 'in_progress';
  IF NOT was_started AND now() < l.scheduled_at - make_interval(mins => public.app_setting('room_open_minutes_before')::int) THEN
    RAISE EXCEPTION 'La salle ouvre % minutes avant le début du cours',
      public.app_setting('room_open_minutes_before') USING ERRCODE = '22023';
  END IF;

  UPDATE public.lessons
     SET status = 'in_progress',
         started_at = COALESCE(started_at, now()),
         student_joined_at = CASE WHEN uid = student_id THEN COALESCE(student_joined_at, now()) ELSE student_joined_at END,
         tutor_joined_at   = CASE WHEN uid = tutor_id   THEN COALESCE(tutor_joined_at, now())   ELSE tutor_joined_at END
   WHERE id = p_lesson_id RETURNING * INTO l;

  IF NOT was_started THEN
    SELECT COALESCE(NULLIF(trim(first_name), ''), 'Votre interlocuteur') INTO caller_name
    FROM public.profiles WHERE user_id = uid;
    other := CASE WHEN uid = l.student_id THEN l.tutor_id ELSE l.student_id END;
    PERFORM public._notify(other, 'Cours en cours',
      caller_name || ' vous attend dans la salle (' || l.subject || ').',
      'live', '/room/' || l.id);
  END IF;
  RETURN l;
END;
$$;
REVOKE ALL ON FUNCTION public.start_lesson(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_lesson(UUID) TO authenticated;

-- Heure à partir de laquelle le prof peut terminer le cours
CREATE OR REPLACE FUNCTION public.lesson_can_complete_at(l public.lessons)
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT GREATEST(COALESCE(l.started_at, l.scheduled_at), l.scheduled_at)
         + make_interval(mins => GREATEST(l.duration_minutes / 2, 5));
$$;

-- 2. Terminer le cours
CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id UUID)
RETURNS public.lessons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  l public.lessons;
  is_admin BOOLEAN := public.has_role(uid, 'admin');
  ready_at timestamptz;
BEGIN
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson_id FOR UPDATE;
  IF NOT FOUND OR (l.tutor_id <> uid AND NOT is_admin) THEN
    RAISE EXCEPTION 'Seul le professeur peut terminer le cours' USING ERRCODE = '42501';
  END IF;
  IF l.status = 'completed' THEN
    RETURN l;
  END IF;
  IF l.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Le cours n''a pas commencé' USING ERRCODE = '22023';
  END IF;
  IF NOT is_admin THEN
    IF l.tutor_joined_at IS NULL THEN
      RAISE EXCEPTION 'Entre dans la salle de cours avant de terminer le cours' USING ERRCODE = '22023';
    END IF;
    ready_at := public.lesson_can_complete_at(l);
    IF now() < ready_at THEN
      RAISE EXCEPTION 'Trop tôt pour terminer : tu pourras terminer ce cours à partir de % (heure de Paris)',
        to_char(ready_at AT TIME ZONE 'Europe/Paris', 'HH24"h"MI') USING ERRCODE = '22023';
    END IF;
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
REVOKE ALL ON FUNCTION public.complete_lesson(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lesson(UUID) TO authenticated;

-- 3. Cours en attente non confirmés + cours oubliés
CREATE OR REPLACE FUNCTION public._expire_stale_lessons()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l public.lessons;
  n INTEGER := 0;
BEGIN
  -- Demandes jamais confirmées : remboursées
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

  -- Cours confirmés ou commencés, 30 min après l'heure de fin
  FOR l IN
    SELECT * FROM public.lessons
     WHERE status IN ('confirmed', 'in_progress')
       AND GREATEST(scheduled_at, COALESCE(started_at, scheduled_at))
           + make_interval(mins => duration_minutes) + interval '30 minutes' < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    IF l.tutor_joined_at IS NOT NULL THEN
      -- Le prof est venu : le cours est terminé et payé (même si l'élève n'est pas venu)
      UPDATE public.lessons SET status = 'completed', completed_at = now() WHERE id = l.id;
      PERFORM public._notify(l.tutor_id, 'Cours terminé automatiquement',
        'Ton cours de ' || l.subject || ' a été clôturé : tes gains sont crédités. Pense à cliquer sur « Terminer le cours » la prochaine fois.',
        'lesson', '/earnings');
      PERFORM public._notify(l.student_id, 'Cours terminé 🎉',
        'Donnez votre avis sur votre cours de ' || l.subject || '.',
        'review', '/report/' || l.id);
    ELSE
      -- Le prof n'est pas venu : l'élève est remboursé
      UPDATE public.lessons SET status = 'cancelled', cancelled_by = l.tutor_id WHERE id = l.id;
      IF COALESCE(l.price_cents, 0) > 0 THEN
        PERFORM public._credit(l.student_id, l.price_cents, 'refund',
          'Remboursement : le prof n''est pas venu (' || l.subject || ')', NULL, l.id);
      END IF;
      PERFORM public._notify(l.student_id, 'Prof absent : remboursé',
        'Ton prof n''est pas venu à ton cours de ' || l.subject || '. '
          || public._eur(COALESCE(l.price_cents, 0)) || ' ont été remis sur ton solde.',
        'lesson', '/tutors');
      PERFORM public._notify(l.tutor_id, 'Cours manqué',
        'Tu n''es pas venu à ton cours de ' || l.subject || ' : l''élève a été remboursé.',
        'lesson', '/lessons');
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public._expire_stale_lessons() FROM PUBLIC, anon, authenticated;
