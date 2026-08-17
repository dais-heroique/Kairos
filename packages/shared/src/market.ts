import { z } from "zod";

// Marchés TikTok Shop actuellement annoncés pour les vendeurs et créateurs.
// Les données Kairos ne sont disponibles que pour un marché lorsqu'un pipeline
// y a réellement écrit des relevés : ajouter un marché ici n'invente jamais
// son catalogue.
export const MARKETS = [
  "FR",
  "US",
  "UK",
  "DE",
  "IE",
  "IT",
  "ES",
  "AT",
  "BE",
  "NL",
  "PL",
] as const;
export const marketSchema = z.enum(MARKETS);
export type Market = z.infer<typeof marketSchema>;

export const PRIMARY_MARKET: Market = "FR";
