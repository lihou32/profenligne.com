import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"
import { onReopen, readConsent, saveConsent, type ConsentChoice } from "@/lib/consent"

/** Bandeau cookies : « Tout refuser » et « Tout accepter » au même niveau (CNIL). */
export function CookieBanner() {
  const [open, setOpen] = useState(() => readConsent() === null)

  useEffect(() => onReopen(() => setOpen(true)), [])

  if (!open) return null

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice)
    setOpen(false)
  }

  return (
    <div role="dialog" aria-live="polite" aria-label="Choix des cookies" className="fixed inset-x-3 bottom-3 z-[60] sm:left-auto sm:right-4 sm:max-w-md">
      <div className="sticker rounded-2xl bg-white p-4 shadow-lg sm:p-5">
        <p className="flex items-center gap-2 font-bold text-ink-2"><Cookie className="h-4 w-4" /> Cookies</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          On utilise les cookies nécessaires au site. Avec ton accord, on enregistre aussi certaines sessions pour corriger
          les bugs. <Link to="/confidentialite#cookies" className="font-semibold text-ink underline">En savoir plus</Link>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => choose("refused")}>Tout refuser</Button>
          <Button type="button" onClick={() => choose("accepted")}>Tout accepter</Button>
        </div>
      </div>
    </div>
  )
}
