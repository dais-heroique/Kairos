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

/**
 * Ce que le plan gratuit permet quand même.
 *
 * Un plan gratuit qui ne sert à rien ne convertit personne : il fait juste
 * partir les gens avant qu'ils aient compris l'outil. Mais un plan gratuit
 * qui donne tout ne se transforme jamais en abonnement. La ligne retenue :
 * **le gratuit donne l'information et une production, le payant donne la
 * production au rythme voulu.**
 *
 * Concrètement, un compte gratuit peut aller au bout de la boucle **une
 * fois** : trouver un produit, voir ce qu'il rapporterait, le suivre, et
 * obtenir le texte à dire face caméra. S'il tourne la vidéo et que ça
 * marche, il sait exactement ce qu'il achète ensuite. C'est plus honnête
 * qu'une démonstration, et plus convaincant.
 */
export const FREE_LIMITS = {
  /**
   * Produits suivis simultanément. Cinq suffit à suivre une semaine de
   * tournage ; un portefeuille sérieux les dépasse tout de suite.
   */
  watchlist: 5,
  /**
   * Briefs de tournage, **au total** et non par mois. Un quota mensuel
   * demanderait de savoir quel mois on est et de le remettre à zéro — donc
   * un serveur, ou un compteur que le client peut fausser. Un quota à vie
   * se compte par la simple existence des documents `users/{uid}/briefs/*`,
   * que les règles Firestore interdisent de supprimer.
   */
  briefs: 1,
  /**
   * Produits dont le gain chiffré est affiché. Au-delà, la ligne reste
   * visible et seul le montant est retenu — cacher la ligne entière ferait
   * croire que le produit n'existe pas, alors que le classement complet est
   * précisément ce que le gratuit offre.
   *
   * Cette valeur vivait en dur dans `RankingList.tsx` : elle est ici pour
   * que la page de tarifs et l'application ne puissent pas annoncer deux
   * chiffres différents.
   */
  earningsTop: 10,
} as const;

/** Briefs gratuits restants — jamais négatif. */
export function freeBriefsRemaining(unlockedCount: number): number {
  return Math.max(0, FREE_LIMITS.briefs - unlockedCount);
}

/**
 * Ce que le plan gratuit annonce **en plus** de ses capacités : les limites
 * qu'il faut connaître avant de créer un compte, pas après.
 *
 * Dérivées de `FREE_LIMITS` et non recopiées : un plafond annoncé qui ne
 * correspond plus au plafond appliqué est exactement la promesse non tenue
 * que ce fichier existe pour empêcher.
 */
export const FREE_PLAN_NOTES: readonly string[] = [
  `${FREE_LIMITS.briefs === 1 ? "Un texte de tournage offert" : `${FREE_LIMITS.briefs} textes de tournage offerts`}, sur le produit de ton choix`,
  `Jusqu'à ${FREE_LIMITS.watchlist} produits suivis en même temps`,
  `Les gains chiffrés sur les ${FREE_LIMITS.earningsTop} premiers produits de la liste`,
];

/**
 * Les deux périodicités facturables.
 *
 * Défini ici plutôt que dans `@kairos/payments` parce que `plans.ts` est en
 * dessous dans le graphe de dépendances — `payments` importe `shared`, pas
 * l'inverse. `payments` réexporte ce type, de sorte que le catalogue Stripe
 * et les prix affichés parlent littéralement du même ensemble de valeurs :
 * ajouter une périodicité d'un côté sans l'autre ne compilerait pas.
 */
export const BILLING_PERIODS = ["monthly", "yearly"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

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
  /**
   * Prix annuel en centimes, même règle. Séparé du mensuel et non calculé
   * à partir de lui : appliquer une remise de tête (« × 10 mois ») ici
   * afficherait un montant que Stripe ne facturerait pas. Les deux nombres
   * viennent du tableau de bord Stripe, chacun saisi une fois.
   */
  yearlyPriceCents: number | null;
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
    yearlyPriceCents: 0,
    tagline: "Pour voir si l'outil te parle",
    highlight:
      "Toute la liste des produits, la recommandation pour chacun, et un texte de tournage offert",
    popular: false,
  },
  {
    slug: "creator",
    name: "Creator",
    // Ces deux montants doivent correspondre **au centime** aux prix
    // Stripe `price_1U2Zjw…` (mensuel) et `price_1U2ZmQ…` (annuel).
    // Ils ne sont pas la source de vérité de la facturation — Stripe l'est
    // — mais ils sont ce que le client lit avant de payer. Un écart entre
    // les deux est une publicité mensongère, pas un bug d'affichage.
    priceCents: 1900,
    yearlyPriceCents: 19000,
    tagline: "Pour qui poste chaque semaine",
    highlight: "Tes gains sur tous les produits, les courbes, et le texte à dire",
    popular: true,
  },
  {
    slug: "pro",
    name: "Pro",
    // Correspondent au centime aux prix Stripe `price_1U3ZEm…` (mensuel)
    // et `price_1U3ZGE…` (annuel). Le double de Creator, pas plus : au-delà
    // il faudrait une différence de nature (multi-comptes, API), que Pro
    // n'a pas — il ajoute quatre fonctionnalités au même produit.
    priceCents: 3900,
    yearlyPriceCents: 39000,
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

/**
 * Ce que `to` apporte **par rapport au plan réellement détenu**, `from` —
 * pas par rapport au palier juste en dessous.
 *
 * La différence n'est pas cosmétique : un compte Radar qui bute sur une
 * capacité propre à Pro ne doit pas voir seulement les capacités de Pro
 * (`newCapabilitiesOf("pro")`, 4 items) — il lui manque *aussi* tout ce que
 * Creator apporte, qu'il n'a jamais eu. Lui montrer 4 items pour 39 €/mois
 * fait paraître le palier payant plus pauvre que le gratuit, qui liste ses
 * propres capacités en entier juste à côté. `newCapabilitiesOf` reste utile
 * pour les colonnes de `/tarifs`, où chaque palier compare toujours au
 * précédent ; celle-ci sert quand le point de départ réel de l'utilisateur
 * compte, ce qui est le cas de tout paywall.
 */
export function capabilitiesGainedFrom(from: PlanSlug, to: PlanSlug): Capability[] {
  const owned = new Set(CAPABILITIES_BY_PLAN[from]);
  return CAPABILITIES_BY_PLAN[to].filter((c) => !owned.has(c));
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

/** Le montant d'un plan pour une périodicité, `null` s'il n'est pas arrêté. */
export function planPriceCents(
  plan: PlanDefinition,
  period: BillingPeriod = "monthly",
): number | null {
  return period === "yearly" ? plan.yearlyPriceCents : plan.priceCents;
}

function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function formatPlanPrice(
  plan: PlanDefinition,
  period: BillingPeriod = "monthly",
): string {
  const cents = planPriceCents(plan, period);
  if (cents === 0) return "Gratuit";
  if (cents === null) return "Bientôt";
  return `${formatEuros(cents)} / ${period === "yearly" ? "an" : "mois"}`;
}

/**
 * Ce que l'annuel revient par mois — le seul chiffre qui permet de comparer
 * les deux périodicités d'un coup d'œil. Calculé, jamais saisi : un montant
 * mensuel affiché à côté d'un annuel qui ne s'y ramène pas serait une
 * publicité mensongère au sens strict.
 */
export function formatYearlyAsMonthly(plan: PlanDefinition): string | null {
  if (plan.yearlyPriceCents === null || plan.yearlyPriceCents === 0) return null;
  return `${formatEuros(Math.round(plan.yearlyPriceCents / 12))} / mois`;
}

/**
 * L'économie réelle de l'annuel, en pourcentage entier arrondi **vers le
 * bas** — annoncer « 20 % » pour 19,6 % serait promettre plus que ce qu'on
 * facture. `null` dès qu'un des deux montants manque, ou que l'annuel
 * n'est pas avantageux : on n'affiche pas un badge « économisez 0 % ».
 */
export function yearlySavingsPct(plan: PlanDefinition): number | null {
  const { priceCents, yearlyPriceCents } = plan;
  if (priceCents === null || yearlyPriceCents === null) return null;
  if (priceCents === 0 || yearlyPriceCents === 0) return null;
  const fullYear = priceCents * 12;
  if (yearlyPriceCents >= fullYear) return null;
  return Math.floor(((fullYear - yearlyPriceCents) / fullYear) * 100);
}
