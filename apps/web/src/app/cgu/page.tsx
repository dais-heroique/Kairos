import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "CGU & CGV — KAIROS" };

export default function CguPage() {
  return (
    <LegalPage
      title="Conditions générales d'utilisation et de vente"
      updatedAt="26 juillet 2026"
    >
      <p>
        <em>
          Modèle à faire valider par un professionnel du droit avant mise en
          production.
        </em>
      </p>

      <h2>Objet</h2>
      <p>
        KAIROS est un service d&apos;aide à la décision pour créateurs
        affiliés et petits vendeurs TikTok Shop en France&nbsp;: classements,
        verdicts, simulateur de gains, briefs créatifs. KAIROS n&apos;est ni
        affilié à TikTok, ni un intermédiaire de vente.
      </p>

      <h2>Compte et accès</h2>
      <p>
        L&apos;accès nécessite un compte (email, Google ou Apple). Tu es
        responsable de la confidentialité de tes moyens de connexion.
      </p>

      <h2>Plans et paiement</h2>
      <p>
        KAIROS propose un plan gratuit (Radar) et des plans payants (Creator,
        Pro) facturés mensuellement ou annuellement via Stripe. Les prix en
        vigueur sont affichés sur la page tarifs. Le paiement est exigible
        d&apos;avance&nbsp;; le renouvellement est automatique sauf
        résiliation avant la fin de la période en cours, depuis le portail
        client Stripe.
      </p>

      <h2>Estimations et absence de garantie</h2>
      <p>
        Les estimations affichées (ventes, gains, saturation, fiabilité
        vendeur) sont calculées à partir de données publiques et de modèles
        statistiques. Elles sont fournies à titre indicatif, toujours
        accompagnées d&apos;une fourchette et d&apos;un niveau de confiance,
        et ne constituent ni un conseil financier ni une garantie de
        résultat. Elles ne doivent pas être utilisées pour un calcul de
        commission ou de règlement.
      </p>

      <h2>Programme d&apos;affiliation</h2>
      <p>
        L&apos;utilisation du programme d&apos;affiliation est soumise à des
        conditions spécifiques (taux de commission, durée, anti-fraude,
        interdiction d&apos;auto-parrainage) détaillées dans le tableau de
        bord d&apos;affiliation.
      </p>

      <h2>Résiliation</h2>
      <p>
        Tu peux résilier ton abonnement à tout moment depuis le portail
        client Stripe, ou supprimer ton compte depuis la page{" "}
        <a href="/compte" className="underline">
          Ton compte
        </a>
        . Voir aussi le droit de rétractation applicable aux nouveaux
        abonnés.
      </p>

      <h2>Droit applicable</h2>
      <p>Droit français. Tribunaux compétents&nbsp;: [ville du siège social].</p>
    </LegalPage>
  );
}
