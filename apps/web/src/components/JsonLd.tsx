import { PLANS } from "@kairos/shared";
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

export function WebSiteJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "fr-FR",
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
        areaServed: [
          { "@type": "Country", name: "France" },
          { "@type": "Country", name: "United States" },
          { "@type": "Country", name: "United Kingdom" },
          { "@type": "Country", name: "Germany" },
          { "@type": "Country", name: "Ireland" },
          { "@type": "Country", name: "Italy" },
          { "@type": "Country", name: "Spain" },
          { "@type": "Country", name: "Austria" },
          { "@type": "Country", name: "Belgium" },
          { "@type": "Country", name: "Netherlands" },
          { "@type": "Country", name: "Poland" },
        ],
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
        // Les offres sont **dérivées du catalogue**, jamais recopiées : un
        // tarif annoncé à Google et différent de celui facturé est une
        // donnée structurée fausse, sanctionnée — et à raison. Un plan sans
        // `priceCents` n'apparaît pas du tout, plutôt que d'apparaître à un
        // prix inventé.
        offers: PLANS.filter((plan) => plan.priceCents !== null).map((plan) => ({
          "@type": "Offer",
          price: (plan.priceCents! / 100).toFixed(2),
          priceCurrency: "EUR",
          name: plan.name,
          description: plan.highlight,
        })),
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; path: string }>;
}) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: `${SITE_URL}${item.path}`,
        })),
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
