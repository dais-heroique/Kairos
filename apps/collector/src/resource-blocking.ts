import type { Page, Route } from "playwright";

// Optimisation de coût légitime : bloquer les ressources non essentielles
// au rendu des données (images, polices, CSS, médias) avant de privilégier
// les endpoints JSON — facteur 5 sur la facture proxy (le proxy est
// généralement facturé au Mo transféré).
export const BLOCKED_RESOURCE_TYPES = new Set(["image", "font", "stylesheet", "media"]);

export function shouldBlockResource(resourceType: string): boolean {
  return BLOCKED_RESOURCE_TYPES.has(resourceType);
}

export async function blockNonEssentialResources(page: Page): Promise<void> {
  await page.route("**/*", (route: Route) => {
    if (shouldBlockResource(route.request().resourceType())) {
      return route.abort();
    }
    return route.continue();
  });
}
