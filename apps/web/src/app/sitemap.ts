import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-static";

// Ne liste que les pages publiques (voir PUBLIC_ROUTES) : soumettre à
// Google des URL qui redirigent vers /connexion fait chuter la confiance
// accordée au sitemap entier.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
