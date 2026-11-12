\set ON_ERROR_STOP 0
\pset tuples_only on
-- Abonnements Plus / Bac, priorité dans la file, questions express (migration 0700)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('f1111111-1111-1111-1111-111111111111','m-prof@x.fr','{"first_name":"Ugo","role":"tutor"}'),
 ('f2222222-2222-2222-2222-222222222222','m-libre@x.fr','{"first_name":"Vic"}'),
 ('f3333333-3333-3333-3333-333333333333','m-plus@x.fr','{"first_name":"Wes"}'),
 ('f4444444-4444-4444-4444-444444444444','m-bac@x.fr','{"first_name":"Xia"}'),
 ('f5555555-5555-5555-5555-555555555555','m-admin@x.fr','{"first_name":"Yan"}');
INSERT INTO user_roles (user_id, role) VALUES ('f5555555-5555-5555-5555-555555555555','admin') ON CONFLICT DO NOTHING;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',false); SELECT become_tutor(ARRAY['Mathématiques']) IS NOT NULL; RESET ROLE;
SET ROLE service_role;
SELECT add_credits('f2222222-2222-2222-2222-222222222222', 10000, 'T', 'cs_m1');
SELECT add_credits('f3333333-3333-3333-3333-333333333333', 10000, 'T', 'cs_m2');
SELECT add_credits('f4444444-4444-4444-4444-444444444444', 3000, 'T', 'cs_m3');
RESET ROLE;
-- Le prof de test du jeu 29 est hors ligne pour ce scénario
UPDATE tutors SET status = 'offline';

-- ── S'abonner ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',false);
SELECT 'M1 abonnement Plus (attendu plus):', plan FROM subscribe('plus');
SELECT 'M2 solde debite (attendu 9001):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'M3 membre actif, annulation 2 h (attendu t|2):', active || '|' || cancel_hours FROM my_membership();
SELECT 'M4 renouvelle (attendu 60 jours):', round(extract(epoch FROM ends_at - now())/86400) FROM subscribe('plus');
SELECT 'M5 troisieme mois d avance (attendu erreur)'; SELECT subscribe('plus');
SELECT 'M6 passage a Bac (attendu bac, fin inchangee 60 j, solde 9001-999-600=7402):', plan, round(extract(epoch FROM ends_at - now())/86400) FROM subscribe('bac');
SELECT 'M6b solde (attendu 7402):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'M7 retour a Plus (attendu erreur)'; SELECT subscribe('plus');
SELECT 'M8 ecriture directe (attendu erreur)'; UPDATE subscriptions SET ends_at = now() + interval '5 years' WHERE user_id=auth.uid();
SELECT 'M8b fin intacte (attendu 60):', round(extract(epoch FROM ends_at - now())/86400) FROM subscriptions WHERE user_id=auth.uid();
RESET ROLE;
UPDATE subscriptions SET plan='plus' WHERE user_id='f3333333-3333-3333-3333-333333333333';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f4444444-4444-4444-4444-444444444444',false);
SELECT 'M9 Bac (attendu bac):', s.plan FROM subscribe('bac') s;
SELECT 'M9b solde (attendu 1401):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'M10 express hors semaine de revision (attendu erreur)'; SELECT join_express_queue('Mathématiques', 'DM');
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',false);
SELECT 'M11 non membre: annulation 24 h (attendu f|24):', active || '|' || cancel_hours FROM my_membership();
SELECT 'M12 non membre express (attendu erreur)'; SELECT join_express_queue('Mathématiques', NULL);
SELECT 'M13 offres invisibles (attendu 0):', count(*) FROM member_offers;
RESET ROLE;

-- ── Admin : semaine de révision et offre ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f5555555-5555-5555-5555-555555555555',false);
INSERT INTO revision_periods (label, starts_on, ends_on) VALUES ('Semaine du bac blanc', current_date - 1, current_date + 5);
INSERT INTO member_offers (title, body, code) VALUES ('Recharge +10 %', 'Ce week-end seulement', 'BAC10');
SELECT 'M14 stats admin (attendu 1|1):', plus_active || '|' || bac_active FROM admin_membership_stats();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',false);
SELECT 'M15 eleve cree une periode (attendu erreur)'; INSERT INTO revision_periods (label, starts_on, ends_on) VALUES ('x', current_date, current_date);
SELECT 'M15b eleve voit la periode (attendu 1):', count(*) FROM revision_periods;
SELECT 'M15c stats admin par un eleve (attendu erreur)'; SELECT * FROM admin_membership_stats();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',false);
SELECT 'M16 membre voit l offre (attendu BAC10):', code FROM member_offers;
RESET ROLE;

-- ── File : priorité ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',false);
SELECT 'M17 non membre en file (attendu 0):', priority FROM join_live_queue('Mathématiques', NULL, 20);
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',false);
SELECT 'M18 Plus en file (attendu 1):', priority FROM join_live_queue('Mathématiques', NULL, 20);
SELECT 'M19 Plus passe devant (attendu position 1):', queue_position FROM my_live_request();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',false);
SELECT 'M20 non membre recule (attendu 2):', queue_position FROM my_live_request();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f4444444-4444-4444-4444-444444444444',false);
SELECT 'M21 question express du jour restante (attendu 1):', express_left_today FROM my_membership();
SELECT 'M22 question express (attendu waiting|3|10):', status || '|' || priority || '|' || duration_minutes FROM join_express_queue('Mathématiques', 'Limite en +infini');
SELECT 'M23 deuxieme express (attendu erreur)'; SELECT join_express_queue('Mathématiques', NULL);
SELECT 'M24 express en tete (attendu 1):', queue_position FROM my_live_request();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',false);
SELECT 'M25 le prof voit l express en premier, paye 5 € (attendu t|5.00|0):', is_express || '|' || payout_eur || '|' || price_eur FROM tutor_live_queue() LIMIT 1;
UPDATE tutors SET status='online' WHERE user_id=auth.uid();
SELECT 'M26 cours express cree (attendu Xia express gratuit: t|0|10):', is_express || '|' || price_cents || '|' || duration_minutes FROM lessons WHERE tutor_id=auth.uid();
SELECT start_lesson(id) IS NULL FROM lessons WHERE tutor_id=auth.uid();
RESET ROLE; UPDATE lessons SET started_at = now() - interval '3 hours', scheduled_at = LEAST(scheduled_at, now() - interval '3 hours') WHERE status = 'in_progress'; -- cours fait (migration 1100 : pas de fin avant la moitié du cours)
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f1111111-1111-1111-1111-111111111111',false);
SELECT complete_lesson(id) IS NULL FROM lessons WHERE tutor_id=auth.uid();
SELECT 'M27 prof paye 5 € (attendu 5.00):', amount FROM tutor_earnings WHERE tutor_id=auth.uid();
SELECT 'M27b prof modifie le paiement (attendu erreur)'; UPDATE lessons SET tutor_payout_cents = 9999 WHERE tutor_id=auth.uid();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f4444444-4444-4444-4444-444444444444',false);
SELECT 'M28 eleve Bac non debite (attendu 1401):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'M28b plus de question aujourd hui (attendu 0):', express_left_today FROM my_membership();
RESET ROLE;
SELECT 'M29 Plus servi ensuite quand le prof se libere (attendu matched):', status FROM live_requests WHERE student_id='f3333333-3333-3333-3333-333333333333';
SELECT 'M29b non membre attend toujours (attendu waiting):', status FROM live_requests WHERE student_id='f2222222-2222-2222-2222-222222222222';

-- ── Annulation : 2 h pour les membres ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',false);
SELECT 'M30 solde avant annulation (attendu 5402):', (SELECT balance FROM user_credits WHERE user_id=auth.uid()) AS avant FROM (SELECT 1) x;
RESET ROLE;
INSERT INTO lessons (student_id, tutor_id, subject, scheduled_at, duration_minutes, status, credits_cost, price_cents)
VALUES ('f3333333-3333-3333-3333-333333333333','f1111111-1111-1111-1111-111111111111','Mathématiques', now() + interval '5 hours', 60, 'confirmed', 0, 3500),
       ('f2222222-2222-2222-2222-222222222222','f1111111-1111-1111-1111-111111111111','Mathématiques', now() + interval '8 hours', 60, 'confirmed', 0, 3500);
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f3333333-3333-3333-3333-333333333333',false);
SELECT cancel_lesson((SELECT id FROM lessons WHERE student_id=auth.uid() AND price_cents=3500)) IS NULL;
SELECT 'M30b refund membre a 5 h (attendu 8902 = 5402 + 3500):', balance FROM user_credits WHERE user_id=auth.uid();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','f2222222-2222-2222-2222-222222222222',false);
SELECT cancel_lesson((SELECT id FROM lessons WHERE student_id=auth.uid() AND price_cents=3500)) IS NULL;
SELECT 'M31 non membre a 8 h pas rembourse (attendu 10000):', balance FROM user_credits WHERE user_id=auth.uid();
RESET ROLE;
