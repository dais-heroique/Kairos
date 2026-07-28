import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";

// Appel direct d'endpoints JSON (pas de rendu de page) — source à privilégier,
// c'est le facteur 5 sur la facture proxy (§6.4 n°8). Implémenté en Phase 3.
export const tiktokApiSource: CollectorSource = {
  name: "tiktok-api",
  async fetchProductSnapshot(_productExternalId: string): Promise<ProductSnapshot> {
    throw new Error("tiktokApiSource: not implemented — Phase 3");
  },
};
