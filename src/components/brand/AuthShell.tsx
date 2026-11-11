import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { CalendarCheck, Coins, MonitorPlay, Star } from "lucide-react"
import { Backdrop } from "./Backdrop"
import { Logo } from "./Logo"

/**
 * Écran des pages d'authentification : à gauche la promesse (en verre, sur grand écran),
 * à droite le formulaire dans une carte en verre.
 */
export function AuthShell({ title, subtitle, children, footer, aside = "student" }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; aside?: "student" | "tutor"
}) {
  return (
    <div className="relative min-h-screen">
      <Backdrop variant="landing" />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:px-8">
        <aside className="hidden lg:sticky lg:top-16 lg:block lg:self-start lg:pt-6">
          <Logo />
          <h2 className="mt-10 max-w-md text-[2.7rem] leading-[1.02]">
            {aside === "tutor" ? <>Partage ce que tu sais. <span className="hl-mark">Fixe ton prix.</span></> : <>Un prof pour chaque <span className="hl-mark">« j'ai pas compris »</span>.</>}
          </h2>
          <ul className="mt-10 grid max-w-md gap-3">
            {(aside === "tutor"
              ? [[Coins, "Tu gardes 80 % du prix de chaque cours"], [CalendarCheck, "Tu acceptes les demandes qui te conviennent"], [MonitorPlay, "Visio et tableau blanc fournis"]]
              : [[Star, "Des profs notés par de vrais élèves"], [CalendarCheck, "Annulation gratuite jusqu'à 24 h avant"], [MonitorPlay, "Cours en visio, rien à installer"]]
            ).map(([Icon, text], i) => {
              const I = Icon as typeof Star
              return (
                <li key={i} className="glass reveal in flex items-center gap-3 rounded-2xl px-4 py-3" style={{ transitionDelay: `${i * 90}ms` }}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hl-soft"><I className="h-5 w-5 text-ink" /></span>
                  <span className="font-semibold text-ink-2">{text as string}</span>
                </li>
              )
            })}
          </ul>
        </aside>

        <div className="w-full">
          <div className="mb-6 flex justify-center lg:hidden"><Logo /></div>
          <div className="glass-strong rounded-[2rem] p-6 animate-[fadeup_.6s_cubic-bezier(.2,.7,.2,1)] sm:p-9">
            <h1 className="text-[1.9rem] leading-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-muted-foreground">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-ink-2">← Retour à l'accueil</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/** Bouton de connexion Google / Apple. */
export function SocialButton({ provider, onClick }: { provider: "google" | "apple"; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-white text-sm font-semibold text-ink-2 transition hover:border-ink/30 hover:bg-white">
      {provider === "google" ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
      )}
      Continuer avec {provider === "google" ? "Google" : "Apple"}
    </button>
  )
}

export function OrDivider() {
  return (
    <div className="relative my-6 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="absolute inset-x-0 top-1/2 h-px bg-ink/10" />
      <span className="relative bg-white/0 px-3 backdrop-blur">ou</span>
    </div>
  )
}
