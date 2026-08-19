import type { VerdictLabel } from "@kairos/shared";

const VERDICT_LABELS: Record<VerdictLabel, string> = {
  entrer_maintenant: "Entrer maintenant",
  avec_un_angle: "Entrer avec un angle",
  risque: "Surveiller",
  eviter: "Éviter",
};

const VERDICT_COLORS: Record<VerdictLabel, { bg: string; fg: string }> = {
  entrer_maintenant: { bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  avec_un_angle: { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
  risque: { bg: "var(--color-coral-soft)", fg: "var(--color-coral)" },
  eviter: { bg: "var(--color-surface)", fg: "var(--color-ink-muted)" },
};

// Un seul badge pour tout le produit : la home (mock statique) et les
// classements (données réelles Phase 4) doivent afficher exactement la
// même sémantique couleur — voir §1 règle produit n°3.
export function VerdictBadge({ verdict }: { verdict: VerdictLabel }) {
  const c = VERDICT_COLORS[verdict];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}
