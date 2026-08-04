import type { ProductSnapshot, ProductVerdict, Phase } from "@kairos/shared";
import { clamp } from "../lib/math";
import {
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_VERDICT_THRESHOLDS,
  type ScoringWeights,
  type VerdictThresholds,
} from "../config/weights";

const DAY_MS = 24 * 60 * 60 * 1000;
const FLAT_EPSILON = 0.02; // en dessous de 2% de variation jour/jour, on considère "plat"

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

function salesMid(s: ProductSnapshot): number {
  return (s.estSalesLow + s.estSalesHigh) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Historique jugé insuffisant pour un verdict fiable — réutilisé par le
// pipeline (Lot 3) pour marquer productEstimates.method = "insufficient_data".
export function hasInsufficientHistory(
  snapshots: ProductSnapshot[],
  thresholds: VerdictThresholds = DEFAULT_VERDICT_THRESHOLDS,
): boolean {
  return snapshots.length < thresholds.minSnapshotsAbsolute;
}

function sortByDateAsc(snapshots: ProductSnapshot[]): ProductSnapshot[] {
  return [...snapshots].sort((a, b) => a.capturedDate.localeCompare(b.capturedDate));
}

function largestGapDays(snapshots: ProductSnapshot[]): number {
  let maxGap = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const gap = daysBetween(snapshots[i - 1]!.capturedDate, snapshots[i]!.capturedDate);
    if (gap > maxGap) maxGap = gap;
  }
  return maxGap;
}

function spanDays(snapshots: ProductSnapshot[]): number {
  if (snapshots.length === 0) return 0;
  return Math.max(
    1,
    daysBetween(snapshots[0]!.capturedDate, snapshots[snapshots.length - 1]!.capturedDate) + 1,
  );
}

// Croissance macro : compare le début et la fin de la série (moyenne des 3
// premiers/derniers points pour lisser le bruit d'un seul jour).
function growthRatio(snapshots: ProductSnapshot[]): number {
  const head = snapshots.slice(0, Math.min(3, snapshots.length)).map(salesMid);
  const tail = snapshots.slice(-Math.min(3, snapshots.length)).map(salesMid);
  const start = average(head);
  const end = average(tail);
  if (start <= 0) return end > 0 ? 1 : 0;
  return (end - start) / start;
}

// Moyenne glissante centrée sur 3 points. Sans elle, la comparaison
// jour/jour ci-dessous casse la série au premier soubresaut : un produit
// en croissance depuis un mois annonçait « phase growth depuis 2 jours »,
// parce qu'il suffit d'une seule journée un peu creuse pour rompre la
// séquence. Le bruit quotidien réel dépasse largement FLAT_EPSILON.
function smoothedSales(snapshots: ProductSnapshot[]): number[] {
  return snapshots.map((_, i) => {
    const from = Math.max(0, i - 1);
    const to = Math.min(snapshots.length - 1, i + 1);
    let sum = 0;
    for (let k = from; k <= to; k++) sum += salesMid(snapshots[k]!);
    return sum / (to - from + 1);
  });
}

// Nombre de jours pendant lesquels la tendance est restée dans le même
// sens que la tendance macro — sert de proxy à "depuis combien de temps on
// est dans cette phase", sans état persisté entre deux appels.
function daysInCurrentTrend(snapshots: ProductSnapshot[], macroSign: 1 | 0 | -1): number {
  if (snapshots.length < 2) return spanDays(snapshots);
  const smoothed = smoothedSales(snapshots);
  let streakDays = daysBetween(
    snapshots[snapshots.length - 2]!.capturedDate,
    snapshots[snapshots.length - 1]!.capturedDate,
  );
  for (let i = snapshots.length - 1; i >= 2; i--) {
    const prev = smoothed[i - 2]!;
    const curr = smoothed[i - 1]!;
    const delta = curr - prev;
    const sign: 1 | 0 | -1 =
      Math.abs(delta) < FLAT_EPSILON * Math.max(prev, 1) ? 0 : delta > 0 ? 1 : -1;
    if (sign !== macroSign) break;
    streakDays += daysBetween(snapshots[i - 2]!.capturedDate, snapshots[i - 1]!.capturedDate);
  }
  return Math.max(1, Math.min(streakDays, spanDays(snapshots)));
}

function classifyPhase(
  ratio: number,
  span: number,
  thresholds: VerdictThresholds,
): Phase {
  const t = thresholds.phaseTransitionDays;
  if (ratio < -0.05) return "decline";
  if (span <= t.emergenceMaxDays && ratio >= 0) return "emergence";
  if (ratio > 0.15 && span <= t.growthMaxDays) return "growth";
  if (ratio > 0.02 && span <= t.lateGrowthMaxDays) return "late_growth";
  if (Math.abs(ratio) <= 0.02 && span <= t.maturityMaxDays) return "maturity";
  if (span > t.maturityMaxDays) return "maturity";
  return ratio > 0 ? "late_growth" : "maturity";
}

interface SaturationBreakdown {
  score: number;
  topDriver: string;
}

function computeSaturationScore(
  snapshots: ProductSnapshot[],
  weights: ScoringWeights,
): SaturationBreakdown {
  const latest = snapshots[snapshots.length - 1]!;

  const competingShopsNorm = clamp((latest.competingShopCount / 20) * 100, 0, 100);
  const creatorDensityNorm = clamp((latest.activeCreatorCount / 50) * 100, 0, 100);

  const window14 = snapshots.filter(
    (s) => daysBetween(s.capturedDate, latest.capturedDate) <= 14,
  );
  const oldestIn14 = window14[0] ?? latest;
  const priceDrop =
    oldestIn14.priceCents > 0
      ? (oldestIn14.priceCents - latest.priceCents) / oldestIn14.priceCents
      : 0;
  const priceDropNorm = clamp(priceDrop * 200, 0, 100);

  const window7 = snapshots.filter(
    (s) => daysBetween(s.capturedDate, latest.capturedDate) <= 7,
  );
  const oldestIn7 = window7[0] ?? latest;
  const sellerArrivalRate =
    oldestIn7.competingShopCount > 0
      ? (latest.competingShopCount - oldestIn7.competingShopCount) / oldestIn7.competingShopCount
      : latest.competingShopCount > 0
        ? 1
        : 0;
  const sellerArrivalNorm = clamp(sellerArrivalRate * 100, 0, 100);

  const mid = Math.floor(snapshots.length / 2);
  const firstHalf = snapshots.slice(0, Math.max(mid, 1));
  const secondHalf = snapshots.slice(Math.max(mid, 1));
  const rateOf = (group: ProductSnapshot[]): number => {
    if (group.length < 2) return 0;
    const days = Math.max(
      1,
      daysBetween(group[0]!.capturedDate, group[group.length - 1]!.capturedDate),
    );
    return (group[group.length - 1]!.reviewCount - group[0]!.reviewCount) / days;
  };
  const earlyRate = rateOf(firstHalf);
  const lateRate = rateOf(secondHalf);
  const deceleration = earlyRate > 0 ? (earlyRate - lateRate) / earlyRate : 0;
  const decelerationNorm = clamp(deceleration * 100, 0, 100);

  const indicators: Array<[keyof ScoringWeights, number]> = [
    ["competingShops", competingShopsNorm],
    ["creatorDensity", creatorDensityNorm],
    ["priceDropAmplitude14d", priceDropNorm],
    ["newSellerArrivalRate7d", sellerArrivalNorm],
    ["reviewVelocityDeceleration", decelerationNorm],
  ];

  const score = clamp(
    indicators.reduce((sum, [key, value]) => sum + weights[key] * value, 0),
    0,
    100,
  );

  const topDriver = indicators.reduce((top, curr) =>
    weights[curr[0]] * curr[1] > weights[top[0]] * top[1] ? curr : top,
  )[0];

  return { score, topDriver };
}

// Détecte une hausse brutale de saturation sur la fenêtre récente (§4 —
// "saturation brutale") : compare le score calculé sur les N derniers
// jours à celui calculé N jours plus tôt.
function detectSaturationSpike(
  snapshots: ProductSnapshot[],
  weights: ScoringWeights,
  thresholds: VerdictThresholds,
): boolean {
  const windowDays = thresholds.saturationSpikeWindowDays;
  const latest = snapshots[snapshots.length - 1]!;
  const recentWindow = snapshots.filter(
    (s) => daysBetween(s.capturedDate, latest.capturedDate) <= windowDays,
  );
  const priorWindow = snapshots.filter((s) => {
    const age = daysBetween(s.capturedDate, latest.capturedDate);
    return age > windowDays && age <= windowDays * 2;
  });
  if (recentWindow.length < 2 || priorWindow.length < 1) return false;
  const recentScore = computeSaturationScore(recentWindow, weights).score;
  const priorScore = computeSaturationScore(priorWindow, weights).score;
  return recentScore - priorScore >= thresholds.saturationSpikeDeltaPoints;
}

function computeWindowDaysRemaining(
  phase: Phase,
  saturationScore: number,
  span: number,
  maxGap: number,
  thresholds: VerdictThresholds,
): ProductVerdict["windowDaysRemaining"] {
  const base: Record<Phase, [number, number]> = {
    emergence: [60, 120],
    growth: [30, 75],
    late_growth: [15, 40],
    maturity: [5, 20],
    decline: [0, 7],
  };
  const [baseLow, baseHigh] = base[phase];
  const saturationFactor = clamp(1 - saturationScore / 150, 0.2, 1);

  const gapPenalty = clamp(1 - Math.max(0, maxGap - thresholds.maxAllowedGapDays) / 30, 0, 1);
  const spanConfidence = clamp(span / thresholds.fullConfidenceSpanDays, 0, 1);
  const confidence = clamp(spanConfidence * gapPenalty, 0.05, 0.95);

  return {
    low: Math.round(baseLow * saturationFactor),
    high: Math.round(baseHigh * saturationFactor),
    confidence,
  };
}

function pickVerdictLabel(
  phase: Phase,
  saturationScore: number,
  thresholds: VerdictThresholds,
): ProductVerdict["verdict"] {
  const bands = thresholds.verdictScoreBands;
  let label: ProductVerdict["verdict"];
  if (saturationScore <= bands.entrerMaintenantMax) label = "entrer_maintenant";
  else if (saturationScore <= bands.avecUnAngleMax) label = "avec_un_angle";
  else if (saturationScore <= bands.risqueMax) label = "risque";
  else label = "eviter";

  // Un produit en déclin ne doit jamais être recommandé sans réserve, même
  // si sa saturation instantanée est encore basse.
  if (phase === "decline" && label === "entrer_maintenant") label = "avec_un_angle";

  return label;
}

/**
 * Fonction pure — snapshots doit couvrir jusqu'à 45 jours, trié par
 * capturedDate croissant (trié défensivement ici si ce n'est pas le cas).
 * weights vient de config/weights.ts, surchargeable depuis un document
 * Firestore config/scoringWeights, jamais en dur ailleurs dans le code.
 */
export function computeVerdict(
  snapshots: ProductSnapshot[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  thresholds: VerdictThresholds = DEFAULT_VERDICT_THRESHOLDS,
): ProductVerdict {
  const computedAt = new Date().toISOString();
  const sorted = sortByDateAsc(snapshots);

  if (hasInsufficientHistory(sorted, thresholds)) {
    return {
      phase: "emergence",
      daysInPhase: sorted.length > 0 ? spanDays(sorted) : 0,
      saturationScore: 50,
      windowDaysRemaining: { low: 0, high: 30, confidence: 0.05 },
      marginLowPct: 0,
      marginHighPct: 0,
      verdict: "risque",
      reasoning: [
        sorted.length === 0
          ? "Aucun historique de collecte disponible — verdict prudent par défaut."
          : `Historique trop court (${sorted.length} jour(s) de données, minimum ${thresholds.minSnapshotsAbsolute}) — verdict prudent par défaut.`,
      ],
      computedAt,
    };
  }

  const span = spanDays(sorted);
  const ratio = growthRatio(sorted);
  const phase = classifyPhase(ratio, span, thresholds);
  const macroSign: 1 | 0 | -1 = ratio > 0.02 ? 1 : ratio < -0.02 ? -1 : 0;
  const daysInPhase = daysInCurrentTrend(sorted, macroSign);

  const { score: saturationScore, topDriver } = computeSaturationScore(sorted, weights);
  const spike = detectSaturationSpike(sorted, weights, thresholds);
  const maxGap = largestGapDays(sorted);

  const windowDaysRemaining = computeWindowDaysRemaining(
    phase,
    saturationScore,
    span,
    maxGap,
    thresholds,
  );

  // Proxy de marge basé sur la pression prix/saturation — computeVerdict
  // ne reçoit pas la commission réelle du produit (voir Commission dans
  // @kairos/shared, utilisée par computeOpportunityScore). C'est une
  // approximation provisoire documentée comme telle, à affiner une fois
  // les vraies données de commission branchées dans le pipeline (Lot 3).
  const marginHighPct = clamp(100 - saturationScore * 0.5, 0, 100);
  const marginLowPct = clamp(marginHighPct - clamp(saturationScore * 0.2, 5, 40), 0, marginHighPct);

  let verdict = pickVerdictLabel(phase, saturationScore, thresholds);
  const reasoning: string[] = [
    `Phase "${phase}" depuis ${daysInPhase} jour(s), tendance des ventes ${ratio >= 0 ? "en hausse" : "en baisse"} (${Math.round(ratio * 100)}%).`,
    `Score de saturation ${Math.round(saturationScore)}/100, principal facteur : ${topDriver}.`,
  ];

  if (spike) {
    verdict = saturationScore >= thresholds.verdictScoreBands.avecUnAngleMax ? "eviter" : "risque";
    reasoning.push(
      `Saturation brutale détectée sur les ${thresholds.saturationSpikeWindowDays} derniers jours — verdict revu à la baisse malgré la tendance de fond.`,
    );
  }

  if (maxGap > thresholds.maxAllowedGapDays) {
    reasoning.push(
      `Trou de collecte de ${maxGap} jour(s) dans la série — confiance sur la fenêtre restante réduite.`,
    );
  }

  if (phase === "decline" && pickVerdictLabel(phase, saturationScore, thresholds) === "avec_un_angle") {
    reasoning.push("Produit en phase de déclin — recommandé uniquement avec un angle différenciant.");
  }

  return {
    phase,
    daysInPhase,
    saturationScore: Math.round(saturationScore),
    windowDaysRemaining,
    marginLowPct: Math.round(marginLowPct * 10) / 10,
    marginHighPct: Math.round(marginHighPct * 10) / 10,
    verdict,
    reasoning,
    computedAt,
  };
}
