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
  const collections = [
    "products",
    "creators",
    "shops",
    "sounds",
    "rankings",
    "feeds",
    "waves",
    "config",
    "briefCache",
  ];

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
