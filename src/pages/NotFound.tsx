import { Link, useLocation } from "react-router-dom"
import { ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Backdrop } from "@/components/brand/Backdrop"
import { Logo } from "@/components/brand/Logo"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"

export default function NotFound() {
  useDocumentTitle("Page introuvable")
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Backdrop variant="landing" />
      <Logo className="mb-10" />
      <p className="display select-none text-[clamp(6rem,18vw,10rem)] leading-none text-ink-2">
        4<span className="hl-mark">0</span>4
      </p>
      <h1 className="mt-4 text-2xl">Cette page n'existe pas.</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        L'adresse <code className="rounded-md bg-white/70 px-1.5 py-0.5 text-sm text-ink-2">{pathname}</code> ne mène nulle part. Pas de panique, on te ramène.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild><Link to="/"><ArrowLeft /> Accueil</Link></Button>
        <Button asChild variant="outline"><Link to="/tutors"><Search /> Trouver un prof</Link></Button>
      </div>
    </div>
  )
}
