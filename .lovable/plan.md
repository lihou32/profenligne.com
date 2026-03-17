

# Audit complet de l'application "Prof en Ligne"

## Etat actuel

L'application est en **mode Coming Soon** (`COMING_SOON_MODE = true` dans App.tsx). Seule la page de preinscription est accessible. L'application complete (auth, dashboard, cours, etc.) est prete en arriere-plan mais desactivee.

---

## Problemes identifies

### 1. CRITIQUE - App.tsx utilise `require()` au lieu de `import`
Le composant `FullApp` utilise `require()` pour charger les modules. Cela ne fonctionne pas avec Vite/ESM en production. Il faut convertir en lazy imports React (`React.lazy`) ou en imports statiques standard.

### 2. CRITIQUE - Routes non protegees
Les routes dans `AppLayout` (dashboard, lessons, live, notifications, etc.) sont protegees par `AppLayout` qui redirige vers `/login` si pas connecte. Cependant, il n'y a **aucune verification de role** sur les routes sensibles :
- `/earnings` (revenus tuteur) : accessible a un etudiant
- `/credits` (achat credits) : accessible a un tuteur
- `/reviews` : la page est partagee mais la logique "donner un avis" permet a un tuteur de se noter lui-meme
- Seul `/admin` a une `ProtectedRoute` avec role

### 3. CRITIQUE - Signup redirige vers `/dashboard` avant confirmation email
Apres `signUp()`, le code fait `navigate("/dashboard")`. Or, la confirmation email est requise (auto-confirm non active). L'utilisateur ne sera pas connecte et sera redirige vers `/login` par l'AppLayout. Il faudrait afficher un message "Verifiez votre email" au lieu de rediriger.

### 4. IMPORTANT - AdminPanel avec donnees statiques
Les statistiques du panel admin (1,234 utilisateurs, 456 cours, 12,450 euros, 94%) et la liste d'utilisateurs sont **codees en dur**. Seul l'onglet "Preinscrits" est dynamique. Les onglets "Tuteurs" et "Cours" affichent un placeholder.

### 5. IMPORTANT - Subjects stockes dans user_metadata au lieu de la base
Le profil sauvegarde les matieres via `supabase.auth.updateUser({ data: { subjects } })` au lieu de les stocker dans la table `tutors.subjects` ou une colonne `profiles`. Cela cree une incoherence : la page Profile lit depuis `user_metadata` mais les tuteurs affichent depuis `tutors.subjects`.

### 6. IMPORTANT - Sidebar affiche "Cours en direct" pour les tuteurs mais pas "AI Tutor"
Le lien vers `/ai-tutor` n'est dans aucun menu de la sidebar. La page existe mais n'est accessible que via le bouton du StudentDashboard. Les tuteurs n'y ont pas acces non plus.

### 7. MOYEN - LessonRoom: sujet/topic en dur dans la redirection
Quand un cours se termine, `handleEndCall` redirige vers `/report/${roomId}?subject=Mathematiques&topic=Cours` avec des valeurs en dur au lieu de lire les vraies donnees de la lecon.

### 8. MOYEN - Boutons Help sans action
Les boutons "Email" et "Chat en direct" de la page Help n'ont aucun `onClick` ni `href`. Ils ne font rien.

### 9. MOYEN - Boutons Pricing sans action
Les boutons "S'abonner" et "Commencer gratuitement" de la page Pricing ne font rien (pas de handler).

### 10. MOYEN - BuyCredits: achat non fonctionnel
Le bouton "Acheter" affiche un toast "sera configure prochainement" sans logique reelle.

### 11. MINEUR - Tutor Review: un etudiant peut noter un tuteur avec qui il n'a jamais eu de cours
La page `TutorReviews` affiche tous les tuteurs et permet de laisser un avis sans verifier qu'un cours a eu lieu entre eux.

### 12. MINEUR - useDashboardStats ne filtre pas par user
La requete `useDashboardStats` fait un `select("*")` sur les lessons sans filtrer par `student_id`. Avec les RLS en place, ca marche correctement cote securite, mais les RLS retournent les lecons ou l'user est student OU tutor, ce qui peut melanger les stats d'un utilisateur qui a les deux roles.

### 13. MINEUR - Countdown Coming Soon toujours a 90 jours
`LAUNCH_DATE` est calcule comme `Date.now() + 90 jours` a chaque chargement. Le compteur ne converge jamais. Il faudrait une date fixe.

### 14. MINEUR - Preregistrations insert utilise `as any`
Le cast `from("preregistrations" as any)` contourne le typage, probablement parce que les types ne sont pas regeneres.

---

## Plan de corrections

### Phase 1 - Corrections critiques

1. **Remplacer `require()` par des imports statiques** dans App.tsx (ou `React.lazy` pour du code-splitting)
2. **Proteger les routes par role** : wrapper `/earnings` avec `requiredRole="tutor"`, `/credits` avec `requiredRole="student"`, etc.
3. **Corriger le flux d'inscription** : apres `signUp`, afficher un message de confirmation email au lieu de rediriger vers le dashboard

### Phase 2 - Corrections importantes

4. **Rendre le AdminPanel dynamique** : remplacer les stats codees en dur par des requetes reelles (count users, lessons, etc.)
5. **Synchroniser les matieres** : sauvegarder les subjects dans `tutors.subjects` pour les tuteurs, pas dans `user_metadata`
6. **Ajouter AI Tutor dans la sidebar** pour les etudiants

### Phase 3 - Corrections moyennes

7. **LessonRoom** : lire le subject/topic depuis la BDD lors de la fin d'appel
8. **Page Help** : ajouter `mailto:` sur le bouton Email et un handler ou lien pour le chat
9. **Page Pricing** : ajouter un toast ou redirection pour les boutons d'abonnement
10. **Coming Soon** : utiliser une date fixe pour le countdown

### Phase 4 - Ameliorations de logique

11. **Verifier qu'un etudiant a eu un cours avec le tuteur** avant de permettre un avis
12. **Filtrer les stats dashboard** correctement si un utilisateur a plusieurs roles
13. **Regenerer les types Supabase** pour supprimer les `as any`

---

## Resume technique

| Categorie | Nb de problemes |
|-----------|----------------|
| Critique (app cassee en prod) | 3 |
| Important (logique incorrecte) | 3 |
| Moyen (UX incomplete) | 4 |
| Mineur (ameliorations) | 4 |

L'application est bien architecturee dans l'ensemble avec une bonne separation des roles (student/tutor), des hooks de donnees clairs, et une UI soignee. Les corrections critiques concernent principalement le routing, l'auth flow et la compatibilite ESM. Une fois ces points corriges, l'application sera prete pour une mise en production.

