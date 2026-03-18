import { useEffect } from "react";

const APP_NAME = "Prof en Ligne";

/**
 * Sets the document title to "<pageName> — Prof en Ligne".
 * Restores the default title on unmount.
 */
export function useDocumentTitle(pageName: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${pageName} — ${APP_NAME}`;
    return () => {
      document.title = prev;
    };
  }, [pageName]);
}
