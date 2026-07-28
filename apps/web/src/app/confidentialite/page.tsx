import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Politique de confidentialité — KAIROS" };

export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="26 juillet 2026"
    >
      <p>
        <em>
          Modèle à faire valider par un professionnel du droit avant mise en
          production, notamment sur le régime applicable au traitement des
          transferts hors UE (Vertex AI, Anthropic) et sur le DAC7 — voir
          §5.9 et §5.4 du brief produit.
        </em>
      </p>

      <h2>Responsable de traitement</h2>
      <p>
        [Nom légal de la société], [adresse complète]. Contact vie privée
        &nbsp;: [email du DPO / contact RGPD].
      </p>

      <h2>Données collectées</h2>
      <p>
        Email, informations de profil créateur (niches, marché, fourchette
        d&apos;abonnés, vues moyennes), historique d&apos;usage du service
        (produits suivis, briefs générés), données de paiement (traitées par
        Stripe, jamais stockées par KAIROS), et — si tu es affilié — code de
        parrainage, revenus d&apos;affiliation et informations Stripe
        Connect.
      </p>

      <h2>Finalités et base légale</h2>
      <p>
        Fourniture du service (exécution du contrat), amélioration du produit
        et mesure d&apos;audience (intérêt légitime), programme
        d&apos;affiliation (exécution du contrat), obligations comptables et
        fiscales (obligation légale).
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Les données du compte sont conservées tant que le compte est actif,
        puis supprimées dans un délai raisonnable après suppression du
        compte (voir « Droit à l&apos;effacement » ci-dessous). Les données
        de facturation sont conservées selon les délais légaux comptables.
      </p>

      <h2>Destinataires</h2>
      <p>
        Prestataires techniques&nbsp;: Google Cloud / Firebase (hébergement,
        base de données), Anthropic (génération de briefs), Google Vertex AI
        / Gemini (analyse vidéo), Stripe (paiement), Resend (emails), Sentry
        et PostHog (observabilité). Aucune vente de données à des tiers.
      </p>

      <h2>Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de
        rectification, d&apos;effacement, de portabilité et
        d&apos;opposition. L&apos;export et la suppression de ton compte
        sont disponibles directement depuis la page{" "}
        <a href="/compte" className="underline">
          Ton compte
        </a>
        . Tu peux aussi introduire une réclamation auprès de la CNIL
        (cnil.fr).
      </p>

      <h2>Cookies</h2>
      <p>
        Un cookie technique d&apos;attribution d&apos;affiliation (
        <code>kai_ref</code>) peut être déposé lors d&apos;une inscription
        via un lien de parrainage. Voir la bannière de consentement affichée
        à ta première visite.
      </p>
    </LegalPage>
  );
}
