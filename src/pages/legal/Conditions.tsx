import { Link } from "react-router-dom"
import { LegalPage, Pending, Section } from "@/components/legal/LegalPage"
import { LEGAL } from "@/lib/legal"
import {
  FREE_CANCEL_HOURS, LATE_END_HOUR, LATE_START_HOUR, LATE_SURCHARGE_EUR, LESSON_DURATIONS, MAX_TOPUP_EUR,
  MIN_TOPUP_EUR, MIN_WITHDRAWAL_EUR, PLATFORM_COMMISSION, REFERRAL_BONUS_EUR, TOPUP_PACKS, WITHDRAWAL_FEE_RATE, formatEur,
} from "@/lib/credits"
import { MEMBER_CANCEL_HOURS, PERIOD_DAYS, PLANS } from "@/lib/membership"

const pct = (r: number) => `${Math.round(r * 100)} %`

export default function Conditions() {
  const e = LEGAL.editor
  return (
    <LegalPage
      title="Conditions générales d'utilisation et de vente"
      intro={`Les règles du jeu entre toi, les profs et ${LEGAL.brand}. En créant un compte, tu les acceptes.`}
    >
      <Section title="1. Qui fait quoi">
        <p>
          {LEGAL.brand} est une plateforme en ligne qui met en relation des élèves avec des professeurs particuliers
          indépendants, pour des cours en visio. Elle est éditée par {e.name} ({e.status}, voir les{" "}
          <Link to="/mentions-legales">mentions légales</Link>).
        </p>
        <p>
          Les cours sont donnés par les profs, sous leur propre responsabilité : {LEGAL.brand} n'est pas leur employeur et
          ne donne pas les cours. {LEGAL.brand} fournit le service de réservation, la salle de cours en ligne, le solde et
          la messagerie, et se rémunère par une commission sur chaque cours.
        </p>
      </Section>

      <Section title="2. Compte">
        <p>
          Tu dois donner des informations exactes et garder ton mot de passe pour toi. Un élève mineur utilise le site avec
          l'accord d'un parent ou de son représentant légal, qui reste responsable des paiements.
        </p>
      </Section>

      <Section title="3. Prix">
        <p>Le prix d'un cours est le même chez tous les profs et dépend seulement de sa durée :</p>
        <ul>
          {LESSON_DURATIONS.map((d) => <li key={d.value}>{d.label} : {formatEur(d.priceEur)}</li>)}
        </ul>
        <p>
          Un cours en direct (sans réservation) coûte {formatEur(LATE_SURCHARGE_EUR)} de plus entre {LATE_START_HOUR} h
          et {LATE_END_HOUR} h (heure de Paris). Les prix sont en euros, toutes taxes comprises : TVA non applicable,
          article 293 B du CGI.
        </p>
      </Section>

      <Section title="4. Solde et paiement">
        <p>
          Les cours se paient avec ton solde {LEGAL.brand}. Tu le recharges d'un montant libre (de {formatEur(MIN_TOPUP_EUR)} à{" "}
          {formatEur(MAX_TOPUP_EUR)}) ou d'un pack avec bonus :{" "}
          {TOPUP_PACKS.map((p) => `${formatEur(p.amountEur)} (+${formatEur(p.bonusEur)} offerts)`).join(", ")}.
          Le paiement se fait par virement, Revolut ou WhatsApp, avec la référence indiquée ; ton solde est crédité à
          réception, en général sous 24 h. Ton solde n'expire pas.
        </p>
        <p>
          Le prix du cours est débité de ton solde à la réservation. Le parrainage offre {formatEur(REFERRAL_BONUS_EUR)} à
          chacun, crédités après le premier cours terminé du filleul. Les bonus et cadeaux ne sont pas remboursables en argent.
        </p>
      </Section>

      <Section title="5. Annulation et remboursement">
        <ul>
          <li>Tant que le prof n'a pas confirmé, tu peux annuler : le prix revient intégralement sur ton solde.</li>
          <li>Après confirmation, l'annulation est gratuite jusqu'à {FREE_CANCEL_HOURS} h avant le cours ({MEMBER_CANCEL_HOURS} h avec un abonnement).</li>
          <li>Si le prof refuse, ne confirme pas ou annule, tu es toujours remboursé sur ton solde.</li>
          <li>Pour récupérer en argent le solde que tu as payé et pas utilisé, écris à <a href={`mailto:${e.email}`}>{e.email}</a>.</li>
        </ul>
      </Section>

      <Section id="retractation" title="6. Droit de rétractation (14 jours)">
        <p>
          Tu as 14 jours pour changer d'avis après une recharge ou un abonnement, sans avoir à te justifier. Il suffit de nous
          l'écrire à <a href={`mailto:${e.email}`}>{e.email}</a>, par exemple avec ce modèle : « Je vous notifie ma
          rétractation du contrat portant sur [la recharge / l'abonnement] du [date]. Nom, e-mail du compte, date. »
          Nous te remboursons sous 14 jours, par le même moyen de paiement, la partie que tu n'as pas utilisée.
        </p>
        <p>
          Si tu réserves un cours qui a lieu pendant ces 14 jours, tu demandes qu'il commence avant la fin du délai. Une fois
          le cours entièrement donné, tu ne peux plus te rétracter pour ce cours ; il reste dû.
        </p>
      </Section>

      <Section title="7. Abonnements">
        <ul>
          {PLANS.map((p) => <li key={p.id}>{p.name} — {formatEur(p.priceEur)} pour {PERIOD_DAYS} jours : {p.perks.join(" ; ")}.</li>)}
        </ul>
        <p>Un abonnement se paie avec ton solde et ne se renouvelle pas automatiquement.</p>
      </Section>

      <Section title="8. Les profs">
        <p>
          Les profs sont des indépendants. Ils choisissent leurs matières, leurs niveaux et leurs créneaux, et restent libres
          d'accepter ou de refuser une demande. {LEGAL.brand} garde une commission de {pct(PLATFORM_COMMISSION)} sur le prix
          de chaque cours ; le reste revient au prof. Un retrait est possible dès {formatEur(MIN_WITHDRAWAL_EUR)}, avec{" "}
          {pct(WITHDRAWAL_FEE_RATE)} de frais.
        </p>
        <p>
          Chaque prof déclare lui-même ses revenus aux impôts et à l'Urssaf. {LEGAL.brand} lui envoie chaque année un
          récapitulatif des sommes perçues et les transmet à l'administration fiscale quand la loi l'exige (voir{" "}
          <Link to="/fonctionnement#profs">fonctionnement de la plateforme</Link>).
        </p>
      </Section>

      <Section title="9. Comportement et avis">
        <p>
          Respect, ponctualité et bienveillance sont attendus de tous. Sont interdits : les propos insultants ou
          discriminatoires, le partage de contenus illicites, et le fait de proposer de payer ou d'être payé en dehors de la
          plateforme. Un compte qui ne respecte pas ces règles peut être suspendu. Les avis suivent les règles décrites
          dans le <Link to="/fonctionnement#avis">fonctionnement de la plateforme</Link>.
        </p>
      </Section>

      <Section title="10. Responsabilité">
        <p>
          {LEGAL.brand} fait de son mieux pour que le site fonctionne en continu, sans pouvoir le garantir. Chaque prof est
          responsable du contenu de ses cours. {LEGAL.brand} ne garantit pas un résultat scolaire.
        </p>
      </Section>

      <Section title="11. Données personnelles">
        <p>Voir la <Link to="/confidentialite">politique de confidentialité</Link>.</p>
      </Section>

      <Section title="12. Réclamations et litiges">
        <p>
          Pour toute réclamation, écris d'abord à <a href={`mailto:${e.email}`}>{e.email}</a>. Si nous ne trouvons pas de
          solution, tu peux saisir gratuitement le médiateur de la consommation :{" "}
          {LEGAL.mediator
            ? <>{LEGAL.mediator.name}, {LEGAL.mediator.address}, <a href={LEGAL.mediator.url} target="_blank" rel="noreferrer">{LEGAL.mediator.url}</a></>
            : <Pending>coordonnées à venir</Pending>}
          . Ces conditions sont soumises au droit français.
        </p>
      </Section>
    </LegalPage>
  )
}
