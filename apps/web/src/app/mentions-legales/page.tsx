import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Mentions légales — KAIROS" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="17 août 2026">
      <p>
        <strong>Version de pré-lancement — à compléter avant la première vente commerciale.</strong>
        <br />
        Ce document ne constitue pas une déclaration d&apos;immatriculation et ne présente pas le site comme une société déjà créée.
      </p>

      <h2>Éditeur et contact</h2>
      <p>
        Le service est actuellement publié en phase de pré-lancement. Pour toute question, demande relative au compte, demande liée aux données personnelles ou réclamation, écris à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé au moyen de services Firebase / Google Cloud. Les informations détaillées concernant l&apos;hébergement, l&apos;identité de l&apos;éditeur et le cadre contractuel doivent être complétées avant l&apos;ouverture commerciale définitive.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les contenus, textes, visuels, éléments graphiques, logiciels et structure du site sont protégés par les règles applicables de propriété intellectuelle. Toute reproduction ou réutilisation non autorisée est interdite.
      </p>

      <h2>Données et estimations</h2>
      <p>
        Les informations présentées peuvent inclure des données déclarées, publiques ou estimées relatives à des produits et à des boutiques. Elles sont indicatives et ne constituent ni une garantie de résultat, ni un conseil financier, ni une donnée officielle de TikTok Shop.
      </p>

      <p>
        Consulte également la <a href="/confidentialite" className="underline">politique de confidentialité</a>, les <a href="/cookies" className="underline">informations cookies</a> et les <a href="/cgu" className="underline">conditions d&apos;utilisation et de vente</a>.
      </p>
    </LegalPage>
  );
}

// Version de pré-lancement : les informations d'identité, d'immatriculation,
// de direction de publication et de médiation doivent être ajoutées avant
// toute exploitation commerciale définitive.
