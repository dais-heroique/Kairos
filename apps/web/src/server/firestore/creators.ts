import type { Creator } from "@kairos/shared";
import { getAdminFirestore } from "../firebase-admin";
import type { ReadCounter } from "./read-counter";

// 1 opération Firestore.
export async function getCreatorDetail(
  creatorId: string,
  counter?: ReadCounter,
): Promise<Creator | null> {
  const db = getAdminFirestore();
  const snap = await db.collection("creators").doc(creatorId).get();
  counter?.increment();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Creator;
}
