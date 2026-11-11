-- Données « à l'ancienne » (en crédits), créées AVANT la migration 0300,
-- pour vérifier la conversion unique crédits → centimes.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('a1111111-1111-1111-1111-111111111111','vieuxprof@x.fr','{"first_name":"Vieux","role":"tutor"}'),
 ('a2222222-2222-2222-2222-222222222222','vieileleve@x.fr','{"first_name":"Ancienne"}');
INSERT INTO tutors (user_id, subjects, hourly_rate, status) VALUES ('a1111111-1111-1111-1111-111111111111', ARRAY['SVT'], 40, 'online');
UPDATE user_credits SET balance = 7 WHERE user_id = 'a2222222-2222-2222-2222-222222222222';
INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ('a2222222-2222-2222-2222-222222222222', 7, 'purchase', 'Ancien achat');
ALTER TABLE lessons DISABLE TRIGGER USER;
INSERT INTO lessons (student_id, tutor_id, subject, scheduled_at, duration_minutes, status, credits_cost)
VALUES ('a2222222-2222-2222-2222-222222222222','a1111111-1111-1111-1111-111111111111','SVT', now() + interval '10 days', 60, 'confirmed', 8);
ALTER TABLE lessons ENABLE TRIGGER USER;
INSERT INTO credit_purchase_requests (user_id, credits, amount_eur, method, reference)
VALUES ('a2222222-2222-2222-2222-222222222222', 10, 45, 'virement', 'PEL-OLD001');
