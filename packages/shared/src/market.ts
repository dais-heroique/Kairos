import { z } from "zod";

// V1 = marché FR uniquement. US/UK apparaissent en lecture seule pour le
// module Vagues (produits qui explosent ailleurs, pas encore vendus en FR).
export const MARKETS = ["FR", "US", "UK"] as const;
export const marketSchema = z.enum(MARKETS);
export type Market = z.infer<typeof marketSchema>;

export const PRIMARY_MARKET: Market = "FR";
