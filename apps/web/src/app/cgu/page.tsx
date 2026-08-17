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
      <p>
        {/* Franchise en base : les prix affichés sont donc les prix finaux,
            sans TVA à ajouter. La mention est obligatoire sur les factures
            (art. 293 B du CGI) ; l'écrire aussi ici évite qu'un client se
            demande si 19 € deviendront 22,80 € au paiement. */}
        <strong>TVA non applicable, article 293 B du Code général des
        impôts.</strong> Les montants affichés sont les montants finaux&nbsp;:
        aucune taxe n&apos;est ajoutée au moment du paiement.
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
        client Stripe — accessible en un clic depuis la page{" "}
        <a href="/compte" className="underline">
          Ton compte
        </a>
        , ou directement à l&apos;adresse{" "}
        <a
          href="https://billing.stripe.com/p/login/5kQ00cbcT6T8cjI79G8AE00"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          billing.stripe.com
        </a>
        . La résiliation prend effet à la fin de la période déjà payée. Voir aussi le droit de rétractation applicable aux nouveaux
        abonnés.
      </p>

      <h2>Médiation de la consommation</h2>
      <p>
        Après une réclamation écrite restée sans solution, le consommateur peut
        saisir gratuitement le médiateur de la consommation désigné par Kairos :
        [nom du médiateur], [adresse], [site internet]. Ces coordonnées doivent
        être complétées avant toute vente à un consommateur.
      </p>

      <h2>Droit applicable</h2>
      <p>Droit français. Tribunaux compétents&nbsp;: [ville du siège social], sous réserve des règles impératives applicables aux consommateurs.</p>
    </LegalPage>
  );
}
