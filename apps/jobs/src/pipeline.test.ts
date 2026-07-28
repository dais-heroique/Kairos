import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { BigQuery } from "@google-cloud/bigquery";
import { RANKING_TYPES } from "@kairos/shared";
import type { ProductSnapshot } from "@kairos/shared";
import { FixtureSnapshotSource } from "./datasource/fixture-source.js";
import { runDailyPipeline } from "./pipeline.js";

// Vérifie le pipeline complet de bout en bout contre un vrai émulateur
// Firestore — voir docs/STATE.md pour la commande d'exécution
// (`pnpm test:jobs-integration`, requiert l'émulateur). BigQuery est
// mocké (verdict_history uniquement) : FixtureSnapshotSource remplace
// entièrement la lecture BigQuery côté données produit.

function makeSnapshot(
  productId: string,
  capturedDate: string,
  overrides: Partial<ProductSnapshot> = {},
): ProductSnapshot {
  return {
    productId,
    capturedDate,
    priceCents: 1999,
    reviewCount: 20,
    ratingAvg: 4.5,
    activeCreatorCount: 8,
    videoCount: 15,
    competingShopCount: 3,
    estSalesLow: 100,
    estSalesHigh: 150,
    confidence: 0.7,
    ...overrides,
  };
}

function makeFakeBigQuery(): BigQuery {
  const query = vi.fn().mockResolvedValue([[]]);
  const insert = vi.fn().mockResolvedValue(undefined);
  const table = vi.fn().mockReturnValue({ insert });
  const dataset = vi.fn().mockReturnValue({ table });
  return { query, dataset } as unknown as BigQuery;
}

let app: App;
let db: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "pipeline.test.ts requires the Firestore emulator — run via `pnpm test:jobs-integration`, not plain `pnpm test`",
    );
  }
  app = getApps().length === 0 ? initializeApp({ projectId: "kairos-jobs-test" }) : getApps()[0]!;
  db = getFirestore(app);
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

async function clearCollection(name: string): Promise<void> {
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

beforeEach(async () => {
  await Promise.all(["products", "rankings", "feeds"].map(clearCollection));
});

describe("daily pipeline (Firestore emulator)", () => {
  it("writes latestVerdict/latestEstimates/ranks for every active product", async () => {
    const source = new FixtureSnapshotSource({
      p1: Array.from({ length: 20 }, (_, i) =>
        makeSnapshot("p1", `2026-07-${String(i + 1).padStart(2, "0")}`, {
          estSalesLow: 50 + i * 5,
          estSalesHigh: 70 + i * 6,
        }),
      ),
      p2: Array.from({ length: 20 }, (_, i) =>
        makeSnapshot("p2", `2026-07-${String(i + 1).padStart(2, "0")}`, {
          estSalesLow: 500 - i * 5,
          estSalesHigh: 600 - i * 5,
        }),
      ),
    });

    const result = await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });
    expect(result.productCount).toBe(2);

    const p1Doc = await db.collection("products").doc("p1").get();
    expect(p1Doc.exists).toBe(true);
    expect(p1Doc.data()?.latestVerdict).toBeDefined();
    expect(p1Doc.data()?.latestEstimates).toBeDefined();
    expect(p1Doc.data()?.ranks).toBeDefined();
  });

  it("writes all 9 ranking documents for every period, each capped at 100 items", async () => {
    const source = new FixtureSnapshotSource({ p1: [makeSnapshot("p1", "2026-07-28")] });
    await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });

    for (const period of ["24h", "7d", "30d"] as const) {
      for (const type of RANKING_TYPES) {
        const doc = await db.collection("rankings").doc(`${type}_FR_${period}_all`).get();
        expect(doc.exists).toBe(true);
        expect((doc.data()?.items as unknown[]).length).toBeLessThanOrEqual(100);
      }
    }
  });

  it("writes a feed document", async () => {
    const source = new FixtureSnapshotSource({ p1: [makeSnapshot("p1", "2026-07-28")] });
    await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });

    const feedDoc = await db.collection("feeds").doc("FR_all_2026-07-28").get();
    expect(feedDoc.exists).toBe(true);
  });

  it("writes an explicit insufficient_data verdict instead of nothing when history is empty", async () => {
    const source = new FixtureSnapshotSource({ "brand-new": [] });
    await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });

    const doc = await db.collection("products").doc("brand-new").get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.latestEstimates.method).toBe("insufficient_data");
  });

  it("is idempotent — rerunning the same day recomputes the same values", async () => {
    const source = new FixtureSnapshotSource({
      p1: Array.from({ length: 10 }, (_, i) =>
        makeSnapshot("p1", `2026-07-${String(i + 1).padStart(2, "0")}`),
      ),
    });

    await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });
    const first = (await db.collection("products").doc("p1").get()).data();

    await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });
    const second = (await db.collection("products").doc("p1").get()).data();

    // computedAt est un timestamp généré à chaque calcul, donc il diffère
    // volontairement — c'est le reste (verdict, scores, estimations) qui
    // doit être identique d'un run à l'autre pour la même journée/données.
    expect(second?.latestVerdict.verdict).toBe(first?.latestVerdict.verdict);
    expect(second?.latestVerdict.saturationScore).toBe(first?.latestVerdict.saturationScore);
    expect(second?.latestEstimates).toEqual(first?.latestEstimates);

    const rankingsAfterSecond = (await db.collection("rankings").get()).size;
    await runDailyPipeline(source, db, makeFakeBigQuery(), { today: "2026-07-28" });
    const rankingsAfterThird = (await db.collection("rankings").get()).size;
    expect(rankingsAfterThird).toBe(rankingsAfterSecond);
  });

  it("--dry-run performs zero Firestore writes", async () => {
    const source = new FixtureSnapshotSource({
      "dry-run-product": [makeSnapshot("dry-run-product", "2026-07-28")],
    });

    await runDailyPipeline(source, db, makeFakeBigQuery(), {
      today: "2026-07-28",
      dryRun: true,
    });

    const productDoc = await db.collection("products").doc("dry-run-product").get();
    expect(productDoc.exists).toBe(false);
    const rankingDoc = await db.collection("rankings").doc("products_FR_7d_all").get();
    expect(rankingDoc.exists).toBe(false);
    const feedDoc = await db.collection("feeds").doc("FR_all_2026-07-28").get();
    expect(feedDoc.exists).toBe(false);
  });
});
