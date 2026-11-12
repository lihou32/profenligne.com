import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { LEGAL } from "@/lib/legal"
import { logger } from "@/lib/logger"

/** Trace de l'acceptation des CGU/CGV, gardée dans les métadonnées du compte. */
export function termsMetadata(at: string = new Date().toISOString()) {
  return { terms_accepted_at: at, terms_version: LEGAL.updatedAt }
}

const PENDING_KEY = "pel-terms-pending"

/** Inscription Google : l'acceptation a lieu avant la redirection, on la garde jusqu'au retour. */
export function markTermsPendingForOAuth() {
  try { localStorage.setItem(PENDING_KEY, new Date().toISOString()) } catch { /* navigation privée */ }
}

/** Au retour de Google : enregistre l'acceptation sur le compte s'il n'en a pas encore. */
export async function applyPendingTerms(session: Session) {
  let at: string | null = null
  try { at = localStorage.getItem(PENDING_KEY) } catch { return }
  if (!at) return
  try { localStorage.removeItem(PENDING_KEY) } catch { /* ignore */ }
  if (session.user.user_metadata?.terms_accepted_at) return
  const { error } = await supabase.auth.updateUser({ data: termsMetadata(at) })
  if (error) logger.error("Enregistrement de l'acceptation des CGU impossible", error)
}
