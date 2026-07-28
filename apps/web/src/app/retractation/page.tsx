import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Droit de rétractation — KAIROS" };

export default function RetractationPage() {
  return (
    <LegalPage title="Droit de rétractation" updatedAt="26 juillet 2026">
      <p>
        <em>
          Modèle à faire valider par un professionnel du droit avant mise en
          production.
        </em>
      </p>

      <h2>Principe</h2>
      <p>
        Conformément aux articles L221-18 et suivants du Code de la
        consommation, tu disposes d&apos;un délai de 14 jours francs à
        compter de la souscription de ton abonnement pour exercer ton droit
        de rétractation, sans avoir à justifier de motif.
      </p>

      <h2>Exception liée au contenu numérique</h2>
      <p>
        Si tu demandes expressément à accéder au service immédiatement
        (avant la fin du délai de 14 jours) et que tu reconnais ainsi
        renoncer à ton droit de rétractation, ce droit ne pourra plus être
        exercé une fois le service pleinement fourni, conformément à
        l&apos;article L221-28 13° du Code de la consommation.
      </p>

      <h2>Comment exercer ce droit</h2>
      <p>
        Envoie une déclaration dénuée d&apos;ambiguïté à [email de contact],
        ou utilise le modèle ci-dessous.
      </p>

      <h2>Modèle de formulaire de rétractation</h2>
      <p>
        À l&apos;attention de [Nom légal de la société], [adresse]&nbsp;:
        <br />
        Je notifie par la présente ma rétractation du contrat portant sur
        l&apos;abonnement KAIROS souscrit le [date].
        <br />
        Nom du client&nbsp;: ______
        <br />
        Adresse du client&nbsp;: ______
        <br />
        Date&nbsp;: ______
      </p>
    </LegalPage>
  );
}
