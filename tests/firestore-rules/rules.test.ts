import { readFileSync } from "node:fs";
import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PROJECT_ID = "kairos-rules-test";

function validUser(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    uid,
    email: `${uid}@example.com`,
    displayName: null,
    photoURL: null,
    locale: "fr",
    role: "user",
    createdAt: new Date().toISOString(),
    deletedAt: null,
    profile: {
      niches: [],
      markets: [],
      followerRange: "0_1k",
      avgViews: 0,
      experienceLevel: "debutant",
      onboardingCompletedAt: null,
      timezone: "Europe/Paris",
    },
    plan: {
      slug: "radar",
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
    },
    stats: { briefsGenerated: 0, videosPosted: 0, estimatedEarningsCents: 0 },
    referredByCode: null,
    appliedInviteCode: null,
    ...overrides,
  };
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("../../firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("users/{uid}", () => {
  it("blocks all access when unauthenticated", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("users").doc("alice").get());
    await assertFails(
      db.collection("users").doc("alice").set(validUser("alice")),
    );
  });

  it("lets an owner create their own doc with the default free plan", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      db.collection("users").doc("alice").set(validUser("alice")),
    );
  });

  it("blocks creating a doc with an escalated plan", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      db.collection("users").doc("alice").set(
        validUser("alice", {
          plan: {
            slug: "pro",
            status: "active",
            currentPeriodEnd: null,
            stripeCustomerId: null,
          },
        }),
      ),
    );
  });

  it("blocks creating a doc for someone else's uid", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      db.collection("users").doc("bob").set(validUser("bob")),
    );
  });

  it("blocks updating the plan field directly", async () => {
    const admin = testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
    );
    await admin;

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      db
        .collection("users")
        .doc("alice")
        .update({ "plan.slug": "pro" }),
    );
  });

  it("blocks changing referredByCode after creation", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("alice")
        .set(validUser("alice", { referredByCode: "K7XM4P2R" })),
    );

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      db
        .collection("users")
        .doc("alice")
        .update({ referredByCode: "OTHERCOD" }),
    );
  });

  it("lets an owner update their own profile fields", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
    );

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      db
        .collection("users")
        .doc("alice")
        .update({ "profile.niches": ["beaute", "mode"] }),
    );
  });

  it("blocks another signed-in user from reading someone else's doc", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
    );

    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(db.collection("users").doc("alice").get());
  });

  it("lets an owner delete their own doc (suppression RGPD), blocks others", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
    );

    const stranger = testEnv.authenticatedContext("bob").firestore();
    await assertFails(stranger.collection("users").doc("alice").delete());

    const owner = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(owner.collection("users").doc("alice").delete());
  });

  it("blocks all client access to the private subcollection, even for the owner", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("alice")
        .collection("private")
        .doc("secrets")
        .set({ apiKey: "shh" }),
    );

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      db
        .collection("users")
        .doc("alice")
        .collection("private")
        .doc("secrets")
        .get(),
    );
  });

  it("lets the owner read/write their watchlist, blocks other users", async () => {
    const ownerDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      ownerDb
        .collection("users")
        .doc("alice")
        .collection("watchlist")
        .doc("product-1")
        .set({ addedAt: new Date().toISOString(), status: "watching" }),
    );

    const otherDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      otherDb
        .collection("users")
        .doc("alice")
        .collection("watchlist")
        .doc("product-1")
        .get(),
    );
  });

  it("lets the owner get a document in their affiliate subcollection", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("alice")
        .collection("affiliate")
        .doc("profile")
        .set({ code: "K7XM4P2R" }),
    );

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      db
        .collection("users")
        .doc("alice")
        .collection("affiliate")
        .doc("profile")
        .get(),
    );
  });

  it("blocks create/update on affiliate but lets the owner delete it (suppression RGPD)", async () => {
    const owner = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      owner
        .collection("users")
        .doc("alice")
        .collection("affiliate")
        .doc("profile")
        .set({ code: "K7XM4P2R" }),
    );

    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("alice")
        .collection("affiliate")
        .doc("profile")
        .set({ code: "K7XM4P2R" }),
    );

    await assertFails(
      owner
        .collection("users")
        .doc("alice")
        .collection("affiliate")
        .doc("profile")
        .update({ code: "OTHERCOD" }),
    );

    await assertSucceeds(
      owner
        .collection("users")
        .doc("alice")
        .collection("affiliate")
        .doc("profile")
        .delete(),
    );
  });
});

describe("public read-only collections", () => {
  const collections = ["creators", "sounds", "feeds", "waves", "config", "briefCache"];

  for (const name of collections) {
    it(`${name}: signed-in read allowed, write always blocked`, async () => {
      await testEnv.withSecurityRulesDisabled((ctx) =>
        ctx.firestore().collection(name).doc("doc-1").set({ seed: true }),
      );

      const signedIn = testEnv.authenticatedContext("alice").firestore();
      await assertSucceeds(signedIn.collection(name).doc("doc-1").get());
      await assertFails(
        signedIn.collection(name).doc("doc-1").set({ seed: false }),
      );

      const anon = testEnv.unauthenticatedContext().firestore();
      await assertFails(anon.collection(name).doc("doc-1").get());
    });
  }
});

describe("catalogue (products, shops, rankings)", () => {
  // Le classement complet et les verdicts sont ce que le plan gratuit
  // offre : lecture ouverte à tout compte *connecté*. La règle avait été
  // ouverte aux anonymes pour un rendu statique au build, devenu inutile
  // quand les pages sont passées en chargement client derrière
  // <RequireAuth> — n'importe qui pouvait alors vider tout le catalogue
  // avec la configuration Firebase publique.
  const collections = ["products", "shops", "rankings"];

  for (const name of collections) {
    it(`${name}: lecture réservée aux comptes connectés, écriture à l'admin`, async () => {
      await testEnv.withSecurityRulesDisabled((ctx) =>
        ctx.firestore().collection(name).doc("doc-1").set({ seed: true }),
      );

      const anon = testEnv.unauthenticatedContext().firestore();
      await assertFails(anon.collection(name).doc("doc-1").get());
      await assertFails(anon.collection(name).doc("doc-1").set({ seed: false }));

      const signedIn = testEnv.authenticatedContext("alice").firestore();
      await assertSucceeds(signedIn.collection(name).doc("doc-1").get());
      await assertFails(
        signedIn.collection(name).doc("doc-1").set({ seed: false }),
      );

      await testEnv.withSecurityRulesDisabled((ctx) =>
        ctx.firestore().collection("users").doc("admin-uid").set(validUser("admin-uid", { role: "admin" })),
      );
      const admin = testEnv.authenticatedContext("admin-uid").firestore();
      await assertSucceeds(admin.collection(name).doc("doc-1").set({ seed: true }));
    });
  }
});

// L'unique capacité payante réellement appliquée côté serveur : tout le
// reste du paywall est du rendu client, donc contournable. L'historique
// des relevés est l'actif le plus long à reconstituer, c'est donc lui
// qu'on protège pour de vrai.
describe("historique des relevés — capacité payante", () => {
  async function seedSnapshot() {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("products")
        .doc("p1")
        .collection("snapshots")
        .doc("2026-08-05")
        .set({ productId: "p1", capturedDate: "2026-08-05" }),
    );
  }

  const snap = (db: FirebaseFirestore.Firestore | ReturnType<ReturnType<typeof testEnv.authenticatedContext>["firestore"]>) =>
    (db as ReturnType<ReturnType<typeof testEnv.authenticatedContext>["firestore"]>)
      .collection("products")
      .doc("p1")
      .collection("snapshots")
      .doc("2026-08-05");

  it("refuse un anonyme", async () => {
    await seedSnapshot();
    await assertFails(snap(testEnv.unauthenticatedContext().firestore()).get());
  });

  it("refuse un compte gratuit, même connecté", async () => {
    await seedSnapshot();
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("free-uid").set(validUser("free-uid")),
    );
    await assertFails(snap(testEnv.authenticatedContext("free-uid").firestore()).get());
  });

  it("autorise un abonnement Creator actif", async () => {
    await seedSnapshot();
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("paid-uid")
        .set(
          validUser("paid-uid", {
            plan: {
              slug: "creator",
              status: "active",
              currentPeriodEnd: null,
              stripeCustomerId: null,
            },
          }),
        ),
    );
    await assertSucceeds(snap(testEnv.authenticatedContext("paid-uid").firestore()).get());
  });

  // Le slug ne suffit pas : un abonnement impayé ne doit plus donner accès.
  it("refuse un abonnement Pro impayé", async () => {
    await seedSnapshot();
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("due-uid")
        .set(
          validUser("due-uid", {
            plan: {
              slug: "pro",
              status: "past_due",
              currentPeriodEnd: null,
              stripeCustomerId: null,
            },
          }),
        ),
    );
    await assertFails(snap(testEnv.authenticatedContext("due-uid").firestore()).get());
  });

  // Sans quoi le pipeline client, qui recalcule les verdicts, ne pourrait
  // plus lire les relevés.
  it("laisse passer l'admin", async () => {
    await seedSnapshot();
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("admin2").set(validUser("admin2", { role: "admin" })),
    );
    await assertSucceeds(snap(testEnv.authenticatedContext("admin2").firestore()).get());
  });

  it("n'autorise jamais l'écriture, même à un abonné", async () => {
    await seedSnapshot();
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("paid2")
        .set(
          validUser("paid2", {
            plan: { slug: "pro", status: "active", currentPeriodEnd: null, stripeCustomerId: null },
          }),
        ),
    );
    await assertFails(
      snap(testEnv.authenticatedContext("paid2").firestore()).set({ tampered: true }),
    );
  });
});

describe("config/complianceRules", () => {
  it("blocks a non-admin from writing, allows read", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      Promise.all([
        ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
        ctx.firestore().collection("config").doc("complianceRules").set({ rules: [] }),
      ]),
    );

    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(db.collection("config").doc("complianceRules").get());
    await assertFails(
      db.collection("config").doc("complianceRules").set({ rules: [{ id: "x" }] }),
    );
  });

  it("allows an admin to write", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("admin1")
        .set(validUser("admin1", { role: "admin" })),
    );

    const admin = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(
      admin.collection("config").doc("complianceRules").set({ rules: [] }),
    );
  });

  it("does not weaken the generic config/{docId} write:false for other docs", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("admin1")
        .set(validUser("admin1", { role: "admin" })),
    );

    const admin = testEnv.authenticatedContext("admin1").firestore();
    await assertFails(admin.collection("config").doc("costGuards").set({ dailyCapCents: 1 }));
  });
});

describe("affiliateReferrals", () => {
  it("lets referrer and referred read, blocks everyone else and all writes", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("affiliateReferrals")
        .doc("ref-1")
        .set({ referrerUid: "alice", referredUid: "bob" }),
    );

    const referrer = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      referrer.collection("affiliateReferrals").doc("ref-1").get(),
    );

    const stranger = testEnv.authenticatedContext("carol").firestore();
    await assertFails(
      stranger.collection("affiliateReferrals").doc("ref-1").get(),
    );
    await assertFails(
      referrer
        .collection("affiliateReferrals")
        .doc("ref-1")
        .update({ status: "converted" }),
    );
  });
});

function validCode(code: string, overrides: Record<string, unknown> = {}) {
  return {
    code,
    trialDays: 14,
    maxUses: 5,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: "admin-uid",
    ...overrides,
  };
}

describe("role & admin bootstrap", () => {
  it("blocks a normal user from self-promoting to admin", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
    );
    const db = testEnv.authenticatedContext("alice", {
      email: "alice@example.com",
    }).firestore();
    await assertFails(
      db.collection("users").doc("alice").update({ role: "admin" }),
    );
  });

  it("lets only the bootstrap email promote itself to admin", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("boss").set(validUser("boss")),
    );
    const db = testEnv.authenticatedContext("boss", {
      email: "contact.conforva@gmail.com",
    }).firestore();
    await assertSucceeds(
      db.collection("users").doc("boss").update({ role: "admin" }),
    );
  });

  it("lets an admin read any user's doc, blocks a normal user", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      Promise.all([
        ctx
          .firestore()
          .collection("users")
          .doc("admin1")
          .set(validUser("admin1", { role: "admin" })),
        ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
      ]),
    );

    const admin = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(admin.collection("users").doc("alice").get());

    const stranger = testEnv.authenticatedContext("bob").firestore();
    await assertFails(stranger.collection("users").doc("alice").get());
  });
});

describe("inviteCodes", () => {
  it("blocks a non-admin from creating a code, allows an admin", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("users")
        .doc("admin1")
        .set(validUser("admin1", { role: "admin" })),
    );

    const stranger = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      stranger.collection("inviteCodes").doc("AMIS").set(validCode("AMIS")),
    );

    const admin = testEnv.authenticatedContext("admin1").firestore();
    await assertSucceeds(
      admin.collection("inviteCodes").doc("AMIS").set(validCode("AMIS")),
    );
  });

  it("lets a signed-in user redeem a valid code (usedCount +1 only)", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("inviteCodes")
        .doc("AMIS")
        .set(validCode("AMIS")),
    );

    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(
      bob.collection("inviteCodes").doc("AMIS").update({ usedCount: 1 }),
    );
  });

  it("blocks redeeming an inactive or exhausted code", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      Promise.all([
        ctx
          .firestore()
          .collection("inviteCodes")
          .doc("DEAD")
          .set(validCode("DEAD", { active: false })),
        ctx
          .firestore()
          .collection("inviteCodes")
          .doc("FULL")
          .set(validCode("FULL", { usedCount: 5, maxUses: 5 })),
      ]),
    );

    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      bob.collection("inviteCodes").doc("DEAD").update({ usedCount: 1 }),
    );
    await assertFails(
      bob.collection("inviteCodes").doc("FULL").update({ usedCount: 6 }),
    );
  });

  it("blocks a redemption that also tampers with other fields", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx
        .firestore()
        .collection("inviteCodes")
        .doc("AMIS")
        .set(validCode("AMIS")),
    );

    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      bob
        .collection("inviteCodes")
        .doc("AMIS")
        .update({ usedCount: 1, maxUses: 999 }),
    );
  });

  it("grants a trial plan transition when redeeming, blocks arbitrary plan changes", async () => {
    await testEnv.withSecurityRulesDisabled((ctx) =>
      ctx.firestore().collection("users").doc("alice").set(validUser("alice")),
    );

    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      alice
        .collection("users")
        .doc("alice")
        .update({
          appliedInviteCode: "AMIS",
          plan: {
            slug: "pro",
            status: "active",
            currentPeriodEnd: new Date().toISOString(),
            stripeCustomerId: null,
          },
        }),
    );

    // Une deuxième tentative doit échouer : appliedInviteCode n'est plus null.
    await assertFails(
      alice
        .collection("users")
        .doc("alice")
        .update({
          appliedInviteCode: "AUTRE",
          plan: {
            slug: "pro",
            status: "active",
            currentPeriodEnd: new Date().toISOString(),
            stripeCustomerId: null,
          },
        }),
    );
  });
});
