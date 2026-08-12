import Stripe from "stripe";
import { buildPriceCatalog, resolveWebhookEvent } from "@kairos/payments";
import {
  claimEvent,
  readUser,
  writeUserPlan,
  type WorkerEnv,
} from "./firestore-rest";
import { bearerToken, TokenError, verifyFirebaseToken } from "./verify-token";

// Worker Cloudflare — les deux seuls points du produit qui ont besoin d'un
// serveur.
//
// Pourquoi ici plutôt que dans des Cloud Functions : le palier gratuit de
// Cloudflare Workers (100 000 requêtes/jour) autorise l'usage commercial,
// là où le plan Hobby de Vercel l'interdit et où Cloud Functions exige le
// plan Blaze, donc une carte bancaire. Le site reste sur Firebase Hosting,
// statique, et Firestore ne bouge pas. Coût réel : 0 €.
//
// Ce fichier ne contient aucune règle métier. Quel prix donne quel plan et
// quel événement change quoi vivent dans `packages/payments`, purs et
// testés sans réseau (18 tests). Ici : vérifier, appeler, écrire.

function stripeClient(env: WorkerEnv): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    // Obligatoire hors Node : le client HTTP par défaut de Stripe utilise
    // le module `http`, absent des Workers.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function allowedOrigin(env: WorkerEnv, origin: string | null): string | null {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  if (!origin) return null;
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(origin) },
  });
}

/**
 * Crée une session de paiement pour l'utilisateur **authentifié**.
 *
 * L'`uid` vient de la signature du jeton, jamais du corps de la requête :
 * accepter un `uid` envoyé par le client permettrait d'offrir un abonnement
 * à n'importe qui, ou de s'en attribuer un au nom d'un autre.
 */
async function handleCheckout(request: Request, env: WorkerEnv, origin: string | null) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return json({ error: "Connexion requise." }, 401, origin);

  let user;
  try {
    user = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
  } catch (error) {
    if (error instanceof TokenError) return json({ error: error.message }, 401, origin);
    throw error;
  }

  const body = (await request.json().catch(() => ({}))) as { priceId?: unknown };
  const priceId = typeof body.priceId === "string" ? body.priceId : "";

  const { catalog } = buildPriceCatalog(env as unknown as Record<string, string | undefined>);
  if (!catalog.has(priceId)) {
    // On n'accepte que les prix de notre propre catalogue : sinon un client
    // pourrait demander une session sur n'importe quel prix du compte
    // Stripe, y compris un prix à 0 €.
    return json({ error: "Offre inconnue." }, 400, origin);
  }

  const snapshot = await readUser(env, user.uid);
  const stripe = stripeClient(env);
  const site = origin ?? env.ALLOWED_ORIGINS.split(",")[0]!.trim();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // Deux endroits, et ce n'est pas une redondance : Stripe ne recopie pas
    // `client_reference_id` de la session vers l'abonnement. Sans
    // `subscription_data.metadata.uid`, tous les événements de cycle de vie
    // (renouvellement, impayé, résiliation) arriveraient orphelins.
    client_reference_id: user.uid,
    subscription_data: { metadata: { uid: user.uid } },
    ...(snapshot?.stripeCustomerId
      ? { customer: snapshot.stripeCustomerId }
      : user.email
        ? { customer_email: user.email }
        : {}),
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
    success_url: `${site}/compte?paiement=ok`,
    cancel_url: `${site}/tarifs?paiement=annule`,
    locale: "fr",
  });

  return json({ url: session.url }, 200, origin);
}

/**
 * Ouvre le portail client Stripe — c'est là que le client change de moyen
 * de paiement, télécharge ses factures et **résilie**.
 *
 * Pouvoir résilier aussi facilement qu'on s'est abonné est une obligation
 * légale (article L. 215-1 du code de la consommation, « bouton
 * résiliation »), pas un confort. Le portail hébergé de Stripe la remplit
 * sans qu'on ait à écrire d'écran de gestion d'abonnement.
 *
 * L'identifiant client vient du document Firestore, jamais de la requête :
 * accepter un `customerId` envoyé par le navigateur ouvrirait le portail —
 * donc les factures et les cartes — de n'importe quel client.
 */
async function handlePortal(request: Request, env: WorkerEnv, origin: string | null) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return json({ error: "Connexion requise." }, 401, origin);

  let user;
  try {
    user = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
  } catch (error) {
    if (error instanceof TokenError) return json({ error: error.message }, 401, origin);
    throw error;
  }

  const snapshot = await readUser(env, user.uid);
  if (!snapshot?.stripeCustomerId) {
    // Cas réel et non exceptionnel : compte fondateur, plan accordé à la
    // main via `pnpm grant:plan`, ou simple utilisateur gratuit. Aucun
    // client Stripe n'existe, donc aucun portail. On le dit.
    return json({ error: "Aucun abonnement payant n'est rattaché à ce compte." }, 404, origin);
  }

  const site = origin ?? env.ALLOWED_ORIGINS.split(",")[0]!.trim();
  const session = await stripeClient(env).billingPortal.sessions.create({
    customer: snapshot.stripeCustomerId,
    return_url: `${site}/compte`,
    locale: "fr",
  });

  return json({ url: session.url }, 200, origin);
}

/**
 * Reçoit les événements Stripe et applique le plan.
 *
 * La signature est vérifiée sur le **texte brut** du corps : le relire après
 * un `JSON.parse` puis re-sérialiser changerait un espace, et la signature
 * ne correspondrait plus.
 *
 * `constructEventAsync` et non `constructEvent` : la vérification passe par
 * WebCrypto, qui est asynchrone. La version synchrone échoue sur Workers.
 */
async function handleWebhook(request: Request, env: WorkerEnv) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("signature manquante", { status: 400 });

  const payload = await request.text();
  const stripe = stripeClient(env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    // Signature invalide = requête non authentifiée. On répond 400 sans
    // détail : inutile d'aider qui tente de forger un événement.
    console.error("[stripe] signature refusée", error);
    return new Response("signature invalide", { status: 400 });
  }

  const { catalog } = buildPriceCatalog(env as unknown as Record<string, string | undefined>);
  const outcome = resolveWebhookEvent(
    {
      id: event.id,
      type: event.type,
      data: { object: event.data.object as unknown as Record<string, unknown> },
    },
    catalog,
  );

  // On réserve l'événement avant d'agir : deux livraisons simultanées du
  // même événement, une seule passe.
  const first = await claimEvent(env, event.id, {
    type: event.type,
    outcome: outcome.kind,
    reason: outcome.kind === "update" ? null : outcome.reason,
  });
  if (!first) return new Response("déjà traité", { status: 200 });

  if (outcome.kind === "update") {
    await writeUserPlan(env, outcome.update.uid, outcome.update.plan);
    console.log(
      `[stripe] ${event.type} → ${outcome.update.uid} : ${outcome.update.plan.slug}/${outcome.update.plan.status}`,
    );
  } else if (outcome.kind === "unresolved") {
    // On répond quand même 200 : un 5xx ferait réessayer Stripe en boucle
    // sur un événement qu'on ne saura pas mieux interpréter la fois
    // suivante. La trace reste dans stripeEvents/{id}, et `pnpm grant:plan`
    // permet de trancher à la main.
    console.error(`[stripe] NON RÉSOLU — ${outcome.reason} (événement ${event.id})`);
  }

  return new Response("ok", { status: 200 });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(env, request.headers.get("origin"));

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      // Le webhook est appelé par Stripe, pas par un navigateur : pas de
      // CORS, et surtout pas de contrôle d'origine — c'est la signature qui
      // authentifie.
      if (url.pathname === "/stripe/webhook" && request.method === "POST") {
        return await handleWebhook(request, env);
      }

      if (url.pathname === "/stripe/checkout" && request.method === "POST") {
        if (!origin) return json({ error: "Origine non autorisée." }, 403, null);
        return await handleCheckout(request, env, origin);
      }

      if (url.pathname === "/stripe/portal" && request.method === "POST") {
        if (!origin) return json({ error: "Origine non autorisée." }, 403, null);
        return await handlePortal(request, env, origin);
      }

      if (url.pathname === "/health") {
        const { missing } = buildPriceCatalog(
          env as unknown as Record<string, string | undefined>,
        );
        // Dit ce qui est configuré sans jamais révéler une valeur : de quoi
        // diagnostiquer un déploiement sans exposer un identifiant de prix.
        return json({ ok: true, prixManquants: missing }, 200, origin);
      }

      return new Response("not found", { status: 404 });
    } catch (error) {
      console.error("[worker] erreur non rattrapée", error);
      return json({ error: "Erreur interne." }, 500, origin);
    }
  },
};
