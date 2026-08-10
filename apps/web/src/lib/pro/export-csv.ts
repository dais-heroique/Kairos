import type { ProductRankItem } from "@/types/product-rank-item";

// Export CSV — capacité Pro.
//
// Ce que ça vaut : quelqu'un qui en fait un revenu ne travaille pas dans un
// navigateur. Il planifie ses tournages dans un tableur, partage une liste
// avec un monteur, garde une trace de ce qu'il a joué. Sortir les données
// est le geste qui sépare l'outil qu'on consulte de l'outil sur lequel on
// s'organise.

/**
 * Échappe une cellule au format CSV.
 *
 * Les titres de produits contiennent des virgules (« Huile de ricin cils &
 * sourcils, 30 ml »), des guillemets et parfois des sauts de ligne. Sans
 * échappement, une seule virgule décale toute la ligne et le tableau
 * devient faux — silencieusement, ce qui est le pire cas.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  // Séparateur point-virgule : Excel en configuration française lit les
  // virgules comme des séparateurs décimaux, et un CSV « standard » y
  // arrive donc tout entier dans la première colonne.
  //
  // BOM UTF-8 en tête, pour la même raison : sans lui Excel affiche
  // « SÃ©rum » au lieu de « Sérum ».
  return "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

const VERDICT_TEXT: Record<ProductRankItem["verdict"], string> = {
  entrer_maintenant: "Entrer maintenant",
  avec_un_angle: "Avec un angle",
  risque: "Risque",
  eviter: "Éviter",
};

/**
 * Un classement en tableau.
 *
 * Les nombres restent des nombres, mais une donnée absente reste **vide**
 * plutôt que zéro : dans un tableur, un 0 se moyenne et se somme, et
 * transformerait « on ne sait pas » en « ça ne rapporte rien ». C'est la
 * même règle qu'à l'écran.
 */
export function rankingToCsv(items: ProductRankItem[]): string {
  const header = [
    "Rang",
    "Produit",
    "Boutique",
    "Prix (€)",
    "Commission (%)",
    "Verdict",
    "Concurrence /100",
    "Fenêtre min (jours)",
    "Fenêtre max (jours)",
    "Unités vendues",
    "Relevés",
  ];

  const rows = items.map((item) => [
    item.rank,
    item.title,
    item.shopName,
    (item.priceCents / 100).toFixed(2).replace(".", ","),
    // 0 % n'est pas une commission mesurée, c'est une absence (voir
    // NEUTRAL_COMMISSION). On laisse la cellule vide.
    item.commissionRatePct > 0 ? item.commissionRatePct : null,
    VERDICT_TEXT[item.verdict],
    item.saturationScore ?? null,
    item.windowDaysLow ?? null,
    item.windowDaysHigh ?? null,
    item.soldTotal ?? null,
    item.snapshotCount ?? null,
  ]);

  return toCsv([header, ...rows]);
}

/** Déclenche le téléchargement, sans serveur ni dépendance. */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Sans révocation, le blob reste en mémoire jusqu'au rechargement de la
  // page — et l'utilisateur peut exporter des dizaines de fois.
  URL.revokeObjectURL(url);
}
