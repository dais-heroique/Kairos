import type { PlanSlug } from "./user";

// Catalogue des offres — source unique.
//
// Le problème qu'il résout : la page d'accueil listait les fonctionnalités
// à la main dans les fichiers de traduction, pendant qu'`entitlements.ts`
// décidait de son côté qui a droit à quoi. Rien ne garantissait que les
// deux disent la même chose, et une page qui promet plus que l'application
// ne délivre est une promesse non tenue payée par l'utilisateur.
//
// Ici, chaque ligne affichée est reliée à la capacité qui la gouverne
// (`gate`). Un test vérifie que toute capacité est bien annoncée quelque
// part, et qu'aucune ligne ne prétend débloquer une capacité que le plan
// n'a pas.

/**
 * Capacités vendables. Une seule liste, utilisée par les droits
 * (`entitlementsOf`) comme par l'affichage des offres.
 */
export const CAPABILITIES = [
  "rankings",
  "earningsTop10",
  "earningsAll",
  "watchlist",
  "simulator",
  "productHistory",
  "brief",
  "alerts",
  "rankingArchive",
  "rankTrend",
  "productCompare",
  "dataExport",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/**
 * Ce qui marche aujourd'hui, et ce qui ne marche pas encore.
 *
 * Deux fonctionnalités étaient annoncées alors que rien ne les
 * implémentait : les alertes (seul un booléen `alertsEnabled` était écrit
 * dans Firestore, aucune notification n'existe) et l'archive des
 * classements (le document est écrasé à chaque calcul, il n'y a aucun
 * historique). Vendre ça, c'est vendre du vide. Elles restent au
 * catalogue — elles sont prévues — mais marquées `soon`, et l'interface
 * l'affiche partout où elles apparaissent.
 */
export type CapabilityStatus = "live" | "soon";

export interface CapabilityInfo {
  /** Une phrase, sans jargon, qui dit ce que ça fait concrètement. */
  label: string;
  status: CapabilityStatus;
}

// Rédaction : pas de « GMV », pas de « saturation », pas de « phase ».
// Ces mots-là veulent dire quelque chose pour qui a déjà travaillé le
// sujet, et rien du tout pour quelqu'un qui débute — c'est-à-dire
// exactement le public visé.
export const CAPABILITY_INFO: Record<Capability, CapabilityInfo> = {
  rankings: {
    label:
      "La liste des produits TikTok Shop qui marchent en ce moment, avec pour chacun : vas-y, trouve un angle, méfie-toi, ou laisse tomber",
    status: "live",
  },
  earningsTop10: {
    label: "Ce que tu toucherais sur les 10 premiers produits de la liste",
    status: "live",
  },
  earningsAll: {
    label: "Ce que tu toucherais sur tous les produits, pas seulement les 10 premiers",
    status: "live",
  },
  watchlist: {
    label:
      "Ta liste de produits à suivre, de « j'ai demandé l'échantillon » jusqu'à « c'est publié »",
    status: "live",
  },
  simulator: {
    label: "Un curseur pour essayer : si je fais 50 000 vues sur ce produit, je touche combien ?",
    status: "live",
  },
  productHistory: {
    label:
      "La courbe d'un produit jour après jour : ses ventes, et combien de créateurs en parlent déjà",
    status: "live",
  },
  brief: {
    label:
      "Le texte à dire face caméra, minuté seconde par seconde, avec le plan des images à filmer",
    status: "live",
  },
  alerts: {
    label:
      "Ce qui a bougé sur tes produits suivis depuis ta dernière visite : ceux qui montent, et ceux où la place se remplit",
    status: "live",
  },
  // ---- Ce qui distingue Pro -----------------------------------------------
  // Creator répond à « quel produit je tourne cette semaine ». Pro répond à
  // « comment je pilote ça dans la durée » : l'historique des classements,
  // la trajectoire d'un produit, la comparaison côte à côte, et la sortie
  // des données. Ce sont les besoins de quelqu'un qui en fait un revenu,
  // pas de quelqu'un qui teste.
  rankingArchive: {
    label: "Revoir les classements des semaines passées, jour par jour",
    status: "live",
  },
  rankTrend: {
    label:
      "La trajectoire d'un produit dans le classement : 34e il y a deux semaines, 6e aujourd'hui",
    status: "live",
  },
  productCompare: {
    label:
      "Comparer jusqu'à quatre produits côte à côte : verdict, concurrence, fenêtre et gain",
    status: "live",
  },
  dataExport: {
    label: "Sortir tes classements et ta liste de suivi en tableau (CSV)",
    status: "live",
  },
};

/** Raccourci de lecture — le libellé seul. */
export const CAPABILITY_LABELS: Record<Capability, string> = Object.fromEntries(
  (Object.keys(CAPABILITY_INFO) as Capability[]).map((c) => [c, CAPABILITY_INFO[c].label]),
) as Record<Capability, string>;

export function isLive(capability: Capability): boolean {
  return CAPABILITY_INFO[capability].status === "live";
}

/**
 * Ce que chaque plan débloque. `radar` est volontairement généreux : un
 * plan gratuit qui ne sert à rien ne convertit personne, il fait juste
 * partir les gens. On retient les *gains détaillés* et la *production de
 * contenu*, pas l'accès à l'information.
 */
export const CAPABILITIES_BY_PLAN: Record<PlanSlug, readonly Capability[]> = {
  radar: ["rankings", "earningsTop10", "watchlist", "simulator"],
  creator: [
    "rankings",
    "earningsTop10",
    "earningsAll",
    "watchlist",
    "simulator",
    "productHistory",
    "brief",
    "alerts",
  ],
  pro: [...CAPABILITIES],
};

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  /**
   * Prix mensuel en centimes, ou `null` tant qu'il n'est pas arrêté.
   * `null` fait afficher « bientôt » plutôt qu'un montant inventé —
   * annoncer un tarif qu'on ne peut pas encaisser serait pire que de ne
   * rien annoncer.
   */
  priceCents: number | null;
  tagline: string;
  /** Ce que ce plan apporte *en plus* du précédent. */
  highlight: string;
  popular: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    slug: "radar",
    name: "Radar",
    priceCents: 0,
    tagline: "Pour voir si l'outil te parle",
    highlight: "Toute la liste des produits, avec la recommandation pour chacun",
    popular: false,
  },
  {
    slug: "creator",
    name: "Creator",
    priceCents: null,
    tagline: "Pour qui poste chaque semaine",
    highlight: "Tes gains sur tous les produits, les courbes, et le texte à dire",
    popular: true,
  },
  {
    slug: "pro",
    name: "Pro",
    priceCents: null,
    tagline: "Pour en faire un vrai revenu",
    highlight: "Suivre un produit sur plusieurs semaines",
    popular: false,
  },
];

export function planBySlug(slug: PlanSlug): PlanDefinition {
  return PLANS.find((p) => p.slug === slug)!;
}

/** Capacités qu'un plan apporte et que le précédent n'avait pas. */
export function newCapabilitiesOf(slug: PlanSlug): Capability[] {
  const index = PLANS.findIndex((p) => p.slug === slug);
  if (index <= 0) return [...CAPABILITIES_BY_PLAN[slug]];
  const previous = new Set(CAPABILITIES_BY_PLAN[PLANS[index - 1]!.slug]);
  return CAPABILITIES_BY_PLAN[slug].filter((c) => !previous.has(c));
}

/** Le premier plan qui débloque cette capacité — ce qu'il faut proposer. */
export function planUnlocking(capability: Capability): PlanDefinition {
  return PLANS.find((p) => CAPABILITIES_BY_PLAN[p.slug].includes(capability)) ?? PLANS[0]!;
}

/**
 * Combien de temps une fenêtre reste ouverte, en moyenne. Ce n'est pas un
 * argument marketing : c'est la borne haute réellement utilisée par le
 * moteur pour un produit en croissance (voir `computeWindowDaysRemaining`
 * dans packages/core). L'urgence du produit est vraie — inutile d'en
 * inventer une.
 *
 * À ne surtout pas remplacer par « plus que 3 places » ou « offre valable
 * 24 h » : ce sont exactement les formulations que le Compliance Guard
 * signale comme trompeuses (`trompeur-urgence`), et il serait absurde de
 * les interdire aux créateurs tout en s'en servant soi-même.
 */
// `min`/`max` et non `low`/`high` : ces derniers désignent, partout
// ailleurs dans le code, les bornes d'une estimation portant sur un
// produit précis — qui doit alors s'afficher via <EstimatedValue>, avec sa
// confiance. Ici c'est un ordre de grandeur général, pas une estimation ;
// la règle ESLint kairos/no-raw-estimate-number avait raison de tiquer.
export const TYPICAL_WINDOW_DAYS = { min: 15, max: 40 } as const;

/**
 * Les premiers inscrits gardent le tarif de lancement quand les offres
 * ouvriront. C'est une promesse tenable — elle ne dépend que de nous — et
 * c'est la seule raison honnête de s'inscrire maintenant plutôt que dans
 * six mois. Passer à `false` la retire partout d'un coup.
 */
export const FOUNDING_PRICE_LOCK = true;

export function formatPlanPrice(plan: PlanDefinition): string {
  if (plan.priceCents === 0) return "Gratuit";
  if (plan.priceCents === null) return "Bientôt";
  return `${(plan.priceCents / 100).toFixed(2).replace(".", ",")} € / mois`;
}
