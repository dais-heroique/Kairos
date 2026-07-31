"use client";

import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { type User, userSchema } from "@kairos/shared";
import { firestore } from "@/lib/firebase/client";

// Accessible uniquement si les Firestore Rules autorisent isAdmin() —
// sinon la requête échoue en permission-denied.
export async function listAllUsers(): Promise<User[]> {
  const q = query(
    collection(firestore, "users"),
    orderBy("createdAt", "desc"),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => userSchema.parse(d.data()));
}
