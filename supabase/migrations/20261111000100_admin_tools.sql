-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — outils d'administration
-- 2026-11-11
--
-- Le panneau admin interrogeait des colonnes inexistantes (profiles.email,
-- profiles.role, profiles.is_suspended, lessons.price) et une jointure
-- lessons → profiles sans clé étrangère : il ne pouvait rien afficher.
-- On expose des RPC dédiées, réservées aux admins.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- Un prof suspendu ne peut plus recevoir de réservation
CREATE OR REPLACE FUNCTION public.guard_suspended_tutor_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tutors WHERE user_id = NEW.tutor_id AND is_suspended) THEN
    RAISE EXCEPTION 'Ce professeur n''accepte pas de réservation pour le moment' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_suspended_tutor_booking ON public.lessons;
CREATE TRIGGER trg_guard_suspended_tutor_booking
  BEFORE INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.guard_suspended_tutor_booking();

-- Un prof ne peut pas lever sa propre suspension
CREATE OR REPLACE FUNCTION public.guard_tutor_suspension()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_tutor_suspension ON public.tutors;
CREATE TRIGGER trg_guard_tutor_suspension
  BEFORE UPDATE ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.guard_tutor_suspension();

-- ─── Liste des profs (admin) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_tutors()
RETURNS TABLE (
  user_id UUID, email TEXT, first_name TEXT, last_name TEXT, status TEXT,
  hourly_rate NUMERIC, rating NUMERIC, total_reviews INTEGER, is_suspended BOOLEAN,
  lessons_completed BIGINT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT t.user_id, u.email::text, p.first_name, p.last_name, t.status,
         t.hourly_rate, t.rating, t.total_reviews, t.is_suspended,
         (SELECT count(*) FROM public.lessons l WHERE l.tutor_id = t.user_id AND l.status = 'completed'),
         t.created_at
  FROM public.tutors t
  JOIN auth.users u ON u.id = t.user_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_tutor_suspended(p_user_id UUID, p_suspended BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  UPDATE public.tutors
     SET is_suspended = p_suspended,
         status = CASE WHEN p_suspended THEN 'offline' ELSE status END
   WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professeur introuvable' USING ERRCODE = '22023';
  END IF;
  PERFORM public._notify(p_user_id,
    CASE WHEN p_suspended THEN 'Compte professeur suspendu' ELSE 'Compte professeur réactivé' END,
    CASE WHEN p_suspended
         THEN 'Votre profil n''apparaît plus dans la marketplace. Contactez le support pour plus d''informations.'
         ELSE 'Votre profil est de nouveau visible dans la marketplace.' END,
    'system', '/dashboard');
END;
$$;

-- ─── Liste des cours (admin) ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_lessons(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, tutor_id UUID, student_id UUID, tutor_name TEXT, student_name TEXT,
  subject TEXT, status TEXT, created_at TIMESTAMPTZ, scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER, credits_cost INTEGER, price_eur NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT l.id, l.tutor_id, l.student_id,
         COALESCE(NULLIF(trim(concat_ws(' ', tp.first_name, tp.last_name)), ''), 'Inconnu'),
         COALESCE(NULLIF(trim(concat_ws(' ', sp.first_name, sp.last_name)), ''), 'Inconnu'),
         l.subject, l.status, l.created_at, l.scheduled_at, l.duration_minutes, l.credits_cost,
         l.credits_cost * public.app_setting('credit_value_eur')
  FROM public.lessons l
  LEFT JOIN public.profiles tp ON tp.user_id = l.tutor_id
  LEFT JOIN public.profiles sp ON sp.user_id = l.student_id
  WHERE p_status IS NULL OR l.status = p_status
  ORDER BY l.created_at DESC
  LIMIT 500;
END;
$$;

-- ─── Chiffres clés (admin) ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE (
  total_users BIGINT, total_tutors BIGINT, lessons_this_month BIGINT, lessons_last_month BIGINT,
  revenue_this_month NUMERIC, revenue_last_month NUMERIC, avg_rating NUMERIC, preregistrations BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m0 TIMESTAMPTZ := date_trunc('month', now());
  m1 TIMESTAMPTZ := date_trunc('month', now()) - interval '1 month';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT count(*) FROM public.tutors WHERE NOT is_suspended),
    (SELECT count(*) FROM public.lessons WHERE scheduled_at >= m0 AND status <> 'cancelled'),
    (SELECT count(*) FROM public.lessons WHERE scheduled_at >= m1 AND scheduled_at < m0 AND status <> 'cancelled'),
    -- Chiffre d'affaires réellement encaissé via Stripe (packs remisés inclus), hors bonus parrainage
    COALESCE((SELECT sum(amount_paid_eur) FROM public.credit_transactions WHERE type = 'purchase' AND created_at >= m0), 0),
    COALESCE((SELECT sum(amount_paid_eur) FROM public.credit_transactions WHERE type = 'purchase' AND created_at >= m1 AND created_at < m0), 0),
    COALESCE((SELECT round(avg(rating)::numeric, 2) FROM public.reviews), 0),
    (SELECT count(*) FROM public.preregistrations);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_tutors() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_tutor_suspended(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_lessons(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_tutors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_tutor_suspended(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_lessons(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
