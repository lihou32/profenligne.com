import { Outlet, Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useReveal } from "@/hooks/useReveal"
import { Backdrop } from "@/components/brand/Backdrop"
import { Logo } from "@/components/brand/Logo"
import { LEGAL_LINKS } from "@/lib/legal"
import { reopenCookieChoice } from "@/lib/consent"
import { cn } from "@/lib/utils"

/** Pages publiques (liste et profils des profs) : barre pilule flottante + fond animé. */
export function PublicLayout() {
  const { user } = useAuth()
  useReveal()

  return (
    <div className="min-h-screen">
      <Backdrop />
      <PublicNav loggedIn={!!user} />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

export function PublicNav({ loggedIn, links }: { loggedIn: boolean; links?: { href: string; label: string }[] }) {
  return (
    <div className="sticky top-3 z-50 px-3">
      <nav className="sticker mx-auto flex h-16 max-w-6xl items-center gap-4 rounded-2xl bg-white pl-4 pr-2">
        <Logo />
        {links && (
          <div className="ml-6 hidden items-center gap-6 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-1 text-[15px] font-bold text-ink-2/75 transition hover:bg-sun-soft hover:text-ink-2">{l.label}</a>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {loggedIn ? (
            <Button asChild className="max-[399px]:h-10 max-[399px]:px-3"><Link to="/dashboard">Mon espace <ArrowRight className="max-[399px]:hidden" /></Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Connexion</Link></Button>
              <Button asChild className="max-[399px]:h-10 max-[399px]:px-3"><Link to="/signup">Commencer <ArrowRight className="max-[399px]:hidden" /></Link></Button>
            </>
          )}
        </div>
      </nav>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col gap-4 border-t-2 border-ink-2 px-6 pb-10 pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
      <Logo />
      <span className="sm:ml-4">Cours particuliers en visio, avec des profs choisis un par un.</span>
      <div className="flex flex-col gap-2 sm:ml-auto sm:items-end">
        <nav className="flex gap-4">
          <Link to="/tutors" className="font-semibold hover:text-ink-2">Les profs</Link>
          <Link to="/help" className="font-semibold hover:text-ink-2">Aide</Link>
          <Link to="/signup?role=tutor" className="font-semibold hover:text-ink-2">Devenir prof</Link>
        </nav>
        <LegalLinks />
      </div>
    </footer>
  )
}

/** Liens légaux discrets, présents sur toutes les pages. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/80", className)}>
      {LEGAL_LINKS.map((l) => <Link key={l.to} to={l.to} className="hover:text-ink-2">{l.label}</Link>)}
      <button type="button" onClick={reopenCookieChoice} className="hover:text-ink-2">Cookies</button>
    </nav>
  )
}
