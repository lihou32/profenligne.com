-- ═══════════════════════════════════════════════════════════════════
-- Un compte est SOIT élève, SOIT prof (jamais les deux).
--  - Contrôle en base : un compte ne peut pas avoir les rôles élève et prof.
--  - Devenir prof depuis un compte élève : possible seulement si ce compte
--    n'a encore rien fait comme élève (aucun cours, aucun paiement, solde nul) ;
--    le rôle élève est alors remplacé par le rôle prof. Sinon : créer un compte
--    prof avec une autre adresse e-mail.
--  - Un compte prof ne peut ni réserver, ni entrer dans la file du direct,
--    ni s'abonner.
--  - Comptes existants qui avaient les deux rôles : ils gardent le rôle prof.
-- Le rôle admin reste compatible avec les deux.
-- Rejouable sans erreur.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Comptes existants : élève + prof → prof
DELETE FROM public.user_roles r
WHERE r.role = 'student'
  AND EXISTS (SELECT 1 FROM public.user_roles t WHERE t.user_id = r.user_id AND t.role = 'tutor');

-- 2. Jamais élève et prof à la fois
CREATE OR REPLACE FUNCTION public.enforce_single_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('student', 'tutor') AND EXISTS (
    SELECT 1 FROM user_roles r
    WHERE r.user_id = NEW.user_id
      AND r.role IN ('student', 'tutor')
      AND r.role <> NEW.role
  ) THEN
    RAISE EXCEPTION 'Un compte est soit élève, soit prof : pas les deux.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_single_role ON public.user_roles;
CREATE TRIGGER enforce_single_role
  BEFORE INSERT OR UPDATE OF role, user_id ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_role();

-- 3. Devenir prof
CREATE OR REPLACE FUNCTION public.become_tutor(p_subjects TEXT[], p_hourly_rate NUMERIC DEFAULT NULL)
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

  -- Compte élève : on le transforme en compte prof seulement s'il est encore vierge
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = uid AND role = 'student') THEN
    IF EXISTS (SELECT 1 FROM lessons WHERE student_id = uid)
       OR EXISTS (SELECT 1 FROM credit_transactions WHERE user_id = uid)
       OR EXISTS (SELECT 1 FROM user_credits WHERE user_id = uid AND balance <> 0)
       OR EXISTS (SELECT 1 FROM subscriptions WHERE user_id = uid)
       OR EXISTS (SELECT 1 FROM live_requests WHERE student_id = uid) THEN
      RAISE EXCEPTION 'Ce compte est un compte élève. Pour donner des cours, crée un compte prof avec une autre adresse e-mail.'
        USING ERRCODE = '42501';
    END IF;
    DELETE FROM user_roles WHERE user_id = uid AND role = 'student';
  END IF;

  -- p_hourly_rate est ignoré : le prix est le même pour tous les profs
  INSERT INTO public.tutors (user_id, subjects, hourly_rate, status)
  VALUES (uid, p_subjects, public.app_setting('fixed_hourly_rate'), 'offline')
  ON CONFLICT (user_id) DO UPDATE
    SET subjects = EXCLUDED.subjects
  RETURNING id INTO tutor_row_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'tutor')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN tutor_row_id;
END;
$$;
REVOKE ALL ON FUNCTION public.become_tutor(TEXT[], NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_tutor(TEXT[], NUMERIC) TO authenticated;

-- 4. Les actions d'élève sont réservées aux comptes élèves
CREATE OR REPLACE FUNCTION public.require_student_account()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
BEGIN
  IF TG_TABLE_NAME = 'subscriptions' THEN
    v_user := NEW.user_id;
  ELSE
    v_user := NEW.student_id;
  END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user AND role = 'tutor') THEN
    RAISE EXCEPTION 'Un compte prof ne peut pas réserver ni s''abonner : utilise un compte élève.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_student_account ON public.lessons;
CREATE TRIGGER require_student_account
  BEFORE INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.require_student_account();

DROP TRIGGER IF EXISTS require_student_account ON public.live_requests;
CREATE TRIGGER require_student_account
  BEFORE INSERT ON public.live_requests
  FOR EACH ROW EXECUTE FUNCTION public.require_student_account();

DROP TRIGGER IF EXISTS require_student_account ON public.subscriptions;
CREATE TRIGGER require_student_account
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.require_student_account();
