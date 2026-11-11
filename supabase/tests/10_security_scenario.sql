\set ON_ERROR_STOP 0
\pset tuples_only on
-- Utilisateurs
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('11111111-1111-1111-1111-111111111111','prof@x.fr','{"first_name":"Paul","role":"tutor"}'),
 ('22222222-2222-2222-2222-222222222222','eleve@x.fr','{"first_name":"Emma"}'),
 ('33333333-3333-3333-3333-333333333333','hacker@x.fr','{"first_name":"H","role":"admin"}'),
 ('44444444-4444-4444-4444-444444444444','filleul@x.fr','{"first_name":"Fil","referral_code":"22222222"}');
SELECT 'T1 hacker role (attendu student):', string_agg(role::text, ',') FROM user_roles WHERE user_id='33333333-3333-3333-3333-333333333333';
SELECT 'T2 referral cree:', count(*) FROM referrals WHERE referred_user_id='44444444-4444-4444-4444-444444444444';

-- Prof s'inscrit comme tuteur
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
SELECT 'T3 tarif trop bas (attendu erreur)'; SELECT become_tutor(ARRAY['Mathématiques'], 2);
SELECT 'T4 become_tutor ok:', become_tutor(ARRAY['Mathématiques'], 40) IS NOT NULL;
SELECT 'T5 prof modifie sa note (attendu erreur)'; UPDATE tutors SET rating=5 WHERE user_id=auth.uid();
UPDATE tutors SET status='online' WHERE user_id=auth.uid();
SELECT 'T6 statut online:', status FROM tutors WHERE user_id=auth.uid();
SELECT 'T7 prof se cree un gain (attendu erreur)'; INSERT INTO tutor_earnings(tutor_id, amount) VALUES (auth.uid(), 1000);
RESET ROLE;

-- Elève : réservation sans crédits
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
SELECT 'T8 cout 60min a 40€/h (attendu 8):', lesson_credit_cost('11111111-1111-1111-1111-111111111111', 60);
SELECT 'T9 sans credits (attendu erreur)'; SELECT book_lesson('11111111-1111-1111-1111-111111111111','Mathématiques','Intégrales', now()+interval '2 days', 60);
SELECT 'T10 insert direct lesson (attendu erreur)'; INSERT INTO lessons(student_id,tutor_id,subject,scheduled_at) VALUES (auth.uid(),'11111111-1111-1111-1111-111111111111','Maths',now()+interval '1 day');
SELECT 'T11 add_credits depuis client (attendu erreur)'; SELECT add_credits(auth.uid(), 100, 'x', 'y');
SELECT 'T12 XP gratuite (attendu erreur)'; INSERT INTO user_xp(user_id,total_xp) VALUES (auth.uid(), 99999);
RESET ROLE;

-- Webhook Stripe (service_role) x2 pour idempotence
SET ROLE service_role;
SELECT 'T13 achat 10 credits:', add_credits('22222222-2222-2222-2222-222222222222', 10, 'Achat', 'cs_test_1');
SELECT 'T14 rejeu webhook (attendu 10):', add_credits('22222222-2222-2222-2222-222222222222', 10, 'Achat', 'cs_test_1');
RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
SELECT 'T15 reservation:', (book_lesson('11111111-1111-1111-1111-111111111111','Mathématiques','Intégrales', now()+interval '2 days', 60)).credits_cost;
SELECT 'T16 solde apres (attendu 2):', balance FROM user_credits WHERE user_id=auth.uid();
SELECT 'T17 double reservation meme creneau (attendu erreur: deja un cours)'; SELECT book_lesson('11111111-1111-1111-1111-111111111111','Mathématiques','x', (SELECT scheduled_at FROM lessons LIMIT 1)+interval '30 min', 30);
SELECT 'T18 eleve se marque completed (attendu erreur)'; UPDATE lessons SET status='completed';
SELECT 'T19 eleve modifie notes ok'; UPDATE lessons SET notes='ma note';
SELECT 'T20 eleve annule pending → rembourse'; SELECT (cancel_lesson(id)).status FROM lessons WHERE status='pending';
SELECT 'T21 solde (attendu 10):', balance FROM user_credits WHERE user_id=auth.uid();
-- Nouveau cours, qui commence dans 5 minutes
SELECT 'T22 resa 2:', (book_lesson('11111111-1111-1111-1111-111111111111','Mathématiques','Suites', now()+interval '5 minutes', 30)).credits_cost;
SELECT 'T23 eleve demarre avant confirmation (attendu erreur)'; SELECT start_lesson(id) FROM lessons WHERE status='pending';
RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
SELECT 'T24 prof confirme:', (confirm_lesson(id)).status FROM lessons WHERE status='pending';
SELECT 'T25 prof demarre:', (start_lesson(id)).status FROM lessons WHERE status='confirmed';
SELECT 'T26 prof termine:', (complete_lesson(id)).status FROM lessons WHERE status='in_progress';
SELECT 'T27 gain prof (4 credits*5*0.8=16):', amount FROM tutor_earnings;
SELECT 'T28 retrait trop gros (attendu erreur)'; SELECT request_withdrawal(500);
SELECT 'T29 retrait sous minimum (attendu erreur)'; SELECT request_withdrawal(10);
RESET ROLE;

SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
SELECT 'T30 avis:', (submit_review(id, 5, 'Super prof')).rating FROM lessons WHERE status='completed';
SELECT 'T31 note prof recalculee:', rating, total_reviews FROM tutors;
SELECT 'T32 XP eleve:', total_xp FROM user_xp WHERE user_id=auth.uid();
SELECT 'T33 notifs eleve:', count(*) FROM notifications WHERE user_id=auth.uid();
RESET ROLE;

-- Hacker : chat dans une salle qui n'est pas la sienne
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
SELECT 'T34 hacker chat (attendu erreur)'; INSERT INTO room_messages(room_id,user_id,sender_name,content) SELECT room_id, auth.uid(), 'H', 'spam' FROM lessons LIMIT 1;
SELECT 'T35 hacker voit cours des autres (attendu 0):', count(*) FROM lessons;
SELECT 'T36 hacker devient admin (attendu erreur)'; INSERT INTO user_roles(user_id, role) VALUES (auth.uid(), 'admin');
RESET ROLE;

-- Filleul : premier cours terminé → bonus des deux côtés
SET ROLE service_role; SELECT add_credits('44444444-4444-4444-4444-444444444444', 10, 'Achat', 'cs_test_2'); RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false);
SELECT (book_lesson('11111111-1111-1111-1111-111111111111','Mathématiques','x', now()+interval '3 minutes', 30)).id IS NOT NULL;
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
SELECT (confirm_lesson(id)).status, (start_lesson(id)).status, (complete_lesson(id)).status FROM lessons WHERE student_id='44444444-4444-4444-4444-444444444444';
RESET ROLE;
SELECT 'T37 parrainage:', status, credits_awarded FROM referrals;
SELECT 'T38 solde parrain (attendu 10-4+2=8):', balance FROM user_credits WHERE user_id='22222222-2222-2222-2222-222222222222';
SET ROLE anon; SELECT set_config('request.jwt.claim.sub','',false);
SELECT 'T39 visiteur voit les profs (attendu 1):', count(*) FROM tutors;
SELECT 'T40 visiteur voit profil prof (attendu 1):', count(*) FROM profiles;
RESET ROLE;

-- ─── Admin ──────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('55555555-5555-5555-5555-555555555555','admin@x.fr','{"first_name":"Ad"}');
INSERT INTO user_roles (user_id, role) VALUES ('55555555-5555-5555-5555-555555555555','admin');
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
SELECT 'T41 hacker admin_list_tutors (attendu erreur)'; SELECT * FROM admin_list_tutors();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
SELECT 'T43 admin liste profs:', email, lessons_completed FROM admin_list_tutors();
SELECT 'T44 admin liste cours:', count(*) FROM admin_list_lessons(NULL);
SELECT 'T45 admin stats:', total_users, total_tutors, revenue_this_month FROM admin_stats();
SELECT admin_set_tutor_suspended('11111111-1111-1111-1111-111111111111', true);
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
SELECT 'T46 prof suspendu se reactive (attendu erreur)'; UPDATE tutors SET is_suspended=false WHERE user_id=auth.uid();
RESET ROLE;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
SELECT 'T47 resa prof suspendu (attendu erreur)'; SELECT book_lesson('11111111-1111-1111-1111-111111111111','Mathématiques','x', now()+interval '4 days', 30);
RESET ROLE;
