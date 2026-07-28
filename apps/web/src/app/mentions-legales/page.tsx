import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Mentions légales — KAIROS" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="26 juillet 2026">
      <p>
        <em>
          Modèle à faire valider par un professionnel du droit avant mise en
          production — les champs entre crochets doivent être complétés avec
          les informations réelles de la société.
        </em>
      </p>

      <h2>Éditeur du site</h2>
      <p>
        Le site KAIROS est édité par [Nom légal de la société], [forme
        juridique, ex. SAS], au capital de [montant] €, immatriculée au
        Registre du Commerce et des Sociétés de [ville] sous le numéro
        [SIREN/SIRET], dont le siège social est situé [adresse complète].
        <br />
        Directeur de la publication&nbsp;: [nom, prénom].
        <br />
        Contact&nbsp;: [email de contact].
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Google LLC (Firebase Hosting), 1600
        Amphitheatre Parkway, Mountain View, CA 94043, États-Unis.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus du site (textes, visuels, logo,
        structure) est protégé par le droit de la propriété intellectuelle.
        Toute reproduction non autorisée est interdite.
      </p>

      <h2>Données publiques et estimations</h2>
      <p>
        KAIROS agrège et estime des données publiques relatives à des
        produits, boutiques et créateurs sur TikTok Shop. Ces estimations
        sont fournies à titre indicatif et ne sauraient engager la
        responsabilité de l&apos;éditeur — voir la page{" "}
        <a href="/confidentialite" className="underline">
          Politique de confidentialité
        </a>{" "}
        et les{" "}
        <a href="/cgu" className="underline">
          CGU/CGV
        </a>
        .
      </p>
    </LegalPage>
  );
}
