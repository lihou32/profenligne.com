import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/** Emblème : un « P » blanc sur un carré violet à contour encre, avec une pastille jaune. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn("h-10 w-10 shrink-0", className)} aria-hidden="true">
      <rect x="4" y="4" width="38" height="38" rx="11" fill="#17162B" />
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#6B4EFF" stroke="#17162B" strokeWidth="2" />
      <path d="M14 30V10h8.2c4.5 0 7.3 2.5 7.3 6.4s-2.8 6.5-7.3 6.5h-3.5V30Zm4.7-11h3.1c1.9 0 3-1 3-2.6s-1.1-2.5-3-2.5h-3.1Z" fill="#fff" />
      <circle cx="31" cy="28.5" r="3.6" fill="#FFC53D" stroke="#17162B" strokeWidth="2" />
    </svg>
  )
}

export function Logo({ to = "/", className, compact = false, invert = false }: { to?: string; className?: string; compact?: boolean; invert?: boolean }) {
  return (
    <Link to={to} className={cn("group flex min-w-0 items-center gap-2 sm:gap-2.5", className)} aria-label="Ton Prof en Ligne — accueil">
      <LogoMark className="transition-transform duration-200 group-hover:-rotate-6" />
      {!compact && (
        <span className={cn("whitespace-nowrap font-display text-[0.95rem] font-extrabold leading-none tracking-[-0.03em] min-[400px]:text-[1.1rem] sm:text-[1.3rem]", invert ? "text-white" : "text-ink-2")}>
          <span className={invert ? "text-sun" : "text-peri"}>Ton</span> Prof en Ligne
        </span>
      )}
    </Link>
  )
}
