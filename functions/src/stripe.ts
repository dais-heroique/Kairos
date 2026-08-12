import { getFirestore } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { buildPriceCatalog, resolveWebhookEvent } from "@kairos/payments";

// Adaptateur Stripe — la seule partie qui a besoin d'un serveur.
//
// ⚠️ **Exige le plan Blaze.** Le reste de KAIROS tient sur Spark (site
// statique + Firestore), et c'est une contrainte explicite. Déployer ce
// fichier la casse : à lire dans docs/STRIPE.md avant de le faire, avec les
// deux autres options.
//
// Ce qui a réellement besoin d'un serveur, et pourquoi :
//
//   - Créer une session de paiement demande `STRIPE_SECRET_KEY`. Cette clé
//     donne un accès total au compte Stripe : elle ne doit jamais partir
//     dans un bundle navigateur, où n'importe qui peut la lire.
//   - Recevoir un webhook demande de vérifier une signature, puis d'écrire
//     `users/{uid}.plan` — champ que les règles Firestore interdisent au
//     client, précisément pour qu'on ne puisse pas s'offrir un plan payant.
//
// Toute la logique métier (quel prix donne quel plan, quel événement change
// quoi) vit dans `packages/payments`, pure et testée sans réseau. Ici, il
// n'y a que de la plomberie : vérifier, appeler, écrire.

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

function stripeClient(): Stripe {
  return new Stripe(stripeSecretKey.value(), { apiVersion: "2025-02-24.acacia" });
}

function catalogFromEnv() {
  const { catalog, missing } = buildPriceCatalog(process.env);
  return { catalog, missing };
}

/**
 * Crée une session de paiement pour l'utilisateur connecté.
 *
 * L'`uid` est posé à **deux** endroits, et ce n'est pas une redondance :
 * Stripe ne recopie pas `client_reference_id` de la session vers
 * l'abonnement. Sans `subscription_data.metadata.uid`, tous les événements
 * de cycle de vie ultérieurs (renouvellement, impayé, résiliation)
 * arriveraient orphelins et seraient rejetés en `unresolved`.
 */
export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey], enforceAppCheck: false, region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Connexion requise.");

    const priceId = String((request.data as { priceId?: unknown })?.priceId ?? "");
    const { catalog } = catalogFromEnv();
    if (!catalog.has(priceId)) {
      // On n'accepte que les prix de notre propre catalogue : sans ce
      // contrôle, un client pourrait demander une session sur n'importe
      // quel prix du compte Stripe, y compris un prix à 0 €.
      throw new HttpsError("invalid-argument", "Offre inconnue.");
    }

    const db = getFirestore();
    const snap = await db.collection("users").doc(uid).get();
    const email = (snap.data()?.email as string | undefined) ?? request.auth?.token.email;
    const existingCustomer = (snap.data()?.plan?.stripeCustomerId as string | undefined) ?? null;

    const origin = String((request.data as { origin?: unknown })?.origin ?? "https://kairos-on.web.app");
    const stripe = stripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: uid,
      ...(existingCustomer ? { customer: existingCustomer } : email ? { customer_email: email } : {}),
      subscription_data: { metadata: { uid } },
      // TVA : Stripe Tax calcule et collecte selon le pays du client. Sans
      // lui, vendre un service numérique à des particuliers dans l'UE
      // laisse la TVA à la charge du vendeur. Voir docs/STRIPE.md.
      // TVA : **désactivée**, et c'est une décision fiscale, pas un oubli.
      // Le vendeur relève de la franchise en base de TVA (art. 293 B du
      // CGI) : il ne la collecte pas, donc Stripe ne doit pas l'ajouter.
      // Activer `automatic_tax` ici facturerait au client une taxe qui n'est
      // pas due et qu'il faudrait ensuite lui rembourser.
      //
      // Deux conséquences à ne pas perdre de vue le jour où le seuil de la
      // franchise est dépassé : repasser ce drapeau à `true` **et** activer
      // Stripe Tax dans le tableau de bord — l'un sans l'autre fait échouer
      // la création de session. La mention « TVA non applicable, art. 293 B
      // du CGI » doit par ailleurs figurer sur les factures, ce qui se règle
      // dans Stripe (Paramètres → Facturation → pied de page des factures).
      automatic_tax: { enabled: false },
      success_url: `${origin}/compte?paiement=ok`,
      cancel_url: `${origin}/tarifs?paiement=annule`,
      locale: "fr",
    });

    return { url: session.url };
  },
);

/**
 * Reçoit les événements Stripe et applique le plan.
 *
 * La signature est vérifiée sur le corps **brut** : `req.rawBody`, jamais
 * `req.body`, que le parsing JSON a déjà réécrit — la signature ne
 * correspondrait plus et tout serait rejeté.
 */
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret], region: "europe-west1" },
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      res.status(400).send("signature manquante");
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(
        req.rawBody,
        signature,
        stripeWebhookSecret.value(),
      );
    } catch (error) {
      // Signature invalide = requête non authentifiée. On répond 400 sans
      // détail : inutile d'aider qui essaie de forger un événement.
      console.error("[stripe] signature refusée", error);
      res.status(400).send("signature invalide");
      return;
    }

    const db = getFirestore();

    // Idempotence : Stripe réémet un événement tant qu'il n'a pas reçu de
    // 2xx, et peut le livrer deux fois. Sans ce garde-fou, un même
    // événement pourrait écraser un état plus récent.
    const seen = db.collection("stripeEvents").doc(event.id);
    if ((await seen.get()).exists) {
      res.status(200).send("déjà traité");
      return;
    }

    const { catalog } = catalogFromEnv();
    const outcome = resolveWebhookEvent(
      { id: event.id, type: event.type, data: { object: event.data.object as unknown as Record<string, unknown> } },
      catalog,
    );

    if (outcome.kind === "update") {
      await db
        .collection("users")
        .doc(outcome.update.uid)
        .set({ plan: outcome.update.plan }, { merge: true });
      console.log(
        `[stripe] ${event.type} → ${outcome.update.uid} : ${outcome.update.plan.slug}/${outcome.update.plan.status}`,
      );
    } else if (outcome.kind === "unresolved") {
      // On répond quand même 200 : un 5xx ferait réessayer Stripe en
      // boucle sur un événement qu'on ne saura pas mieux interpréter la
      // fois suivante. La trace est là, et `pnpm grant:plan` permet de
      // trancher à la main.
      console.error(`[stripe] NON RÉSOLU — ${outcome.reason} (événement ${event.id})`);
    }

    await seen.set({
      type: event.type,
      outcome: outcome.kind,
      reason: outcome.kind === "update" ? null : outcome.reason,
      receivedAt: new Date().toISOString(),
    });

    res.status(200).send("ok");
  },
);
