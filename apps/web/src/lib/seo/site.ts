// Constantes de référencement, en un seul endroit : l'URL canonique se
// retrouve sinon recopiée dans le sitemap, les balises Open Graph, le
// robots.txt et les données structurées, avec la garantie qu'un jour l'une
// d'elles reste sur l'ancien domaine.
//
// Surchargeable par NEXT_PUBLIC_SITE_URL le jour où un nom de domaine
// propre remplace le sous-domaine Firebase — c'est d'ailleurs la première
// chose à faire pour le référencement, un `.web.app` n'inspirant ni
// confiance ni autorité.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kairos-on.web.app"
).replace(/\/$/, "");

export const SITE_NAME = "KAIROS";

export const SITE_TAGLINE = "Analyse le timing des produits TikTok Shop avant la saturation.";

export const SITE_DESCRIPTION =
  "KAIROS est un outil d'analyse TikTok Shop pour les créateurs et affiliés : " +
  "évalue le timing d'un produit, la concurrence, la saturation et un gain estimé " +
  "à partir de tes vues. Commence gratuitement, sans promesse de revenu garanti.";

/**
 * Pages réellement publiques. Tout le reste de l'app est derrière
 * `<RequireAuth>` : les y référencer enverrait Google sur un écran de
 * connexion, ce qui abîme le référencement plutôt que de l'aider.
 */
export const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/methode", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/tarifs", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/connexion", priority: 0.5, changeFrequency: "yearly" as const },
  { path: "/cgu", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/cgu-affiliation", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/retractation", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" as const },
];

/**
 * Chemins que les robots ne doivent pas explorer : ce sont des coquilles
 * vides pour un crawler (le contenu arrive après authentification), et
 * les laisser ouverts dilue le budget d'exploration sur des pages qui
 * n'afficheront jamais rien.
 */
export const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/brief",
  "/classements",
  "/compte",
  "/onboarding",
  "/produit",
  "/boutique",
  "/createur",
  "/simulateur",
  "/tableau-de-bord",
  "/watchlist",
];
