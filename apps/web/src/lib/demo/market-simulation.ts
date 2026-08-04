import type { ProductSnapshot } from "@kairos/shared";

// Génère un marché TikTok Shop FR plausible : des relevés quotidiens par
// produit, sur lesquels les vrais moteurs (computeVerdict,
// computeOpportunityScore) tournent normalement.
//
// Différence avec le jeu de démo précédent — et c'est tout l'enjeu : les
// verdicts n'y étaient PAS calculés, ils étaient écrits en dur à côté de
// produits sans le moindre relevé. Ici on ne simule que ce qu'un collecteur
// observerait (prix, avis, créateurs actifs, boutiques concurrentes) ; le
// verdict, la phase, la saturation et le score d'opportunité sont ensuite
// déduits par le code de production, exactement comme sur des données
// réelles. Un bug de moteur se voit donc dans la démo.
//
// Déterministe (PRNG à graine) : deux exécutions donnent le même marché,
// sinon les captures d'écran et les tests changeraient à chaque passage.

// mulberry32 — court, rapide, suffisant pour du bruit de démonstration.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Étapes de vie d'un produit sur TikTok Shop. Les noms correspondent aux
 * phases que `computeVerdict` doit retrouver *tout seul* à partir des
 * relevés — ils ne sont jamais écrits dans les données.
 */
export type LifecycleProfile =
  | "emergence"
  | "growth"
  | "late_growth"
  | "maturity"
  | "decline"
  | "saturation_spike"
  | "just_added"
  | "collection_gap";

export interface DemoShop {
  id: string;
  name: string;
  trustScore: number;
  shipDays: number;
  sampleApprovalRate: number;
  commissionHonorRate: number;
  disputeRate: number;
  verified: boolean;
}

export interface DemoProduct {
  id: string;
  title: string;
  emoji: string;
  priceCents: number;
  commissionRatePct: number;
  category: string;
  shopId: string;
  profile: LifecycleProfile;
}

// Boutiques : des noms de vendeurs FR plausibles, avec des niveaux de
// fiabilité contrastés — c'est ce qui fait bouger le score d'opportunité
// à commission égale.
export const DEMO_SHOPS: DemoShop[] = [
  { id: "glowlab-paris", name: "GlowLab Paris", trustScore: 88, shipDays: 3, sampleApprovalRate: 0.72, commissionHonorRate: 0.97, disputeRate: 0.02, verified: true },
  { id: "maison-sereine", name: "Maison Sereine", trustScore: 79, shipDays: 4, sampleApprovalRate: 0.61, commissionHonorRate: 0.94, disputeRate: 0.03, verified: true },
  { id: "techclip-fr", name: "TechClip FR", trustScore: 61, shipDays: 8, sampleApprovalRate: 0.34, commissionHonorRate: 0.83, disputeRate: 0.09, verified: false },
  { id: "atelier-nova", name: "Atelier Nova", trustScore: 82, shipDays: 4, sampleApprovalRate: 0.58, commissionHonorRate: 0.95, disputeRate: 0.03, verified: true },
  { id: "activefit-store", name: "ActiveFit Store", trustScore: 70, shipDays: 6, sampleApprovalRate: 0.45, commissionHonorRate: 0.89, disputeRate: 0.05, verified: false },
  { id: "patte-propre", name: "PattePropre", trustScore: 85, shipDays: 3, sampleApprovalRate: 0.66, commissionHonorRate: 0.96, disputeRate: 0.02, verified: true },
  { id: "petit-nuage", name: "Petit Nuage", trustScore: 90, shipDays: 2, sampleApprovalRate: 0.78, commissionHonorRate: 0.98, disputeRate: 0.01, verified: true },
];

// Prix et taux de commission calés sur ce qui se pratique réellement en
// affiliation TikTok Shop FR : la beauté paie le mieux (25-32%),
// l'électronique le moins (12-18%), les paniers tournent autour de 10-45 €.
export const DEMO_PRODUCTS: DemoProduct[] = [
  // Émergence — repérés tôt, peu de concurrence. Le cœur de cible.
  { id: "huile-ricin-cils-sourcils", title: "Huile de ricin cils & sourcils", emoji: "🌿", priceCents: 1190, commissionRatePct: 32, category: "Beauté & soins", shopId: "glowlab-paris", profile: "emergence" },
  { id: "infuseur-the-inox", title: "Infuseur à thé inox pliable", emoji: "🍵", priceCents: 1090, commissionRatePct: 22, category: "Alimentation & boissons", shopId: "maison-sereine", profile: "emergence" },
  { id: "brosse-anti-poils-chat", title: "Brosse anti-poils pour chat", emoji: "🐱", priceCents: 1390, commissionRatePct: 24, category: "Animalerie", shopId: "patte-propre", profile: "emergence" },

  // Croissance — la fenêtre est encore ouverte mais elle se referme.
  { id: "serum-niacinamide-10", title: "Sérum niacinamide 10%", emoji: "🧴", priceCents: 1690, commissionRatePct: 28, category: "Beauté & soins", shopId: "glowlab-paris", profile: "growth" },
  { id: "veilleuse-projecteur-etoiles", title: "Veilleuse projecteur d'étoiles", emoji: "✨", priceCents: 2390, commissionRatePct: 20, category: "Bébé & enfant", shopId: "petit-nuage", profile: "growth" },
  { id: "bracelet-acier-inoxydable", title: "Bracelet acier inoxydable gravé", emoji: "⛓️", priceCents: 1590, commissionRatePct: 28, category: "Mode & sous-vêtements", shopId: "atelier-nova", profile: "growth" },
  { id: "gourde-isotherme-1l", title: "Gourde isotherme 1 L", emoji: "🧊", priceCents: 1990, commissionRatePct: 18, category: "Sport & plein air", shopId: "activefit-store", profile: "growth" },

  // Fin de croissance — ça marche encore, mais il faut un angle.
  { id: "lampe-coucher-soleil", title: "Lampe coucher de soleil", emoji: "🌅", priceCents: 1890, commissionRatePct: 20, category: "Maison & électroménager", shopId: "maison-sereine", profile: "late_growth" },
  { id: "sac-bandouliere-matelasse", title: "Sac bandoulière matelassé", emoji: "👜", priceCents: 2790, commissionRatePct: 20, category: "Mode & sous-vêtements", shopId: "atelier-nova", profile: "late_growth" },
  { id: "bandes-elastiques-fitness", title: "Bandes élastiques fitness (5)", emoji: "💪", priceCents: 1690, commissionRatePct: 20, category: "Sport & plein air", shopId: "activefit-store", profile: "late_growth" },

  // Maturité — tout le monde en fait, plus d'avantage à se lancer.
  { id: "patchs-hydrocolloides", title: "Patchs hydrocolloïdes anti-boutons", emoji: "🩹", priceCents: 890, commissionRatePct: 30, category: "Beauté & soins", shopId: "glowlab-paris", profile: "maturity" },
  { id: "gua-sha-quartz-rose", title: "Gua sha quartz rose", emoji: "💎", priceCents: 1250, commissionRatePct: 25, category: "Beauté & soins", shopId: "glowlab-paris", profile: "maturity" },
  { id: "range-cables-magnetique", title: "Range-câbles magnétique", emoji: "🔌", priceCents: 990, commissionRatePct: 22, category: "Maison & électroménager", shopId: "maison-sereine", profile: "maturity" },
  { id: "support-voiture-magnetique", title: "Support voiture magnétique", emoji: "🚗", priceCents: 1390, commissionRatePct: 18, category: "Téléphonie & électronique", shopId: "techclip-fr", profile: "maturity" },

  // Déclin — la vague est passée.
  { id: "coque-magsafe-transparente", title: "Coque MagSafe transparente", emoji: "📱", priceCents: 1490, commissionRatePct: 15, category: "Téléphonie & électronique", shopId: "techclip-fr", profile: "decline" },
  { id: "humidificateur-brume-froide", title: "Humidificateur brume froide", emoji: "💨", priceCents: 2490, commissionRatePct: 18, category: "Maison & électroménager", shopId: "maison-sereine", profile: "decline" },
  { id: "legging-push-up-sculptant", title: "Legging push-up sculptant", emoji: "🩱", priceCents: 2290, commissionRatePct: 25, category: "Mode & sous-vêtements", shopId: "atelier-nova", profile: "decline" },

  // Saturation brutale — en croissance sur le fond, mais 40 boutiques
  // sont arrivées en une semaine. Le cas que le moteur doit rattraper.
  { id: "masque-led-visage", title: "Masque LED visage", emoji: "😷", priceCents: 4490, commissionRatePct: 20, category: "Beauté & soins", shopId: "glowlab-paris", profile: "saturation_spike" },
  { id: "brosse-lissante-chauffante", title: "Brosse lissante chauffante", emoji: "💇", priceCents: 2990, commissionRatePct: 18, category: "Beauté & soins", shopId: "techclip-fr", profile: "saturation_spike" },

  // Ajoutés hier/avant-hier — moins de 3 relevés, donc verdict volontairement
  // prudent avec "historique trop court". Il FAUT que la démo montre ce cas :
  // c'est l'état normal d'un produit qu'on vient de saisir.
  { id: "batterie-externe-10000mah", title: "Batterie externe 10 000 mAh", emoji: "🔋", priceCents: 2690, commissionRatePct: 12, category: "Téléphonie & électronique", shopId: "techclip-fr", profile: "just_added" },
  { id: "distributeur-croquettes-auto", title: "Distributeur de croquettes auto", emoji: "🐕", priceCents: 3990, commissionRatePct: 16, category: "Animalerie", shopId: "patte-propre", profile: "just_added" },

  // Série trouée — un week-end de saisie oublié. Montre la pénalité de
  // confiance, qui est le cas le plus probable avec une saisie manuelle.
  { id: "aspirateur-main-voiture", title: "Aspirateur à main voiture", emoji: "🧹", priceCents: 3290, commissionRatePct: 15, category: "Maison & électroménager", shopId: "techclip-fr", profile: "collection_gap" },
];

interface CurveSpec {
  /** Jours d'historique générés. */
  days: number;
  /** Ventes/jour au premier relevé. */
  startSales: number;
  /** Multiplicateur appliqué au dernier relevé (1 = plat). */
  salesMultiplier: number;
  competingShopsStart: number;
  competingShopsEnd: number;
  creatorsStart: number;
  creatorsEnd: number;
  /** Baisse de prix cumulée sur la période (0.2 = -20%). */
  priceErosion: number;
  /**
   * Amplitude du bruit jour/jour (0.2 = ±20%). Volontairement variable :
   * un produit qui vend 40 unités/jour a une variation relative bien plus
   * forte qu'un produit installé qui en vend 500 — c'est la loi des
   * grands nombres, pas un réglage cosmétique.
   *
   * Ce paramètre a une conséquence directe sur le moteur : `classifyPhase`
   * ne range en "maturity" qu'un ratio de croissance dans ±2 %, or ce
   * ratio est mesuré sur des moyennes de 3 points. Avec ±12 % de bruit
   * quotidien, l'erreur type sur le ratio dépasse largement 2 % et un
   * produit parfaitement plat ressort en "late_growth" au hasard du bruit.
   * Voir docs/STATE.md, « Questions ouvertes ».
   */
  noiseAmplitude: number;
}

// Les paramètres sont choisis pour que le moteur *retrouve* la phase
// annoncée par le nom du profil — pas l'inverse. Les bornes utilisées :
// emergence si span ≤ 14, growth si ratio > 0.15 et span ≤ 45, late_growth
// si ratio > 0.02, maturity si |ratio| ≤ 0.02, decline si ratio < -0.05.
const CURVES: Record<LifecycleProfile, CurveSpec> = {
  emergence: { days: 11, startSales: 40, salesMultiplier: 2.6, competingShopsStart: 1, competingShopsEnd: 3, creatorsStart: 2, creatorsEnd: 7, priceErosion: 0, noiseAmplitude: 0.22 },
  growth: { days: 32, startSales: 90, salesMultiplier: 3.1, competingShopsStart: 3, competingShopsEnd: 8, creatorsStart: 6, creatorsEnd: 19, priceErosion: 0.03, noiseAmplitude: 0.16 },
  late_growth: { days: 58, startSales: 260, salesMultiplier: 1.22, competingShopsStart: 7, competingShopsEnd: 14, creatorsStart: 15, creatorsEnd: 31, priceErosion: 0.08, noiseAmplitude: 0.1 },
  // Gros volume installé : la variation relative jour/jour est faible, ce
  // qui est aussi la seule façon d'atteindre la bande "maturity" du moteur.
  maturity: { days: 96, startSales: 520, salesMultiplier: 1.0, competingShopsStart: 14, competingShopsEnd: 23, creatorsStart: 28, creatorsEnd: 46, priceErosion: 0.14, noiseAmplitude: 0.03 },
  decline: { days: 44, startSales: 610, salesMultiplier: 0.42, competingShopsStart: 19, competingShopsEnd: 26, creatorsStart: 38, creatorsEnd: 24, priceErosion: 0.27, noiseAmplitude: 0.09 },
  // Croissance franche, puis 4 → 34 boutiques concurrentes sur la dernière
  // semaine : c'est la bascule que detectSaturationSpike doit attraper.
  saturation_spike: { days: 30, startSales: 150, salesMultiplier: 2.2, competingShopsStart: 4, competingShopsEnd: 34, creatorsStart: 8, creatorsEnd: 44, priceErosion: 0.18, noiseAmplitude: 0.14 },
  just_added: { days: 2, startSales: 55, salesMultiplier: 1.3, competingShopsStart: 2, competingShopsEnd: 3, creatorsStart: 3, creatorsEnd: 4, priceErosion: 0, noiseAmplitude: 0.2 },
  collection_gap: { days: 34, startSales: 180, salesMultiplier: 1.9, competingShopsStart: 5, competingShopsEnd: 11, creatorsStart: 9, creatorsEnd: 22, priceErosion: 0.05, noiseAmplitude: 0.15 },
};

// Un pic de saturation ne monte pas linéairement : il ne se déclenche que
// sur la dernière semaine, sinon le moteur le lisse et ne voit rien.
function progressFor(profile: LifecycleProfile, t: number): number {
  if (profile !== "saturation_spike") return t;
  const SPIKE_STARTS_AT = 0.76;
  if (t < SPIKE_STARTS_AT) return t * 0.18;
  return 0.14 + ((t - SPIKE_STARTS_AT) / (1 - SPIKE_STARTS_AT)) * 0.86;
}

function isoDaysAgo(days: number, today: Date): string {
  const d = new Date(today.getTime() - days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Relevés quotidiens d'un produit, du plus ancien au plus récent.
 * `today` est injectable pour que les tests ne dépendent pas de l'horloge.
 */
export function simulateSnapshots(
  product: DemoProduct,
  today: Date = new Date(),
): ProductSnapshot[] {
  const curve = CURVES[product.profile];
  const rng = makeRng(hashSeed(product.id));
  const snapshots: ProductSnapshot[] = [];

  // Trou de collecte au milieu de la série : neuf jours sautés, au-delà
  // des 5 tolérés par maxAllowedGapDays, pour que la pénalité se voie.
  const skipped = new Set<number>();
  if (product.profile === "collection_gap") {
    const start = Math.floor(curve.days / 2);
    for (let k = 0; k < 9; k++) skipped.add(start + k);
  }

  // Les avis s'accumulent : jamais décroissants, et leur *vitesse* suit
  // les ventes — c'est ce que lit l'indicateur de décélération.
  let reviewCount = Math.round(curve.startSales * 0.8 + rng() * 40);

  for (let i = 0; i < curve.days; i++) {
    const t = curve.days === 1 ? 1 : i / (curve.days - 1);
    const p = progressFor(product.profile, t);

    const trend = 1 + (curve.salesMultiplier - 1) * t;
    const noise = 1 - curve.noiseAmplitude / 2 + rng() * curve.noiseAmplitude;
    const sales = Math.max(5, curve.startSales * trend * noise);

    reviewCount += Math.max(0, Math.round(sales * 0.045 * (0.8 + rng() * 0.4)));

    if (!skipped.has(i)) {
      const price = Math.round(product.priceCents * (1 - curve.priceErosion * p));
      snapshots.push({
        productId: product.id,
        capturedDate: isoDaysAgo(curve.days - 1 - i, today),
        priceCents: price,
        reviewCount,
        // Une note descend lentement quand les copies arrivent.
        ratingAvg: Math.round((4.75 - p * 0.5 + (rng() - 0.5) * 0.08) * 100) / 100,
        activeCreatorCount: Math.round(
          curve.creatorsStart + (curve.creatorsEnd - curve.creatorsStart) * p,
        ),
        videoCount: Math.round(
          (curve.creatorsStart + (curve.creatorsEnd - curve.creatorsStart) * p) * (3 + rng() * 4),
        ),
        competingShopCount: Math.round(
          curve.competingShopsStart +
            (curve.competingShopsEnd - curve.competingShopsStart) * p,
        ),
        // Fourchette large : c'est une estimation, elle doit le montrer.
        estSalesLow: Math.round(sales * 0.78),
        estSalesHigh: Math.round(sales * 1.24),
        confidence: 0.6,
      });
    }
  }

  return snapshots;
}

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
