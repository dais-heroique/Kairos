import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Vérification du jeton d'identité Firebase, côté Worker.
//
// C'est le seul rempart entre « je crée une session de paiement pour moi »
// et « j'en crée une pour le compte de quelqu'un d'autre ». Le Worker est
// public : il ne peut faire confiance qu'à une signature, jamais à un `uid`
// envoyé dans le corps de la requête.
//
// `firebase-admin` ferait ça tout seul, mais il ne tourne pas sur Workers
// (Node, gRPC, Buffer). On reconstitue donc la vérification à la main —
// c'est du JWT standard, à trois particularités près, listées ci-dessous.

// Google publie les certificats de signature des jetons Firebase ici. Ce
// sont des certificats X.509, pas un JWKS classique — d'où l'endpoint
// dédié `securetoken` ci-dessous, qui expose bien un JWKS.
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const ISSUER_PREFIX = "https://securetoken.google.com/";

export interface VerifiedUser {
  uid: string;
  email: string | null;
}

export class TokenError extends Error {}

/**
 * Lit `iss`/`aud` d'un jeton **sans vérifier sa signature** — uniquement
 * pour enrichir un message d'erreur, jamais pour une décision d'accès.
 *
 * Utile précisément quand `jwtVerify` rejette le jeton pour `iss` ou `aud`
 * incorrect : l'erreur de `jose` dit que la valeur est mauvaise, jamais
 * laquelle. Sans ça, la seule façon de savoir contre quel projet le
 * jeton a réellement été émis est de le décoder à la main — un aller-retour
 * évitable. `iss`/`aud` ne sont pas des secrets : ce sont de simples
 * identifiants de projet, déjà publics par ailleurs (ils apparaissent dans
 * la configuration Firebase du site, servie à tout visiteur).
 */
export function unverifiedClaims(
  idToken: string,
): { iss?: string | undefined; aud?: string | undefined } | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { iss?: unknown; aud?: unknown };
    // Les deux champs sont posés explicitement à `undefined`, jamais omis :
    // `exactOptionalPropertyTypes` distingue une propriété absente d'une
    // propriété valant `undefined`, et le type déclaré exige la seconde forme.
    return {
      iss: typeof claims.iss === "string" ? claims.iss : undefined,
      aud: typeof claims.aud === "string" ? claims.aud : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Vérifie un jeton d'identité Firebase et renvoie l'utilisateur.
 *
 * Les trois contrôles qui comptent, et qu'un `jwtVerify` nu ne fait pas :
 *
 *  - **`aud`** doit valoir l'identifiant du projet. Sans ça, un jeton émis
 *    pour *un autre projet Firebase* passerait : n'importe qui créant un
 *    projet Firebase pourrait se faire passer pour un utilisateur de KAIROS.
 *  - **`iss`** doit être `securetoken.google.com/<projet>`.
 *  - **`sub`** est l'`uid`, et il doit être non vide. C'est lui qu'on
 *    utilisera pour attribuer un abonnement — pas `user_id`, pas `email`,
 *    qui peuvent changer.
 */
export async function verifyFirebaseToken(
  idToken: string,
  projectId: string,
): Promise<VerifiedUser> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(idToken, JWKS, {
      issuer: `${ISSUER_PREFIX}${projectId}`,
      audience: projectId,
    }));
  } catch (error) {
    const base = error instanceof Error ? error.message : "signature invalide";
    // N'ajoute la comparaison que si elle éclaire vraiment quelque chose :
    // sur une signature invalide ou un jeton expiré, `iss`/`aud` sont
    // corrects et répéter « attendu kairos-on, reçu kairos-on » n'aiderait
    // personne.
    const claims = unverifiedClaims(idToken);
    const expectedIss = `${ISSUER_PREFIX}${projectId}`;
    const mismatch =
      claims && ((claims.iss && claims.iss !== expectedIss) || (claims.aud && claims.aud !== projectId));
    const detail = mismatch
      ? ` (jeton émis pour le projet Firebase « ${claims.aud ?? claims.iss} », ce Worker attend « ${projectId} » — vérifie FIREBASE_PROJECT_ID dans wrangler.toml et la configuration Firebase du site)`
      : "";
    throw new TokenError(`Jeton refusé : ${base}${detail}`);
  }

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid) throw new TokenError("Jeton sans identifiant utilisateur (sub).");

  const email = typeof payload.email === "string" ? payload.email : null;
  return { uid, email };
}

/** Extrait le jeton d'un en-tête `Authorization: Bearer …`. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
