// Déplacé vers ../config/weights.ts (LOT 1) — regroupe tous les
// poids/seuils du moteur au même endroit. Ré-export conservé ici pour ne
// pas casser d'imports existants sur ce chemin.
export {
  scoringWeightsSchema,
  DEFAULT_SCORING_WEIGHTS,
  type ScoringWeights,
} from "../config/weights";
