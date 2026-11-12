import * as Sentry from "@sentry/react";
import { onConsentChange, readConsent, type ConsentChoice } from "./consent";

Sentry.init({
  dsn: "https://2f11a777c57a9996760aef5f869d70e6@o4511096227037184.ingest.de.sentry.io/4511100728442960",

  // Only enable in production
  enabled: import.meta.env.PROD,

  // Performance monitoring — sample 20% of transactions in prod
  tracesSampleRate: 0.2,

  // Session replay for debugging — 10% normal, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Replay n'est ajouté qu'après accord dans le bandeau cookies (voir enableReplay plus bas)
  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Network request failed",
    "Load failed",
    "Failed to fetch",
    "AbortError",
  ],

  environment: import.meta.env.MODE,
});

/**
 * Enregistrement de sessions : seulement si l'utilisateur a accepté les cookies de mesure
 * (CNIL : le session replay n'est jamais exempté de consentement).
 */
let replayAdded = false
function applyConsent(choice: ConsentChoice | null) {
  if (choice === "accepted") {
    if (!replayAdded) {
      Sentry.addIntegration(Sentry.replayIntegration())
      replayAdded = true
    } else {
      Sentry.getReplay()?.start()
    }
  } else if (replayAdded) {
    void Sentry.getReplay()?.stop()
  }
}

if (import.meta.env.PROD) {
  applyConsent(readConsent())
  onConsentChange(applyConsent)
}

export default Sentry;
