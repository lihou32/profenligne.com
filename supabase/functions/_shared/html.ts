// Échappe le texte saisi par les utilisateurs (noms, matière, sujet, e-mail)
// avant de l'insérer dans le HTML d'un e-mail : empêche d'y glisser des liens
// ou du contenu piégé (hameçonnage envoyé au nom de la plateforme).
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
