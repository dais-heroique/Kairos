import { describe, expect, it } from "vitest";
import type { EstimatedRange, WatchlistEntry } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";
import {
  buildCategoryPulse,
  buildDashboard,
  FOCUS_SIZE,
  windowRangeOf,
} from "./build-dashboard";

function item(over: Partial<ProductRankItem> & { id: string }): ProductRankItem {
  return {
    rank: 1,
    title: over.id,
    shopName: "Boutique",
    priceCents: 1690,
    verdict: "entrer_maintenant",
    salesTrend: "up",
    commissionRatePct: 25,
    snapshotCount: 30,
    verdictConfidence: 0.8,
    opportunityScore: 70,
    windowDaysHigh: 60,
    saturationScore: 20,
    ...over,
  };
}

const range = (low: number, high: number): EstimatedRange => ({
  low,
  high,
  confidence: 0.6,
  method: "manual_entry",
});

const flatEstimate = () => range(10, 20);

function build(over: Partial<Parameters<typeof buildDashboard>[0]> = {}) {
  return buildDashboard({
    opportunities: [],
    products: [],
    watchlist: [],
    niches: [],
    estimateFor: flatEstimate,
    ...over,
  });
}

describe("buildDashboard", () => {
  it("ne propose rien plutôt que d'inventer quand il n'y a pas de données", () => {
    const d = build();
    expect(d.topPick).toBeNull();
    expect(d.focus).toEqual([]);
    expect(d.focusEarnings).toBeNull();
    expect(d.openWindowCount).toBe(0);
  });

  it("ne retient jamais un produit sans historique suffisant", () => {
    const d = build({
      opportunities: [
        item({ id: "neuf", snapshotCount: 2, verdictConfidence: 0.05 }),
        item({ id: "etabli", snapshotCount: 30 }),
      ],
    });
    expect(d.topPick?.item.id).toBe("etabli");
    expect(d.focus.map((p) => p.item.id)).not.toContain("neuf");
  });

  it("écarte du focus les produits à éviter ou risqués", () => {
    const d = build({
      opportunities: [
        item({ id: "eviter", verdict: "eviter" }),
        item({ id: "risque", verdict: "risque" }),
        item({ id: "angle", verdict: "avec_un_angle" }),
      ],
    });
    expect(d.focus.map((p) => p.item.id)).toEqual(["angle"]);
  });

  // Ce qui rend le tableau de bord personnel plutôt que générique : à
  // score égal, le produit de la niche de l'utilisateur passe devant.
  it("privilégie la niche de l'utilisateur à score comparable", () => {
    const d = build({
      opportunities: [
        item({ id: "maison", category: "Maison & électroménager", opportunityScore: 80 }),
        item({ id: "beaute", category: "Beauté & soins", opportunityScore: 72 }),
      ],
      niches: ["beaute"],
    });
    expect(d.topPick?.item.id).toBe("beaute");
    expect(d.topPick?.matchesNiche).toBe(true);
  });

  it("retombe sur le meilleur score quand aucune niche ne correspond", () => {
    const d = build({
      opportunities: [
        item({ id: "a", category: "Animalerie", opportunityScore: 60 }),
        item({ id: "b", category: "Sport & plein air", opportunityScore: 90 }),
      ],
      niches: ["beaute"],
    });
    expect(d.topPick?.item.id).toBe("b");
    expect(d.topPick?.matchesNiche).toBe(false);
  });

  it("limite le focus et additionne les fourchettes de gain", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      item({ id: `p${i}`, opportunityScore: 90 - i }),
    );
    const d = build({ opportunities: many, estimateFor: () => range(10, 25) });
    expect(d.focus).toHaveLength(FOCUS_SIZE);
    expect(d.focusEarnings).toEqual({
      low: 50,
      high: 125,
      confidence: 0.6,
      method: "manual_entry",
    });
  });

  // Agréger ne doit pas fabriquer de la certitude.
  it("plafonne la confiance de la somme à celle du maillon le plus faible", () => {
    let n = 0;
    const d = build({
      opportunities: [item({ id: "a" }), item({ id: "b" })],
      estimateFor: () => ({ ...range(10, 20), confidence: n++ === 0 ? 0.9 : 0.3 }),
    });
    expect(d.focusEarnings?.confidence).toBe(0.3);
  });

  it("ignore les estimations impossibles au lieu de les compter pour zéro", () => {
    const d = build({
      opportunities: [item({ id: "a" })],
      estimateFor: () => ({ low: 0, high: 0, confidence: 0, method: "insufficient_data" }),
    });
    expect(d.focusEarnings).toBeNull();
  });

  it("classe les fenêtres qui se referment, de la plus urgente à la moins", () => {
    const d = build({
      opportunities: [
        item({ id: "large", windowDaysHigh: 90 }),
        item({ id: "serre", windowDaysHigh: 6 }),
        item({ id: "moyen", windowDaysHigh: 18 }),
      ],
    });
    expect(d.closingSoon.map((i) => i.id)).toEqual(["serre", "moyen"]);
  });

  it("remonte les produits à éviter par saturation décroissante", () => {
    const d = build({
      opportunities: [
        item({ id: "sature", verdict: "eviter", saturationScore: 88 }),
        item({ id: "tendu", verdict: "risque", saturationScore: 62 }),
      ],
    });
    expect(d.avoid.map((i) => i.id)).toEqual(["sature", "tendu"]);
  });

  it("signale les produits trop récents sans les masquer", () => {
    const d = build({
      products: [item({ id: "hier", snapshotCount: 1, verdictConfidence: 0.05 })],
    });
    expect(d.needsHistory.map((i) => i.id)).toEqual(["hier"]);
  });

  it("résume le pipeline watchlist dans l'ordre des étapes", () => {
    const watchlist: WatchlistEntry[] = [
      { productId: "a", addedAt: "", alertsEnabled: true, status: "watching" },
      { productId: "b", addedAt: "", alertsEnabled: true, status: "sample_requested" },
      { productId: "c", addedAt: "", alertsEnabled: true, status: "sample_requested" },
      { productId: "d", addedAt: "", alertsEnabled: true, status: "posted" },
    ] as WatchlistEntry[];
    const d = build({ watchlist });
    expect(d.pipeline.map((s) => [s.status, s.count])).toEqual([
      ["watching", 1],
      ["sample_requested", 2],
      ["sample_received", 0],
      ["filmed", 0],
      ["posted", 1],
    ]);
    expect(d.awaitingSample).toBe(2);
  });
});

describe("windowRangeOf", () => {
  it("expose la fenêtre comme une estimation, avec sa confiance", () => {
    const r = windowRangeOf(item({ id: "a", windowDaysLow: 30, windowDaysHigh: 75 }));
    expect(r).toEqual({ low: 30, high: 75, confidence: 0.8, method: "historical_regression" });
  });

  // Sans historique, computeVerdict renvoie quand même une fenêtre
  // (0–30 jours) : l'afficher serait présenter un remplissage comme un
  // résultat.
  it("ne renvoie rien quand l'historique ne la soutient pas", () => {
    expect(
      windowRangeOf(
        item({ id: "neuf", snapshotCount: 2, verdictConfidence: 0.05, windowDaysLow: 0, windowDaysHigh: 30 }),
      ),
    ).toBeNull();
  });

  it("ne renvoie rien quand le champ est absent", () => {
    const bare = item({ id: "vieux" });
    delete (bare as { windowDaysHigh?: number }).windowDaysHigh;
    expect(windowRangeOf(bare)).toBeNull();
  });
});

// Le tableau de bord répond à « qu'est-ce que je tourne cette semaine ? ».
// Un créateur choisit d'abord un terrain, ensuite un produit — d'où le
// regroupement par famille, qui n'existait pas.
describe("buildCategoryPulse", () => {
  const p = (
    id: string,
    category: string,
    verdict: ProductRankItem["verdict"],
    score = 50,
  ): ProductRankItem => ({
    ...item({ id, verdict }),
    category,
    opportunityScore: score,
    snapshotCount: 10,
    verdictConfidence: 0.8,
  });

  it("compte les fenêtres ouvertes et les produits à éviter par famille", () => {
    const pulse = buildCategoryPulse([
      p("a", "beaute", "entrer_maintenant"),
      p("b", "beaute", "entrer_maintenant"),
      p("c", "beaute", "eviter"),
      p("d", "tech", "entrer_maintenant"),
    ]);

    const beaute = pulse.find((c) => c.label === "beaute")!;
    expect(beaute.total).toBe(3);
    expect(beaute.open).toBe(2);
    expect(beaute.avoid).toBe(1);
  });

  it("classe par fenêtres ouvertes, pas par volume", () => {
    // Une famille de 3 produits tous jouables est plus utile qu'une de 5
    // dont aucun ne l'est.
    const pulse = buildCategoryPulse([
      ...["a", "b", "c", "d", "e"].map((id) => p(id, "maison", "risque")),
      ...["f", "g", "h"].map((id) => p(id, "tech", "entrer_maintenant")),
    ]);
    expect(pulse[0]!.label).toBe("tech");
  });

  it("ignore les produits sans assez de recul", () => {
    // Sinon une famille entièrement récente afficherait « 10 produits,
    // 0 fenêtre ouverte » — un terrain lu comme mort alors qu'il est
    // seulement inconnu.
    const recent = { ...p("x", "beaute", "entrer_maintenant"), snapshotCount: 1 };
    delete (recent as { verdictConfidence?: number }).verdictConfidence;
    expect(buildCategoryPulse([recent])).toEqual([]);
  });

  it("ignore les produits sans catégorie plutôt que d'inventer un fourre-tout", () => {
    const sans = { ...p("y", "", "entrer_maintenant") };
    expect(buildCategoryPulse([sans])).toEqual([]);
  });

  it("désigne le meilleur produit de chaque famille", () => {
    const pulse = buildCategoryPulse([
      p("faible", "beaute", "entrer_maintenant", 30),
      p("fort", "beaute", "entrer_maintenant", 90),
    ]);
    expect(pulse[0]!.best?.id).toBe("fort");
  });
});
