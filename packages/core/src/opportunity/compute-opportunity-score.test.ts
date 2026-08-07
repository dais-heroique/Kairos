import { describe, expect, it } from "vitest";
import type { Commission, ProductVerdict, SellerTrust } from "@kairos/shared";
import {
  compareOpportunity,
  computeOpportunityScore,
  hasOpportunityBasis,
  opportunityGroupOf,
  type OpportunityBasis,
} from "./compute-opportunity-score";

const MEASURED: OpportunityBasis = { hasMeasuredHistory: true };
const NO_HISTORY: OpportunityBasis = { hasMeasuredHistory: false };

function makeVerdict(overrides: Partial<ProductVerdict> = {}): ProductVerdict {
  return {
    phase: "emergence",
    daysInPhase: 5,
    saturationScore: 10,
    // Confiance élevée : la phase n'est prise pour argent comptant que
    // dans la mesure où l'historique la soutient (voir UNKNOWN_PHASE_SCORE).
    windowDaysRemaining: { low: 60, high: 100, confidence: 0.95 },
    marginLowPct: 30,
    marginHighPct: 50,
    verdict: "entrer_maintenant",
    reasoning: ["test"],
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCommission(overrides: Partial<Commission> = {}): Commission {
  return { ratePct: 20, isOpenCollab: true, isTargetedOnly: false, ...overrides };
}

function makeSellerTrust(overrides: Partial<SellerTrust> = {}): SellerTrust {
  return {
    score: 80,
    shipDays: 3,
    commissionHonorRate: 0.95,
    sampleApprovalRate: 0.8,
    avgSampleResponseHours: 12,
    disputeRate: 0.02,
    sampleCount: 40,
    ...overrides,
  };
}

// La plupart des cas ci-dessous testent l'arithmétique du score, pas son
// refus de sortir : ils travaillent sur une base mesurée et veulent un
// nombre.
function scoreOf(
  verdict: ProductVerdict,
  commission: Commission,
  sellerTrust: SellerTrust,
  basis: OpportunityBasis = MEASURED,
): number {
  const score = computeOpportunityScore(verdict, commission, sellerTrust, basis);
  if (score === null) throw new Error("un score était attendu, `null` reçu");
  return score;
}

describe("computeOpportunityScore", () => {
  it("forte opportunité — émergence, commission élevée, vendeur fiable, faible saturation", () => {
    const score = scoreOf(makeVerdict(), makeCommission(), makeSellerTrust());

    expect(score).toBeGreaterThan(70);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("faible opportunité — déclin, forte saturation, vendeur peu fiable", () => {
    const score = scoreOf(
      makeVerdict({ phase: "decline", saturationScore: 90 }),
      makeCommission({ ratePct: 5 }),
      makeSellerTrust({ score: 20 }),
    );

    expect(score).toBeLessThan(30);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("commission absente — score pénalisé, pas de crash", () => {
    const withCommission = scoreOf(
      makeVerdict(),
      makeCommission({ ratePct: 25 }),
      makeSellerTrust(),
    );
    const withoutCommission = scoreOf(
      makeVerdict(),
      makeCommission({ ratePct: 0, isOpenCollab: false }),
      makeSellerTrust(),
    );

    expect(Number.isFinite(withoutCommission)).toBe(true);
    expect(withoutCommission).toBeLessThan(withCommission);
  });

  it("commission réservée (isTargetedOnly) — pèse moins qu'une commission ouverte équivalente", () => {
    const open = scoreOf(
      makeVerdict(),
      makeCommission({ ratePct: 20, isOpenCollab: true, isTargetedOnly: false }),
      makeSellerTrust(),
    );
    const targeted = scoreOf(
      makeVerdict(),
      makeCommission({ ratePct: 20, isOpenCollab: false, isTargetedOnly: true }),
      makeSellerTrust(),
    );

    expect(targeted).toBeLessThan(open);
  });
});

// Régression : le verdict d'un produit sans historique est prudent
// ("risque") mais sa *phase* par défaut est "emergence", la mieux notée.
// Le classement « Opportunités » plaçait donc un produit saisi la veille
// au-dessus de produits réellement analysés — constaté en conditions
// réelles, 7e sur 22.
describe("phase non étayée par les données", () => {
  const insufficient = makeVerdict({
    phase: "emergence",
    saturationScore: 50,
    windowDaysRemaining: { low: 0, high: 30, confidence: 0.05 },
    verdict: "risque",
  });

  it("ne récompense pas une phase déduite d'un historique vide", () => {
    const unknown = scoreOf(insufficient, makeCommission(), makeSellerTrust(), NO_HISTORY);
    const known = scoreOf(makeVerdict(), makeCommission(), makeSellerTrust());
    expect(unknown).toBeLessThan(known);
  });

  it("le classe même sous un produit en simple fin de croissance", () => {
    const lateGrowth = makeVerdict({
      phase: "late_growth",
      saturationScore: 50,
      windowDaysRemaining: { low: 15, high: 40, confidence: 0.9 },
    });
    expect(scoreOf(insufficient, makeCommission(), makeSellerTrust(), NO_HISTORY)).toBeLessThan(
      scoreOf(lateGrowth, makeCommission(), makeSellerTrust()),
    );
  });
});

// Régression : les 90 produits Apify de production réunissaient les trois
// absences à la fois — un seul relevé, aucune commission (l'actor n'en
// renvoie pas), aucune confiance vendeur mesurée. Les quatre termes de la
// somme étaient alors des constantes, et les 90 obtenaient exactement
// 30/100. Le tri ne départageait plus rien : l'ordre affiché était celui
// des identifiants.
describe("aucun axe mesuré", () => {
  const noHistoryVerdict = makeVerdict({
    phase: "emergence",
    saturationScore: 50,
    windowDaysRemaining: { low: 0, high: 30, confidence: 0.05 },
    verdict: "risque",
  });
  const noCommission = makeCommission({ ratePct: 0, isOpenCollab: false });
  const unmeasuredTrust = makeSellerTrust({ score: 50, sampleCount: 0 });

  it("ne sort aucun nombre plutôt qu'une constante déguisée en mesure", () => {
    expect(
      computeOpportunityScore(noHistoryVerdict, noCommission, unmeasuredTrust, NO_HISTORY),
    ).toBeNull();
  });

  it("deux produits sans base ne peuvent pas être départagés", () => {
    const cher = computeOpportunityScore(
      noHistoryVerdict,
      noCommission,
      makeSellerTrust({ score: 90, sampleCount: 0 }),
      NO_HISTORY,
    );
    const bonMarche = computeOpportunityScore(
      noHistoryVerdict,
      noCommission,
      makeSellerTrust({ score: 10, sampleCount: 0 }),
      NO_HISTORY,
    );
    // Sans base, la note vendeur est un remplissage : elle n'a pas à créer
    // un écart de classement entre deux produits qu'on ne sait pas juger.
    expect(cher).toBeNull();
    expect(bonMarche).toBeNull();
  });

  it("un seul axe réel suffit à rendre le score publiable", () => {
    expect(
      computeOpportunityScore(noHistoryVerdict, makeCommission(), unmeasuredTrust, NO_HISTORY),
    ).not.toBeNull();
    expect(
      computeOpportunityScore(noHistoryVerdict, noCommission, makeSellerTrust(), NO_HISTORY),
    ).not.toBeNull();
    expect(
      computeOpportunityScore(noHistoryVerdict, noCommission, unmeasuredTrust, MEASURED),
    ).not.toBeNull();
  });

  it("hasOpportunityBasis dit la même chose que le score", () => {
    expect(hasOpportunityBasis(noCommission, unmeasuredTrust, NO_HISTORY)).toBe(false);
    expect(hasOpportunityBasis(makeCommission(), unmeasuredTrust, NO_HISTORY)).toBe(true);
  });
});

describe("compareOpportunity", () => {
  const classable = { opportunityScore: 40, verdict: "avec_un_angle" } as const;
  const meilleur = { opportunityScore: 80, verdict: "entrer_maintenant" } as const;
  const sansBase = { opportunityScore: null, verdict: "risque" } as const;
  const aEviter = { opportunityScore: 95, verdict: "eviter" } as const;

  it("classe par score décroissant à l'intérieur d'un groupe", () => {
    expect([classable, meilleur].sort(compareOpportunity)).toEqual([meilleur, classable]);
  });

  it("relègue un produit « éviter » derrière tout le reste, malgré un score élevé", () => {
    const ordre = [aEviter, sansBase, classable].sort(compareOpportunity);
    expect(ordre).toEqual([classable, sansBase, aEviter]);
  });

  it("un score absent ne vaut pas zéro — il sort du groupe classable, pas du bas de tableau", () => {
    const nul = { opportunityScore: 0, verdict: "risque" } as const;
    const ordre = [sansBase, nul].sort(compareOpportunity);
    // Le produit noté 0 a été jugé ; celui sans base ne l'a pas été.
    expect(ordre).toEqual([nul, sansBase]);
  });

  it("nomme les trois groupes", () => {
    expect(opportunityGroupOf(classable)).toBe("classable");
    expect(opportunityGroupOf(sansBase)).toBe("sans_base");
    expect(opportunityGroupOf(aEviter)).toBe("a_eviter");
  });
});
