import { Link } from "react-router-dom"
import { LegalPage, Pending, Section } from "@/components/legal/LegalPage"
import { LEGAL } from "@/lib/legal"

export default function MentionsLegales() {
  const e = LEGAL.editor
  return (
    <LegalPage title="Mentions légales" intro={`Qui édite ${LEGAL.siteUrl.replace("https://", "")} et qui l'héberge.`}>
      <Section title="Éditeur du site">
        <ul>
          <li>{e.name} — {e.status}</li>
          <li>Nom commercial : {LEGAL.brand}</li>
          <li>Adresse : {e.address}</li>
          <li>SIREN : {e.siren ?? <Pending>en cours d'immatriculation</Pending>}</li>
          <li>E-mail : <a href={`mailto:${e.email}`}>{e.email}</a></li>
          <li>Téléphone : {e.phone ?? <Pending>à venir</Pending>}</li>
          <li>TVA non applicable, article 293 B du CGI</li>
        </ul>
        <p>Directeur de la publication : {e.name}.</p>
      </Section>

      <Section title="Hébergement">
        <ul>
          {LEGAL.hosts.map((h) => (
            <li key={h.name}>
              {h.role} : {h.name}{h.address ? `, ${h.address}` : ""} — <a href={h.url} target="_blank" rel="noreferrer">{h.url.replace("https://", "")}</a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Le nom {LEGAL.brand}, le logo, les textes et le design du site appartiennent à son éditeur. Toute reproduction
          sans autorisation est interdite. Les contenus publiés par les profs et les élèves (présentations, avis, messages)
          restent les leurs ; ils en accordent l'usage nécessaire au fonctionnement du site.
        </p>
      </Section>

      <Section title="Signaler un contenu">
        <p>
          Un contenu te semble illicite ? Écris à <a href={`mailto:${e.email}`}>{e.email}</a> en indiquant la page concernée
          et la raison. Nous répondons et retirons le contenu s'il y a lieu.
        </p>
      </Section>

      <Section title="Pour aller plus loin">
        <p>
          Voir les <Link to="/conditions">conditions générales</Link>, la <Link to="/confidentialite">politique de confidentialité</Link> et
          le <Link to="/fonctionnement">fonctionnement de la plateforme</Link>.
        </p>
      </Section>
    </LegalPage>
  )
}
