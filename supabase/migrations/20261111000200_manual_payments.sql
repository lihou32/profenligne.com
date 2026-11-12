-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — paiement manuel des crédits (WhatsApp, virement, Revolut)
-- 2026-11-11
--
-- En attendant Stripe : l'élève choisit un pack et un moyen de paiement, reçoit
-- une référence unique et les coordonnées de paiement. L'admin vérifie la
-- réception de l'argent puis valide la demande : les crédits sont alors ajoutés
-- (une seule fois, via _credit). Aucun crédit ne peut être ajouté par l'élève.
-- Idempotent : peut être rejouée sans effet de bord.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Prix des packs (source de vérité côté base) ────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_pack_price_eur(_credits INTEGER)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _credits WHEN 5 THEN 25::numeric WHEN 10 THEN 45::numeric WHEN 20 THEN 80::numeric END
$$;

-- ─── Coordonnées de paiement (une seule ligne, modifiable par l'admin) ──────
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  whatsapp_number TEXT,          -- format international sans « + » ni espaces, ex. 33612345678
  account_holder TEXT,           -- titulaire du compte pour le virement
  iban TEXT,
  bic TEXT,
  revolut_tag TEXT,              -- identifiant Revolut, sans « @ »
  instructions TEXT,             -- message libre affiché à l'élève
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.payment_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_settings_read_authenticated" ON public.payment_settings;
CREATE POLICY "payment_settings_read_authenticated" ON public.payment_settings
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.payment_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payment_settings FROM authenticated;

-- ─── Demandes d'achat ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL CHECK (credits IN (5, 10, 20)),
  amount_eur NUMERIC(10,2) NOT NULL CHECK (amount_eur > 0),
  method TEXT NOT NULL CHECK (method IN ('whatsapp', 'virement', 'revolut')),
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  amount_received_eur NUMERIC(10,2),
  admin_note TEXT CHECK (admin_note IS NULL OR length(admin_note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_cpr_user ON public.credit_purchase_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpr_status ON public.credit_purchase_requests (status, created_at DESC);

ALTER TABLE public.credit_purchase_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpr_read_own_or_admin" ON public.credit_purchase_requests;
CREATE POLICY "cpr_read_own_or_admin" ON public.credit_purchase_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.credit_purchase_requests FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.credit_purchase_requests FROM authenticated;

-- ─── Élève : créer une demande ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_credit_purchase(p_credits INTEGER, p_method TEXT)
RETURNS public.credit_purchase_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  price NUMERIC := public.credit_pack_price_eur(p_credits);
  ref TEXT;
  r public.credit_purchase_requests;
  admin_id UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF price IS NULL THEN
    RAISE EXCEPTION 'Pack de crédits invalide' USING ERRCODE = '22023';
  END IF;
  IF p_method IS NULL OR p_method NOT IN ('whatsapp', 'virement', 'revolut') THEN
    RAISE EXCEPTION 'Moyen de paiement invalide' USING ERRCODE = '22023';
  END IF;

  -- Anti-spam : 3 demandes en attente maximum par élève
  PERFORM pg_advisory_xact_lock(hashtext('credit_purchase:' || uid::text));
  IF (SELECT count(*) FROM public.credit_purchase_requests
       WHERE user_id = uid AND status = 'pending') >= 3 THEN
    RAISE EXCEPTION 'Vous avez déjà 3 demandes en attente : annulez-en une ou attendez leur validation'
      USING ERRCODE = '22023';
  END IF;

  -- Référence courte et lisible à mettre dans le libellé du paiement
  LOOP
    ref := 'PEL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.credit_purchase_requests WHERE reference = ref);
  END LOOP;

  INSERT INTO public.credit_purchase_requests (user_id, credits, amount_eur, method, reference)
  VALUES (uid, p_credits, price, p_method, ref)
  RETURNING * INTO r;

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public._notify(admin_id, 'Nouvelle demande de crédits 💶',
      p_credits || ' crédits · ' || price || ' € · ' || p_method || ' · ' || ref, 'payment', '/admin');
  END LOOP;

  RETURN r;
END;
$$;

-- ─── Élève : annuler une demande en attente ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_credit_purchase(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.credit_purchase_requests
     SET status = 'cancelled', processed_at = now()
   WHERE id = p_request_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable ou déjà traitée' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- ─── Admin : liste des demandes ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_credit_purchases(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, email TEXT, first_name TEXT, last_name TEXT,
  credits INTEGER, amount_eur NUMERIC, method TEXT, reference TEXT, status TEXT,
  amount_received_eur NUMERIC, admin_note TEXT, created_at TIMESTAMPTZ, processed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT r.id, r.user_id, u.email::text, p.first_name, p.last_name,
         r.credits, r.amount_eur, r.method, r.reference, r.status,
         r.amount_received_eur, r.admin_note, r.created_at, r.processed_at
  FROM public.credit_purchase_requests r
  LEFT JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE p_status IS NULL OR r.status = p_status
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC
  LIMIT 200;
END;
$$;

-- ─── Admin : valider (ajoute les crédits) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_confirm_credit_purchase(
  p_request_id UUID, p_amount_received_eur NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.credit_purchase_requests;
  bal INTEGER;
  label TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO r FROM public.credit_purchase_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable' USING ERRCODE = '22023';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette demande est déjà traitée (%)', r.status USING ERRCODE = '22023';
  END IF;
  IF p_amount_received_eur IS NOT NULL AND p_amount_received_eur <= 0 THEN
    RAISE EXCEPTION 'Montant reçu invalide' USING ERRCODE = '22023';
  END IF;

  label := CASE r.method WHEN 'whatsapp' THEN 'WhatsApp' WHEN 'virement' THEN 'virement' ELSE 'Revolut' END;
  bal := public._credit(r.user_id, r.credits, 'purchase',
    'Achat de ' || r.credits || ' crédits (' || label || ', ' || r.reference || ')',
    'manual:' || r.reference, NULL);
  UPDATE public.credit_transactions
     SET amount_paid_eur = COALESCE(p_amount_received_eur, r.amount_eur)
   WHERE stripe_payment_id = 'manual:' || r.reference;

  UPDATE public.credit_purchase_requests
     SET status = 'confirmed',
         amount_received_eur = COALESCE(p_amount_received_eur, r.amount_eur),
         processed_at = now(), processed_by = auth.uid()
   WHERE id = r.id;

  PERFORM public._notify(r.user_id, 'Paiement reçu 💳',
    r.credits || ' crédits ont été ajoutés à votre compte. Merci !', 'payment', '/credits');
  RETURN bal;
END;
$$;

-- ─── Admin : refuser ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_credit_purchase(p_request_id UUID, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.credit_purchase_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  UPDATE public.credit_purchase_requests
     SET status = 'rejected', admin_note = left(p_note, 500), processed_at = now(), processed_by = auth.uid()
   WHERE id = p_request_id AND status = 'pending'
  RETURNING * INTO r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable ou déjà traitée' USING ERRCODE = '22023';
  END IF;
  PERFORM public._notify(r.user_id, 'Demande de crédits refusée',
    'Votre demande ' || r.reference || ' n''a pas pu être validée'
      || COALESCE(' : ' || NULLIF(trim(p_note), ''), '.'), 'payment', '/credits');
END;
$$;

-- ─── Admin : coordonnées de paiement ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_payment_settings(
  p_whatsapp_number TEXT, p_account_holder TEXT, p_iban TEXT, p_bic TEXT,
  p_revolut_tag TEXT, p_instructions TEXT
)
RETURNS public.payment_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.payment_settings;
  wa TEXT := NULLIF(regexp_replace(COALESCE(p_whatsapp_number, ''), '[^0-9]', '', 'g'), '');
  iban_clean TEXT := NULLIF(upper(regexp_replace(COALESCE(p_iban, ''), '\s', '', 'g')), '');
  tag TEXT := NULLIF(regexp_replace(trim(COALESCE(p_revolut_tag, '')), '^@', ''), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF wa IS NOT NULL AND length(wa) NOT BETWEEN 8 AND 15 THEN
    RAISE EXCEPTION 'Numéro WhatsApp invalide (format international, ex. 33612345678)' USING ERRCODE = '22023';
  END IF;
  IF iban_clean IS NOT NULL AND iban_clean !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' THEN
    RAISE EXCEPTION 'IBAN invalide' USING ERRCODE = '22023';
  END IF;
  IF tag IS NOT NULL AND tag !~ '^[A-Za-z0-9._-]{2,40}$' THEN
    RAISE EXCEPTION 'Identifiant Revolut invalide' USING ERRCODE = '22023';
  END IF;

  UPDATE public.payment_settings SET
    whatsapp_number = wa,
    account_holder  = NULLIF(left(trim(COALESCE(p_account_holder, '')), 100), ''),
    iban            = iban_clean,
    bic             = NULLIF(upper(trim(COALESCE(p_bic, ''))), ''),
    revolut_tag     = tag,
    instructions    = NULLIF(left(trim(COALESCE(p_instructions, '')), 500), ''),
    updated_at      = now()
  WHERE id = 1
  RETURNING * INTO s;
  RETURN s;
END;
$$;

-- ─── Droits ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.request_credit_purchase(INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_credit_purchase(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_credit_purchases(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_confirm_credit_purchase(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_credit_purchase(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_payment_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_credit_purchase(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_credit_purchase(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_credit_purchases(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_credit_purchase(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_credit_purchase(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
