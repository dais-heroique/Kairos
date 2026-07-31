"use client";

import { deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { collection } from "firebase/firestore";
import type { WatchlistEntry, WatchlistStatus } from "@kairos/shared";
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

// Le pipeline complet (§ Lot 4/8) : la page watchlist affiche le statut de
// chaque entrée et le Sample Radar (Lot 8) le fait avancer en 1 tap.
export async function getWatchlistEntries(uid: string): Promise<WatchlistEntry[]> {
  const snap = await getDocs(collection(userDocRef(uid), "watchlist"));
  return snap.docs.map((d) => d.data() as WatchlistEntry);
}

export async function updateWatchlistStatus(
  uid: string,
  productId: string,
  status: WatchlistStatus,
): Promise<void> {
  await setDoc(watchlistDocRef(uid, productId), { status }, { merge: true });
}
