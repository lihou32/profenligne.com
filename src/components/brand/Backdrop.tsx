/**
 * Fond des pages publiques : un voile très léger au dégradé signature en haut de page,
 * fixe et discret. L'espace connecté utilise son propre bandeau (AppLayout).
 */
export function Backdrop({ variant = "app" }: { variant?: "app" | "landing" }) {
  if (variant === "app") return null
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 70% at 85% 10%, #ECEBF6 0%, transparent 70%), radial-gradient(50% 60% at 10% 20%, #F8E9EA 0%, transparent 70%)" }} />
    </div>
  )
}
