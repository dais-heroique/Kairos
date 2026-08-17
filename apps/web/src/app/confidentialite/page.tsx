import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Politique de confidentialité — KAIROS" };

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="17 août 2026">
      <p>
        <strong>Version de pré-lancement — à vérifier avant toute exploitation commerciale définitive.</strong>
        <br />
        Cette page décrit les traitements prévus par le site. Les prestataires effectivement activés, les durées exactes et les transferts éventuels doivent être confirmés avant la première vente.
      </p>

      <h2>Contact vie privée</h2>
      <p>
        Pour toute question relative à tes données ou pour exercer tes droits, écris à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>.
      </p>

      <h2>Données collectées</h2>
      <p>
        Le site peut traiter ton adresse email, les informations de profil créateur que tu renseignes, tes marchés et niches, les produits suivis, les briefs générés, les informations techniques nécessaires à la sécurité et les données liées à un abonnement lorsqu&apos;un paiement est activé.
      </p>

      <h2>Finalités et bases</h2>
      <p>
        Ces données servent à créer et sécuriser le compte, fournir les fonctionnalités demandées, enregistrer les préférences, gérer un abonnement lorsqu&apos;il existe, répondre aux demandes de support et respecter les obligations légales applicables. Les traitements fondés sur le consentement peuvent être retirés à tout moment.
      </p>

      <h2>Prestataires</h2>
      <p>
        Le fonctionnement peut utiliser Firebase / Google Cloud pour l&apos;authentification, l&apos;hébergement et la base de données, ainsi qu&apos;un prestataire de paiement tel que Stripe lorsque l&apos;abonnement est activé. D&apos;autres prestataires ne doivent être mentionnés ici qu&apos;après vérification de leur activation réelle et de leurs garanties de transfert.
      </p>

      <h2>Conservation</h2>
      <p>
        Les données du compte sont conservées pendant son utilisation puis supprimées ou anonymisées dans un délai raisonnable après sa fermeture, sous réserve des obligations légales de conservation. Les données de paiement ne sont pas stockées directement par le site lorsqu&apos;elles sont traitées par le prestataire de paiement.
      </p>

      <h2>Tes droits</h2>
      <p>
        Tu peux demander l&apos;accès, la rectification, l&apos;effacement, la portabilité ou la limitation de tes données, et t&apos;opposer à certains traitements. Écris à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>.
        Tu peux également saisir la CNIL si tu estimes que tes droits ne sont pas respectés.
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Le site peut utiliser des mécanismes techniques nécessaires à l&apos;authentification, au fonctionnement de la session et à la mémorisation de préférences. Les traceurs non nécessaires ne doivent être activés qu&apos;avec le consentement requis. Consulte la <a href="/cookies" className="underline">politique cookies</a> pour l&apos;inventaire à jour.
      </p>
    </LegalPage>
  );
}
