import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "CGU du programme d'affiliation — KAIROS" };

export default function CguAffiliationPage() {
  return (
    <LegalPage
      title="Conditions générales du programme d'affiliation"
      updatedAt="28 juillet 2026"
    >
      <p>
        <em>
          Modèle à faire valider par un professionnel du droit avant mise en
          production. Document distinct des CGU/CGV générales.
        </em>
      </p>

      <h2>Principe</h2>
      <p>
        Tout utilisateur peut parrainer d&apos;autres créateurs via un code
        ou un lien personnel. Une commission de 30% du montant de
        l&apos;abonnement du filleul est reversée au parrain, pendant 12
        mois maximum à compter de l&apos;inscription du filleul — sauf pour
        le palier Ambassadeur, où la commission peut devenir récurrente sans
        limite de durée.
      </p>

      <h2>Attribution</h2>
      <p>
        L&apos;attribution se fait au premier clic (« first-touch ») dans
        les 90 jours précédant l&apos;inscription, via un cookie de suivi.
        Un code peut aussi être saisi manuellement jusqu&apos;à 7 jours après
        l&apos;inscription.
      </p>

      <h2>Rétention et paiement</h2>
      <p>
        Une commission reste en attente 30 jours avant de devenir payable,
        pour couvrir les remboursements éventuels. Le paiement n&apos;est
        déclenché qu&apos;à partir de 25€ de commissions payables cumulées.
        Deux modes de versement sont proposés&nbsp;: virement (Stripe
        Connect, réservé aux personnes majeures) ou crédit sur
        l&apos;abonnement KAIROS (accessible aux mineurs, sans compte
        Stripe).
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
