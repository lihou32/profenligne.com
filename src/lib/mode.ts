/** Espace affiché : un compte peut être à la fois élève et prof. */
export type AppMode = "student" | "tutor";

export const MODE_KEY = (userId: string) => `tpl-mode:${userId}`;

/** Espace par défaut : prof si le compte est prof, sinon élève ; un compte
 *  à la fois élève et prof garde le dernier espace choisi. */
export function resolveMode(roles: string[], stored: string | null): AppMode {
  const tutor = roles.includes("tutor");
  const student = roles.includes("student");
  if (tutor && student) return stored === "student" || stored === "tutor" ? stored : "tutor";
  return tutor ? "tutor" : "student";
}
