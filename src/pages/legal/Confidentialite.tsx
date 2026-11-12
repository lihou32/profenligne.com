import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { LegalPage, Section } from "@/components/legal/LegalPage"
import { LEGAL, PROCESSORS } from "@/lib/legal"
import { reopenCookieChoice } from "@/lib/consent"

export default function Confidentialite() {
  const e = LEGAL.editor
  return (
    <LegalPage title="Politique de confidentialité" intro="Quelles données on garde, pourquoi, combien de temps, et comment exercer tes droits.">
      <Section title="Responsable du traitement">
        <p>{e.name}, éditeur de {LEGAL.brand} — <a href={`mailto:${e.email}`}>{e.email}</a>.</p>
      </Section>

      <Section title="Ce que nous collectons et pourquoi">
        <ul>
          <li><b>Ton compte</b> (prénom, nom, e-mail, mot de passe chiffré ; pour les élèves : niveau, année de naissance, établissement, matières) : pour te fournir le service (exécution du contrat).</li>
          <li><b>Profil de prof</b> (présentation, matières, niveaux, disponibilités, gains et retraits) : pour te proposer aux élèves et te payer (contrat), et pour les obligations fiscales des plateformes (obligation légale).</li>
          <li><b>Cours et paiements</b> (réservations, solde, recharges, références de paiement, avis, messages) : contrat, et comptabilité (obligation légale).</li>
          <li><b>E-mail de préinscription</b> : pour te prévenir du lancement (consentement, retirable à tout moment).</li>
          <li><b>Données techniques et erreurs</b> (journaux, rapports d'erreur) : pour la sécurité et le bon fonctionnement du site (intérêt légitime).</li>
          <li><b>Enregistrement de sessions</b> (Sentry Replay) : seulement si tu acceptes les cookies de mesure, pour comprendre les bugs.</li>
        </ul>
        <p>Les cours en visio ne sont pas enregistrés. Nous ne vendons aucune donnée et ne faisons pas de publicité ciblée.</p>
      </Section>

      <Section title="Combien de temps">
        <ul>
          <li>Compte : tant qu'il est actif, puis supprimé après 3 ans sans connexion.</li>
          <li>Pièces comptables (paiements, retraits) : 10 ans, comme l'exige la loi.</li>
          <li>Préinscription : jusqu'au lancement, ou jusqu'à ce que tu demandes à être retiré.</li>
          <li>Rapports d'erreur et enregistrements de sessions : 90 jours au plus.</li>
        </ul>
      </Section>

      <Section title="Qui y a accès">
        <p>L'éditeur du site et, pour ce qui les concerne, le prof ou l'élève avec qui tu as un cours. Nos sous-traitants :</p>
        <ul>
          {PROCESSORS.map((p) => <li key={p.name}><b>{p.name}</b> — {p.purpose}</li>)}
        </ul>
        <p>
          Certains sont situés hors de l'Union européenne (notamment aux États-Unis). Ces transferts sont encadrés par les
          clauses contractuelles types de la Commission européenne ou par le cadre de protection des données UE–États-Unis.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux accéder à tes données, les corriger, les supprimer, t'opposer à un traitement, en limiter l'usage ou les
          récupérer. Tu peux supprimer ton compte toi-même depuis les <Link to="/settings">paramètres</Link>, ou écrire à{" "}
          <a href={`mailto:${e.email}`}>{e.email}</a>. Si tu n'es pas satisfait de notre réponse, tu peux saisir la CNIL
          (<a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">cnil.fr</a>).
        </p>
      </Section>

      <Section id="cookies" title="Cookies et stockage local">
        <ul>
          <li><b>Nécessaires</b> (toujours actifs) : rester connecté, mémoriser tes profs favoris et ton choix sur les cookies.</li>
          <li><b>Mesure</b> (seulement avec ton accord) : enregistrement de sessions Sentry Replay pour comprendre les bugs.</li>
        </ul>
        <p>Ton choix est gardé 6 mois. Tu peux le changer à tout moment :</p>
        <Button type="button" variant="outline" className="mt-3" onClick={reopenCookieChoice}>Modifier mes choix de cookies</Button>
      </Section>
    </LegalPage>
  )
}
