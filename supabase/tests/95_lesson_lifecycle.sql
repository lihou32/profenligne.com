\set ON_ERROR_STOP 0
\pset tuples_only on
-- Vie d'un cours (migration 1100)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('e1111111-1111-1111-1111-111111111111','l-prof@x.fr','{"first_name":"Paul","role":"tutor"}'),
 ('e2222222-2222-2222-2222-222222222222','l-eleve@x.fr','{"first_name":"Emma"}');
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',false);
SELECT become_tutor(ARRAY['Mathématiques']) IS NOT NULL;
RESET ROLE;
-- A : commence il y a 10 min (1 h) ; B : oublié, prof venu ; C : oublié, prof absent ; D : dans 2 h
INSERT INTO lessons (id, student_id, tutor_id, subject, scheduled_at, duration_minutes, status, price_cents) VALUES
 ('e0000000-0000-0000-0000-00000000000a','e2222222-2222-2222-2222-222222222222','e1111111-1111-1111-1111-111111111111','Mathématiques', now() - interval '10 minutes', 60, 'confirmed', 3500),
 ('e0000000-0000-0000-0000-00000000000b','e2222222-2222-2222-2222-222222222222','e1111111-1111-1111-1111-111111111111','Mathématiques', now() - interval '3 hours', 60, 'in_progress', 3500),
 ('e0000000-0000-0000-0000-00000000000c','e2222222-2222-2222-2222-222222222222','e1111111-1111-1111-1111-111111111111','Mathématiques', now() - interval '4 hours', 60, 'confirmed', 3500),
 ('e0000000-0000-0000-0000-00000000000d','e2222222-2222-2222-2222-222222222222','e1111111-1111-1111-1111-111111111111','Mathématiques', now() + interval '2 hours', 60, 'confirmed', 3500);
UPDATE lessons SET started_at = scheduled_at, tutor_joined_at = scheduled_at WHERE id = 'e0000000-0000-0000-0000-00000000000b';

-- L'élève entre : le cours démarre et on note sa venue
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e2222222-2222-2222-2222-222222222222',false);
SELECT 'V1 eleve entre (attendu in_progress|t|f):', status || '|' || (student_joined_at IS NOT NULL) || '|' || (tutor_joined_at IS NOT NULL) FROM start_lesson('e0000000-0000-0000-0000-00000000000a');
SELECT 'V2 trop tot pour la salle D (attendu erreur)'; SELECT start_lesson('e0000000-0000-0000-0000-00000000000d');
SELECT 'V3 eleve modifie sa venue (attendu erreur)'; UPDATE lessons SET tutor_joined_at = now() WHERE id = 'e0000000-0000-0000-0000-00000000000a';
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',false);
SELECT 'V4 prof termine sans etre entre (attendu erreur Entre dans la salle)'; SELECT complete_lesson('e0000000-0000-0000-0000-00000000000a');
SELECT 'V5 prof entre (attendu t):', tutor_joined_at IS NOT NULL FROM start_lesson('e0000000-0000-0000-0000-00000000000a');
SELECT 'V6 terminer apres 10 min sur 1 h (attendu erreur Trop tot)'; SELECT complete_lesson('e0000000-0000-0000-0000-00000000000a');
RESET ROLE;
UPDATE lessons SET scheduled_at = now() - interval '35 minutes', started_at = now() - interval '35 minutes' WHERE id = 'e0000000-0000-0000-0000-00000000000a';
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','e1111111-1111-1111-1111-111111111111',false);
SELECT 'V7 terminer apres 35 min (attendu completed):', status FROM complete_lesson('e0000000-0000-0000-0000-00000000000a');
RESET ROLE;

-- Balayage des cours oubliés
SELECT 'V8 solde eleve avant (attendu 0):', COALESCE((SELECT balance FROM user_credits WHERE user_id='e2222222-2222-2222-2222-222222222222'), 0);
SELECT 'V9 balayage (attendu 2):', _expire_stale_lessons();
SELECT 'V10 B prof venu (attendu completed):', status FROM lessons WHERE id='e0000000-0000-0000-0000-00000000000b';
SELECT 'V11 C prof absent (attendu cancelled):', status FROM lessons WHERE id='e0000000-0000-0000-0000-00000000000c';
SELECT 'V12 eleve rembourse de C (attendu 3500):', balance FROM user_credits WHERE user_id='e2222222-2222-2222-2222-222222222222';
SELECT 'V13 D intact (attendu confirmed):', status FROM lessons WHERE id='e0000000-0000-0000-0000-00000000000d';
SELECT 'V14 gains du prof pour A et B (attendu 2):', count(*) FROM tutor_earnings WHERE tutor_id='e1111111-1111-1111-1111-111111111111';
SELECT 'V15 notifications prof (attendu >=2):', count(*) >= 2 FROM notifications WHERE user_id='e1111111-1111-1111-1111-111111111111';
