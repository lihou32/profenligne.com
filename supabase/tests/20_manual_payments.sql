\set ON_ERROR_STOP 0
\pset tuples_only on
-- Admin
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
 ('55555555-5555-5555-5555-555555555555','admin@x.fr','{"first_name":"Ad"}') ON CONFLICT DO NOTHING;
INSERT INTO user_roles(user_id, role) VALUES ('55555555-5555-5555-5555-555555555555','admin') ON CONFLICT DO NOTHING;

-- Élève : coordonnées lisibles, pas modifiables
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
SELECT 'P1 lecture coordonnees (attendu 1):', count(*) FROM payment_settings;
SELECT 'P2 eleve modifie IBAN (attendu erreur)'; UPDATE payment_settings SET iban='FR76HACK';
SELECT 'P3 eleve via RPC admin (attendu erreur)'; SELECT admin_update_payment_settings('33600000000',NULL,NULL,NULL,NULL,NULL);
SELECT 'P4 montant invalide (attendu erreur)'; SELECT request_topup(9000, 'virement');
SELECT 'P5 methode invalide (attendu erreur)'; SELECT request_topup(50, 'paypal');
SELECT 'P6 insert direct (attendu erreur)'; INSERT INTO credit_purchase_requests(user_id,amount_eur,method,reference,status) VALUES (auth.uid(),1,'virement','PEL-HACK','confirmed');
SELECT 'P7 demande ok (attendu 70.00|7.50|pending):', amount_eur||'|'||bonus_eur||'|'||status FROM request_topup(70,'revolut');
SELECT 'P8 eleve valide sa demande (attendu erreur)'; SELECT admin_confirm_credit_purchase((SELECT id FROM credit_purchase_requests WHERE user_id=auth.uid() LIMIT 1));
SELECT 'P9 eleve passe en confirmed (attendu erreur)'; UPDATE credit_purchase_requests SET status='confirmed';
SELECT request_topup(50,'virement'); SELECT request_topup(30,'whatsapp');
SELECT 'P10 4e demande en attente (attendu erreur)'; SELECT request_topup(150,'virement');
SELECT 'P11 annulation:', cancel_credit_purchase((SELECT id FROM credit_purchase_requests WHERE user_id=auth.uid() AND method='whatsapp')) IS NULL;
RESET ROLE;
SELECT 'P12 admin notifie (attendu >=3):', count(*) FROM notifications WHERE user_id='55555555-5555-5555-5555-555555555555' AND type='payment';

-- Autre élève ne voit pas les demandes d'Emma
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false);
SELECT 'P13 visibilite autres (attendu 0):', count(*) FROM credit_purchase_requests;
SELECT 'P14 annuler demande d autrui (attendu erreur)'; SELECT cancel_credit_purchase((SELECT id FROM credit_purchase_requests LIMIT 1));
RESET ROLE;

-- Admin
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
SELECT 'P15 IBAN invalide (attendu erreur)'; SELECT admin_update_payment_settings(NULL,NULL,'pas un iban',NULL,NULL,NULL);
SELECT 'P16 coordonnees ok:', whatsapp_number||'|'||iban||'|'||revolut_tag FROM admin_update_payment_settings('+33 6 12 34 56 78','Lihou T','FR76 3000 6000 0112 3456 7890 189','AGRIFRPP','@lihou','Mettre la référence');
SELECT 'P17 liste admin (attendu 3):', count(*) FROM admin_list_credit_purchases(NULL);
SELECT 'P18 solde avant:', balance FROM user_credits WHERE user_id='22222222-2222-2222-2222-222222222222';
SELECT 'P19 validation revolut, nouveau solde:', admin_confirm_credit_purchase((SELECT id FROM credit_purchase_requests WHERE method='revolut'), NULL);
SELECT 'P20 double validation (attendu erreur)'; SELECT admin_confirm_credit_purchase((SELECT id FROM credit_purchase_requests WHERE method='revolut'));
SELECT 'P21 transaction (attendu purchase|7750|70.00):', type||'|'||amount||'|'||amount_paid_eur FROM credit_transactions WHERE stripe_payment_id LIKE 'manual:%';
SELECT 'P22 refus:', admin_reject_credit_purchase((SELECT id FROM credit_purchase_requests WHERE method='virement'), 'Paiement non reçu') IS NULL;
SELECT 'P23 statuts (attendu cancelled,confirmed,rejected):', string_agg(status, ',' ORDER BY status) FROM credit_purchase_requests;
RESET ROLE;
SELECT 'P24 eleve notifie (attendu 3 : recharge test 10 + validation + refus):', count(*) FROM notifications WHERE user_id='22222222-2222-2222-2222-222222222222' AND type='payment';
SELECT 'P25 revenus admin_stats (attendu 45 + 70 = 115.00):', revenue_this_month FROM admin_stats() ; 
