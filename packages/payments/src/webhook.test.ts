import { describe, expect, it } from "vitest";
import { buildPriceCatalog, planForPrice, sellablePlans } from "./catalog";
import { mapStripeStatus, resolveWebhookEvent, type StripeEventLike } from "./webhook";

const ENV = {
  STRIPE_PRICE_CREATOR_MONTHLY: "price_creator_m",
  STRIPE_PRICE_CREATOR_YEARLY: "price_creator_y",
  STRIPE_PRICE_PRO_MONTHLY: "price_pro_m",
  STRIPE_PRICE_PRO_YEARLY: "price_pro_y",
};

const { catalog } = buildPriceCatalog(ENV);

function subscriptionEvent(
  type: string,
  overrides: Record<string, unknown> = {},
): StripeEventLike {
  return {
    id: "evt_1",
    type,
    data: {
      object: {
        id: "sub_1",
        status: "active",
        customer: "cus_1",
        current_period_end: 1_800_000_000,
        metadata: { uid: "user-1" },
        items: { data: [{ price: { id: "price_creator_m" } }] },
        ...overrides,
      },
    },
  };
}

describe("buildPriceCatalog", () => {
  it("associe chaque prix configuré à son offre", () => {
    expect(planForPrice("price_creator_m", catalog)).toEqual({
      plan: "creator",
      period: "monthly",
    });
    expect(planForPrice("price_pro_y", catalog)).toEqual({ plan: "pro", period: "yearly" });
    expect(sellablePlans(catalog).sort()).toEqual(["creator", "pro"]);
  });

  it("un prix absent rend l'offre invendable, sans planter", () => {
    const { catalog: partial, missing } = buildPriceCatalog({
      STRIPE_PRICE_CREATOR_MONTHLY: "price_only",
    });
    expect(missing).toContain("STRIPE_PRICE_PRO_MONTHLY");
    expect(sellablePlans(partial)).toEqual(["creator"]);
  });

  // Deux offres derrière le même prix veut dire qu'un client peut payer
  // pour l'une et recevoir l'autre. Refuser de démarrer vaut mieux que
  // tirer au sort.
  it("refuse deux offres derrière le même identifiant de prix", () => {
    expect(() =>
      buildPriceCatalog({
        STRIPE_PRICE_CREATOR_MONTHLY: "price_doublon",
        STRIPE_PRICE_PRO_MONTHLY: "price_doublon",
      }),
    ).toThrow(/deux offres différentes/);
  });

  it("ignore les espaces autour d'un identifiant recopié à la main", () => {
    const { catalog: c } = buildPriceCatalog({ STRIPE_PRICE_CREATOR_MONTHLY: "  price_x  " });
    expect(planForPrice("price_x", c)).not.toBeNull();
  });
});

describe("mapStripeStatus", () => {
  it("ramène les statuts Stripe aux cinq du schéma KAIROS", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("incomplete")).toBe("incomplete");
  });

  // `unpaid` et `paused` : l'argent ne rentre pas. `entitlementsOf` ne
  // considère actifs que `active` et `trialing`, donc l'accès retombe au
  // gratuit — sans supprimer l'abonnement.
  it("traite « impayé » et « en pause » comme un défaut de paiement", () => {
    expect(mapStripeStatus("unpaid")).toBe("past_due");
    expect(mapStripeStatus("paused")).toBe("past_due");
  });

  it("une souscription jamais aboutie est une résiliation", () => {
    expect(mapStripeStatus("incomplete_expired")).toBe("canceled");
  });

  it("ne devine pas un statut inconnu", () => {
    expect(mapStripeStatus("quelque_chose_de_nouveau")).toBeNull();
    expect(mapStripeStatus(undefined)).toBeNull();
  });
});

describe("resolveWebhookEvent", () => {
  it("accorde le plan payé quand l'abonnement devient actif", () => {
    const outcome = resolveWebhookEvent(subscriptionEvent("customer.subscription.created"), catalog);

    expect(outcome).toEqual({
      kind: "update",
      update: {
        uid: "user-1",
        plan: {
          slug: "creator",
          status: "active",
          currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
          stripeCustomerId: "cus_1",
        },
      },
    });
  });

  it("suit le changement d'offre quand le client passe à Pro", () => {
    const outcome = resolveWebhookEvent(
      subscriptionEvent("customer.subscription.updated", {
        items: { data: [{ price: { id: "price_pro_y" } }] },
      }),
      catalog,
    );

    expect(outcome.kind).toBe("update");
    if (outcome.kind === "update") expect(outcome.update.plan.slug).toBe("pro");
  });

  it("marque l'impayé sans supprimer l'abonnement", () => {
    const outcome = resolveWebhookEvent(
      subscriptionEvent("customer.subscription.updated", { status: "past_due" }),
      catalog,
    );

    expect(outcome.kind).toBe("update");
    if (outcome.kind === "update") {
      expect(outcome.update.plan.status).toBe("past_due");
      // Le slug est conservé : on sait ce qu'il avait, et `entitlementsOf`
      // se charge de lui retirer l'accès tant que ce n'est pas payé.
      expect(outcome.update.plan.slug).toBe("creator");
    }
  });

  it("ramène au gratuit à la résiliation effective", () => {
    const outcome = resolveWebhookEvent(subscriptionEvent("customer.subscription.deleted"), catalog);

    expect(outcome.kind).toBe("update");
    if (outcome.kind === "update") {
      expect(outcome.update.plan.slug).toBe("radar");
      expect(outcome.update.plan.status).toBe("canceled");
    }
  });

  // Un prix archivé dans Stripe dont un abonnement en cours se réclame
  // encore. Rétrograder serait injuste, promouvoir serait faux.
  it("ne tranche pas sur un prix inconnu", () => {
    const outcome = resolveWebhookEvent(
      subscriptionEvent("customer.subscription.updated", {
        items: { data: [{ price: { id: "price_archive_2024" } }] },
      }),
      catalog,
    );

    expect(outcome.kind).toBe("unresolved");
  });

  it("ne tranche pas sur un abonnement sans uid", () => {
    const outcome = resolveWebhookEvent(
      subscriptionEvent("customer.subscription.updated", { metadata: {} }),
      catalog,
    );

    expect(outcome.kind).toBe("unresolved");
  });

  // Les droits sont posés par customer.subscription.*, qui porte le statut.
  // La session de paiement, elle, ne le porte pas.
  it("n'accorde rien sur la seule session de paiement", () => {
    const outcome = resolveWebhookEvent(
      {
        id: "evt_2",
        type: "checkout.session.completed",
        data: { object: { id: "cs_1", client_reference_id: "user-1" } },
      },
      catalog,
    );

    expect(outcome.kind).toBe("ignore");
  });

  it("signale une session de paiement qui a perdu son uid", () => {
    const outcome = resolveWebhookEvent(
      { id: "evt_3", type: "checkout.session.completed", data: { object: { id: "cs_2" } } },
      catalog,
    );

    expect(outcome.kind).toBe("unresolved");
  });

  it("laisse passer sans rien faire les événements hors sujet", () => {
    const outcome = resolveWebhookEvent(
      { id: "evt_4", type: "invoice.created", data: { object: {} } },
      catalog,
    );

    expect(outcome.kind).toBe("ignore");
  });

  it("accepte un abonnement sans date de fin de période", () => {
    const outcome = resolveWebhookEvent(
      subscriptionEvent("customer.subscription.created", { current_period_end: null }),
      catalog,
    );

    expect(outcome.kind).toBe("update");
    if (outcome.kind === "update") expect(outcome.update.plan.currentPeriodEnd).toBeNull();
  });
});
