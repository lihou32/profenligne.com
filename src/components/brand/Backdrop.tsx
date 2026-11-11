/**
 * Fond animé de l'application : trois formes floues qui dérivent lentement
 * derrière les cartes en verre. Fixe, sans interaction, désactivé si l'utilisateur
 * préfère moins d'animations (voir index.css).
 */
export function Backdrop({ variant = "app" }: { variant?: "app" | "landing" }) {
  const strong = variant === "landing"
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="blob" style={{ width: 560, height: 560, top: -160, right: -140, background: "hsl(233 90% 72%)", opacity: strong ? 0.45 : 0.32 }} />
      <span className="blob" style={{ width: 480, height: 480, top: "40vh", left: -180, background: "hsl(46 100% 70%)", opacity: strong ? 0.5 : 0.34, animationDelay: "-7s" }} />
      <span className="blob" style={{ width: 440, height: 440, bottom: -180, right: "14vw", background: "hsl(158 55% 72%)", opacity: strong ? 0.42 : 0.28, animationDelay: "-13s" }} />
      {/* fines lignes de cahier, très discrètes */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "linear-gradient(hsl(233 52% 20% / 0.035) 1px, transparent 1px)",
          backgroundSize: "100% 36px",
          maskImage: "linear-gradient(to bottom, black, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
        }}
      />
    </div>
  )
}
