import type {
  Brief,
  BriefHook,
  ComplianceRule,
  FollowerRange,
  HookType,
  Phase,
  ProductVerdict,
  ShotListItem,
} from "@kairos/shared";
import { BRIEF_CACHE_TTL_DAYS } from "@kairos/shared";

// Brief de tournage construit à partir de l'analyse réelle du produit —
// phase, saturation, prix, commission — sans appeler la moindre IA.
//
// Pourquoi ne pas attendre Gemini/Claude : le plan Spark interdit les
// Cloud Functions, et une clé d'API ne peut pas partir dans un bundle
// navigateur. Un bouton « générer un brief » branché sur une IA serait
// donc resté mort, ou aurait exigé de payer. Or l'essentiel d'un bon
// brief se déduit de ce qu'on sait déjà : à quel moment du cycle on
// arrive détermine l'angle, la saturation détermine s'il faut se
// différencier, et le cadre légal détermine ce qu'il ne faut pas dire.
//
// L'IA reste la suite logique — elle apportera les tournures propres à
// chaque produit et les objections réellement lues en commentaires. Ce
// module produit la structure ; `packages/ai-gateway` l'enrichira quand
// une clé existera. D'ici là le créateur a un script exploitable, pas un
// bouton grisé.

/** Angle d'attaque en fonction du moment du cycle où l'on arrive. */
const HOOKS_BY_PHASE: Record<Phase, HookType[]> = {
  // Personne ne connaît le produit : la découverte est l'argument.
  emergence: ["pov", "reaction_choc", "unboxing"],
  // Ça commence à tourner : montrer le résultat prime.
  growth: ["probleme_agitation", "avant_apres", "tutoriel_direct"],
  // Tout le monde l'a fait : il faut un angle, pas une redite.
  late_growth: ["objection_frontale", "comparaison", "storytime"],
  // Saturé : seule la forme peut encore surprendre.
  maturity: ["absurde_pattern_interrupt", "asmr_sensoriel", "storytime"],
  decline: ["absurde_pattern_interrupt", "comparaison", "objection_frontale"],
};

const HOOK_LINES: Record<HookType, (ctx: BriefContext) => string> = {
  pov: (c) => `POV : tu découvres ${c.shortTitle} avant tout le monde.`,
  reaction_choc: (c) => `J'ai commandé ${c.shortTitle} en pensant que c'était nul.`,
  unboxing: (c) => `${c.priceLabel} pour ça. On ouvre ensemble.`,
  probleme_agitation: (c) => `Si ${c.problem}, arrête de scroller deux secondes.`,
  avant_apres: () => "Regarde bien la différence — je n'ai rien retouché.",
  tutoriel_direct: (c) => `Comment j'utilise ${c.shortTitle}, en 20 secondes.`,
  objection_frontale: (c) => `« ${c.shortTitle}, c'est encore un truc inutile » — j'ai vérifié.`,
  comparaison: (c) => `${c.priceLabel} contre la version à trois fois le prix.`,
  storytime: (c) => `Je ne voulais pas de ${c.shortTitle}. Trois semaines après, voilà où j'en suis.`,
  absurde_pattern_interrupt: (c) => `J'ai testé ${c.shortTitle} de la pire façon possible.`,
  asmr_sensoriel: (c) => `Le son de ${c.shortTitle}. Monte le volume.`,
  prix_choc: (c) => `${c.priceLabel}. Je répète : ${c.priceLabel}.`,
  autorite_expert: (c) => `Ce qu'il faut vraiment regarder avant d'acheter ${c.shortTitle}.`,
  temoignage: (c) => `Trois semaines avec ${c.shortTitle} : ce que j'en pense vraiment.`,
};

/** Objections récurrentes par famille de produit. */
const GENERIC_OBJECTIONS: Record<string, string[]> = {
  beaute: [
    "« Ça va irriter ma peau » — précise ton type de peau et la durée du test.",
    "« C'est encore un produit qui ne fait rien » — montre l'usage, pas la promesse.",
    "« Trop cher pour ce que c'est » — ramène au prix par utilisation.",
  ],
  maison: [
    "« Ça va casser en deux semaines » — manipule-le sans précaution à l'écran.",
    "« Je n'ai pas la place » — montre-le rangé, pas seulement en usage.",
    "« On trouve la même chose moins cher » — assume le prix et dis pourquoi.",
  ],
  tech: [
    "« Ce n'est pas compatible avec mon téléphone » — annonce les modèles dès le début.",
    "« La batterie va tenir deux jours » — montre l'autonomie réelle.",
    "« C'est de la mauvaise qualité » — montre les finitions de près.",
  ],
  mode: [
    "« Ça ne tombera pas pareil sur moi » — donne ta taille et tes mensurations.",
    "« La matière va gratter » — parle du toucher, filme la matière de près.",
    "« Ça rétrécit au lavage » — dis ce que tu as fait après lavage.",
  ],
  default: [
    "« Est-ce que ça vaut vraiment le prix ? » — compare à ce que la personne dépense déjà.",
    "« Ça a l'air fragile » — manipule-le normalement à l'écran.",
    "« Le colis met un mois » — annonce le délai que tu as constaté.",
  ],
};

const CATEGORY_KEYS: Array<[RegExp, string]> = [
  [/beaut|soin|cosm/i, "beaute"],
  [/maison|[ée]lectrom[ée]nager|cuisine/i, "maison"],
  [/t[ée]l[ée]phon|[ée]lectroniq|tech|gadget/i, "tech"],
  [/mode|v[êe]tement|sous-v[êe]tement|bijou/i, "mode"],
];

interface BriefContext {
  shortTitle: string;
  priceLabel: string;
  problem: string;
}

export interface BuildBriefInput {
  productId: string;
  title: string;
  category: string;
  priceCents: number;
  commissionRatePct: number;
  verdict: ProductVerdict;
  nicheBucket: string;
  followerRange: FollowerRange;
  /**
   * Règles de conformité en vigueur : les interdits du brief en sont
   * directement dérivés, de sorte qu'ils ne puissent pas diverger de ce
   * que le Compliance Guard vérifiera ensuite.
   */
  complianceRules: ComplianceRule[];
  now?: Date;
}

function categoryKey(category: string): string {
  for (const [pattern, key] of CATEGORY_KEYS) {
    if (pattern.test(category)) return key;
  }
  return "default";
}

// Mots qui ne peuvent pas terminer un nom de produit lu à voix haute :
// couper « Huile de ricin cils & sourcils » après quatre mots donnait
// « Huile de ricin cils », qui s'entend comme une phrase inachevée.
const DANGLING = /^(?:de|du|des|d'|la|le|les|l'|et|&|à|au|aux|en|pour|avec|sans|par)$/i;

function shortenTitle(title: string): string {
  // Retire les précisions entre parenthèses et le conditionnement final
  // (« 30 ml », « x2 »), qui n'apportent rien à l'oral.
  const cleaned = title
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+\d+([.,]\d+)?\s*(ml|cl|l|g|kg|mm|cm|m|w|mah|pcs?|x\d+)\b/gi, "")
    .trim();

  const words = cleaned.split(/\s+/);
  if (words.length <= 4) return cleaned;

  const kept = words.slice(0, 4);
  // Recule tant que le dernier mot ne peut pas clore le groupe.
  while (kept.length > 1 && DANGLING.test(kept[kept.length - 1]!)) kept.pop();
  return kept.join(" ");
}

function problemFor(key: string): string {
  switch (key) {
    case "beaute":
      return "tu changes de routine tous les mois sans jamais voir de différence";
    case "maison":
      return "tu ranges la même chose trois fois par semaine";
    case "tech":
      return "ton téléphone te lâche toujours au mauvais moment";
    case "mode":
      return "tu commandes et rien ne te va jamais";
    default:
      return "tu hésites depuis des semaines";
  }
}

// La mention publicitaire n'est pas une option : la loi n° 2023-451
// l'impose dès qu'un lien d'affiliation rapporte une commission. Elle est
// donc écrite dans le script généré, et pas laissée à la bonne volonté —
// c'est aussi ce qui fait que le brief passe son propre contrôle de
// conformité (voir le test dédié).
const AD_DISCLOSURE = "Collaboration commerciale.";

function buildShotList(phase: Phase, ctx: BriefContext): ShotListItem[] {
  const base: string[] = [
    `Plan d'accroche, 0–3 s : ${ctx.shortTitle} en main, visage dans le cadre.`,
    "Gros plan produit, 3–6 s : la texture ou le détail qui donne envie.",
    "Plan d'usage, 6–15 s : toi en train de t'en servir pour de vrai.",
    "Plan résultat, 15–22 s : ce que ça change, filmé sans montage caché.",
    "Plan de fin, 22–28 s : regard caméra, ce que tu en penses en une phrase.",
  ];
  if (phase === "late_growth" || phase === "maturity" || phase === "decline") {
    base.splice(3, 0, "Plan différenciant : l'usage que personne n'a encore montré.");
  }
  return base.map((description) => ({ description, done: false }));
}

function buildScript(ctx: BriefContext, hooks: BriefHook[], phase: Phase): string {
  const lines = [
    `[0–3 s] ${hooks[0]!.spokenLine}`,
    `[3–8 s] ${AD_DISCLOSURE} Je te montre exactement ce que c'est, sans enrobage.`,
    `[8–15 s] Concrètement : ${ctx.shortTitle}, ${ctx.priceLabel}. Voilà comment je m'en sers.`,
    "[15–22 s] Ce que j'ai constaté, moi, sur la durée où je l'ai testé.",
  ];
  if (phase === "late_growth" || phase === "maturity" || phase === "decline") {
    lines.push(
      "[22–26 s] Tu l'as sûrement déjà vu passer. La raison pour laquelle j'en parle quand même :",
    );
  }
  lines.push(
    "[fin] Si ça te parle, le lien est dans ma boutique. Sinon, garde ton argent.",
  );
  return lines.join("\n");
}

function buildDoNots(rules: ComplianceRule[], phase: Phase, saturation: number): string[] {
  // Les interdits viennent des règles de conformité elles-mêmes : pas de
  // liste parallèle qui finirait par diverger de ce qui est réellement
  // contrôlé.
  const fromRules = rules
    .filter((rule) => rule.severity === "blocking")
    .map((rule) => rule.message);

  const contextual: string[] = [];
  if (saturation >= 55) {
    contextual.push(
      "Ne refais pas le format que tout le monde a déjà publié sur ce produit : à ce niveau de saturation, la copie ne sort pas.",
    );
  }
  if (phase === "decline") {
    contextual.push(
      "Ne présente pas ce produit comme une nouveauté : il est en fin de cycle, et l'audience le sait.",
    );
  }
  return [...contextual, ...fromRules];
}

/**
 * Fonction pure — aucun appel réseau, aucune dépendance Firebase.
 * Produit un brief conforme à `briefSchema`, exploitable tel quel.
 */
export function buildBrief(input: BuildBriefInput): Brief {
  const now = input.now ?? new Date();
  const key = categoryKey(input.category);
  const ctx: BriefContext = {
    shortTitle: shortenTitle(input.title),
    priceLabel: `${(input.priceCents / 100).toFixed(2).replace(".", ",")} €`,
    problem: problemFor(key),
  };

  const hookTypes = HOOKS_BY_PHASE[input.verdict.phase];
  const hooks: BriefHook[] = hookTypes.slice(0, 3).map((type) => ({
    type,
    spokenLine: HOOK_LINES[type](ctx),
  }));

  const expiresAt = new Date(now.getTime() + BRIEF_CACHE_TTL_DAYS * 86_400_000);

  return {
    productId: input.productId,
    nicheBucket: input.nicheBucket,
    followerRange: input.followerRange,
    hooks,
    shotList: buildShotList(input.verdict.phase, ctx),
    script: buildScript(ctx, hooks, input.verdict.phase),
    objections: GENERIC_OBJECTIONS[key] ?? GENERIC_OBJECTIONS.default!,
    // Aucun commentaire réel n'est collecté aujourd'hui (voir décision #8
    // dans docs/STATE.md) : on le dit plutôt que de faire croire que ces
    // objections viennent du terrain.
    objectionsSource: "generic",
    doNots: buildDoNots(input.complianceRules, input.verdict.phase, input.verdict.saturationScore),
    generatedAt: now.toISOString(),
    cacheExpiresAt: expiresAt.toISOString(),
  };
}
