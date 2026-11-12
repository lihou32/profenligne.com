\set ON_ERROR_STOP 0
\pset tuples_only on
SELECT 'L1 supplement 22h direct (attendu 500):', late_surcharge_cents('2026-11-12 22:30 Europe/Paris'::timestamptz, true);
SELECT 'L2 supplement 22h reserve (attendu 0):', late_surcharge_cents('2026-11-12 22:30 Europe/Paris'::timestamptz, false);
SELECT 'L3 supplement 20h59 direct (attendu 0):', late_surcharge_cents('2026-11-12 20:59 Europe/Paris'::timestamptz, true);
SELECT 'L4 supplement 2h direct (attendu 500):', late_surcharge_cents('2026-11-13 02:00 Europe/Paris'::timestamptz, true);
SELECT 'L5 supplement 6h direct (attendu 0):', late_surcharge_cents('2026-11-13 06:00 Europe/Paris'::timestamptz, true);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('c1111111-1111-1111-1111-111111111111','live-prof@x.fr','{"first_name":"Nora","role":"tutor"}'),
 ('c2222222-2222-2222-2222-222222222222','live-eleve@x.fr','{"first_name":"Max"}');
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',false);
SELECT become_tutor(ARRAY['Mathématiques']) IS NOT NULL;
RESET ROLE;
SET ROLE service_role; SELECT add_credits('c2222222-2222-2222-2222-222222222222', 20000, 'Test', 'cs_live'); RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','c2222222-2222-2222-2222-222222222222',false);
SELECT 'L6 direct avec prof hors ligne (attendu erreur)'; SELECT book_lesson('c1111111-1111-1111-1111-111111111111','Mathématiques','x', now(), 60);
RESET ROLE;
UPDATE tutors SET status='online' WHERE user_id='c1111111-1111-1111-1111-111111111111';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','c2222222-2222-2222-2222-222222222222',false);
SELECT 'L7 direct maintenant (attendu instant=t, prix = 3500 + supplement selon l heure):',
  (l).is_instant, (l).price_cents - (l).surcharge_cents, (l).surcharge_cents = late_surcharge_cents(now(), true)
  FROM (SELECT book_lesson('c1111111-1111-1111-1111-111111111111','Mathématiques','Suites', now(), 60) AS l) s;
SELECT 'L8 reserve dans 2 jours a 22h (attendu f|2500|0):', (l).is_instant || '|' || (l).price_cents || '|' || (l).surcharge_cents
  FROM (SELECT book_lesson('c1111111-1111-1111-1111-111111111111','Mathématiques','x', date_trunc('day', now() + interval '2 days') + interval '22 hours', 30) AS l) s;
SELECT 'L9 eleve modifie le supplement (attendu erreur)'; UPDATE lessons SET surcharge_cents=0 WHERE student_id=auth.uid();
RESET ROLE;
-- Simulation à 22 h : cours en direct à 22 h 05 (heure de Paris) via la fonction de calcul
SELECT 'L10 prix direct 1h a 22h (attendu 4000):', lesson_price_cents(60) + late_surcharge_cents('2026-11-12 22:05 Europe/Paris'::timestamptz, true);
