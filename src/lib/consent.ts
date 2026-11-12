/**
 * Choix de l'utilisateur sur les cookies non nécessaires (CNIL : refuser aussi simple qu'accepter,
 * choix gardé 6 mois). Seule la mesure (Sentry Replay) en dépend.
 */
export type ConsentChoice = "accepted" | "refused"

const KEY = "pel-consent-v1"
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 182 // ~6 mois
const EVENT = "pel-consent-change"
const REOPEN = "pel-consent-reopen"

export function readConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { choice, at } = JSON.parse(raw) as { choice: ConsentChoice; at: number }
    if (Date.now() - at > MAX_AGE_MS) return null
    return choice === "accepted" || choice === "refused" ? choice : null
  } catch {
    return null
  }
}

export function saveConsent(choice: ConsentChoice) {
  try { localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() })) } catch { /* navigation privée */ }
  window.dispatchEvent(new CustomEvent<ConsentChoice>(EVENT, { detail: choice }))
}

/** Changement de choix, dans cet onglet ou dans un autre (événement `storage`). */
export function onConsentChange(cb: (choice: ConsentChoice | null) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ConsentChoice>).detail)
  const fromOtherTab = (e: StorageEvent) => { if (e.key === KEY) cb(readConsent()) }
  window.addEventListener(EVENT, handler)
  window.addEventListener("storage", fromOtherTab)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener("storage", fromOtherTab)
  }
}

/** Rouvre le bandeau (lien « Modifier mes choix de cookies »). */
export function reopenCookieChoice() {
  window.dispatchEvent(new Event(REOPEN))
}

export function onReopen(cb: () => void) {
  window.addEventListener(REOPEN, cb)
  return () => window.removeEventListener(REOPEN, cb)
}
