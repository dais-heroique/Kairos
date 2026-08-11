// Formatage des champs produit dont la valeur peut manquer.
//
// La collecte ne renvoie pas toujours tout. `toProductRankItem` remplace
// alors la valeur absente par `0` — commode pour le typage, désastreux à
// l'écran : « 0 % de commission » est une affirmation, et elle est fausse.
// Ces deux fonctions sont le seul endroit où l'on décide comment le dire,
// pour que les onze écrans qui affichent une commission le disent pareil.

/**
 * Un taux de commission, ou « inconnue » quand il manque.
 *
 * Le zéro est traité comme une absence, et non comme un taux : un produit
 * d'affiliation à 0 % n'existe pas dans un catalogue d'affiliation, donc
 * entre « le vendeur ne reverse rien » et « la collecte n'a pas eu
 * l'information », la seconde lecture est la seule plausible.
 */
export function commissionLabel(ratePct: number | null | undefined): string {
  if (ratePct === null || ratePct === undefined || ratePct <= 0) return "commission inconnue";
  return `${ratePct} % de commission`;
}

/** Version courte, pour les lignes serrées : « 22 % » ou « — ». */
export function commissionShort(ratePct: number | null | undefined): string {
  if (ratePct === null || ratePct === undefined || ratePct <= 0) return "—";
  return `${ratePct} %`;
}

/**
 * Raccourcit un titre produit trop long.
 *
 * Les titres de TikTok Shop empilent la marque, le modèle, la couleur et
 * trois arguments de vente : « JLab JBuds Lux ANC Wireless Bluetooth
 * Headphones Over Ear with Cloud Foam Cushions… ». Rendus tels quels, ils
 * poussent le reste de la ligne hors de l'écran et rendent deux produits
 * voisins impossibles à distinguer — l'essentiel étant toujours au début.
 *
 * Coupe sur un mot entier plutôt qu'au milieu d'un caractère : un titre
 * tronqué en « Bluetoo… » se lit plus mal que le même coupé un mot plus
 * tôt.
 */
export function shortTitle(title: string, maxChars = 48): string {
  const clean = title.trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  // Sans espace exploitable (un seul mot très long), on coupe net plutôt
  // que de renvoyer le titre entier.
  const base = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:·-]+$/, "")}…`;
}
