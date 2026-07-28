import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { createReadCounter } from "./read-counter";
import { getRankingPageData } from "./rankings";
import { getProductDetail } from "./products";

// Garde-fou anti-N+1 (règle invariante #6 : "aucune liste sans document
// pré-calculé") — une page ne doit jamais dépasser 5 opérations Firestore
// quelle que soit la taille du classement affiché.
const MAX_READS_PER_PAGE = 5;

let app: App;
let db: Firestore;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "read-budget.test.ts requires the Firestore emulator — run via `pnpm test:web-integration`, not plain `pnpm test`",
    );
  }
  app = getApps().length === 0 ? initializeApp({ projectId: "kairos-web-test" }) : getApps()[0]!;
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
  await Promise.all(["rankings", "shops", "products"].map(clearCollection));
});

describe("getRankingPageData — Firestore read budget", () => {
  it("stays within budget for a 100-item ranking with 40 distinct shops", async () => {
    const shopIds = Array.from({ length: 40 }, (_, i) => `shop-${i}`);
    await Promise.all(
      shopIds.map((id) => db.collection("shops").doc(id).set({ name: `Boutique ${id}` })),
    );

    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `p${i}`,
      rank: i + 1,
      title: `Produit ${i}`,
      priceCents: 1000 + i,
      shopId: shopIds[i % shopIds.length],
      commissionRatePct: 10,
      verdict: "entrer_maintenant",
      salesTrend: "up",
    }));
    await db
      .collection("rankings")
      .doc("products_FR_7d_all")
      .set({
        generatedAt: new Date().toISOString(),
        type: "products",
        market: "FR",
        period: "7d",
        category: null,
        items,
      });

    const counter = createReadCounter();
    const { items: pageItems } = await getRankingPageData("products", "FR", "7d", null, counter);

    expect(pageItems.length).toBe(100);
    expect(pageItems[0]!.shopName).toBe("Boutique shop-0");
    expect(counter.count).toBeLessThanOrEqual(MAX_READS_PER_PAGE);
  });

  it("stays within budget when the ranking document does not exist yet", async () => {
    const counter = createReadCounter();
    const { items } = await getRankingPageData("creators", "FR", "24h", null, counter);

    expect(items).toEqual([]);
    expect(counter.count).toBeLessThanOrEqual(MAX_READS_PER_PAGE);
  });
});

describe("getProductDetail — Firestore read budget", () => {
  it("stays within budget for a product detail page", async () => {
    await db.collection("shops").doc("shop-1").set({ name: "Ma Boutique" });
    await db.collection("products").doc("p1").set({ title: "Produit test", shopId: "shop-1" });

    const counter = createReadCounter();
    const { product, shop } = await getProductDetail("p1", counter);

    expect(product?.title).toBe("Produit test");
    expect(shop?.name).toBe("Ma Boutique");
    expect(counter.count).toBeLessThanOrEqual(MAX_READS_PER_PAGE);
  });
});
