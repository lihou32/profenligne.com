-- ═══════════════════════════════════════════════════════════════════
-- Salle de cours maison (remplace Jitsi, limité à 5 min une fois intégré)
--  1. Canaux temps réel PRIVÉS « lesson:<id> » : seuls l'élève et le prof
--     du cours (non terminé, non annulé) peuvent écouter / émettre.
--     Ils servent à la visio (signalisation WebRTC) et au tableau.
--  2. lesson_boards : le tableau est enregistré (retrouvé au rechargement,
--     visible dans le compte rendu). Fusion côté base, élément par élément,
--     en gardant la version la plus récente de chaque élément.
--  3. lesson_messages : le chat de la salle.
-- Rejouable sans erreur.
-- ═══════════════════════════════════════════════════════════════════

-- ── Qui peut entrer dans la salle ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_lesson_participant(p_lesson uuid, p_active_only boolean DEFAULT true)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.id = p_lesson
      AND auth.uid() IS NOT NULL
      AND auth.uid() IN (l.student_id, l.tutor_id)
      AND (NOT p_active_only OR l.status IN ('pending', 'confirmed', 'in_progress'))
  );
$$;

-- Canal temps réel « lesson:<uuid> » réservé aux participants d'un cours actif
CREATE OR REPLACE FUNCTION public.can_use_lesson_channel(p_topic text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_topic IS NULL OR p_topic !~ '^lesson:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  RETURN public.is_lesson_participant(substr(p_topic, 8)::uuid, true);
END;
$$;

REVOKE ALL ON FUNCTION public.is_lesson_participant(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_use_lesson_channel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lesson_participant(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_use_lesson_channel(text) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Participants du cours : lecture salle" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Participants du cours : envoi salle" ON realtime.messages';
    EXECUTE $p$CREATE POLICY "Participants du cours : lecture salle" ON realtime.messages
      FOR SELECT TO authenticated
      USING (extension IN ('broadcast', 'presence') AND public.can_use_lesson_channel(realtime.topic()))$p$;
    EXECUTE $p$CREATE POLICY "Participants du cours : envoi salle" ON realtime.messages
      FOR INSERT TO authenticated
      WITH CHECK (extension IN ('broadcast', 'presence') AND public.can_use_lesson_channel(realtime.topic()))$p$;
  END IF;
END $$;

-- ── Tableau enregistré ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_boards (
  lesson_id   uuid PRIMARY KEY REFERENCES public.lessons(id) ON DELETE CASCADE,
  elements    jsonb NOT NULL DEFAULT '[]'::jsonb,
  files       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by  uuid,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_boards ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.lesson_boards FROM anon, authenticated;
GRANT SELECT ON public.lesson_boards TO authenticated;

DROP POLICY IF EXISTS "Participants voient le tableau" ON public.lesson_boards;
CREATE POLICY "Participants voient le tableau" ON public.lesson_boards
  FOR SELECT TO authenticated
  USING (public.is_lesson_participant(lesson_id, false));

-- Fusionne les éléments reçus avec ceux enregistrés : pour chaque id, on garde
-- la version la plus haute (à égalité, le plus petit versionNonce, comme Excalidraw).
-- Les fichiers (images) sont ajoutés, jamais remplacés.
CREATE OR REPLACE FUNCTION public.save_lesson_board(p_lesson uuid, p_elements jsonb, p_files jsonb DEFAULT NULL)
RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cur public.lesson_boards%ROWTYPE;
  v_elements jsonb;
  v_files jsonb;
  v_key text;
BEGIN
  IF NOT public.is_lesson_participant(p_lesson, true) THEN
    RAISE EXCEPTION 'Salle fermée : vous ne participez pas à ce cours ou il est terminé.';
  END IF;
  IF p_elements IS NULL OR jsonb_typeof(p_elements) <> 'array' THEN
    RAISE EXCEPTION 'Tableau invalide.';
  END IF;
  IF pg_column_size(p_elements) > 2000000 THEN
    RAISE EXCEPTION 'Tableau trop lourd : effacez une partie du tableau.';
  END IF;
  IF p_files IS NOT NULL AND jsonb_typeof(p_files) <> 'object' THEN
    RAISE EXCEPTION 'Fichiers invalides.';
  END IF;
  IF p_files IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(p_files) LOOP
      IF pg_column_size(p_files -> v_key) > 3000000 THEN
        RAISE EXCEPTION 'Image trop lourde (3 Mo maximum).';
      END IF;
    END LOOP;
  END IF;

  INSERT INTO lesson_boards (lesson_id) VALUES (p_lesson) ON CONFLICT (lesson_id) DO NOTHING;
  SELECT * INTO v_cur FROM lesson_boards WHERE lesson_id = p_lesson FOR UPDATE;

  SELECT COALESCE(jsonb_agg(e ORDER BY COALESCE(e->>'index', '') COLLATE "C", e->>'id'), '[]'::jsonb)
    INTO v_elements
  FROM (
    SELECT DISTINCT ON (e->>'id') e
    FROM (
      SELECT e FROM jsonb_array_elements(v_cur.elements) e
      UNION ALL
      SELECT e FROM jsonb_array_elements(p_elements) e
    ) s
    WHERE jsonb_typeof(e) = 'object' AND e ? 'id'
    ORDER BY e->>'id',
             COALESCE((e->>'version')::bigint, 0) DESC,
             COALESCE((e->>'versionNonce')::bigint, 0) ASC
  ) picked;

  IF jsonb_array_length(v_elements) > 5000 THEN
    RAISE EXCEPTION 'Tableau trop chargé : effacez une partie du tableau.';
  END IF;

  v_files := v_cur.files;
  IF p_files IS NOT NULL THEN
    v_files := p_files || v_cur.files;   -- les fichiers déjà enregistrés gardent la priorité
  END IF;
  IF pg_column_size(v_files) > 15000000 THEN
    RAISE EXCEPTION 'Trop d''images sur ce tableau (15 Mo maximum).';
  END IF;

  UPDATE lesson_boards
     SET elements = v_elements, files = v_files, updated_by = auth.uid(), updated_at = now()
   WHERE lesson_id = p_lesson;
  RETURN now();
END;
$$;
REVOKE ALL ON FUNCTION public.save_lesson_board(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_lesson_board(uuid, jsonb, jsonb) TO authenticated;

-- ── Chat de la salle ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL DEFAULT auth.uid(),
  body        text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_messages_lesson_idx ON public.lesson_messages (lesson_id, created_at);
ALTER TABLE public.lesson_messages ENABLE ROW LEVEL SECURITY;
REVOKE UPDATE, DELETE ON public.lesson_messages FROM anon, authenticated;
REVOKE ALL ON public.lesson_messages FROM anon;
GRANT SELECT, INSERT ON public.lesson_messages TO authenticated;

DROP POLICY IF EXISTS "Participants lisent le chat" ON public.lesson_messages;
CREATE POLICY "Participants lisent le chat" ON public.lesson_messages
  FOR SELECT TO authenticated
  USING (public.is_lesson_participant(lesson_id, false));

DROP POLICY IF EXISTS "Participants écrivent dans le chat" ON public.lesson_messages;
CREATE POLICY "Participants écrivent dans le chat" ON public.lesson_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_lesson_participant(lesson_id, true));

-- Le chat arrive en direct (postgres_changes respecte la sécurité ci-dessus)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lesson_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_messages;
  END IF;
END $$;
