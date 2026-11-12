\set ON_ERROR_STOP 0
\pset tuples_only on
-- ─── Conversion des anciennes données (seed 29) ─────────────────────────────
SELECT 'E1 solde converti 7 credits (attendu 3500):', balance FROM user_credits WHERE user_id='a2222222-2222-2222-2222-222222222222';
SELECT 'E2 historique converti (attendu 3500):', amount FROM credit_transactions WHERE description='Ancien achat';
SELECT 'E3 cours ancien prix_cents (attendu 4000):', price_cents FROM lessons WHERE subject='SVT';
SELECT 'E4 demande en attente bonus (attendu 5.00):', bonus_eur FROM credit_purchase_requests WHERE reference='PEL-OLD001';
SELECT 'E5 tarif unique (attendu 35):', string_agg(DISTINCT hourly_rate::int::text, ',') FROM tutors;

-- ─── Grille de prix ─────────────────────────────────────────────────────────
SELECT 'E6 grille (attendu 1500,2500,3000,3500,5000,6500):', string_agg(lesson_price_cents(d)::text, ',' ORDER BY d) FROM unnest(ARRAY[20,30,45,60,90,120]) d;
SELECT 'E7 duree hors grille (attendu vide):', lesson_price_cents(50) IS NULL;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('b1111111-1111-1111-1111-111111111111','prof2@x.fr','{"first_name":"Lea","role":"tutor"}'),
 ('b2222222-2222-2222-2222-222222222222','eleve2@x.fr','{"first_name":"Zoe"}');
INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555','admin@x.fr') ON CONFLICT DO NOTHING;
INSERT INTO user_roles(user_id, role) VALUES ('55555555-5555-5555-5555-555555555555','admin') ON CONFLICT DO NOTHING;

-- Prof : plus de tarif, ne peut pas le modifier
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','b1111111-1111-1111-1111-111111111111',false);
SELECT 'E8 devenir prof sans tarif:', become_tutor(ARRAY['Anglais']) IS NOT NULL;
SELECT 'E9 tarif fixe (attendu 35):', hourly_rate::int FROM tutors WHERE user_id=auth.uid();
SELECT 'E10 prof change son tarif (attendu erreur)'; UPDATE tutors SET hourly_rate=80 WHERE user_id=auth.uid();
RESET ROLE;

-- Élève : recharge
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','b2222222-2222-2222-2222-222222222222',false);
SELECT 'E11 sans solde (attendu erreur Solde insuffisant)'; SELECT book_lesson('b1111111-1111-1111-1111-111111111111','Anglais','Oral', now()+interval '3 days', 60);
SELECT 'E12 recharge trop petite (attendu erreur)'; SELECT request_topup(10, 'virement');
SELECT 'E13 recharge 100 € (attendu 100.00|15.00):', amount_eur||'|'||bonus_eur FROM request_topup(100, 'revolut');
SELECT 'E14 recharge libre 20 € (attendu 20.00|0.00):', amount_eur||'|'||bonus_eur FROM request_topup(20, 'whatsapp');
SELECT 'E15 ancienne RPC supprimee (attendu erreur)'; SELECT request_credit_purchase(10, 'virement');
RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
SELECT 'E16 admin valide 100 € (attendu solde 11500):', admin_confirm_credit_purchase((SELECT id FROM credit_purchase_requests WHERE user_id='b2222222-2222-2222-2222-222222222222' AND amount_eur=100));
SELECT 'E17 liste admin bonus (attendu 15.00):', bonus_eur FROM admin_list_credit_purchases('confirmed') WHERE amount_eur=100;
RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','b2222222-2222-2222-2222-222222222222',false);
SELECT 'E18 reservation 1h30 (attendu 5000):', (book_lesson('b1111111-1111-1111-1111-111111111111','Anglais','Oral', now()+interval '3 days', 90)).price_cents;
SELECT 'E19 solde apres (attendu 6500):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'E20 eleve change le prix (attendu erreur)'; UPDATE lessons SET price_cents=1 WHERE student_id=auth.uid();
SELECT 'E21 annulation > 24h rembourse:', (cancel_lesson((SELECT id FROM lessons WHERE student_id=auth.uid() AND status='pending' LIMIT 1))).status;
SELECT 'E22 solde rembourse (attendu 11500):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'E23 resa 2h (attendu 6500):', (book_lesson('b1111111-1111-1111-1111-111111111111','Anglais','Écrit', now()+interval '4 days', 120)).price_cents;
SELECT 'E24 duree invalide (attendu erreur)'; SELECT book_lesson('b1111111-1111-1111-1111-111111111111','Anglais','x', now()+interval '6 days', 50);
RESET ROLE;

-- Le prof fait le cours : gain = 80 % de 65 € = 52 €
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','b1111111-1111-1111-1111-111111111111',false);
SELECT confirm_lesson(id) IS NOT NULL FROM lessons WHERE tutor_id=auth.uid() AND status='pending';
RESET ROLE;
UPDATE lessons SET scheduled_at = now() WHERE tutor_id='b1111111-1111-1111-1111-111111111111' AND status='confirmed';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','b1111111-1111-1111-1111-111111111111',false);
SELECT start_lesson(id) IS NOT NULL FROM lessons WHERE tutor_id=auth.uid() AND status='confirmed';
SELECT 'E25 termine:', (complete_lesson((SELECT id FROM lessons WHERE tutor_id=auth.uid() AND status='in_progress'))).status;
SELECT 'E26 gain prof (attendu 52.00):', amount FROM tutor_earnings WHERE tutor_id=auth.uid();
SELECT 'E27 retrait 50 € (attendu 50.00|1.00|49.00):', amount||'|'||fee_eur||'|'||net_amount_eur FROM request_withdrawal(50);
SELECT 'E28 solde dispo (attendu 2.00):', tutor_available_balance(auth.uid());
RESET ROLE;
SELECT 'E29 message solde insuffisant en euros:', count(*) FROM pg_proc WHERE proname='_credit' AND prosrc LIKE '%Solde insuffisant%';
