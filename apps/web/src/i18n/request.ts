import { getRequestConfig } from "next-intl/server";

// L’export reste sans préfixe de locale dans les URLs. Le français sert de
// contenu initial statique ; LanguageProvider détecte ensuite la langue du
// navigateur côté client et permet un choix manuel mémorisé, sans middleware
// dynamique ni route serveur.
export default getRequestConfig(async () => {
  const locale = "fr";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
