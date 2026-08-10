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

/** Levée quand le plan gratuit a atteint sa limite de produits suivis. */
export class WatchlistFullError extends Error {
  constructor(public readonly limit: number) {
    super(`Le plan gratuit suit ${limit} produits à la fois.`);
  }
}

/**
 * Ajoute un produit à la liste de suivi.
 *
 * `limit` non défini = aucune limite (plan payant). Le contrôle est côté
 * client, et c'est assumé : une entrée de watchlist n'est qu'un pointeur
 * vers un produit que l'utilisateur voit déjà gratuitement dans le
 * classement. Ce qui est réellement protégé côté serveur, ce sont les
 * données qui ne se reconstituent pas — l'historique des relevés et
 * l'archive des classements. Prétendre verrouiller le reste serait de la
 * sécurité de façade.
 */
export async function addToWatchlist(
  uid: string,
  productId: string,
  limit?: number,
): Promise<void> {
  if (limit !== undefined) {
    const existants = await getWatchlistIds(uid);
    // Un produit déjà suivi ne consomme pas une place de plus.
    if (!existants.has(productId) && existants.size >= limit) {
      throw new WatchlistFullError(limit);
    }
  }

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
