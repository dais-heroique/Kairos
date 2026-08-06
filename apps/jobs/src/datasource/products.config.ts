/**
 * CONFIGURATION DES PRODUITS À TRACKER
 *
 * Ajoute/modifie tes produits ici. Chaque produit doit avoir :
 * - id: identifiant unique (ex: "product-ergo-chair")
 * - queries: liste des mots-clés à chercher sur TikTok Shop
 * - name: nom du produit pour l'affichage
 *
 * Exemple :
 * {
 *   id: "mon-produit",
 *   name: "Mon Produit Awesome",
 *   queries: ["mon produit", "produit awesome"],
 * }
 */

export interface ProductConfig {
  id: string;
  name: string;
  queries: string[];
}

export const PRODUCTS_TO_TRACK: ProductConfig[] = [
  // ========== À REMPLIR : Ajoute tes produits ici ==========

  {
    id: "ergo-chair",
    name: "Ergonomic Chair",
    queries: ["ergonomic chair", "gaming chair", "office chair"],
  },

  {
    id: "wireless-headphones",
    name: "Wireless Headphones",
    queries: ["wireless headphones", "bluetooth headphones", "headphones"],
  },

  {
    id: "desk-lamp",
    name: "LED Desk Lamp",
    queries: ["desk lamp", "led lamp", "table lamp"],
  },

  // ========== Ajoute les tiens ci-dessous ==========
  // {
  //   id: "mon-produit",
  //   name: "Mon Produit",
  //   queries: ["query 1", "query 2"],
  // },
];

export function getProductsToTrack(): ProductConfig[] {
  return PRODUCTS_TO_TRACK.filter((p) => p.id && p.name && p.queries.length > 0);
}

export function getProductConfig(productId: string): ProductConfig | undefined {
  return PRODUCTS_TO_TRACK.find((p) => p.id === productId);
}
