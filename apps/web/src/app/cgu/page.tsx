import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Conditions d’utilisation et de vente — KAIROS" };

export default function CguPage() {
  return (
    <LegalPage
      title="Conditions générales d’utilisation et de vente"
      updatedAt="17 août 2026"
    >
      <p>
        <strong>Version de pré-lancement — à faire relire avant toute première vente.</strong>
        <br />
        Les informations d&apos;identification, de facturation, de TVA et de médiation seront complétées avant l&apos;ouverture commerciale définitive.
      </p>

      <h2>Objet du service</h2>
      <p>
        Le service propose aux créateurs des outils d&apos;observation, de classement, de simulation et de préparation de contenus pour TikTok Shop. Il n&apos;est ni affilié à TikTok, ni un intermédiaire de vente des produits présentés.
      </p>

      <h2>Compte et accès</h2>
      <p>
        L&apos;accès nécessite un compte. Tu es responsable de la confidentialité de tes moyens de connexion et de l&apos;exactitude des informations fournies. Toute utilisation abusive, automatisée ou destinée à contourner les limitations du service peut entraîner une suspension.
      </p>

      <h2>Plans et paiement</h2>
      <p>
        Le service peut proposer un accès gratuit et des plans payants, selon les offres affichées sur la page tarifs. Les prix, la périodicité, les modalités de renouvellement et les fonctionnalités incluses sont présentés avant le paiement. Le paiement peut être traité par Stripe. Les documents de facturation et le régime de TVA applicables seront finalisés avant la première vente commerciale.
      </p>

      <h2>Estimations et absence de garantie</h2>
      <p>
        Les estimations de ventes, de gains, de saturation et de fiabilité sont indicatives. Elles peuvent dépendre de données déclarées, publiques ou modélisées. Elles ne constituent ni un conseil financier, ni une garantie de résultat, ni une promesse de commission ou de revenu.
      </p>

      <h2>Affiliation</h2>
      <p>
        Le programme d&apos;affiliation, lorsqu&apos;il est activé, est soumis à des conditions spécifiques concernant l&apos;attribution, la fraude, l&apos;auto-parrainage, la vérification d&apos;identité et les paiements. Les modalités effectivement disponibles sont celles affichées dans l&apos;espace concerné.
      </p>

      <h2>Résiliation</h2>
      <p>
        Lorsque le paiement récurrent est activé, la résiliation peut être effectuée depuis l&apos;espace de gestion du paiement indiqué dans le compte. Pour toute demande d&apos;assistance, écris à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>.
      </p>

      <h2>Droit de rétractation</h2>
      <p>
        Les modalités applicables au droit de rétractation et à la fourniture immédiate d&apos;un service numérique sont présentées sur la page <a href="/retractation" className="underline">Droit de rétractation</a>. Elles doivent être validées avant l&apos;activation des ventes.
      </p>

      <h2>Réclamation et médiation</h2>
      <p>
        Toute réclamation peut être adressée à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>.
        Le médiateur de la consommation compétent et ses coordonnées seront ajoutés avant toute vente à des consommateurs.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Le droit applicable et les règles de compétence seront précisés dans la version commerciale définitive, sous réserve des dispositions impératives protégeant les consommateurs.
      </p>
    </LegalPage>
  );
}
