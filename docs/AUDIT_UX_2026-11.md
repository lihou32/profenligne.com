# Audit du site Prof en Ligne — 11 novembre 2026

Comparaison avec Superprof et Preply (fonctionnement, pas couleurs), puis tour du site côté visiteur, élève, prof et admin.

## Ce que font les leaders

| | Superprof | Preply | Prof en Ligne (avant) |
|---|---|---|---|
| Liste des profs | Grandes photos, prénom en surimpression, note + nb d'avis, phrase d'accroche, prix/h, favori ♥ | Filtres en haut (matière, niveau, prix, disponibilité, tri), prix « cours de 50 min », « X réservations récentes » | Petites cartes, pas de niveau, pas de disponibilité, pas de favoris |
| Profil | Carte fixe à droite : photo, tarif, temps de réponse, nb d'élèves, bouton « Contacter » | Vidéo + **agenda de la semaine** (une colonne par jour, heures cliquables, fuseau), carte fixe avec « Réserver un cours d'essai » | Formulaire date + heure libres, sans voir quand le prof est libre |
| Réservation | Message au prof, il répond | Créneau de l'agenda = cours réservé tout de suite | Demande que le prof doit confirmer, sans délai |
| Confiance | Badge « Ambassadeur », 1er cours offert, avis | « Prof qualifié », remplacement gratuit si le prof ne convient pas | Avis vérifiés seulement |

## Ce qui ne marchait pas (et qui est corrigé)

1. **Pas d'agenda.** L'élève tapait une date au hasard (même 3 h du matin) et attendait que le prof confirme. → Les profs publient leurs disponibilités (page « Mes disponibilités », raccourcis « soirs de semaine », « week-end »…). L'élève voit les créneaux libres semaine par semaine et réserve en deux clics : **cours confirmé tout de suite**.
2. **« En ligne » fantôme.** Un prof qui passait « en ligne » puis fermait son ordinateur restait en ligne pour toujours : la file « Rejoindre un cours » pouvait l'attribuer à un élève qui payait et attendait dans le vide. → L'appli du prof envoie un signal toutes les 50 s ; sans signal depuis 3 min, il repasse hors ligne et ne reçoit plus d'élèves.
3. **Argent bloqué.** Une demande jamais confirmée restait « en attente » à vie, l'argent de l'élève avec. → Annulée et remboursée automatiquement à l'heure du cours (10 min pour un cours en direct).
4. **Cours en direct depuis un profil** : il fallait encore que le prof accepte. → Confirmé tout de suite, l'élève arrive dans la salle et le prof est prévenu.
5. **Durée choisie sur le profil ignorée** (le formulaire repartait sur 1 h). → Une seule durée, partagée par l'agenda et la réservation.
6. **« Du collège au master » sans filtre par niveau.** → Les profs indiquent leurs niveaux (inscription + profil) ; filtre « Niveau » dans la liste.
7. **Liste des profs** : refaite façon Superprof (grande photo, en ligne, note, accroche, prochain créneau libre « demain 18:00 »), filtres façon Preply (matière, niveau, tri « recommandés / dispo au plus tôt / mieux notés »), « En ligne maintenant », « Dispo cette semaine », favoris ♥.
8. Texte périmé (« un tarif plus haut » alors qu'il n'y a plus de filtre de prix) : retiré.

## Ce qui reste à décider ou à faire (par priorité)

1. **Vérifier les profs avant publication** (P1). Aujourd'hui n'importe qui devient prof avec 20 caractères de bio, et les élèves peuvent être mineurs. Proposition : profil « en attente de validation » jusqu'à ce que l'admin vérifie pièce d'identité + diplôme ou carte étudiante, puis badge « Profil vérifié ». **Décision de Lihou.**
2. **Garantie du premier cours** (P1, argument de vente). Preply remplace le prof gratuitement, Superprof met « 1er cours offert ». Proposition simple : « premier cours satisfait ou remboursé » (remboursement sur demande dans les 24 h). **Décision de Lihou (coût).**
3. **Messagerie avant réservation** (P2). Superprof et Preply ont « Envoyer un message ». Aujourd'hui on ne peut pas poser de question au prof avant de payer.
4. **Absence au cours** (P2). Si le prof ne vient pas à un cours confirmé, rien ne rembourse l'élève automatiquement ; si l'élève ne vient pas, le prof peut marquer le cours terminé. Règle à écrire (ex. : salle ouverte 10 min sans le prof → remboursement).
5. **Vidéo de présentation du prof** (P2, Preply) et **temps de réponse** (Superprof).
6. **Rappels** : e-mail/notification 1 h avant le cours (la fonction existe, à brancher sur les cours confirmés automatiquement).
7. **Abonnement 9,99 €/mois** : contenu toujours à définir.
8. **Thème** : couleurs gardées ; les écrans clés (liste, profil, agenda) suivent maintenant le fonctionnement Superprof/Preply. Si le style reste trop chargé, prochaine étape : version plus sobre (moins de contours épais et d'ombres), même palette.

## Règles retenues (modifiables)

- Agenda par tranches de 30 min, heure de Paris ; créneaux visibles sur 4 semaines ; réservation au moins 1 h avant (en dessous : cours en direct).
- Prof sans agenda : l'élève propose une date, le prof confirme, sinon remboursement automatique.
- Présence : signal toutes les 50 s, hors ligne après 3 min sans signal.
