import { Link } from "react-router-dom"
import { LegalPage, Section } from "@/components/legal/LegalPage"
import { LEGAL, TAX_LINKS } from "@/lib/legal"
import { PLATFORM_COMMISSION } from "@/lib/credits"

export default function Fonctionnement() {
  return (
    <LegalPage
      title="Fonctionnement de la plateforme"
      intro={`Comment ${LEGAL.brand} met en relation élèves et profs, classe les profs et publie les avis.`}
    >
      <Section title="Le rôle de Prof en Ligne">
        <p>
          {LEGAL.brand} met en relation des élèves avec des profs particuliers pour des cours en visio. La plateforme gère la
          réservation, la salle de cours, le solde et les avis ; les cours eux-mêmes sont donnés par les profs. Le contrat de
          cours est conclu entre l'élève et le prof ; {LEGAL.brand} garde une commission de {Math.round(PLATFORM_COMMISSION * 100)} %
          sur chaque cours. Les règles détaillées sont dans les <Link to="/conditions">conditions générales</Link>.
        </p>
      </Section>

      <Section id="profs" title="Qui sont les profs">
        <p>
          Les profs sont des indépendants, recrutés et contactés un par un par l'éditeur. Ils fixent leurs matières, leurs
          niveaux et leurs créneaux, et acceptent ou refusent chaque demande. Le prix d'un cours est le même chez tous
          les profs, selon sa durée.
        </p>
        <p>
          Un prof qui donne des cours à titre de particulier n'est pas un professionnel : les règles du droit de la
          consommation (comme le droit de rétractation) ne s'appliquent alors pas au contrat entre l'élève et lui, mais
          celles du Code civil. Celles qui concernent {LEGAL.brand} (le solde, les abonnements) s'appliquent toujours.
        </p>
        <p>
          Obligations fiscales et sociales des profs : les sommes gagnées sur la plateforme sont des revenus à déclarer.
          {" "}{LEGAL.brand} envoie à chaque prof, avant le 31 janvier, le récapitulatif de l'année écoulée et le transmet à
          l'administration fiscale quand la loi l'exige. Pour en savoir plus :
        </p>
        <ul>
          {TAX_LINKS.map((l) => <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
        </ul>
      </Section>

      <Section id="classement" title="Comment la liste des profs est classée">
        <p>Par défaut (« Recommandés »), les profs sont classés dans cet ordre :</p>
        <ul>
          <li>d'abord ceux qui sont en ligne maintenant, puis ceux qui ont un créneau libre à venir ;</li>
          <li>à égalité, les mieux notés ;</li>
          <li>puis ceux dont le prochain créneau est le plus proche.</li>
        </ul>
        <p>
          Tu peux aussi trier par « Disponibles au plus tôt », « Mieux notés » ou « Plus d'avis », et filtrer par matière,
          niveau, disponibilité ou favoris. Aucun prof ne paie pour être mieux placé. Dans la file des cours en direct, les
          élèves abonnés passent devant les autres : c'est l'avantage annoncé des abonnements.
        </p>
      </Section>

      <Section id="avis" title="Comment les avis sont publiés">
        <ul>
          <li>Seul un élève qui a terminé un cours avec un prof peut noter ce cours, une fois par cours.</li>
          <li>Les avis sont publiés tout de suite, sans contrôle préalable de leur contenu, avec leur date, du plus récent au plus ancien.</li>
          <li>Un avis injurieux, illicite ou sans rapport avec le cours est retiré. Pour en signaler un : <a href={`mailto:${LEGAL.editor.email}`}>{LEGAL.editor.email}</a>.</li>
          <li>Les avis publiés avant le 11 novembre 2026, repris de l'ancienne version du site, ne sont pas liés à un cours précis : ils sont signalés comme tels.</li>
          <li>Aucun avis n'est acheté ni récompensé.</li>
        </ul>
      </Section>
    </LegalPage>
  )
}
