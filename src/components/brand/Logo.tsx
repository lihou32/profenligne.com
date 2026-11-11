import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/**
 * Emblème : une toque de diplômé blanche sur le dégradé signature
 * corail → bleu-violet des maquettes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-10 w-10", className)} aria-hidden="true">
      <defs>
        <linearGradient id="pel-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B95A5B" />
          <stop offset="50%" stopColor="#975B76" />
          <stop offset="100%" stopColor="#6D67A5" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#pel-g)" />
      {/* toque de diplômé */}
      <path d="M24 11.5 41 19.5 24 27.5 7 19.5Z" fill="#fff" />
      <path d="M14.5 24v6.2c0 2.9 4.3 5.3 9.5 5.3s9.5-2.4 9.5-5.3V24L24 28.6Z" fill="#fff" fillOpacity=".82" />
      <path d="M37.5 21.4v8.1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="37.5" cy="31" r="2" fill="#fff" />
    </svg>
  )
}

export function Logo({ to = "/", className, compact = false, invert = false }: { to?: string; className?: string; compact?: boolean; invert?: boolean }) {
  return (
    <Link to={to} className={cn("group flex min-w-0 items-center gap-2.5", className)} aria-label="Prof en Ligne — accueil">
      <LogoMark className="transition-transform duration-300 group-hover:scale-105" />
      {!compact && (
        <span className={cn("text-[1.12rem] font-bold leading-none tracking-[-0.02em]", invert ? "text-white" : "text-ink-2")}>
          Prof <span className={invert ? "text-white/85" : "brand-text"}>en Ligne</span>
        </span>
      )}
    </Link>
  )
}
