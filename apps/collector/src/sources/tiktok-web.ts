import type { ProductSnapshot } from "@kairos/shared";
import type { CollectorSource } from "./types.js";

// Rendu de page via Playwright — dernier recours seulement (§6.4 n°8 : privilégier
// systématiquement les endpoints JSON, bloquer images/polices/CSS/médias).
// Implémenté en Phase 3.
export const tiktokWebSource: CollectorSource = {
  name: "tiktok-web",
  async fetchProductSnapshot(_productExternalId: string): Promise<ProductSnapshot> {
    throw new Error("tiktokWebSource: not implemented — Phase 3");
  },
};
