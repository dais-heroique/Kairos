import { importPKCS8, SignJWT } from "jose";
import type { Plan } from "@kairos/shared";

// Client Firestore minimal, en REST.
//
// Pourquoi ne pas utiliser `firebase-admin` : il est écrit pour Node — gRPC,
// modules natifs, `Buffer`. Rien de tout ça n'existe dans un Worker
// Cloudflare, qui tourne sur l'environnement du navigateur (fetch,
// WebCrypto). L'API REST de Firestore, elle, n'est que du HTTP.
//
// On n'implémente que ce dont le paiement a besoin : lire un document
// utilisateur, et écrire son champ `plan`. Pas de SDK maison.

export interface WorkerEnv {
  FIREBASE_PROJECT_ID: string;
  /** JSON complet de la clé de compte de service, posé en secret. */
  FIREBASE_SERVICE_ACCOUNT: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_CREATOR_MONTHLY?: string;
  STRIPE_PRICE_CREATOR_YEARLY?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_YEARLY?: string;
  /** Origines autorisées à appeler le Worker, séparées par des virgules. */
  ALLOWED_ORIGINS: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

// ---------------------------------------------------------------------------
// Encodage des valeurs — la partie qui doit être juste, et qui est testable
// sans réseau.
// ---------------------------------------------------------------------------

export type FirestoreValue =
  | { stringValue: string }
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

/**
 * Firestore REST attend des valeurs **typées** : `{"stringValue": "x"}` et
 * non `"x"`. Une valeur mal encodée n'échoue pas bruyamment — elle écrit un
 * document d'une forme que `planSchema.parse()` rejettera ensuite à la
 * lecture, c'est-à-dire un compte cassé après un paiement réussi.
 *
 * `null` doit passer par `nullValue`, jamais être omis : omettre le champ
 * laisserait l'ancienne valeur en place, et un `currentPeriodEnd` périmé
 * après une résiliation raconterait que l'abonnement court encore.
 */
export function encodePlan(plan: Plan): FirestoreValue {
  const str = (value: string | null): FirestoreValue =>
    value === null ? { nullValue: null } : { stringValue: value };

  return {
    mapValue: {
      fields: {
        slug: { stringValue: plan.slug },
        status: { stringValue: plan.status },
        currentPeriodEnd: str(plan.currentPeriodEnd),
        stripeCustomerId: str(plan.stripeCustomerId),
      },
    },
  };
}

/** Lecture inverse, limitée aux champs dont le paiement a besoin. */
export function decodeString(value: FirestoreValue | undefined): string | null {
  if (!value) return null;
  return "stringValue" in value ? value.stringValue : null;
}

// ---------------------------------------------------------------------------
// Jeton d'accès — JWT signé avec la clé du compte de service, échangé contre
// un jeton OAuth Google.
// ---------------------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(env: WorkerEnv): Promise<string> {
  // Le Worker peut servir plusieurs requêtes sur la même instance : garder
  // le jeton évite un aller-retour OAuth à chaque webhook. Marge de 60 s
  // pour ne jamais présenter un jeton qui expire pendant l'appel.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
  if (!account.client_email || !account.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT incomplet : client_email ou private_key manquant.");
  }

  // Les retours à la ligne de la clé survivent mal au copier-coller dans un
  // secret : on accepte les deux formes plutôt que d'échouer sur un détail
  // de presse-papiers.
  const pem = account.private_key.replace(/\\n/g, "\n");
  const key = await importPKCS8(pem, "RS256");

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Échange OAuth refusé (${response.status}) : ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

function documentUrl(env: WorkerEnv, path: string): string {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`;
}

export interface UserSnapshot {
  email: string | null;
  stripeCustomerId: string | null;
}

export async function readUser(env: WorkerEnv, uid: string): Promise<UserSnapshot | null> {
  const token = await getAccessToken(env);
  const response = await fetch(documentUrl(env, `users/${uid}`), {
    headers: { authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Lecture users/${uid} refusée (${response.status})`);

  const doc = (await response.json()) as { fields?: Record<string, FirestoreValue> };
  const fields = doc.fields ?? {};
  const plan = fields.plan;
  const planFields = plan && "mapValue" in plan ? plan.mapValue.fields : {};

  return {
    email: decodeString(fields.email),
    stripeCustomerId: decodeString(planFields.stripeCustomerId),
  };
}

/**
 * Écrit **uniquement** le champ `plan`.
 *
 * `updateMask.fieldPaths=plan` est ce qui rend l'opération sûre : sans lui,
 * un PATCH Firestore remplace le document entier, et un paiement effacerait
 * le profil, la watchlist et les statistiques du client.
 */
export async function writeUserPlan(env: WorkerEnv, uid: string, plan: Plan): Promise<void> {
  const token = await getAccessToken(env);
  const url = `${documentUrl(env, `users/${uid}`)}?updateMask.fieldPaths=plan`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields: { plan: encodePlan(plan) } }),
  });

  if (!response.ok) {
    throw new Error(`Écriture users/${uid} refusée (${response.status}) : ${await response.text()}`);
  }
}

/**
 * Marque un événement Stripe comme traité. Renvoie `false` s'il l'était
 * déjà — Stripe réémet tant qu'il n'a pas reçu de 2xx, et peut livrer deux
 * fois le même événement.
 *
 * `currentDocument.exists=false` fait porter la course à Firestore plutôt
 * qu'à nous : deux livraisons simultanées, une seule création réussit.
 */
export async function claimEvent(
  env: WorkerEnv,
  eventId: string,
  details: Record<string, string | null>,
): Promise<boolean> {
  const token = await getAccessToken(env);
  const url = `${documentUrl(env, `stripeEvents/${eventId}`)}?currentDocument.exists=false`;

  const fields: Record<string, FirestoreValue> = {
    receivedAt: { stringValue: new Date().toISOString() },
  };
  for (const [key, value] of Object.entries(details)) {
    fields[key] = value === null ? { nullValue: null } : { stringValue: value };
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  // 409 = le document existe déjà : l'événement a déjà été traité.
  if (response.status === 409) return false;
  if (!response.ok) {
    throw new Error(`Marquage de l'événement ${eventId} refusé (${response.status})`);
  }
  return true;
}
