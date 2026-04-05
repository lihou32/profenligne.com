/**
 * Logger centralisé pour Prof en Ligne.
 *
 * En développement : affiche tout dans la console.
 * En production   : supprime les logs, garde les erreurs
 *                   (prêt pour Sentry quand il sera activé).
 */

const IS_DEV = import.meta.env.DEV;

interface LogContext {
  [key: string]: unknown;
}

/** Futur hook Sentry — à brancher quand le DSN sera configuré */
function reportToSentry(_msg: string, _ctx?: LogContext) {
  // TODO: Sentry.captureException / captureMessage
  // import * as Sentry from "@sentry/react";
  // Sentry.captureMessage(msg, { extra: ctx });
}

export const logger = {
  /** Info de debug — supprimé en prod */
  debug(msg: string, ctx?: LogContext) {
    if (IS_DEV) console.log(`[debug] ${msg}`, ctx ?? "");
  },

  /** Warning non-critique */
  warn(msg: string, ctx?: LogContext) {
    if (IS_DEV) console.warn(`[warn] ${msg}`, ctx ?? "");
  },

  /** Erreur — toujours loggée + envoyée à Sentry en prod */
  error(msg: string, err?: unknown, ctx?: LogContext) {
    if (IS_DEV) {
      console.error(`[error] ${msg}`, err, ctx ?? "");
    } else {
      reportToSentry(msg, { ...ctx, error: String(err) });
    }
  },
};
