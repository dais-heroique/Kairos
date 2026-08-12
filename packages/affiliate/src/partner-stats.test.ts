import { describe, expect, it } from "vitest";
import type { PartnerCodeDoc } from "@kairos/shared";
import {
  buildPartnerStats,
  commissionCentsOf,
  isPayingCustomer,
  orphanCodes,
  type ReferredUser,
  totalPartnerStats,
} from "./partner-stats";

// Ces nombres deviennent des virements bancaires. Une erreur ici ne se
// voit pas à l'écran : elle se voit sur le relevé de quelqu'un, en trop ou
// en moins.

function code(over: Partial<PartnerCodeDoc> & { code: string }): PartnerCodeDoc {
  return {
    partnerName: "Partenaire",
    contact: null,
    commissionPct: 30,
    active: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    notes: null,
    ...over,
  };
}

function user(over: Partial<ReferredUser> & { uid: string }): ReferredUser {
  return {
    referredByCode: "LEA20",
    planSlug: "creator",
    planStatus: "active",
    monthlyPriceCents: 1900,
    signedUpAt: "2026-08-05T00:00:00.000Z",
    ...over,
  };
}

describe("isPayingCustomer", () => {
  it("compte un abonnement actif", () => {
    expect(isPayingCustomer(user({ uid: "a" }))).toBe(true);
  });

  it("ne compte pas un compte gratuit", () => {
    expect(isPayingCustomer(user({ uid: "a", planSlug: "radar" }))).toBe(false);
  });

  it("ne compte ni l'essai ni l'impayé ni le résilié", () => {
    // Rien n'a été encaissé dans le premier cas, rien n'est sûr dans le
    // deuxième : verser une commission puis devoir la reprendre est la
    // pire conversation possible avec un partenaire.
    for (const planStatus of ["trialing", "past_due", "canceled", "incomplete"] as const) {
      expect(isPayingCustomer(user({ uid: "a", planStatus })), planStatus).toBe(false);
    }
  });
});

describe("commissionCentsOf", () => {
  it("applique le taux", () => {
    expect(commissionCentsOf(1900, 30)).toBe(570);
  });

  it("arrondit vers le bas — l'arrondi favorable va à celui qui paie", () => {
    // 30 % de 1999 = 599,7 centimes.
    expect(commissionCentsOf(1999, 30)).toBe(599);
  });

  it("ne renvoie rien sur un montant ou un taux nul", () => {
    expect(commissionCentsOf(0, 30)).toBe(0);
    expect(commissionCentsOf(1900, 0)).toBe(0);
    expect(commissionCentsOf(-100, 30)).toBe(0);
  });
});

describe("buildPartnerStats", () => {
  it("sépare les inscrits des clients qui paient", () => {
    const stats = buildPartnerStats(
      [code({ code: "LEA20" })],
      [
        user({ uid: "1" }),
        user({ uid: "2" }),
        user({ uid: "3", planSlug: "radar" }),
        user({ uid: "4", planStatus: "canceled" }),
      ],
    );
    expect(stats[0]!.signups).toBe(4);
    expect(stats[0]!.payingCustomers).toBe(2);
    expect(stats[0]!.monthlyRevenueCents).toBe(3800);
    expect(stats[0]!.monthlyCommissionCents).toBe(1140);
  });

  it("garde les codes qui n'ont rien rapporté", () => {
    // C'est justement l'information qui décide si on continue avec ce
    // partenaire — la masquer reviendrait à ne montrer que les succès.
    const stats = buildPartnerStats([code({ code: "VIDE" })], []);
    expect(stats).toHaveLength(1);
    expect(stats[0]!.signups).toBe(0);
    expect(stats[0]!.monthlyCommissionCents).toBe(0);
  });

  it("applique le taux négocié de chaque code, pas une constante", () => {
    const stats = buildPartnerStats(
      [code({ code: "A", commissionPct: 30 }), code({ code: "B", commissionPct: 50 })],
      [user({ uid: "1", referredByCode: "A" }), user({ uid: "2", referredByCode: "B" })],
    );
    expect(stats.find((s) => s.code === "A")!.monthlyCommissionCents).toBe(570);
    expect(stats.find((s) => s.code === "B")!.monthlyCommissionCents).toBe(950);
  });

  it("calcule la commission sur le total, jamais en additionnant des arrondis", () => {
    // Trois clients à 19,99 € : 3 × floor(599,7) = 1797, alors que
    // floor(3 × 599,7) = 1799. L'écart grandit avec le nombre de clients,
    // et c'est toujours le partenaire qui le perd.
    const stats = buildPartnerStats(
      [code({ code: "X" })],
      ["1", "2", "3"].map((uid) => user({ uid, referredByCode: "X", monthlyPriceCents: 1999 })),
    );
    expect(stats[0]!.monthlyCommissionCents).toBe(1799);
  });

  it("ignore les inscrits sans code", () => {
    const stats = buildPartnerStats(
      [code({ code: "LEA20" })],
      [user({ uid: "1", referredByCode: null })],
    );
    expect(stats[0]!.signups).toBe(0);
  });

  it("classe par commission due, le plus gros virement d'abord", () => {
    const stats = buildPartnerStats(
      [code({ code: "PETIT" }), code({ code: "GROS" })],
      [
        user({ uid: "1", referredByCode: "PETIT" }),
        user({ uid: "2", referredByCode: "GROS" }),
        user({ uid: "3", referredByCode: "GROS" }),
      ],
    );
    expect(stats.map((s) => s.code)).toEqual(["GROS", "PETIT"]);
  });

  it("un code désactivé garde ses commissions dues", () => {
    // Désactiver arrête l'attribution de nouveaux inscrits ; ça n'efface
    // pas ce qu'on doit déjà.
    const stats = buildPartnerStats(
      [code({ code: "LEA20", active: false })],
      [user({ uid: "1" })],
    );
    expect(stats[0]!.monthlyCommissionCents).toBe(570);
    expect(stats[0]!.active).toBe(false);
  });
});

describe("totalPartnerStats", () => {
  it("additionne ce qu'il y a à virer ce mois-ci", () => {
    const stats = buildPartnerStats(
      [code({ code: "A" }), code({ code: "B" })],
      [
        user({ uid: "1", referredByCode: "A" }),
        user({ uid: "2", referredByCode: "B", monthlyPriceCents: 3900 }),
      ],
    );
    const total = totalPartnerStats(stats);
    expect(total.payingCustomers).toBe(2);
    expect(total.monthlyRevenueCents).toBe(5800);
    expect(total.monthlyCommissionCents).toBe(570 + 1170);
  });

  it("vaut zéro sans partenaire, plutôt que d'échouer", () => {
    expect(totalPartnerStats([])).toEqual({
      signups: 0,
      payingCustomers: 0,
      monthlyRevenueCents: 0,
      monthlyCommissionCents: 0,
    });
  });
});

describe("orphanCodes", () => {
  it("remonte les codes utilisés mais jamais créés", () => {
    // Un influenceur qui diffuse son code avant sa création, ou avec une
    // faute de frappe. Ces inscrits existent et ne sont rattachés à
    // personne : sans cette liste, ils ne seraient jamais payés — et
    // jamais réclamés, puisque personne ne saurait qu'ils existent.
    const orphelins = orphanCodes(
      [code({ code: "LEA20" })],
      [
        user({ uid: "1", referredByCode: "LEA2O" }),
        user({ uid: "2", referredByCode: "LEA2O" }),
        user({ uid: "3", referredByCode: "INCONNU" }),
        user({ uid: "4", referredByCode: "LEA20" }),
      ],
    );
    expect(orphelins).toEqual([
      { code: "LEA2O", signups: 2 },
      { code: "INCONNU", signups: 1 },
    ]);
  });

  it("ne remonte rien quand tout est rattaché", () => {
    expect(orphanCodes([code({ code: "LEA20" })], [user({ uid: "1" })])).toEqual([]);
  });
});
