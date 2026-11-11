\set ON_ERROR_STOP 0
\pset tuples_only on
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('d1111111-1111-1111-1111-111111111111','q-prof1@x.fr','{"first_name":"Ali","role":"tutor"}'),
 ('d2222222-2222-2222-2222-222222222222','q-prof2@x.fr','{"first_name":"Bea","role":"tutor"}'),
 ('d3333333-3333-3333-3333-333333333333','q-eleve1@x.fr','{"first_name":"Tom"}'),
 ('d4444444-4444-4444-4444-444444444444','q-eleve2@x.fr','{"first_name":"Lou"}'),
 ('d5555555-5555-5555-5555-555555555555','q-pauvre@x.fr','{"first_name":"Zed"}');
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',false); SELECT become_tutor(ARRAY['Mathématiques']) IS NOT NULL; RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',false); SELECT become_tutor(ARRAY['Anglais']) IS NOT NULL; RESET ROLE;
SET ROLE service_role;
SELECT add_credits('d3333333-3333-3333-3333-333333333333', 10000, 'T', 'cs_q1');
SELECT add_credits('d4444444-4444-4444-4444-444444444444', 10000, 'T', 'cs_q2');
SELECT add_credits('d5555555-5555-5555-5555-555555555555', 500, 'T', 'cs_q3');
RESET ROLE;
-- Visiteur : stats publiques
SET ROLE anon;
SELECT 'Q1 stats visiteur (attendu 1 en ligne : le prof du jeu de test 29):', tutors_online FROM live_stats();
SELECT 'Q2 visiteur rejoint (attendu erreur)'; SELECT join_live_queue('Mathématiques', NULL, 20);
RESET ROLE;

-- Aucun prof en ligne : file d'attente
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT 'Q3 rejoint sans prof (attendu waiting):', status FROM join_live_queue('Mathématiques', 'DM dérivées', 20);
SELECT 'Q4 deuxieme demande (attendu erreur)'; SELECT join_live_queue('Mathématiques', NULL, 20);
SELECT 'Q5 position (attendu waiting|1|0):', status || '|' || queue_position || '|' || tutors_online FROM my_live_request();
SELECT 'Q6 eleve insere a la main (attendu erreur)'; INSERT INTO live_requests(student_id, subject, duration_minutes, status) VALUES (auth.uid(), 'x', 20, 'matched');
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d5555555-5555-5555-5555-555555555555',false);
SELECT 'Q7 solde trop faible (attendu erreur Solde insuffisant)'; SELECT join_live_queue('Mathématiques', NULL, 20);
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d4444444-4444-4444-4444-444444444444',false);
SELECT 'Q8 2e eleve anglais (attendu waiting):', status FROM join_live_queue('Anglais', NULL, 30);
SELECT 'Q9 position du 2e (attendu 2):', queue_position FROM my_live_request();
RESET ROLE;

-- Le prof de maths se met en ligne : il prend Tom automatiquement
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',false);
UPDATE tutors SET status='online' WHERE user_id=auth.uid();
SELECT 'Q10 prof passe occupe (attendu busy):', status FROM tutors WHERE user_id=auth.uid();
SELECT 'Q11 cours cree confirme en direct (attendu confirmed|t|Mathématiques):', status || '|' || is_instant || '|' || subject FROM lessons WHERE tutor_id=auth.uid();
SELECT 'Q12 file vue par le prof (attendu 1 anglais, pas pour lui):', count(*), bool_or(mine) FROM tutor_live_queue();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT 'Q13 Tom est en cours (attendu matched, cours):', status, lesson_id IS NOT NULL FROM my_live_request();
SELECT 'Q14 Tom debite (attendu 10000 - prix 20 min):', 10000 - balance = (SELECT price_cents FROM lessons WHERE student_id=auth.uid()) FROM user_credits WHERE user_id=auth.uid();
RESET ROLE;

-- La prof d'anglais accepte Lou depuis la liste
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',false);
SELECT 'Q15 accepte Lou (attendu confirmed):', (tutor_accept_live_request((SELECT id FROM tutor_live_queue() LIMIT 1))).status;
SELECT 'Q16 reprendre la meme demande (attendu erreur)'; SELECT tutor_accept_live_request((SELECT id FROM live_requests WHERE student_id='d4444444-4444-4444-4444-444444444444'));
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT 'Q17 eleve accepte une demande (attendu erreur)'; SELECT tutor_accept_live_request(gen_random_uuid());
RESET ROLE;

-- Fin du cours : le prof redevient en ligne
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',false);
SELECT start_lesson(id) IS NOT NULL FROM lessons WHERE tutor_id=auth.uid() AND status='confirmed';
SELECT complete_lesson(id) IS NOT NULL FROM lessons WHERE tutor_id=auth.uid() AND status='in_progress';
SELECT 'Q18 prof de nouveau en ligne (attendu online):', status FROM tutors WHERE user_id=auth.uid();
RESET ROLE;

-- Annuler sa place
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
RESET ROLE;
UPDATE tutors SET status='offline' WHERE user_id IN ('d1111111-1111-1111-1111-111111111111','d2222222-2222-2222-2222-222222222222');
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT 'Q19 nouvelle demande (attendu waiting):', status FROM join_live_queue('Philosophie', NULL, 20);
SELECT 'Q20 annule (attendu vide = ok):', cancel_live_request((SELECT id FROM live_requests WHERE student_id=auth.uid() AND status='waiting')) IS NULL;
SELECT 'Q21 statut (attendu cancelled):', status FROM my_live_request();
RESET ROLE;
-- Expiration après 30 min
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d4444444-4444-4444-4444-444444444444',false);
SELECT status FROM join_live_queue('Philosophie', NULL, 20);
RESET ROLE;
UPDATE live_requests SET created_at = now() - interval '31 minutes' WHERE student_id='d4444444-4444-4444-4444-444444444444' AND status='waiting';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d4444444-4444-4444-4444-444444444444',false);
SELECT count(*) >= 0 FROM my_live_request();
SELECT 'Q22 expiree (attendu expired):', status FROM live_requests WHERE student_id=auth.uid() AND subject='Philosophie';
RESET ROLE;
SELECT 'Q23 stats (attendu 0 en attente):', students_waiting FROM live_stats();
