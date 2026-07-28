import { getRequestConfig } from "next-intl/server";

// V1 = marché FR uniquement, une seule locale. Pas de préfixe /fr/ dans les
// URLs (pas de middleware next-intl) — on garde la structure prête pour une
// éventuelle extension multi-marché sans réécrire les pages.
export default getRequestConfig(async () => {
  const locale = "fr";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
