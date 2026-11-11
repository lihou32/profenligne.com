import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** En-tête commun des pages de l'application : pastille, titre, sous-titre, actions. */
export function PageHeader({
  eyebrow, title, subtitle, actions, className,
}: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn("reveal flex min-h-[120px] flex-col gap-4 pb-6 pt-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-white/75">{eyebrow}</span>}
        <h1 className="text-[clamp(1.6rem,3vw,2.25rem)] leading-tight text-white [&_.hl-mark]:text-white [&_.hl-mark]:underline [&_.hl-mark]:decoration-white/40 [&_.hl-mark]:underline-offset-4">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[0.98rem] text-white/80 [&_a]:text-white [&_a]:underline">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 [&_button]:!bg-none [&_button]:!bg-white [&_button]:!text-ink [&_a]:!bg-none [&_a]:!bg-white [&_a]:!text-ink">{actions}</div>}
    </header>
  )
}

/** Petite carte de chiffre clé. */
export function StatTile({
  label, value, hint, icon: Icon, tone = "peri", className,
}: {
  label: string; value: ReactNode; hint?: ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: "peri" | "hl" | "mint" | "rose"; className?: string
}) {
  const tones = {
    peri: "bg-peri-soft text-peri",
    hl: "bg-hl-soft text-hl",
    mint: "bg-mint-soft text-mint",
    rose: "bg-rose-soft text-rose",
  }
  return (
    <div className={cn("glass reveal lift p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        {Icon && <span className={cn("grid h-9 w-9 place-items-center rounded-xl", tones[tone])}><Icon className="h-[18px] w-[18px]" /></span>}
      </div>
      <p className="mt-2 text-[1.75rem] font-bold leading-tight text-ink-2 tabular">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** État vide illustré. */
export function EmptyState({ icon: Icon, title, text, action }: {
  icon: React.ComponentType<{ className?: string }>; title: string; text?: string; action?: ReactNode
}) {
  return (
    <div className="glass reveal flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-peri-soft"><Icon className="h-6 w-6 text-peri" /></span>
      <h3 className="text-lg">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
