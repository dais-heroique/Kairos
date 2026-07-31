import type { ProductSnapshot } from "@kairos/shared";

// Interface swappable — implémentation réelle (BigQuery) vs double de test
// (fixtures en mémoire), pour pouvoir vérifier le pipeline complet contre
// l'émulateur Firestore sans dépendre de BigQuery dans les tests.
export interface SnapshotSource {
  listActiveProductIds(): Promise<string[]>;
  getSnapshotSeries(productId: string, days: number): Promise<ProductSnapshot[]>;
}
