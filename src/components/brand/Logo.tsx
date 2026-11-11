import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/** Emblème : un « P » en serif blanc dans un carré violet aux coins doux. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#6D67A5" />
      <text x="20" y="29" textAnchor="middle" fontFamily="'Fraunces Variable', Georgia, serif" fontSize="25" fontWeight="600" fill="#fff">P</text>
    </svg>
  )
}

export function Logo({ to = "/", className, compact = false, invert = false }: { to?: string; className?: string; compact?: boolean; invert?: boolean }) {
  return (
    <Link to={to} className={cn("group flex min-w-0 items-center gap-2.5", className)} aria-label="Prof en Ligne — accueil">
      <LogoMark />
      {!compact && (
        <span className={cn("font-display text-[1.2rem] font-medium leading-none tracking-[-0.01em]", invert ? "text-white" : "text-ink-2")}>
          Prof en Ligne
        </span>
      )}
    </Link>
  )
}
