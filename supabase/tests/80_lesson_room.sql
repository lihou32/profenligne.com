\set ON_ERROR_STOP 0
\pset tuples_only on
-- Salle de cours : canaux privés, tableau enregistré, chat (migration 0800)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('d1111111-1111-1111-1111-111111111111','r-prof@x.fr','{"first_name":"Lea","role":"tutor"}'),
 ('d2222222-2222-2222-2222-222222222222','r-eleve@x.fr','{"first_name":"Max"}'),
 ('d3333333-3333-3333-3333-333333333333','r-intrus@x.fr','{"first_name":"Ivo"}');
INSERT INTO lessons (id, student_id, tutor_id, subject, scheduled_at, status) VALUES
 ('d0000000-0000-0000-0000-00000000000a','d2222222-2222-2222-2222-222222222222','d1111111-1111-1111-1111-111111111111','Mathématiques', now(), 'confirmed'),
 ('d0000000-0000-0000-0000-00000000000b','d2222222-2222-2222-2222-222222222222','d1111111-1111-1111-1111-111111111111','Mathématiques', now() - interval '2 days', 'completed');

-- ── Canaux temps réel privés ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',false);
SELECT set_config('realtime.topic','lesson:d0000000-0000-0000-0000-00000000000a',false);
WITH x AS (INSERT INTO realtime.messages (topic, extension, event) VALUES (realtime.topic(), 'broadcast', 'signal') RETURNING 1) SELECT 'R1 eleve emet sur son canal (attendu 1):', count(*) FROM x;
SELECT 'R2 eleve lit son canal (attendu 1):', count(*) FROM realtime.messages WHERE topic = realtime.topic();
SELECT set_config('realtime.topic','lesson:d0000000-0000-0000-0000-00000000000b',false);
SELECT 'R3 cours termine : emission (attendu erreur)'; INSERT INTO realtime.messages (topic, extension, event) VALUES (realtime.topic(), 'broadcast', 'signal');
SELECT set_config('realtime.topic','lesson:pas-un-uuid',false);
SELECT 'R4 canal mal forme (attendu f):', can_use_lesson_channel(realtime.topic());
SELECT set_config('realtime.topic','whiteboard-x',false);
SELECT 'R4b autre canal (attendu f):', can_use_lesson_channel(realtime.topic());
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT set_config('realtime.topic','lesson:d0000000-0000-0000-0000-00000000000a',false);
SELECT 'R5 intrus emet (attendu erreur)'; INSERT INTO realtime.messages (topic, extension, event) VALUES (realtime.topic(), 'broadcast', 'signal');
SELECT 'R6 intrus lit (attendu 0):', count(*) FROM realtime.messages;
RESET ROLE;
SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false);
SELECT set_config('realtime.topic','lesson:d0000000-0000-0000-0000-00000000000a',false);
SELECT 'R7 visiteur emet (attendu erreur)'; INSERT INTO realtime.messages (topic, extension, event) VALUES (realtime.topic(), 'broadcast', 'signal');
RESET ROLE;

-- ── Tableau enregistré ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',false);
SELECT 'B1 prof enregistre 2 elements (attendu t):', save_lesson_board('d0000000-0000-0000-0000-00000000000a',
  '[{"id":"a","version":1,"versionNonce":5,"index":"a1","type":"line"},{"id":"b","version":3,"versionNonce":9,"index":"a0","type":"text"}]') IS NOT NULL;
SELECT 'B2 ordre par index (attendu b,a):', string_agg(e->>'id', ',' ORDER BY o) FROM lesson_boards, jsonb_array_elements(elements) WITH ORDINALITY t(e, o) WHERE lesson_id='d0000000-0000-0000-0000-00000000000a';
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',false);
-- L'élève envoie une copie plus ancienne de "b" (doit être ignorée), une nouvelle version de "a" et un nouvel élément "c"
SELECT 'B3 eleve fusionne (attendu t):', save_lesson_board('d0000000-0000-0000-0000-00000000000a',
  '[{"id":"b","version":2,"versionNonce":1,"index":"a0","type":"text"},{"id":"a","version":2,"versionNonce":7,"index":"a1","type":"line","isDeleted":true},{"id":"c","version":1,"versionNonce":3,"index":"a2","type":"rectangle"}]',
  '{"img1":{"id":"img1","mimeType":"image/png","dataURL":"data:image/png;base64,AAAA"}}') IS NOT NULL;
SELECT 'B4 versions gardees (attendu a2,b3,c1):', string_agg((e->>'id') || (e->>'version'), ',' ORDER BY e->>'id') FROM lesson_boards, jsonb_array_elements(elements) e WHERE lesson_id='d0000000-0000-0000-0000-00000000000a';
SELECT 'B5 suppression conservee (attendu true):', e->>'isDeleted' FROM lesson_boards, jsonb_array_elements(elements) e WHERE lesson_id='d0000000-0000-0000-0000-00000000000a' AND e->>'id'='a';
SELECT 'B6 image enregistree (attendu 1):', count(*) FROM lesson_boards, jsonb_object_keys(files) WHERE lesson_id='d0000000-0000-0000-0000-00000000000a';
SELECT 'B7 image deja la gardee (attendu AAAA):', split_part(files->'img1'->>'dataURL', ',', 2) FROM (SELECT save_lesson_board('d0000000-0000-0000-0000-00000000000a', '[]', '{"img1":{"id":"img1","dataURL":"data:x,BBBB"}}')) s, lesson_boards WHERE lesson_id='d0000000-0000-0000-0000-00000000000a';
SELECT 'B8 ecriture directe (attendu erreur)'; UPDATE lesson_boards SET elements='[]' WHERE lesson_id='d0000000-0000-0000-0000-00000000000a';
SELECT 'B9 pas un tableau (attendu erreur Tableau invalide)'; SELECT save_lesson_board('d0000000-0000-0000-0000-00000000000a', '{"x":1}');
SELECT 'B10 cours termine (attendu erreur Salle fermee)'; SELECT save_lesson_board('d0000000-0000-0000-0000-00000000000b', '[]');
SELECT 'B11 image trop lourde (attendu erreur)'; SELECT save_lesson_board('d0000000-0000-0000-0000-00000000000a', '[]', jsonb_build_object('big', jsonb_build_object('dataURL', repeat(md5(random()::text), 120000))));
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT 'B12 intrus enregistre (attendu erreur Salle fermee)'; SELECT save_lesson_board('d0000000-0000-0000-0000-00000000000a', '[]');
SELECT 'B13 intrus lit le tableau (attendu 0):', count(*) FROM lesson_boards;
RESET ROLE;

-- ── Chat ──
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d2222222-2222-2222-2222-222222222222',false);
INSERT INTO lesson_messages (lesson_id, body) VALUES ('d0000000-0000-0000-0000-00000000000a', 'Bonjour !');
SELECT 'C1 message envoye (attendu 1):', count(*) FROM lesson_messages WHERE lesson_id='d0000000-0000-0000-0000-00000000000a';
SELECT 'C2 se faire passer pour le prof (attendu erreur)'; INSERT INTO lesson_messages (lesson_id, sender_id, body) VALUES ('d0000000-0000-0000-0000-00000000000a', 'd1111111-1111-1111-1111-111111111111', 'faux');
SELECT 'C3 message vide (attendu erreur)'; INSERT INTO lesson_messages (lesson_id, body) VALUES ('d0000000-0000-0000-0000-00000000000a', '   ');
SELECT 'C4 cours termine (attendu erreur)'; INSERT INTO lesson_messages (lesson_id, body) VALUES ('d0000000-0000-0000-0000-00000000000b', 'apres');
SELECT 'C5 modifier un message (attendu erreur)'; UPDATE lesson_messages SET body='x';
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d1111111-1111-1111-1111-111111111111',false);
SELECT 'C6 le prof lit (attendu Bonjour !):', body FROM lesson_messages;
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','d3333333-3333-3333-3333-333333333333',false);
SELECT 'C7 intrus lit (attendu 0):', count(*) FROM lesson_messages;
SELECT 'C8 intrus ecrit (attendu erreur)'; INSERT INTO lesson_messages (lesson_id, body) VALUES ('d0000000-0000-0000-0000-00000000000a', 'spam');
RESET ROLE;
SELECT 'C9 chat publie en direct (attendu 1):', count(*) FROM pg_publication_tables WHERE tablename='lesson_messages';
