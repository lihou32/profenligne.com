# Mise en production — refonte sécurité, crédits et cycle des cours (novembre 2026)

## Ce qui change

| Domaine | Avant | Après |
|---|---|---|
| Inscription | `role=admin` accepté depuis le formulaire | Seuls `student` / `tutor` possibles |
| Crédits | Achetés mais jamais débités | Débités à la réservation (RPC `book_lesson`), remboursés à l'annulation |
| Cycle d'un cours | Jamais « en cours » ni « terminé » | `confirm` → `start` → `complete` (RPC) ; XP, gains prof, parrainage, avis et certificats se déclenchent |
| Avis | N'importe qui notait n'importe quel prof | Uniquement après un cours terminé, 1 avis par cours (`submit_review`) |
| Gains / retraits / XP | Modifiables depuis le navigateur | Écrits uniquement par la base ; retrait plafonné au solde réel |
| Stripe | `userId` pris dans la requête, mauvaise URL de retour (404) | Acheteur identifié par son token, montant vérifié, webhook idempotent |
| Tâches planifiées | Déclenchables avec la clé anon (publique) | `CRON_SECRET` obligatoire |
| Admin | Requêtes vers des colonnes inexistantes | RPC `admin_*` réservées aux admins |

Règles métier (modifiables dans `public.app_setting` **et** `src/lib/credits.ts`) :
- 1 crédit = 5 € de cours ; coût = tarif du prof × durée ÷ 5 €, arrondi au crédit supérieur
- Commission plateforme : 20 % — le prof touche 80 % de la valeur des crédits payés
- Annulation élève remboursée si le cours n'est pas encore confirmé ou s'il reste plus de 24 h
- Salle ouverte 15 min avant ; tarif prof entre 10 € et 150 €/h ; retrait minimum 20 €
- Parrainage : +2 crédits pour chacun au 1er cours terminé du filleul, 20 parrainages max

## Étapes

1. **Base de données** (projet Supabase `jlytabfuiwfacfbowiyh`, actuellement en pause → le relancer) :
   ```bash
   npx supabase link --project-ref jlytabfuiwfacfbowiyh
   npx supabase db push   # applique 20261111000000_* puis 20261111000100_*
   ```
   Les deux migrations sont idempotentes (rejouables sans erreur).

2. **Types TypeScript** (après la migration) :
   ```bash
   npx supabase gen types typescript --project-id jlytabfuiwfacfbowiyh > src/integrations/supabase/types.ts
   ```

3. **Edge functions** :
   ```bash
   npx supabase functions deploy
   npx supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... \
     APP_URL=https://<domaine> CRON_SECRET=<long secret aléatoire> RESEND_API_KEY=...
   ```
   Webhook Stripe → `https://jlytabfuiwfacfbowiyh.supabase.co/functions/v1/stripe-webhook`
   (événements `checkout.session.completed` et `checkout.session.async_payment_succeeded`).

4. **Crons** (`send-lesson-reminders` toutes les 5-10 min, `weekly-preregistrations-report` hebdo) :
   header `Authorization: Bearer <CRON_SECRET>` — la clé anon ne fonctionne plus.

5. **Vercel** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, et `VITE_COMING_SOON_MODE=false` pour ouvrir l'app.

## Tests

- Front : `npm test` (71 tests), `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`
- Base : `supabase/tests/10_security_scenario.sql` (47 vérifications : escalade de rôle, crédits,
  cycle de cours, avis, parrainage, RLS, admin) — à exécuter sur une base locale après
  `supabase/tests/00_supabase_stub.sql` + migrations.

## Mise à jour — paiement manuel et IA gratuite (11/11/2026)

Stripe est mis de côté. Les crédits s'achètent par **WhatsApp, virement ou Revolut** :

1. L'élève choisit un pack et un moyen de paiement → une demande `PEL-XXXXXX` est créée (`request_credit_purchase`), les admins sont notifiés.
2. L'élève paie en indiquant la référence.
3. L'admin ouvre **Panel Admin → Paiements**, vérifie la réception et clique **Payé** (`admin_confirm_credit_purchase`) : les crédits sont ajoutés une seule fois, l'élève est notifié, le CA apparaît dans les statistiques.

Les coordonnées (WhatsApp, IBAN, BIC, titulaire, identifiant Revolut) se saisissent dans le même onglet. Un moyen de paiement n'apparaît aux élèves que si son champ est rempli.

Migration : `supabase/migrations/20261111000200_manual_payments.sql` (rejouable). Tests : `supabase/tests/20_manual_payments.sql`.

**IA (quiz, cartes mentales)** : la fonction `ai-chat` accepte une clé gratuite. Ajouter dans Supabase → Edge Functions → Secrets **une** de ces clés :
- `GEMINI_API_KEY` — Google AI Studio (aistudio.google.com/apikey), gratuit ; modèle `gemini-2.5-flash` ;
- ou `GROQ_API_KEY` — console.groq.com, gratuit ; modèle `llama-3.3-70b-versatile`.

`AI_MODEL` permet de forcer un autre modèle. `LOVABLE_API_KEY` reste accepté en dernier recours.
