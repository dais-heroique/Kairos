import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo/site";

// Données structurées schema.org. Ce n'est pas de la décoration : la FAQ
// de la page d'accueil peut apparaître dépliée directement dans les
// résultats Google, ce qui prend plus de place que le concurrent d'à côté
// pour exactement zéro euro.
//
// Rendu côté serveur au build (le composant n'est pas "use client") et
// injecté en <script type="application/ld+json">, la seule forme que
// Google lit de façon fiable.

interface FaqEntry {
  question: string;
  answer: string;
}

function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Le contenu vient de nos propres fichiers de traduction, jamais
      // d'une saisie utilisateur. On échappe tout de même `<` pour qu'une
      // chaîne ne puisse pas refermer la balise script.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.svg`,
        description: SITE_DESCRIPTION,
        areaServed: { "@type": "Country", name: "France" },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        slogan: SITE_TAGLINE,
        inLanguage: "fr-FR",
        // Un seul prix déclaré : celui du plan gratuit, le seul qui existe
        // réellement aujourd'hui. Annoncer un tarif Creator/Pro que
        // personne ne peut encore payer serait une donnée structurée
        // fausse — Google sanctionne, et c'est mérité.
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          name: "Radar",
          description: "Classement complet, gains sur le top 10, watchlist illimitée.",
        },
      }}
    />
  );
}

export function FaqJsonLd({ entries }: { entries: FaqEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: entries.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: { "@type": "Answer", text: entry.answer },
        })),
      }}
    />
  );
}
