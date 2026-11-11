import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/** Pictogramme : une bulle de conversation bleu encre traversée d'un trait de surligneur. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="12" fill="hsl(233 52% 20%)" />
      <rect x="9" y="21" width="22" height="7" rx="3.5" fill="hsl(46 100% 62%)" transform="rotate(-6 20 24)" />
      <path d="M13 13.5h14M13 19h9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 31l-3 4 6-2" fill="hsl(233 52% 20%)" />
    </svg>
  )
}

export function Logo({ to = "/", className, compact = false }: { to?: string; className?: string; compact?: boolean }) {
  return (
    <Link to={to} className={cn("group flex min-h-0 min-w-0 items-center gap-2.5", className)} aria-label="Prof en Ligne — accueil">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      {!compact && (
        <span className="font-display text-[1.15rem] font-extrabold tracking-[-0.03em] text-ink-2">
          Prof en <span className="hl-mark">Ligne</span>
        </span>
      )}
    </Link>
  )
}
