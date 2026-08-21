import type { EstimatedRange } from "@kairos/shared";

import { useLocale, useTranslations } from "next-intl";

function formatConfidence(
  confidence: number,
  t: (key: "reliable" | "toConfirm" | "lowConfidence") => string,
): string {
  if (confidence >= 0.75) return t("reliable");
  if (confidence >= 0.4) return t("toConfirm");
  return t("lowConfidence");
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
  const t = useTranslations("Estimates");
  const locale = useLocale();
  const fmt = format ?? ((v: number) => v.toLocaleString(locale));
  const methodLabel = t(`method.${range.method}`);

  // Une estimation impossible ne s'affiche pas comme une estimation nulle.
  // « 0 €–0 € » se lit « ce produit ne rapporte rien » ; ce qu'il faut lire
  // est « on ne sait pas encore ». Le tiret évite ce contresens, qui est
  // exactement ce que la règle « jamais un nombre nu » cherche à empêcher.
  if (range.method === "insufficient_data") {
    return (
      <span className={className} title={methodLabel}>
        <span className="font-[family-name:var(--font-mono)]">—</span>
        <span
          className="ml-1.5 text-xs font-semibold"
          style={{ color: "var(--color-ink-muted)" }}
        >
          ({t("insufficientData")})
        </span>
      </span>
    );
  }

  return (
    <span className={className} title={methodLabel}>
      <span className="font-[family-name:var(--font-mono)]">
        {fmt(range.low)}–{fmt(range.high)}
      </span>
      <span
        className="ml-1.5 text-xs font-semibold"
        style={{ color: confidenceColor(range.confidence) }}
      >
        ({formatConfidence(range.confidence, t)})
      </span>
    </span>
  );
}
