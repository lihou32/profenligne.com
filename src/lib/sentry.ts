import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://2f11a777c57a9996760aef5f869d70e6@o4511096227037184.ingest.de.sentry.io/4511100728442960",

  // Only enable in production
  enabled: import.meta.env.PROD,

  // Performance monitoring — sample 20% of transactions in prod
  tracesSampleRate: 0.2,

  // Session replay for debugging — 10% normal, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
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

export default Sentry;
