import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Cookies et traceurs — KAIROS" };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies et traceurs" updatedAt="17 août 2026">
      <p>
        <strong>
          Version de pré-lancement — à faire valider et à actualiser après l’inventaire des outils réellement activés en production.
        </strong>
      </p>

      <h2>Ce que Kairos utilise actuellement</h2>
      <p>
        Kairos utilise des mécanismes techniques nécessaires au fonctionnement
        du service, notamment la session d’authentification Firebase et le
        stockage local de certaines préférences, comme l’adresse utilisée pour
        finaliser une connexion par lien magique et la langue choisie.
      </p>

      <h2>Pas de traceur publicitaire déclaré</h2>
      <p>
        Kairos ne doit pas activer de publicité personnalisée, de pixel
        marketing ou de mesure d’audience non nécessaire sans avoir d’abord
        informé l’utilisateur et recueilli le consentement requis. Les outils
        réellement activés doivent être comparés à cette page avant chaque mise
        en production.
      </p>

      <h2>Consentement</h2>
      <p>
        Si un outil soumis au consentement est ajouté, le site devra permettre
        d’accepter, de refuser et de retirer le consentement avec la même
        simplicité. L’acceptation des CGU ne remplace pas un consentement
        cookies.
      </p>

      <h2>Gérer une demande</h2>
      <p>
        Pour toute question sur les traceurs ou pour exercer un droit, écris à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>.
        La politique de confidentialité décrit les autres traitements de données et les droits applicables.
      </p>

      <h2>Documents associés</h2>
      <p>
        Consulte la{" "}
        <a href="/confidentialite" className="underline">
          politique de confidentialité
        </a>{" "}
        et les{" "}
        <a href="/mentions-legales" className="underline">
          mentions légales
        </a>
        .
      </p>
    </LegalPage>
  );
}
