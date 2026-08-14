import { describe, expect, it } from "vitest";
import { stripeClient } from "./index";
import type { WorkerEnv } from "./firestore-rest";

// Constaté en production le 2026-08-14 : une STRIPE_SECRET_KEY vide fait
// échouer le SDK Stripe avec « Neither apiKey nor config.authenticator
// provided », loin de toute mention de KAIROS ou du secret en cause. Ce
// test garde le message qui remplace ça.

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    FIREBASE_PROJECT_ID: "kairos-on",
    FIREBASE_SERVICE_ACCOUNT: "{}",
    STRIPE_SECRET_KEY: "sk_test_fake",
    STRIPE_WEBHOOK_SECRET: "whsec_fake",
    ALLOWED_ORIGINS: "https://kairos-on.web.app",
    ...overrides,
  };
}

describe("stripeClient", () => {
  it("nomme explicitement le secret manquant plutôt que de laisser le SDK échouer", () => {
    expect(() => stripeClient(env({ STRIPE_SECRET_KEY: "" }))).toThrow(
      /STRIPE_SECRET_KEY est vide ou absente/,
    );
  });

  it("construit normalement le client dès qu'une clé est présente", () => {
    // Le SDK ne fait aucun appel réseau à la construction — seule la
    // présence de la clé compte ici, pas sa validité auprès de Stripe.
    expect(() => stripeClient(env())).not.toThrow();
  });
});
