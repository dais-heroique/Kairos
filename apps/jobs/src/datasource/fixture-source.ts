import type { ProductSnapshot } from "@kairos/shared";
import type { SnapshotSource } from "./types.js";

// Double de test en mémoire — remplace BigQuery dans pipeline.test.ts pour
// pouvoir vérifier le pipeline complet contre l'émulateur Firestore réel
// sans dépendre d'un projet BigQuery.
export class FixtureSnapshotSource implements SnapshotSource {
  constructor(private readonly data: Record<string, ProductSnapshot[]>) {}

  async listActiveProductIds(): Promise<string[]> {
    return Object.keys(this.data);
  }

  async getSnapshotSeries(productId: string, days: number): Promise<ProductSnapshot[]> {
    const series = this.data[productId] ?? [];
    return series.slice(-days);
  }
}
