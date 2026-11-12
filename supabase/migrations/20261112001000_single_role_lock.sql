-- Un seul rôle (élève OU prof) : verrou par compte, pour que deux ajouts de rôle
-- simultanés ne puissent pas passer le contrôle en même temps. Rejouable.
CREATE OR REPLACE FUNCTION public.enforce_single_role()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('student', 'tutor') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('user_roles:' || NEW.user_id::text, 0));
    IF EXISTS (
      SELECT 1 FROM user_roles r
      WHERE r.user_id = NEW.user_id
        AND r.role IN ('student', 'tutor')
        AND r.role <> NEW.role
    ) THEN
      RAISE EXCEPTION 'Un compte est soit élève, soit prof : pas les deux.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
