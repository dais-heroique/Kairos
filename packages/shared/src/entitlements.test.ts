import { describe, expect, it } from "vitest";
import type { PlanSlug, User } from "./user";
import { entitlementsOf, hasAtLeastPlan, isFounder } from "./entitlements";

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
  it("le plan gratuit ne voit pas tout", () => {
    const e = entitlementsOf(makeUser());
    expect(e.fullRankings).toBe(false);
    expect(e.productDetail).toBe(false);
  });

  it("Pro débloque tout", () => {
    expect(entitlementsOf(makeUser({ slug: "pro" })).fullRankings).toBe(true);
  });

  // La demande explicite : ce compte voit tout sans payer, et sans qu'on
  // aille modifier son document Firestore (le champ `plan` est protégé par
  // les règles, et le contourner rouvrirait la faille qu'elles ferment).
  it("le compte fondateur a tout, même sur le plan gratuit", () => {
    const founder = makeUser({ email: "contact.conforva@gmail.com", slug: "radar" });
    const e = entitlementsOf(founder);
    expect(e.fullRankings).toBe(true);
    expect(e.productDetail).toBe(true);
    expect(e.alerts).toBe(true);
    expect(e.label).toBe("Accès fondateur");
    expect(hasAtLeastPlan(founder, "pro")).toBe(true);
  });

  it("reconnaît le fondateur quelle que soit la casse ou les espaces", () => {
    expect(isFounder("  Contact.Conforva@Gmail.com ")).toBe(true);
    expect(isFounder("autre@gmail.com")).toBe(false);
    expect(isFounder(null)).toBe(false);
  });

  it("un admin voit tout aussi", () => {
    expect(entitlementsOf(makeUser({ role: "admin" })).fullRankings).toBe(true);
  });

  it("un abonnement impayé redescend au gratuit malgré le slug", () => {
    const e = entitlementsOf(makeUser({ slug: "pro", status: "past_due" }));
    expect(e.fullRankings).toBe(false);
  });

  // Se tromper dans ce sens est le seul qui coûte : pendant le chargement
  // du document utilisateur, on ne doit jamais ouvrir l'accès par défaut.
  it("sans utilisateur, retombe sur le plan gratuit", () => {
    expect(entitlementsOf(null).fullRankings).toBe(false);
    expect(hasAtLeastPlan(null, "creator")).toBe(false);
  });
});
