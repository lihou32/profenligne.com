-- ════════════════════════════════════════════════════════════════════════════
-- Prof en Ligne — prix fixes et solde en euros (fin des crédits)
-- 2026-11-11
--
-- Décisions de Lihou (d'après ses fichiers Excel « prof en ligne ») :
--   • Prix identique pour tous les profs, selon la durée du cours :
--       20 min 15 € · 30 min 25 € · 45 min 30 € · 1 h 35 € · 1 h 30 50 € · 2 h 65 €
--   • Commission de la plateforme : 20 % (le prof touche 80 % du prix).
--   • L'élève paie avec un solde en euros. Recharges avec bonus (fidélisation) :
--       50 € → +5 € · 70 € → +7,50 € · 100 € → +15 € · 150 € → +25 €
--     ou un montant libre (15 € minimum, sans bonus).
--   • Frais de retrait de 2 % pour les profs.
--
-- Stockage : les tables gardent leur nom (user_credits, credit_transactions…)
-- mais les montants sont désormais en CENTIMES d'euro (entiers, pas d'arrondi
-- flottant) :
--   user_credits.balance, credit_transactions.amount, referrals.credits_awarded,
--   lessons.price_cents (nouvelle colonne ; credits_cost n'est plus utilisé).
-- Les soldes existants sont convertis une seule fois (1 crédit = 5 € = 500 ct).
--
-- Idempotent : peut être rejouée sans effet de bord.
-- À exécuter APRÈS 20261111000200_manual_payments.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Constantes métier ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.app_setting(_key TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _key
    WHEN 'credit_value_eur'         THEN 5::numeric      -- historique : conversion des anciens crédits
    WHEN 'platform_commission'      THEN 0.20::numeric
    WHEN 'withdrawal_fee_rate'      THEN 0.02::numeric
    WHEN 'referral_bonus_cents'     THEN 1000::numeric   -- 10 € pour chacun
    WHEN 'referral_bonus_credits'   THEN 2::numeric      -- historique
    WHEN 'referral_max_per_user'    THEN 20::numeric
    WHEN 'fixed_hourly_rate'        THEN 35::numeric     -- affichage : prix d'une heure
    WHEN 'min_hourly_rate'          THEN 10::numeric     -- historique
    WHEN 'max_hourly_rate'          THEN 150::numeric    -- historique
    WHEN 'free_cancel_hours'        THEN 24::numeric
    WHEN 'room_open_minutes_before' THEN 15::numeric
    WHEN 'min_withdrawal_eur'       THEN 20::numeric
    WHEN 'min_topup_eur'            THEN 15::numeric
    WHEN 'max_topup_eur'            THEN 500::numeric
  END
$$;

-- ─── Grille de prix (source de vérité) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lesson_price_cents(_duration INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _duration
    WHEN 20  THEN 1500
    WHEN 30  THEN 2500
    WHEN 45  THEN 3000
    WHEN 60  THEN 3500
    WHEN 90  THEN 5000
    WHEN 120 THEN 6500
  END
$$;

-- Compatibilité : même signature qu'avant, le prof n'influe plus sur le prix
CREATE OR REPLACE FUNCTION public.lesson_price_eur(_tutor_id UUID, _duration INTEGER)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT round(public.lesson_price_cents(_duration) / 100.0, 2)
$$;

DROP FUNCTION IF EXISTS public.lesson_credit_cost(UUID, INTEGER);

-- Bonus de fidélisation d'une recharge (en euros)
CREATE OR REPLACE FUNCTION public.topup_bonus_eur(_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _amount
    WHEN 50  THEN 5::numeric
    WHEN 70  THEN 7.5::numeric
    WHEN 100 THEN 15::numeric
    WHEN 150 THEN 25::numeric
    ELSE 0::numeric
  END
$$;

-- Montant en euros lisible (« 12,50 € ») pour les messages
CREATE OR REPLACE FUNCTION public._eur(_cents BIGINT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(to_char(_cents / 100.0, 'FM999G990D00'), '.', ',') || ' €'
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. SCHÉMA + CONVERSION UNIQUE (crédits → centimes)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.credit_purchase_requests ADD COLUMN IF NOT EXISTS bonus_eur NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.credit_purchase_requests ALTER COLUMN credits DROP NOT NULL;
ALTER TABLE public.credit_purchase_requests DROP CONSTRAINT IF EXISTS credit_purchase_requests_credits_check;
ALTER TABLE public.credit_purchase_requests DROP CONSTRAINT IF EXISTS credit_purchase_requests_bonus_check;
ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_bonus_check CHECK (bonus_eur >= 0);

ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS fee_eur NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS net_amount_eur NUMERIC(10,2);

DO $conv$
BEGIN
  -- La présence de lessons.price_cents marque la conversion comme faite.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'price_cents'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE public.lessons ADD CONSTRAINT lessons_price_cents_nonneg CHECK (price_cents >= 0);

    -- Valeur payée par les cours déjà réservés (1 crédit = 5 €)
    ALTER TABLE public.lessons DISABLE TRIGGER USER;
    UPDATE public.lessons SET price_cents = credits_cost * 500;
    ALTER TABLE public.lessons ENABLE TRIGGER USER;

    -- Soldes et historique des élèves
    UPDATE public.user_credits SET balance = balance * 500;
    UPDATE public.credit_transactions SET amount = amount * 500;
    UPDATE public.referrals SET credits_awarded = credits_awarded * 500;

    -- Demandes de recharge encore en attente : même valeur qu'annoncée
    -- (un pack de 10 crédits payé 45 € donne 50 € de solde → bonus 5 €).
    UPDATE public.credit_purchase_requests
       SET bonus_eur = GREATEST(credits * 5 - amount_eur, 0)
     WHERE credits IS NOT NULL;

    -- Retraits passés : pas de frais rétroactifs
    UPDATE public.withdrawal_requests SET net_amount_eur = amount WHERE net_amount_eur IS NULL;
  END IF;
END
$conv$;

-- Prix unique : le tarif horaire affiché est le même pour tous
UPDATE public.tutors SET hourly_rate = public.app_setting('fixed_hourly_rate')
 WHERE hourly_rate IS DISTINCT FROM public.app_setting('fixed_hourly_rate');

-- ════════════════════════════════════════════════════════════════════════════
-- 2. MOUVEMENTS DU SOLDE (en centimes)
-- ════════════════════════════════════════════════════════════════════════════

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
    RAISE EXCEPTION 'Solde insuffisant : ce cours coûte %, ton solde est de %. Recharge ton solde pour réserver.',
      public._eur(-_amount), public._eur(current_balance) USING ERRCODE = 'P0001';
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

-- ─── Devenir prof : plus de tarif à choisir ─────────────────────────────────
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

-- ─── Réserver un cours (débite le solde de façon atomique) ──────────────────
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
  cost := public.lesson_price_cents(p_duration_minutes);
  IF cost IS NULL THEN
    RAISE EXCEPTION 'Durée invalide' USING ERRCODE = '22023';
  END IF;

  -- Sérialise les réservations d'un même prof (pas de double réservation)
  PERFORM pg_advisory_xact_lock(hashtext('book_lesson:' || p_tutor_id::text));

  IF EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.tutor_id = p_tutor_id
      AND l.status IN ('pending', 'confirmed', 'in_progress')
      AND tstzrange(l.scheduled_at, l.scheduled_at + make_interval(mins => l.duration_minutes))
          && tstzrange(p_scheduled_at, p_scheduled_at + make_interval(mins => p_duration_minutes))
  ) THEN
    RAISE EXCEPTION 'Ce professeur a déjà un cours sur ce créneau' USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.lessons (student_id, tutor_id, subject, topic, scheduled_at, duration_minutes, status, credits_cost, price_cents)
  VALUES (uid, p_tutor_id, trim(p_subject), NULLIF(trim(p_topic), ''), p_scheduled_at, p_duration_minutes, 'pending', 0, cost)
  RETURNING * INTO new_lesson;

  -- Débit (lève « Solde insuffisant » et annule tout si le solde ne suffit pas)
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

-- ─── Annuler — remboursement automatique sur le solde ──────────────────────
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

-- ─── Effets de fin de cours : XP + gains prof (80 %) + parrainage ──────────
CREATE OR REPLACE FUNCTION public.on_lesson_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_xp INTEGER := 100;
  tutor_xp   INTEGER := 50;
  ref public.referrals;
  bonus INTEGER := public.app_setting('referral_bonus_cents')::int;
  completed_refs INTEGER;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.xp_transactions (user_id, amount, reason, lesson_id)
  VALUES (NEW.student_id, student_xp, 'Cours complété : ' || NEW.subject, NEW.id),
         (NEW.tutor_id,   tutor_xp,   'Cours enseigné : ' || NEW.subject, NEW.id);

  INSERT INTO public.user_xp (user_id, total_xp) VALUES (NEW.student_id, student_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = public.user_xp.total_xp + student_xp;
  INSERT INTO public.user_xp (user_id, total_xp) VALUES (NEW.tutor_id, tutor_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = public.user_xp.total_xp + tutor_xp;

  -- Gains prof = prix payé × (1 − commission)
  INSERT INTO public.tutor_earnings (tutor_id, lesson_id, amount, status)
  VALUES (NEW.tutor_id, NEW.id,
          round(NEW.price_cents / 100.0 * (1 - public.app_setting('platform_commission')), 2), 'pending')
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
        'Votre filleul a terminé son premier cours : +' || public._eur(bonus) || ' sur votre solde !', 'referral', '/referral');
      PERFORM public._notify(ref.referred_user_id, 'Bonus parrainage 🎁',
        '+' || public._eur(bonus) || ' offerts sur votre solde pour votre premier cours !', 'referral', '/credits');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Protection des colonnes sensibles d'un cours (ajoute price_cents) ──────
CREATE OR REPLACE FUNCTION public.guard_lesson_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
  OR NEW.price_cents  IS DISTINCT FROM OLD.price_cents
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

-- ─── Protection d'un prof : le tarif n'est plus modifiable ──────────────────
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
  OR NEW.total_reviews IS DISTINCT FROM OLD.total_reviews
  OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate THEN
    RAISE EXCEPTION 'Modification non autorisée' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Retrait (prof) : 2 % de frais ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount NUMERIC)
RETURNS public.withdrawal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  available NUMERIC;
  fee NUMERIC;
  w public.withdrawal_requests;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'tutor') THEN
    RAISE EXCEPTION 'Réservé aux professeurs' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || uid::text));

  available := public.tutor_available_balance(uid);
  IF p_amount IS NULL OR p_amount < public.app_setting('min_withdrawal_eur') THEN
    RAISE EXCEPTION 'Montant minimum de retrait : % €', public.app_setting('min_withdrawal_eur') USING ERRCODE = '22023';
  END IF;
  IF p_amount > available THEN
    RAISE EXCEPTION 'Solde disponible insuffisant (% €)', round(available, 2) USING ERRCODE = '22023';
  END IF;

  fee := round(round(p_amount, 2) * public.app_setting('withdrawal_fee_rate'), 2);
  INSERT INTO public.withdrawal_requests (tutor_id, amount, fee_eur, net_amount_eur, status)
  VALUES (uid, round(p_amount, 2), fee, round(p_amount, 2) - fee, 'pending')
  RETURNING * INTO w;
  RETURN w;
END;
$$;

-- ─── Ajout au solde (Stripe, plus tard — service_role) ──────────────────────
-- p_credits est désormais un montant en centimes.
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
    RAISE EXCEPTION 'Montant invalide' USING ERRCODE = '22023';
  END IF;
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
    public._eur(p_credits) || ' ont été ajoutés à votre solde.', 'payment', '/credits');
  RETURN bal;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RECHARGES DU SOLDE (paiement manuel : WhatsApp, virement, Revolut)
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.request_credit_purchase(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.credit_pack_price_eur(INTEGER);

CREATE OR REPLACE FUNCTION public.request_topup(p_amount_eur NUMERIC, p_method TEXT)
RETURNS public.credit_purchase_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  amount NUMERIC := round(p_amount_eur, 2);
  bonus NUMERIC;
  ref TEXT;
  r public.credit_purchase_requests;
  admin_id UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF amount IS NULL OR amount < public.app_setting('min_topup_eur') OR amount > public.app_setting('max_topup_eur') THEN
    RAISE EXCEPTION 'Montant de recharge invalide (entre % € et % €)',
      public.app_setting('min_topup_eur'), public.app_setting('max_topup_eur') USING ERRCODE = '22023';
  END IF;
  IF p_method IS NULL OR p_method NOT IN ('whatsapp', 'virement', 'revolut') THEN
    RAISE EXCEPTION 'Moyen de paiement invalide' USING ERRCODE = '22023';
  END IF;
  bonus := public.topup_bonus_eur(amount);

  PERFORM pg_advisory_xact_lock(hashtext('credit_purchase:' || uid::text));
  IF (SELECT count(*) FROM public.credit_purchase_requests
       WHERE user_id = uid AND status = 'pending') >= 3 THEN
    RAISE EXCEPTION 'Vous avez déjà 3 demandes en attente : annulez-en une ou attendez leur validation'
      USING ERRCODE = '22023';
  END IF;

  LOOP
    ref := 'PEL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.credit_purchase_requests WHERE reference = ref);
  END LOOP;

  INSERT INTO public.credit_purchase_requests (user_id, credits, amount_eur, bonus_eur, method, reference)
  VALUES (uid, NULL, amount, bonus, p_method, ref)
  RETURNING * INTO r;

  FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public._notify(admin_id, 'Nouvelle recharge à vérifier 💶',
      public._eur((amount * 100)::bigint) || ' · ' || p_method || ' · ' || ref, 'payment', '/admin');
  END LOOP;

  RETURN r;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_list_credit_purchases(TEXT);
CREATE OR REPLACE FUNCTION public.admin_list_credit_purchases(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, email TEXT, first_name TEXT, last_name TEXT,
  amount_eur NUMERIC, bonus_eur NUMERIC, method TEXT, reference TEXT, status TEXT,
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
         r.amount_eur, r.bonus_eur, r.method, r.reference, r.status,
         r.amount_received_eur, r.admin_note, r.created_at, r.processed_at
  FROM public.credit_purchase_requests r
  LEFT JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE p_status IS NULL OR r.status = p_status
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC
  LIMIT 200;
END;
$$;

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
  added INTEGER;
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

  added := round((r.amount_eur + r.bonus_eur) * 100)::int;
  label := CASE r.method WHEN 'whatsapp' THEN 'WhatsApp' WHEN 'virement' THEN 'virement' ELSE 'Revolut' END;
  bal := public._credit(r.user_id, added, 'purchase',
    'Recharge de ' || public._eur((r.amount_eur * 100)::bigint)
      || CASE WHEN r.bonus_eur > 0 THEN ' + ' || public._eur((r.bonus_eur * 100)::bigint) || ' offerts' ELSE '' END
      || ' (' || label || ', ' || r.reference || ')',
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
    public._eur(added) || ' ont été ajoutés à votre solde. Merci !', 'payment', '/credits');
  RETURN bal;
END;
$$;

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
  PERFORM public._notify(r.user_id, 'Recharge refusée',
    'Votre demande ' || r.reference || ' n''a pas pu être validée'
      || COALESCE(' : ' || NULLIF(trim(p_note), ''), '.'), 'payment', '/credits');
END;
$$;

-- ─── Admin : liste des cours (prix en euros) ────────────────────────────────
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
         round(l.price_cents / 100.0, 2)
  FROM public.lessons l
  LEFT JOIN public.profiles tp ON tp.user_id = l.tutor_id
  LEFT JOIN public.profiles sp ON sp.user_id = l.student_id
  WHERE p_status IS NULL OR l.status = p_status
  ORDER BY l.created_at DESC
  LIMIT 500;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. DROITS
-- ════════════════════════════════════════════════════════════════════════════
REVOKE ALL ON FUNCTION public._credit(UUID, INTEGER, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._eur(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT, NUMERIC) TO service_role;
REVOKE ALL ON FUNCTION public.request_topup(NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_credit_purchases(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.become_tutor(TEXT[], NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_topup(NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_credit_purchases(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.become_tutor(TEXT[], NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lesson_price_cents(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lesson_price_eur(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.topup_bonus_eur(NUMERIC) TO anon, authenticated;
