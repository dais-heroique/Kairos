// Les visuels du CDN TikTok sont servis en pleine résolution : les URL
// collectées portent un gabarit `~tplv-<id>-<transfo>:3000:3000.webp`, soit
// ~150 Ko par image pour une vignette affichée à 56 px. Sur une page de 90
// produits, cela représente ~14 Mo et plusieurs secondes d'attente pendant
// lesquelles la liste paraît vide.
//
// Le gabarit accepte n'importe quelles dimensions : réécrire 3000:3000 en
// 200:200 fait tomber l'image à ~4 Ko (mesuré : 154 634 → 3 852 octets,
// facteur 40) sans perte visible à cette taille.
//
// Réécriture faite à l'affichage et non au stockage : les URL déjà en base
// en bénéficient sans recollecte, et changer la taille cible ne demande pas
// de repasser le pipeline.
const TIKTOK_SIZE_TEMPLATE = /(tplv-[a-z0-9]+-[a-z-]+):\d+:\d+/i;

/**
 * Demande au CDN une variante à `size` pixels quand l'URL le permet.
 * Renvoie l'URL inchangée si elle ne porte pas de gabarit reconnu — aucune
 * URL n'est cassée par cette fonction.
 */
export function productImageUrl(url: string | null, size = 200): string | null {
  if (!url) return null;
  if (!TIKTOK_SIZE_TEMPLATE.test(url)) return url;
  return url.replace(TIKTOK_SIZE_TEMPLATE, `$1:${size}:${size}`);
}
