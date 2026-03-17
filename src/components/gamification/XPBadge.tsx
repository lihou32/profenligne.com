import { cn } from "@/lib/utils";

export interface BadgeLevel {
  label: string;
  emoji: string;
  minXP: number;
  maxXP: number | null;
  color: string;
  glow: string;
}

export const BADGE_LEVELS: BadgeLevel[] = [
  { label: "Débutant",  emoji: "🌱", minXP: 0,    maxXP: 99,   color: "text-[hsl(152,65%,48%)]",  glow: "shadow-[0_0_10px_hsl(152,65%,48%,0.4)]" },
  { label: "Apprenti",  emoji: "⭐", minXP: 100,  maxXP: 499,  color: "text-[hsl(210,85%,58%)]",  glow: "shadow-[0_0_10px_hsl(210,85%,58%,0.4)]" },
  { label: "Studieux",  emoji: "🔥", minXP: 500,  maxXP: 999,  color: "text-[hsl(var(--accent))]", glow: "shadow-[0_0_12px_hsl(var(--accent)/0.5)]" },
  { label: "Expert",    emoji: "💎", minXP: 1000, maxXP: 2499, color: "text-[hsl(var(--primary))]", glow: "shadow-[0_0_14px_hsl(var(--primary)/0.5)]" },
  { label: "Maître",    emoji: "🏆", minXP: 2500, maxXP: null, color: "text-[hsl(var(--gold))]",   glow: "shadow-[0_0_18px_hsl(var(--gold)/0.5)]" },
];

export function getBadge(xp: number): BadgeLevel {
  return (
    [...BADGE_LEVELS].reverse().find((b) => xp >= b.minXP) ?? BADGE_LEVELS[0]
  );
}

export function getNextBadge(xp: number): BadgeLevel | null {
  return BADGE_LEVELS.find((b) => b.minXP > xp) ?? null;
}

interface XPBadgeProps {
  xp: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function XPBadge({
  xp,
  size = "md",
  showLabel = true,
  showProgress = false,
  className,
}: XPBadgeProps) {
  const badge = getBadge(xp);
  const next = getNextBadge(xp);

  const sizeClasses = {
    sm: "text-sm px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  const progressPct = next
    ? Math.min(100, ((xp - badge.minXP) / (next.minXP - badge.minXP)) * 100)
    : 100;

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full border border-border/50 bg-card font-semibold",
          sizeClasses[size],
          badge.glow
        )}
      >
        <span>{badge.emoji}</span>
        {showLabel && (
          <span className={badge.color}>{badge.label}</span>
        )}
        <span className="text-muted-foreground font-normal">{xp} XP</span>
      </div>

      {showProgress && next && (
        <div className="w-full space-y-0.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {next.minXP - xp} XP avant {next.emoji} {next.label}
          </p>
        </div>
      )}
    </div>
  );
}
