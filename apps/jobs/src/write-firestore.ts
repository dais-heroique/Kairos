import type { Firestore, WriteBatch } from "firebase-admin/firestore";
import type { FeedDoc, ProductRanks, RankingDoc } from "@kairos/shared";
import type { ComputedProduct } from "./compute.js";

// Écritures Firestore en batch de 500 (limite Firestore elle-même) —
// jamais document par document.
const BATCH_SIZE = 500;

async function commitInBatches(db: Firestore, ops: Array<(batch: WriteBatch) => void>): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + BATCH_SIZE)) op(batch);
    await batch.commit();
  }
}

// merge:true → idempotent : relancer le job le même jour réécrit les
// mêmes champs sans toucher au reste du document produit (title, image,
// commission déclarée manuellement, etc.).
export async function writeProductVerdicts(
  db: Firestore,
  computed: ComputedProduct[],
  productRanks: Map<string, ProductRanks>,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would write ${computed.length} product verdict/estimate update(s)`);
    return;
  }
  const ops = computed.map(
    (c) => (batch: WriteBatch) => {
      batch.set(
        db.collection("products").doc(c.productId),
        {
          latestVerdict: c.verdict,
          latestEstimates: c.estimates,
          ranks: productRanks.get(c.productId) ?? {},
        },
        { merge: true },
      );
    },
  );
  await commitInBatches(db, ops);
}

// set() sans merge → idempotent par construction : l'ID de doc est
// déterministe (type_market_period_category), rejouer le job le même
// jour écrase simplement le même document avec le même contenu recalculé.
export async function writeRankingDocs(
  db: Firestore,
  docs: Map<string, RankingDoc>,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would write ${docs.size} ranking document(s)`);
    return;
  }
  const ops = [...docs.entries()].map(
    ([id, doc]) =>
      (batch: WriteBatch) => {
        batch.set(db.collection("rankings").doc(id), doc);
      },
  );
  await commitInBatches(db, ops);
}

export async function writeFeedDoc(
  db: Firestore,
  id: string,
  doc: FeedDoc,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] would write feed document ${id}`);
    return;
  }
  await db.collection("feeds").doc(id).set(doc);
}
