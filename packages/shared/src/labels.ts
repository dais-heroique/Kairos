import type { Phase } from "./verdict";

// Traduction des termes internes en français lisible par quelqu'un qui
// débute. « phase emergence », « score de saturation 62/100 »,
// « GMV » : ces mots sont utiles dans le code, où ils désignent
// précisément une chose. À l'écran, ils ne disent rien à quelqu'un qui
// cherche juste à savoir s'il doit filmer ce produit ou pas.
//
// Un seul endroit, pour que les cinq écrans qui affichent une phase ne
// finissent pas par la nommer de cinq façons différentes.

export interface PhaseLabel {
  /** Comment on l'appelle à l'écran. */
  short: string;
  /** Ce que ça veut dire, en une phrase. */
  meaning: string;
  /** Ce qu'il y a à en faire. */
  advice: string;
}

export const PHASE_LABELS: Record<Phase, PhaseLabel> = {
  emergence: {
    short: "Personne n'en parle encore",
    meaning: "Les ventes montent et très peu de créateurs ont fait la vidéo.",
    advice: "C'est le meilleur moment : ta vidéo ne sera pas la centième.",
  },
  growth: {
    short: "Ça décolle",
    meaning: "Les ventes accélèrent franchement et les premiers créateurs arrivent.",
    advice: "Encore très jouable, mais publie vite plutôt que parfait.",
  },
  late_growth: {
    short: "Beaucoup l'ont déjà fait",
    meaning: "Ça monte encore, mais plus lentement, et la concurrence est là.",
    advice: "Il te faut un angle : un usage que personne n'a montré.",
  },
  maturity: {
    short: "Tout le monde en fait",
    meaning: "Les ventes stagnent et beaucoup de boutiques vendent la même chose.",
    advice: "L'effort demandé devient élevé pour ce que ça rapporte.",
  },
  decline: {
    short: "La vague est passée",
    meaning: "Les ventes reculent, les prix baissent, les créateurs partent.",
    advice: "À laisser passer, sauf idée vraiment originale.",
  },
};

/**
 * Le score interne s'appelle « saturation ». À l'écran on parle de
 * concurrence — c'est ce que ça mesure, et tout le monde comprend le mot.
 */
export const CROWDING_LABEL = "Concurrence";

export function crowdingWording(score: number): string {
  if (score <= 35) return "Peu de monde dessus";
  if (score <= 55) return "Ça commence à se remplir";
  if (score <= 75) return "Déjà beaucoup de monde";
  return "Saturé, tout le monde en fait";
}

/**
 * Suffixe ordinal français : « 1ʳᵉ place », mais « 2ᵉ place ».
 *
 * Le rang 1 est le seul cas particulier, et c'est celui qui s'affiche le
 * plus — en tête de classement, sur la trajectoire d'un produit et dans le
 * résumé hebdomadaire. « 1e place » se lit comme une faute, parce que c'en
 * est une.
 *
 * Accord au féminin : partout dans KAIROS l'ordinal qualifie une *place*.
 */
export function ordinalSuffix(rank: number): string {
  return rank === 1 ? "re" : "e";
}
