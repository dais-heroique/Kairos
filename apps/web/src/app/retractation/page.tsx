import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Droit de rétractation — KAIROS" };

export default function RetractationPage() {
  return (
    <LegalPage title="Droit de rétractation" updatedAt="17 août 2026">
      <p>
        <strong>Version de pré-lancement — à faire relire avant l’activation commerciale définitive.</strong>
      </p>

      <h2>Principe</h2>
      <p>
        Lorsque le droit de rétractation s&apos;applique, le consommateur dispose en principe d&apos;un délai de 14 jours à compter de la souscription pour l&apos;exercer sans avoir à justifier de motif.
      </p>

      <h2>Fourniture immédiate d&apos;un service numérique</h2>
      <p>
        Si l&apos;accès au service commence immédiatement à la demande du client, les conditions de cette demande et les conséquences éventuelles sur le droit de rétractation doivent être présentées clairement avant le paiement et recueillir le consentement requis.
      </p>

      <h2>Comment exercer ce droit</h2>
      <p>
        Envoie une déclaration dénuée d&apos;ambiguïté à{" "}
        <a className="underline" href="mailto:conforva.contact@gmail.com">
          conforva.contact@gmail.com
        </a>,
        ou utilise le modèle ci-dessous.
      </p>

      <h2>Modèle de formulaire</h2>
      <p>
        Je vous notifie par la présente ma rétractation du contrat portant sur l&apos;abonnement souscrit le [date].
        <br />
        Adresse email du compte&nbsp;: ______
        <br />
        Date&nbsp;: ______
        <br />
        Nom du client, si nécessaire pour traiter la demande&nbsp;: ______
      </p>
    </LegalPage>
  );
}
