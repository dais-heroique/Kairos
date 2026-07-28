import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";

// Sources tierces complémentaires (ex. APIs de vérification vendeur).
// Implémenté en Phase 3.
export const thirdpartySource: CollectorSource = {
  name: "thirdparty",
  async fetchProductSnapshot(_productExternalId: string): Promise<ProductSnapshot> {
    throw new Error("thirdpartySource: not implemented — Phase 3");
  },
};
