/** Espace affiché : un compte est soit élève, soit prof (jamais les deux). */
export type AppMode = "student" | "tutor";

/** Un compte prof voit l'espace prof ; tous les autres, l'espace élève. */
export function resolveMode(roles: readonly string[]): AppMode {
  return roles.includes("tutor") ? "tutor" : "student";
}
