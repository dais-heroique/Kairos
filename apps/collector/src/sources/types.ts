import type { ProductSnapshot } from "@kairos/shared";

// Interface commune à toutes les sources de collecte — voir Phase 3.
// Chaque implémentation (tiktok-web, tiktok-api, thirdparty) doit produire
// des ProductSnapshot, jamais écrire directement en base : le job appelant
// se charge de l'écriture BigQuery.
export interface CollectorSource {
  readonly name: string;
  fetchProductSnapshot(productExternalId: string): Promise<ProductSnapshot>;
}
