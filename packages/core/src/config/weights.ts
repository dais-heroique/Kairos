import { z } from "zod";

// Source de vérité pour tous les poids/seuils du moteur packages/core.
// Chaque fonction de calcul accepte ces valeurs en paramètre optionnel
// (surchargeable depuis un document Firestore config/*), jamais en dur
// dans la logique métier elle-même.

export const scoringWeightsSchema = z.object({
  competingShops: z.number().min(0).max(1).default(0.3),
  creatorDensity: z.number().min(0).max(1).default(0.25),
  priceDropAmplitude14d: z.number().min(0).max(1).default(0.2),
  newSellerArrivalRate7d: z.number().min(0).max(1).default(0.15),
  reviewVelocityDeceleration: z.number().min(0).max(1).default(0.1),
});
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  competingShops: 0.3,
  creatorDensity: 0.25,
  priceDropAmplitude14d: 0.2,
  newSellerArrivalRate7d: 0.15,
  reviewVelocityDeceleration: 0.1,
};

export const earningsConfigSchema = z.object({
  // Taux de retour médian appliqué quand l'appelant n'a pas de mesure
  // spécifique au produit — voir compute-earnings.ts.
  defaultReturnRatePct: z.number().min(0).max(100).default(8),
  // Largeur relative min/max de la fourchette basse/haute autour de
  // l'estimation médiane, resserrée quand le volume de vues est élevé.
  minSpread: z.number().min(0).max(1).default(0.15),
  maxSpread: z.number().min(0).max(1).default(0.5),
  // Part des vues qui se transforme en commande, faute de calibration par
  // catégorie (bigquery/08_calibration_factors.sql, encore vide).
  //
  // 0,2 % — et c'est un ordre de grandeur, pas une mesure. La valeur
  // précédente, 1,5 %, était codée en dur dans RankingList.tsx et
  // multipliait les gains annoncés par près de dix : 8 000 vues y
  // devenaient 120 commandes, soit ~530 € pour un sérum à 16,90 €. En
  // pratique une vidéo d'affiliation TikTok Shop tourne plutôt autour de
  // 1 à 3 commandes pour 1 000 vues. Surestimer le gain est la faute la
  // plus grave que puisse commettre un outil vendu sur son honnêteté :
  // le créateur tourne la vidéo, ne touche pas le dixième de la somme, et
  // ne revient jamais.
  defaultConversionRate: z.number().min(0).max(1).default(0.002),
});
export type EarningsConfig = z.infer<typeof earningsConfigSchema>;

export const DEFAULT_EARNINGS_CONFIG: EarningsConfig = {
  defaultReturnRatePct: 8,
  minSpread: 0.15,
  maxSpread: 0.5,
  defaultConversionRate: 0.002,
};

export const opportunityWeightsSchema = z.object({
  phase: z.number().min(0).max(1).default(0.35),
  commission: z.number().min(0).max(1).default(0.25),
  sellerTrust: z.number().min(0).max(1).default(0.25),
  saturationInverse: z.number().min(0).max(1).default(0.15),
});
export type OpportunityWeights = z.infer<typeof opportunityWeightsSchema>;

export const DEFAULT_OPPORTUNITY_WEIGHTS: OpportunityWeights = {
  phase: 0.35,
  commission: 0.25,
  sellerTrust: 0.25,
  saturationInverse: 0.15,
};

export const verdictThresholdsSchema = z.object({
  // En dessous de ce nombre de snapshots, l'historique est jugé
  // insuffisant : confiance forcée au plancher, verdict prudent.
  minSnapshotsAbsolute: z.number().int().positive().default(3),
  // Nombre de jours d'historique à partir duquel la confiance atteint 1.0
  // (avant application de la pénalité de trous de collecte).
  fullConfidenceSpanDays: z.number().int().positive().default(21),
  // Un trou de plus de N jours entre deux snapshots consécutifs dégrade
  // la confiance proportionnellement à sa taille.
  maxAllowedGapDays: z.number().int().positive().default(5),
  // Seuil de saturation (points, sur 7 jours glissants) au-delà duquel on
  // parle de "saturation brutale" et on force un verdict prudent, même en
  // pleine phase de croissance.
  saturationSpikeDeltaPoints: z.number().min(0).max(100).default(30),
  saturationSpikeWindowDays: z.number().int().positive().default(7),
  phaseTransitionDays: z.object({
    emergenceMaxDays: z.number().int().positive().default(14),
    growthMaxDays: z.number().int().positive().default(45),
    lateGrowthMaxDays: z.number().int().positive().default(75),
    maturityMaxDays: z.number().int().positive().default(150),
  }),
  verdictScoreBands: z.object({
    entrerMaintenantMax: z.number().min(0).max(100).default(35),
    avecUnAngleMax: z.number().min(0).max(100).default(55),
    risqueMax: z.number().min(0).max(100).default(75),
  }),
});
export type VerdictThresholds = z.infer<typeof verdictThresholdsSchema>;

export const DEFAULT_VERDICT_THRESHOLDS: VerdictThresholds = {
  minSnapshotsAbsolute: 3,
  fullConfidenceSpanDays: 21,
  maxAllowedGapDays: 5,
  saturationSpikeDeltaPoints: 30,
  saturationSpikeWindowDays: 7,
  phaseTransitionDays: {
    emergenceMaxDays: 14,
    growthMaxDays: 45,
    lateGrowthMaxDays: 75,
    maturityMaxDays: 150,
  },
  verdictScoreBands: {
    entrerMaintenantMax: 35,
    avecUnAngleMax: 55,
    risqueMax: 75,
  },
};
