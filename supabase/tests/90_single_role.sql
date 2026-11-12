\set ON_ERROR_STOP 0
\pset tuples_only on
-- Un compte est soit élève, soit prof (migration 0900)
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('c1111111-1111-1111-1111-111111111111','s-vierge@x.fr','{"first_name":"Vera"}'),
 ('c2222222-2222-2222-2222-222222222222','s-actif@x.fr','{"first_name":"Aldo"}'),
 ('c3333333-3333-3333-3333-333333333333','s-prof@x.fr','{"first_name":"Pia","role":"tutor"}');
SELECT 'S1 inscription eleve = 1 role (attendu student):', string_agg(role::text, ',') FROM user_roles WHERE user_id='c1111111-1111-1111-1111-111111111111';
SELECT 'S2 inscription prof = 1 role (attendu tutor):', string_agg(role::text, ',') FROM user_roles WHERE user_id='c3333333-3333-3333-3333-333333333333';
SELECT 'S3 ajouter prof a un eleve (attendu erreur)'; INSERT INTO user_roles (user_id, role) VALUES ('c1111111-1111-1111-1111-111111111111', 'tutor');
WITH x AS (INSERT INTO user_roles (user_id, role) VALUES ('c1111111-1111-1111-1111-111111111111', 'admin') RETURNING 1) SELECT 'S4 admin reste possible (attendu 1):', count(*) FROM x;
DELETE FROM user_roles WHERE user_id='c1111111-1111-1111-1111-111111111111' AND role='admin';
-- Compte élève vierge → devient prof (le rôle élève est remplacé)
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','c1111111-1111-1111-1111-111111111111',false);
SELECT 'S5 eleve vierge devient prof (attendu t):', become_tutor(ARRAY['Mathématiques']) IS NOT NULL;
RESET ROLE;
SELECT 'S6 roles apres (attendu tutor):', string_agg(role::text, ',') FROM user_roles WHERE user_id='c1111111-1111-1111-1111-111111111111';
-- Compte élève qui a déjà payé → refus
SET ROLE service_role; SELECT add_credits('c2222222-2222-2222-2222-222222222222', 1000, 'T', 'cs_s1'); RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','c2222222-2222-2222-2222-222222222222',false);
SELECT 'S7 eleve actif devient prof (attendu erreur compte eleve)'; SELECT become_tutor(ARRAY['Physique-Chimie']);
RESET ROLE;
SELECT 'S8 eleve actif inchange (attendu student|0):', string_agg(role::text, ',') || '|' || (SELECT count(*) FROM tutors WHERE user_id='c2222222-2222-2222-2222-222222222222') FROM user_roles WHERE user_id='c2222222-2222-2222-2222-222222222222';
-- Un prof ne réserve pas, ne s'abonne pas, n'entre pas dans la file
SELECT 'S9 cours avec un prof comme eleve (attendu erreur)'; INSERT INTO lessons (student_id, tutor_id, subject, scheduled_at) VALUES ('c3333333-3333-3333-3333-333333333333','c1111111-1111-1111-1111-111111111111','Mathématiques', now());
SELECT 'S10 abonnement d un prof (attendu erreur)'; INSERT INTO subscriptions (user_id, plan, ends_at) VALUES ('c3333333-3333-3333-3333-333333333333','plus', now() + interval '30 days');
WITH x AS (INSERT INTO lessons (student_id, tutor_id, subject, scheduled_at) VALUES ('c2222222-2222-2222-2222-222222222222','c1111111-1111-1111-1111-111111111111','Mathématiques', now()) RETURNING 1) SELECT 'S11 cours entre eleve et prof (attendu 1):', count(*) FROM x;
SELECT 'S12 plus aucun compte double (attendu 0):', count(*) FROM (SELECT user_id FROM user_roles WHERE role IN ('student','tutor') GROUP BY user_id HAVING count(DISTINCT role) > 1) d;
