import type { EstimatedRange, WatchlistEntry, WatchlistStatus } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";

// Le tableau de bord répond à une seule question : « qu'est-ce que je
// tourne cette semaine ? ». Tout ce qui n'y contribue pas n'y est pas.
//
// Fonction pure, sans Firebase : elle reçoit les deux documents de
// classement déjà lus par la page (2 lectures Firestore, budget inchangé)
// et l'état de la watchlist, et n'invente rien — chaque bloc peut être
// vide, et l'est franchement quand la donnée manque.

/** Nombre de produits retenus pour l'estimation "si tu fais ces vidéos". */
export const FOCUS_SIZE = 5;

/** En deçà, la fenêtre est jugée en train de se refermer. */
const CLOSING_SOON_DAYS = 21;

/** Minimum de relevés avant qu'un verdict veuille dire quelque chose. */
const MIN_SNAPSHOTS = 3;

export interface DashboardPick {
  item: ProductRankItem;
  earnings: EstimatedRange | null;
  /** Vrai si le produit correspond à une niche déclarée par l'utilisateur. */
  matchesNiche: boolean;
}

export interface PipelineStage {
  status: WatchlistStatus;
  count: number;
}

/**
 * Une famille de produits (catégorie ou mot-clé de collecte) et l'état du
 * marché qu'elle représente cette semaine.
 *
 * L'intérêt n'est pas décoratif : un créateur choisit d'abord un terrain,
 * ensuite un produit. Savoir que « beauté » compte 12 fenêtres ouvertes et
 * « tech » 2 oriente une semaine de tournage bien plus qu'un classement
 * de 90 lignes.
 */
export interface CategoryPulse {
  label: string;
  /** Produits analysables de la famille. */
  total: number;
  /** Ceux dont la fenêtre est encore ouverte. */
  open: number;
  /** Ceux à éviter — un terrain saturé se voit à ce rapport. */
  avoid: number;
  /** Le meilleur du lot, pour donner un point d'entrée cliquable. */
  best: ProductRankItem | null;
}

export interface Dashboard {
  /** Le produit à tourner en priorité, ou rien si aucun ne s'y prête. */
  topPick: DashboardPick | null;
  /** Les suivants, déjà filtrés et ordonnés. */
  focus: DashboardPick[];
  /** Somme des fourchettes de gain du focus — jamais un chiffre unique. */
  focusEarnings: EstimatedRange | null;
  /** Produits jouables dont la fenêtre se referme, du plus urgent au moins. */
  closingSoon: ProductRankItem[];
  /** Produits sur lesquels ne pas perdre de temps, avec la raison. */
  avoid: ProductRankItem[];
  /** Produits trop récents pour être jugés — affichés, jamais masqués. */
  needsHistory: ProductRankItem[];
  /** Répartition de la watchlist par étape, dans l'ordre du pipeline. */
  pipeline: PipelineStage[];
  /** Nombre d'échantillons en attente de réponse (boucle Sample Radar). */
  awaitingSample: number;
  openWindowCount: number;
  totalAnalysed: number;
  /** Les familles les mieux fournies, les plus actives d'abord. */
  categories: CategoryPulse[];
  /**
   * Combien de produits analysables tombent dans les niches déclarées à
   * l'inscription. Zéro est une information : il veut dire que le profil
   * ne correspond à rien de ce qui est collecté, et c'est le profil qu'il
   * faut alors changer, pas le classement.
   */
  nicheMatches: number;
}

const PIPELINE_ORDER: WatchlistStatus[] = [
  "watching",
  "sample_requested",
  "sample_received",
  "filmed",
  "posted",
];

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Les niches du profil ("beaute") et les catégories produit
// ("Beauté & soins") ne viennent pas du même vocabulaire : on rapproche
// sur le radical plutôt que d'exiger une égalité qui ne se produirait
// jamais.
function matchesNiches(item: ProductRankItem, niches: string[]): boolean {
  if (!item.category || niches.length === 0) return false;
  const category = normalise(item.category);
  return niches.some((niche) => {
    const n = normalise(niche);
    return n.length >= 3 && (category.includes(n) || n.includes(category.split(" ")[0] ?? ""));
  });
}

function hasEnoughHistory(item: ProductRankItem): boolean {
  // `snapshotCount` peut manquer sur un document écrit avant son ajout :
  // on s'appuie alors sur la confiance, qui est au plancher dans ce cas.
  if (typeof item.snapshotCount === "number") return item.snapshotCount >= MIN_SNAPSHOTS;
  return (item.verdictConfidence ?? 1) >= 0.1;
}

function isPlayable(item: ProductRankItem): boolean {
  return (
    hasEnoughHistory(item) &&
    (item.verdict === "entrer_maintenant" || item.verdict === "avec_un_angle")
  );
}

function sumRanges(ranges: EstimatedRange[]): EstimatedRange | null {
  const usable = ranges.filter((r) => r.method !== "insufficient_data");
  if (usable.length === 0) return null;
  return {
    low: Math.round(usable.reduce((s, r) => s + r.low, 0) * 100) / 100,
    high: Math.round(usable.reduce((s, r) => s + r.high, 0) * 100) / 100,
    // La confiance d'une somme ne dépasse pas celle de son maillon le plus
    // faible : agréger ne crée pas de certitude.
    confidence: Math.min(...usable.map((r) => r.confidence)),
    method: usable[0]!.method,
  };
}

/**
 * La fenêtre de tir restante est une estimation comme une autre : elle doit
 * s'afficher via `<EstimatedValue>`, avec sa confiance — c'est la règle
 * produit n°1, et la règle ESLint `kairos/no-raw-estimate-number` refuse
 * d'ailleurs de laisser passer `windowDaysLow` en JSX brut.
 *
 * Renvoie null quand le verdict repose sur trop peu de données : annoncer
 * « 0–30 jours » à quelqu'un qui a saisi deux relevés serait un chiffre
 * inventé présenté comme un résultat.
 */
export function windowRangeOf(item: ProductRankItem): EstimatedRange | null {
  if (typeof item.windowDaysLow !== "number" || typeof item.windowDaysHigh !== "number") {
    return null;
  }
  const confidence = item.verdictConfidence ?? 0;
  if (!hasEnoughHistory(item) || confidence < 0.1) return null;
  return {
    low: item.windowDaysLow,
    high: item.windowDaysHigh,
    confidence,
    method: "historical_regression",
  };
}

/** Nombre de familles affichées : au-delà, la liste redevient un classement. */
export const CATEGORY_PULSE_SIZE = 4;

/**
 * Regroupe les produits par famille.
 *
 * Seuls les produits ayant assez de recul sont comptés : une famille dont
 * les dix produits sont trop récents afficherait « 10 produits, 0 fenêtre
 * ouverte », ce qui se lit comme un terrain mort alors qu'il est
 * seulement inconnu.
 */
export function buildCategoryPulse(
  items: ProductRankItem[],
  size = CATEGORY_PULSE_SIZE,
): CategoryPulse[] {
  const groups = new Map<string, ProductRankItem[]>();
  for (const item of items) {
    if (!hasEnoughHistory(item)) continue;
    const label = item.category?.trim();
    if (!label) continue;
    const bucket = groups.get(label);
    if (bucket) bucket.push(item);
    else groups.set(label, [item]);
  }

  return [...groups.entries()]
    .map(([label, group]) => ({
      label,
      total: group.length,
      open: group.filter((i) => i.verdict === "entrer_maintenant").length,
      avoid: group.filter((i) => i.verdict === "eviter").length,
      best:
        [...group].sort(
          (a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0) || a.rank - b.rank,
        )[0] ?? null,
    }))
    // Le nombre de fenêtres ouvertes prime sur la taille : une famille de
    // 30 produits tous fermés est moins utile qu'une de 4 tous jouables.
    .sort((a, b) => b.open - a.open || b.total - a.total)
    .slice(0, size);
}

export interface BuildDashboardInput {
  opportunities: ProductRankItem[];
  products: ProductRankItem[];
  watchlist: WatchlistEntry[];
  niches: string[];
  /** Renvoie null quand le profil ne permet pas d'estimer (vues à 0). */
  estimateFor: (item: ProductRankItem) => EstimatedRange | null;
}

export function buildDashboard({
  opportunities,
  products,
  watchlist,
  niches,
  estimateFor,
}: BuildDashboardInput): Dashboard {
  const playable = opportunities.filter(isPlayable);

  // À score comparable, un produit de la niche de l'utilisateur passe
  // devant : c'est lui qui saura en parler, et l'audience suivra.
  const ranked = [...playable].sort((a, b) => {
    const nicheDelta = Number(matchesNiches(b, niches)) - Number(matchesNiches(a, niches));
    if (nicheDelta !== 0) return nicheDelta;
    return (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0) || a.rank - b.rank;
  });

  const toPick = (item: ProductRankItem): DashboardPick => ({
    item,
    earnings: estimateFor(item),
    matchesNiche: matchesNiches(item, niches),
  });

  const focus = ranked.slice(0, FOCUS_SIZE).map(toPick);
  const topPick = focus[0] ?? null;

  const closingSoon = playable
    .filter((i) => typeof i.windowDaysHigh === "number" && i.windowDaysHigh <= CLOSING_SOON_DAYS)
    .sort((a, b) => (a.windowDaysHigh ?? 0) - (b.windowDaysHigh ?? 0))
    .slice(0, 5);

  const avoid = opportunities
    .filter((i) => hasEnoughHistory(i) && (i.verdict === "eviter" || i.verdict === "risque"))
    .sort((a, b) => (b.saturationScore ?? 0) - (a.saturationScore ?? 0))
    .slice(0, 4);

  const needsHistory = products.filter((i) => !hasEnoughHistory(i)).slice(0, 5);

  const byStatus = new Map<WatchlistStatus, number>();
  for (const entry of watchlist) {
    byStatus.set(entry.status, (byStatus.get(entry.status) ?? 0) + 1);
  }

  return {
    topPick,
    focus,
    focusEarnings: sumRanges(
      focus.map((p) => p.earnings).filter((e): e is EstimatedRange => e !== null),
    ),
    closingSoon,
    avoid,
    needsHistory,
    pipeline: PIPELINE_ORDER.map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    })),
    awaitingSample: byStatus.get("sample_requested") ?? 0,
    openWindowCount: opportunities.filter(
      (i) => hasEnoughHistory(i) && i.verdict === "entrer_maintenant",
    ).length,
    totalAnalysed: opportunities.filter(hasEnoughHistory).length,
    categories: buildCategoryPulse(opportunities),
    nicheMatches: playable.filter((i) => matchesNiches(i, niches)).length,
  };
}
