\set ON_ERROR_STOP 0
\pset tuples_only on
-- Agenda des profs, présence réelle, demandes expirées (migration 0600)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('e1111111-1111-1111-1111-111111111111','a-prof1@x.fr','{"first_name":"Nora","role":"tutor"}'),
 ('e2222222-2222-2222-2222-222222222222','a-prof2@x.fr','{"first_name":"Omar","role":"tutor"}'),
 ('e3333333-3333-3333-3333-333333333333','a-eleve1@x.fr','{"first_name":"Paul"}'),
 ('e4444444-4444-4444-4444-444444444444','a-eleve2@x.fr','{"first_name":"Rita"}');
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',false); SELECT become_tutor(ARRAY['Mathématiques']) IS NOT NULL; RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',false); SELECT become_tutor(ARRAY['Physique-Chimie']) IS NOT NULL; RESET ROLE;
SET ROLE service_role;
SELECT add_credits('e3333333-3333-3333-3333-333333333333', 20000, 'T', 'cs_a1');
SELECT add_credits('e4444444-4444-4444-4444-444444444444', 20000, 'T', 'cs_a2');
RESET ROLE;
-- Lundi prochain (au moins demain), en date de Paris
CREATE TEMP TABLE d AS SELECT (current_date + (8 - extract(isodow FROM current_date))::int) AS monday;
GRANT SELECT ON d TO PUBLIC;
CREATE OR REPLACE FUNCTION pg_temp.at(h int, m int) RETURNS timestamptz LANGUAGE sql AS
  $$ SELECT ((SELECT monday FROM d)::timestamp + make_interval(hours => h, mins => m)) AT TIME ZONE 'Europe/Paris' $$;

-- ── Agenda ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',false);
SELECT 'A1 plages fusionnees (attendu 2):', set_my_availability('[{"weekday":1,"start":1020,"end":1110},{"weekday":1,"start":1080,"end":1200},{"weekday":3,"start":600,"end":720}]');
SELECT 'A1b lundi 17h-20h (attendu 1020|1200):', start_minute || '|' || end_minute FROM tutor_availability WHERE tutor_id=auth.uid() AND weekday=1;
SELECT 'A2 plage invalide (attendu erreur)'; SELECT set_my_availability('[{"weekday":1,"start":1025,"end":1100}]');
SELECT 'A2b agenda intact apres erreur (attendu 2):', count(*) FROM tutor_availability WHERE tutor_id=auth.uid();
SELECT 'A2c ecriture directe (attendu erreur)'; INSERT INTO tutor_availability(tutor_id, weekday, start_minute, end_minute) VALUES (auth.uid(), 2, 600, 660);
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e3333333-3333-3333-3333-333333333333',false);
SELECT 'A3 eleve publie un agenda (attendu erreur)'; SELECT set_my_availability('[]');
RESET ROLE;

SET ROLE anon;
SELECT 'A4 creneaux 1 h lundi vus par un visiteur (attendu 5):', count(*) FROM tutor_open_slots('e1111111-1111-1111-1111-111111111111', (SELECT monday FROM d), 1, 60);
SELECT 'A4b creneaux 20 min (attendu 6, 17h a 19h30):', count(*) FROM tutor_open_slots('e1111111-1111-1111-1111-111111111111', (SELECT monday FROM d), 1, 20);
SELECT 'A4c duree invalide (attendu 0):', count(*) FROM tutor_open_slots('e1111111-1111-1111-1111-111111111111', (SELECT monday FROM d), 1, 37);
RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e3333333-3333-3333-3333-333333333333',false);
SELECT 'A5 reserve lundi 18h (attendu confirmed):', status FROM book_lesson('e1111111-1111-1111-1111-111111111111', 'Mathématiques', 'Suites', pg_temp.at(18,0), 60);
SELECT 'A6 creneaux restants (attendu 17:00,19:00):', string_agg(to_char(starts_at AT TIME ZONE 'Europe/Paris','HH24:MI'), ',' ORDER BY starts_at) FROM tutor_open_slots('e1111111-1111-1111-1111-111111111111', (SELECT monday FROM d), 1, 60);
SELECT 'A7 hors agenda 21h (attendu erreur disponibilites)'; SELECT book_lesson('e1111111-1111-1111-1111-111111111111', 'Mathématiques', NULL, pg_temp.at(21,0), 60);
SELECT 'A7b deborde de la plage 19h30 1 h (attendu erreur disponibilites)'; SELECT book_lesson('e1111111-1111-1111-1111-111111111111', 'Mathématiques', NULL, pg_temp.at(19,30), 60);
SELECT 'A7c notification eleve (attendu Cours confirmé):', title FROM notifications WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 1;
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e4444444-4444-4444-4444-444444444444',false);
SELECT 'A8 meme creneau par une autre eleve (attendu erreur vient d etre pris)'; SELECT book_lesson('e1111111-1111-1111-1111-111111111111', 'Mathématiques', NULL, pg_temp.at(18,30), 30);
SELECT 'A9 prof sans agenda (attendu pending):', status FROM book_lesson('e2222222-2222-2222-2222-222222222222', 'Physique-Chimie', NULL, pg_temp.at(10,0), 60);
RESET ROLE;

-- ── Demande jamais confirmée : remboursée ──
UPDATE lessons SET scheduled_at = now() - interval '1 hour' WHERE student_id='e4444444-4444-4444-4444-444444444444' AND status='pending';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e4444444-4444-4444-4444-444444444444',false);
SELECT 'A10 refresh (attendu 1 expiree):', refresh_lessons();
SELECT 'A10b statut (attendu cancelled):', status FROM lessons WHERE student_id=auth.uid();
SELECT 'A10c solde rembourse (attendu 20000):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'A10d notification (attendu Cours non confirmé : remboursé):', title FROM notifications WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 1;
SELECT 'A10e second refresh (attendu 0):', refresh_lessons();
RESET ROLE;
SET ROLE anon;
SELECT 'A11 visiteur appelle refresh (attendu 0, sans effet)'; SELECT refresh_lessons();
SELECT 'A11b visiteur appelle le balayage interne (attendu erreur)'; SELECT _expire_stale_lessons();
RESET ROLE;

-- ── Présence ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',false);
UPDATE tutors SET status='online' WHERE user_id=auth.uid();
SELECT 'P1 mise en ligne note l heure (attendu t):', last_seen_at > now() - interval '5 seconds' FROM tutors WHERE user_id=auth.uid();
RESET ROLE;
UPDATE tutors SET last_seen_at = now() - interval '10 minutes' WHERE user_id='e2222222-2222-2222-2222-222222222222';
SET ROLE anon;
SELECT 'P2 compteur public sans le prof parti:', tutors_online FROM live_stats();
RESET ROLE;
SELECT 'P2b prof parti repasse hors ligne (attendu offline):', status FROM tutors WHERE user_id='e2222222-2222-2222-2222-222222222222';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e3333333-3333-3333-3333-333333333333',false);
SELECT 'P3 direct avec prof parti (attendu erreur pas en ligne)'; SELECT book_lesson('e2222222-2222-2222-2222-222222222222', 'Physique-Chimie', NULL, now(), 20);
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',false);
UPDATE tutors SET status='online' WHERE user_id=auth.uid();
SELECT 'P4 signal du prof (attendu online):', tutor_heartbeat();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e3333333-3333-3333-3333-333333333333',false);
SELECT 'P5 direct depuis le profil (attendu confirmed|t):', status || '|' || is_instant FROM book_lesson('e2222222-2222-2222-2222-222222222222', 'Physique-Chimie', 'DM', now(), 20);
SELECT 'P5b lien de salle notifie (attendu t):', link LIKE '/room/%' FROM notifications WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 1;
RESET ROLE;
SELECT 'P6 prof passe occupe (attendu busy):', status FROM tutors WHERE user_id='e2222222-2222-2222-2222-222222222222';

-- ── Profil : niveaux et accroche ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',false);
UPDATE tutors SET levels = ARRAY['Lycée','Supérieur'], headline = 'Prépa MP, je rends les maths logiques' WHERE user_id=auth.uid();
SELECT 'L1 niveaux enregistres (attendu {Lycée,Supérieur}):', levels FROM tutors WHERE user_id=auth.uid();
SELECT 'L2 niveau inconnu (attendu erreur)'; UPDATE tutors SET levels = ARRAY['Maternelle'] WHERE user_id=auth.uid();
SELECT 'L3 tarif toujours protege (attendu erreur)'; UPDATE tutors SET hourly_rate = 80 WHERE user_id=auth.uid();
RESET ROLE;
SET ROLE anon;
SELECT 'L4 prochain creneau public (attendu t):', next_slot IS NOT NULL FROM tutors_next_slot(60) WHERE tutor_id='e1111111-1111-1111-1111-111111111111';
RESET ROLE;
