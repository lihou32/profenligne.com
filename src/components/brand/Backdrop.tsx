/**
 * Fond des pages publiques : un léger quadrillage de points, comme une feuille
 * de cahier. Pas de dégradé flou (trop « IA »).
 */
export function Backdrop({ variant = "app" }: { variant?: "app" | "landing" }) {
  if (variant === "app") return null
  return <div aria-hidden="true" className="dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
}
