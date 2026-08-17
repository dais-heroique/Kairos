import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "CGU du programme d'affiliation — KAIROS" };

export default function CguAffiliationPage() {
  return (
    <LegalPage
      title="Conditions générales du programme d'affiliation"
      updatedAt="17 août 2026"
    >
      <p>
        <em>
          Modèle à faire valider par un professionnel du droit avant mise en
          production. Document distinct des CGU/CGV générales.
        </em>
      </p>

      <h2>Principe</h2>
      <p>
        Le programme partenaire fonctionne au moyen de codes et de liens
        créés par l&apos;owner de Kairos. Lorsqu&apos;un code est attribué à un
        partenaire, une commission de 30 % du montant réellement encaissé sur
        les abonnements attribués peut être comptabilisée selon les règles
        affichées dans l&apos;espace partenaire. Aucun palier Ambassadeur ni aucune
        commission sans limite de durée ne doit être annoncé tant qu&apos;il n&apos;est
        pas activé et documenté dans l&apos;application.
      </p>

      <h2>Attribution</h2>
      <p>
        L&apos;attribution se fait au premier clic (« first-touch ») dans
        les 90 jours précédant l&apos;inscription, selon le mécanisme technique
        effectivement activé par Kairos. Un code peut aussi être saisi
        manuellement jusqu&apos;à 7 jours après l&apos;inscription.
      </p>

      <h2>Rétention et paiement</h2>
      <p>
        Une commission reste en attente 30 jours avant de devenir payable,
        pour couvrir les remboursements éventuels. Le paiement n&apos;est
        déclenché qu&apos;à partir du seuil affiché dans l&apos;espace partenaire,
        après vérification des données de paiement et des obligations légales.
        Les virements sont effectués manuellement par Kairos ; Stripe Connect
        n&apos;est pas actuellement activé. Aucun paiement ne doit être promis à
        un bénéficiaire tant que son identité, ses coordonnées et son statut
        fiscal ne sont pas vérifiés.
      </p>

      <h2>Anti-fraude et remboursement</h2>
      <p>
        L&apos;auto-parrainage est strictement interdit et entraîne le rejet
        immédiat du parrainage. Toute commission liée à un abonnement
        remboursé ou contesté (chargeback) est reprise (« clawback »),
        déduite des commissions en attente ou payables, jamais de celles
        déjà versées.
      </p>

      <h2>Résiliation du programme</h2>
      <p>
        KAIROS peut suspendre ou clore le compte d&apos;affiliation d&apos;un
        utilisateur en cas de fraude avérée ou de non-respect de ces
        conditions.
      </p>
    </LegalPage>
  );
}
