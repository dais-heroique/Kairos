"use client";

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { userDocRef } from "@/lib/firestore/user";

// Briefs débloqués — le quota du plan gratuit.
//
// Un document par produit dans `users/{uid}/briefs/{productId}`, créé au
// premier affichage. Deux propriétés en découlent, et ce sont les deux qui
// comptent :
//
//  - **Revoir un brief déjà ouvert ne consomme rien.** Le document existe
//    déjà, donc on ne recompte pas. Un quota qui se viderait à chaque
//    rechargement de page serait perçu comme une arnaque, à juste titre.
//  - **Le compteur ne peut pas être remis à zéro.** Les règles Firestore
//    autorisent la création et interdisent la suppression : ce quota-là est
//    réellement appliqué côté serveur, contrairement au reste du plan
//    gratuit qui est du rendu client assumé.

export interface UnlockedBrief {
  productId: string;
  unlockedAt: string;
}

export async function listUnlockedBriefs(uid: string): Promise<UnlockedBrief[]> {
  const snap = await getDocs(collection(userDocRef(uid), "briefs"));
  return snap.docs.map((d) => ({
    productId: d.id,
    unlockedAt: (d.data().unlockedAt as string | undefined) ?? "",
  }));
}

export async function hasUnlockedBrief(uid: string, productId: string): Promise<boolean> {
  return (await getDoc(doc(collection(userDocRef(uid), "briefs"), productId))).exists();
}

/**
 * Consomme un brief gratuit pour ce produit.
 *
 * Idempotent : si le document existe déjà, la règle Firestore refuse
 * l'écriture (`update` interdit) et on retombe silencieusement — l'appelant
 * a de toute façon vérifié avant. Ne jamais faire dépendre l'affichage du
 * succès de cet appel : un brief refusé à quelqu'un qui y a droit est bien
 * pire qu'un brief offert deux fois.
 */
export async function unlockBrief(uid: string, productId: string): Promise<void> {
  try {
    await setDoc(doc(collection(userDocRef(uid), "briefs"), productId), {
      unlockedAt: new Date().toISOString(),
    });
  } catch {
    // Déjà débloqué, ou écriture refusée : sans conséquence sur l'affichage.
  }
}
