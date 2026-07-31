"use client";

import { deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { collection } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { userDocRef } from "./user";

function watchlistDocRef(uid: string, productId: string) {
  return doc(collection(userDocRef(uid), "watchlist"), productId);
}

export async function getWatchlistIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(collection(userDocRef(uid), "watchlist"));
  return new Set(snap.docs.map((d) => d.id));
}

export async function addToWatchlist(uid: string, productId: string): Promise<void> {
  await setDoc(watchlistDocRef(uid, productId), {
    productId,
    addedAt: new Date().toISOString(),
    alertsEnabled: true,
    status: "watching",
  });
}

export async function removeFromWatchlist(uid: string, productId: string): Promise<void> {
  await deleteDoc(watchlistDocRef(uid, productId));
}
