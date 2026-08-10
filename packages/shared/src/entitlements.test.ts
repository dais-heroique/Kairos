import { describe, expect, it } from "vitest";
import type { PlanSlug, User } from "./user";
import { entitlementsOf, hasAtLeastPlan, isFounder } from "./entitlements";
import {
  CAPABILITIES,
  CAPABILITIES_BY_PLAN,
  CAPABILITY_INFO,
  newCapabilitiesOf,
  planUnlocking,
  PLANS,
} from "./plans";

function makeUser(overrides: {
  email?: string;
  role?: User["role"];
  slug?: PlanSlug;
  status?: User["plan"]["status"];
} = {}): User {
  return {
    uid: "u1",
    email: overrides.email ?? "lea@example.com",
    displayName: null,
    photoURL: null,
    locale: "fr",
    role: overrides.role ?? "user",
    createdAt: new Date().toISOString(),
    deletedAt: null,
    profile: {
      niches: ["beaute"],
      markets: ["FR"],
      followerRange: "5k_20k",
      avgViews: 8000,
      experienceLevel: "intermediaire",
      onboardingCompletedAt: new Date().toISOString(),
    },
    plan: {
      slug: overrides.slug ?? "radar",
      status: overrides.status ?? "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
    },
    stats: { briefsGenerated: 0, videosPosted: 0, estimatedEarningsCents: 0 },
    referredByCode: null,
    appliedInviteCode: null,
  } as User;
}

describe("entitlements", () => {
  it("le plan gratuit voit les classements mais pas les gains détaillés", () => {
    const e = entitlementsOf(makeUser());
    // Un plan gratuit inutile ne convertit personne : l'information reste
    // accessible, c'est le détail des gains et la production qui sont
    // retenus.
    expect(e.can("rankings")).toBe(true);
    expect(e.can("watchlist")).toBe(true);
    expect(e.can("simulator")).toBe(true);
    expect(e.can("earningsAll")).toBe(false);
    expect(e.can("productHistory")).toBe(false);
    expect(e.can("brief")).toBe(false);
  });

  it("Pro débloque tout", () => {
    const e = entitlementsOf(makeUser({ slug: "pro" }));
    for (const capability of CAPABILITIES) expect(e.can(capability)).toBe(true);
  });

  it("Creator débloque les gains, l'historique et le brief", () => {
    const e = entitlementsOf(makeUser({ slug: "creator" }));
    expect(e.can("earningsAll")).toBe(true);
    expect(e.can("productHistory")).toBe(true);
    expect(e.can("brief")).toBe(true);
    // …mais pas l'archive, qui est l'argument du plan Pro.
    expect(e.can("rankingArchive")).toBe(false);
  });

  // La demande explicite : ce compte voit tout sans payer, et sans qu'on
  // aille modifier son document Firestore (le champ `plan` est protégé par
  // les règles, et le contourner rouvrirait la faille qu'elles ferment).
  it("le compte fondateur a tout, même sur le plan gratuit", () => {
    const founder = makeUser({ email: "contact.conforva@gmail.com", slug: "radar" });
    const e = entitlementsOf(founder);
    for (const capability of CAPABILITIES) expect(e.can(capability)).toBe(true);
    expect(e.label).toBe("Accès fondateur");
    expect(e.isFounderAccess).toBe(true);
    expect(hasAtLeastPlan(founder, "pro")).toBe(true);
  });

  it("reconnaît le fondateur quelle que soit la casse ou les espaces", () => {
    expect(isFounder("  Contact.Conforva@Gmail.com ")).toBe(true);
    expect(isFounder("autre@gmail.com")).toBe(false);
    expect(isFounder(null)).toBe(false);
  });

  it("un admin voit tout aussi", () => {
    expect(entitlementsOf(makeUser({ role: "admin" })).can("rankingArchive")).toBe(true);
  });

  it("un abonnement impayé redescend au gratuit malgré le slug", () => {
    const e = entitlementsOf(makeUser({ slug: "pro", status: "past_due" }));
    expect(e.can("earningsAll")).toBe(false);
    expect(e.effectivePlan).toBe("radar");
  });

  // Se tromper dans ce sens est le seul qui coûte : pendant le chargement
  // du document utilisateur, on ne doit jamais ouvrir l'accès par défaut.
  it("sans utilisateur, retombe sur le plan gratuit", () => {
    expect(entitlementsOf(null).can("earningsAll")).toBe(false);
    expect(hasAtLeastPlan(null, "creator")).toBe(false);
  });
});

// Le catalogue est la source unique : ce qui est annoncé sur la page de
// tarifs doit être exactement ce que l'application applique.
describe("cohérence du catalogue d'offres", () => {
  it("les plans forment une échelle — chacun contient le précédent", () => {
    for (let i = 1; i < PLANS.length; i++) {
      const previous = CAPABILITIES_BY_PLAN[PLANS[i - 1]!.slug];
      const current = new Set(CAPABILITIES_BY_PLAN[PLANS[i]!.slug]);
      for (const capability of previous) expect(current.has(capability)).toBe(true);
    }
  });

  it("chaque capacité est débloquée par au moins un plan", () => {
    for (const capability of CAPABILITIES) {
      expect(planUnlocking(capability)).toBeDefined();
    }
  });

  it("chaque plan payant apporte quelque chose de nouveau", () => {
    // Un palier qui n'ajoute rien est un palier qu'on ne peut pas vendre.
    expect(newCapabilitiesOf("creator").length).toBeGreaterThan(0);
    expect(newCapabilitiesOf("pro").length).toBeGreaterThan(0);
  });

  it("n'annonce jamais un prix qui n'est pas arrêté", () => {
    const radar = PLANS.find((p) => p.slug === "radar")!;
    expect(radar.priceCents).toBe(0);
    // Les autres peuvent valoir null (« Bientôt ») — ce qui est interdit,
    // c'est un montant inventé qu'on ne peut pas encaisser.
    for (const plan of PLANS) {
      expect(plan.priceCents === null || plan.priceCents >= 0).toBe(true);
    }
  });
});

// Deux fonctionnalités étaient annoncées sans exister : les alertes (un
// simple booléen stocké, aucune notification) et l'archive des classements
// (le document est écrasé à chaque calcul). Vendre ça, c'est vendre du
// vide — d'où le statut, et ces tests pour qu'il ne se perde pas.
describe("statut réel des fonctionnalités", () => {
  // Cette liste était codée en dur sur les deux capacités qui n'existaient
  // pas encore (`alerts`, `rankingArchive`). Elle échouait donc le jour où
  // on les implémentait — un test qui punit le travail. Ce qu'il faut
  // garder, c'est l'invariant : rien ne s'annonce sans exister.
  it("chaque capacité déclare un statut connu", () => {
    for (const c of CAPABILITIES) {
      expect(["live", "soon"]).toContain(CAPABILITY_INFO[c].status);
    }
  });

  // Le vrai garde-fou commercial, et il vient d'un défaut constaté : le
  // plan Pro n'ajoutait qu'une seule capacité, marquée « pas encore là ».
  // Il se serait donc vendu plus cher que Creator sans rien apporter de
  // fonctionnel. Un palier payant doit apporter au moins une chose qui
  // marche le jour où on l'encaisse.
  it("aucun palier payant ne se vend sur du vide", () => {
    for (const plan of PLANS.filter((p) => p.priceCents !== 0)) {
      const livrees = newCapabilitiesOf(plan.slug).filter(
        (c) => CAPABILITY_INFO[c].status === "live",
      );
      expect(
        livrees.length,
        `${plan.name} n'ajoute aucune fonctionnalité livrée`,
      ).toBeGreaterThan(0);
    }
  });

  // Le public visé débute : « GMV », « saturation » ou « phase » ne veulent
  // rien dire pour lui. Ces mots restent utiles dans le code, jamais à
  // l'écran.
  it("n'emploie aucun jargon dans les libellés visibles", () => {
    const jargon = /\b(GMV|saturation|satur[ée]|phase|churn|ROI|CPM|funnel)\b/i;
    for (const c of CAPABILITIES) {
      expect(CAPABILITY_INFO[c].label).not.toMatch(jargon);
    }
  });

  it("décrit ce que ça fait, pas un nom de fonctionnalité", () => {
    for (const c of CAPABILITIES) {
      // Un libellé de trois mots est une étiquette, pas une explication.
      expect(CAPABILITY_INFO[c].label.split(/\s+/).length).toBeGreaterThan(6);
    }
  });

  it("le plan gratuit ne repose que sur des fonctionnalités qui marchent", () => {
    for (const c of CAPABILITIES_BY_PLAN.radar) {
      expect(CAPABILITY_INFO[c].status).toBe("live");
    }
  });
});
