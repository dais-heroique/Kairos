import type { MetadataRoute } from "next";
import { PRIVATE_PATH_PREFIXES, SITE_URL } from "@/lib/seo/site";

// Généré au build, donc un fichier statique dans la sortie — aucune Cloud
// Function, le plan Spark reste intact.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const publicRule = {
    allow: "/",
    // Interdire l'exploration de ce qui est derrière authentification :
    // un crawler n'y verrait qu'un écran de connexion, et chaque page
    // vide explorée diluerait les pages réellement utiles.
    // Sans slash final : « Disallow: /produit/ » ne couvre pas
    // « /produit?id=xxx », dont le chemin est exactement « /produit ».
    disallow: PRIVATE_PATH_PREFIXES,
  };

  return {
    rules: [
      { userAgent: "*", ...publicRule },
      // OAI-SearchBot sert à faire apparaître les pages publiques dans les
      // résultats de recherche ChatGPT. Il reçoit les mêmes interdictions
      // que les autres robots : aucun espace authentifié n'est exposé.
      { userAgent: "OAI-SearchBot", ...publicRule },
      // GPTBot peut être autorisé séparément de la recherche. Le laisser
      // suivre les pages publiques est un choix explicite de découvrabilité.
      { userAgent: "GPTBot", ...publicRule },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
