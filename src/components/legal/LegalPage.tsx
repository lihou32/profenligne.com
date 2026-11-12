import type { ReactNode } from "react"
import { PageHeader } from "@/components/brand/PageHeader"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { LEGAL } from "@/lib/legal"

/** Gabarit commun des pages légales : titre, sections, liens vers les autres pages. */
export function LegalPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  useDocumentTitle(title)
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Informations légales" title={title} subtitle={intro} />
      <div className="glass space-y-8 p-6 text-[15px] leading-relaxed text-ink-2/85 sm:p-8 [&_a]:font-semibold [&_a]:text-ink [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:text-ink-2 [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
        {children}
        <p className="border-t border-ink/10 pt-4 text-sm text-muted-foreground">Dernière mise à jour : {LEGAL.updatedAt}.</p>
      </div>
    </div>
  )
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

/** Valeur légale encore inconnue : affichée clairement plutôt qu'inventée. */
export function Pending({ children }: { children: ReactNode }) {
  return <span className="italic text-muted-foreground">{children}</span>
}
