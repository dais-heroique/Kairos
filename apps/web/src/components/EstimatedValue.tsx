import type { EstimatedRange } from "@kairos/shared";

const METHOD_LABELS: Record<EstimatedRange["method"], string> = {
  historical_regression: "régression historique",
  category_benchmark: "benchmark catégorie",
  seller_declared: "déclaré par le vendeur",
  ground_truth_calibrated: "calibré sur données réelles",
  insufficient_data: "données insuffisantes",
  // Dit à l'utilisateur d'où vient vraiment le chiffre : un relevé
  // recopié à la main depuis l'espace affilié, pas un calcul de KAIROS.
  manual_entry: "relevé manuel",
};

function formatConfidence(confidence: number): string {
  if (confidence >= 0.75) return "fiable";
  if (confidence >= 0.4) return "à confirmer";
  return "peu fiable";
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "var(--color-success)";
  if (confidence >= 0.4) return "var(--color-warning)";
  return "var(--color-coral)";
}

// Composant obligatoire (§1, règle produit n°1) : jamais un nombre nu.
// Toute estimation affichée à l'utilisateur passe par ici — fourchette +
// confiance + méthode. Une règle ESLint interdit le rendu direct d'un champ
// *Low/*High en dehors de ce composant.
export function EstimatedValue({
  range,
  format,
  className,
}: {
  range: EstimatedRange;
  format?: (value: number) => string;
  className?: string;
}) {
  const fmt = format ?? ((v: number) => v.toLocaleString("fr-FR"));

  // Une estimation impossible ne s'affiche pas comme une estimation nulle.
  // « 0 €–0 € » se lit « ce produit ne rapporte rien » ; ce qu'il faut lire
  // est « on ne sait pas encore ». Le tiret évite ce contresens, qui est
  // exactement ce que la règle « jamais un nombre nu » cherche à empêcher.
  if (range.method === "insufficient_data") {
    return (
      <span className={className} title={METHOD_LABELS[range.method]}>
        <span className="font-[family-name:var(--font-mono)]">—</span>
        <span
          className="ml-1.5 text-xs font-semibold"
          style={{ color: "var(--color-ink-muted)" }}
        >
          (données insuffisantes)
        </span>
      </span>
    );
  }

  return (
    <span className={className} title={METHOD_LABELS[range.method]}>
      <span className="font-[family-name:var(--font-mono)]">
        {fmt(range.low)}–{fmt(range.high)}
      </span>
      <span
        className="ml-1.5 text-xs font-semibold"
        style={{ color: confidenceColor(range.confidence) }}
      >
        ({formatConfidence(range.confidence)})
      </span>
    </span>
  );
}
