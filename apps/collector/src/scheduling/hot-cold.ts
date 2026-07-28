import type { Firestore } from "firebase-admin/firestore";
import type { Market, RankingDoc } from "@kairos/shared";

// Collecte à deux vitesses : produits "chauds" (dans un classement du jour
// ou dans au moins une watchlist) tous les jours, "froids" une fois par
// semaine seulement.
export function classifyHotCold(
  productIds: string[],
  hotIds: ReadonlySet<string>,
): { hot: string[]; cold: string[] } {
  const hot: string[] = [];
  const cold: string[] = [];
  for (const id of productIds) {
    (hotIds.has(id) ? hot : cold).push(id);
  }
  return { hot, cold };
}

// Un produit "froid" n'est réellement recollecté qu'une fois par semaine :
// on ancre le jour de collecte sur les 7 derniers caractères hexadécimaux
// de l'ID produit pour répartir la charge sur la semaine plutôt que de
// tout collecter le même jour.
export function isColdProductDueToday(productId: string, today: Date = new Date()): boolean {
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash * 31 + productId.charCodeAt(i)) >>> 0;
  }
  const assignedDayOfWeek = hash % 7;
  return today.getUTCDay() === assignedDayOfWeek;
}

// Implémentation réelle — dépend des documents rankings/* écrits par le
// Lot 3 et des watchlists utilisateur. Non unitairement testée ici (pure
// plomberie Firestore) : sa valeur ne sera vérifiable qu'une fois le Lot 3
// en place et alimentant de vrais documents rankings/*.
export async function fetchHotProductIds(db: Firestore, market: Market): Promise<Set<string>> {
  const hotIds = new Set<string>();

  const rankingsSnap = await db.collection("rankings").where("market", "==", market).get();
  for (const doc of rankingsSnap.docs) {
    const ranking = doc.data() as RankingDoc;
    for (const item of ranking.items) hotIds.add(item.id);
  }

  const watchlistSnap = await db.collectionGroup("watchlist").get();
  for (const doc of watchlistSnap.docs) hotIds.add(doc.id);

  return hotIds;
}
