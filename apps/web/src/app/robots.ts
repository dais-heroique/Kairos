import type { MetadataRoute } from "next";
import { PRIVATE_PATH_PREFIXES, SITE_URL } from "@/lib/seo/site";

// Généré au build, donc un fichier statique dans la sortie — aucune Cloud
// Function, le plan Spark reste intact.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Interdire l'exploration de ce qui est derrière authentification :
      // un crawler n'y verrait qu'un écran de connexion, et chaque page
      // vide explorée est du budget d'exploration perdu pour les pages
      // qui ont réellement du contenu.
      // Sans slash final : « Disallow: /produit/ » ne couvre pas
      // « /produit?id=xxx », dont le chemin est exactement « /produit ».
      // Or c'est justement la forme utilisée par les fiches produit et les
      // briefs (route fixe + query string, pour rester statique).
      disallow: PRIVATE_PATH_PREFIXES,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
