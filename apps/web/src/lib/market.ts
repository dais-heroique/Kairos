import type { Market, User } from "@kairos/shared";

/**
 * Marché de lecture par défaut pour les écrans qui ne proposent qu'un
 * classement à la fois. Les anciens comptes restent sur la France ; les
 * nouveaux comptes utilisent leur premier marché sélectionné.
 */
export function primaryMarketOf(user: Pick<User, "profile"> | null | undefined): Market {
  return user?.profile.markets[0] ?? "FR";
}

export const MARKET_LABELS: Record<Market, string> = {
  FR: "France",
  US: "États-Unis",
  UK: "Royaume-Uni",
  DE: "Allemagne",
  IE: "Irlande",
  IT: "Italie",
  ES: "Espagne",
  AT: "Autriche",
  BE: "Belgique",
  NL: "Pays-Bas",
  PL: "Pologne",
};

export const MARKET_CODES: Market[] = Object.keys(MARKET_LABELS) as Market[];
