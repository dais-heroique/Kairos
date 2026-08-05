// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { entitlementsOf, type User } from "@kairos/shared";
import { PaywallGate } from "./PaywallGate";

afterEach(cleanup);

function user(slug: "radar" | "creator" | "pro"): User {
  return {
    uid: "u",
    email: "lea@example.com",
    displayName: null,
    photoURL: null,
    locale: "fr",
    role: "user",
    createdAt: new Date().toISOString(),
    deletedAt: null,
    profile: {
      niches: ["beaute"],
      markets: ["FR"],
      followerRange: "5k_20k",
      avgViews: 8000,
      experienceLevel: "intermediaire",
      onboardingCompletedAt: new Date().toISOString(),
    },
    plan: { slug, status: "active", currentPeriodEnd: null, stripeCustomerId: null },
    stats: { briefsGenerated: 0, videosPosted: 0, estimatedEarningsCents: 0 },
    referredByCode: null,
    appliedInviteCode: null,
  } as User;
}

describe("PaywallGate", () => {
  it("laisse passer le contenu quand la capacité est acquise", () => {
    render(
      <PaywallGate
        capability="brief"
        entitlements={entitlementsOf(user("creator"))}
        title="Débloque le brief"
      >
        <p>contenu réel</p>
      </PaywallGate>,
    );
    expect(screen.getByText("contenu réel")).toBeTruthy();
    expect(screen.queryByText("Débloque le brief")).toBeNull();
  });

  it("masque le contenu et propose le premier plan qui débloque", () => {
    render(
      <PaywallGate
        capability="brief"
        entitlements={entitlementsOf(user("radar"))}
        title="Débloque le brief"
      >
        <p>contenu réel</p>
      </PaywallGate>,
    );
    expect(screen.queryByText("contenu réel")).toBeNull();
    expect(screen.getByText("Débloque le brief")).toBeTruthy();
    // Creator est le premier palier qui contient « brief » — proposer Pro
    // serait vendre plus cher que nécessaire.
    expect(screen.getByText(/^Creator/)).toBeTruthy();
  });

  // Une porte fermée ne convertit pas : l'utilisateur doit voir la valeur
  // entière du palier, pas seulement la fonctionnalité qu'il vient de
  // heurter.
  it("liste tout ce que le palier apporte, pas juste la capacité heurtée", () => {
    render(
      <PaywallGate
        capability="brief"
        entitlements={entitlementsOf(user("radar"))}
        title="Débloque le brief"
      >
        <p>contenu</p>
      </PaywallGate>,
    );
    expect(screen.getByText(/Historique jour par jour/)).toBeTruthy();
    expect(screen.getByText(/Alertes quand une fenêtre/)).toBeTruthy();
  });

  it("affiche l'aperçu flouté quand il est fourni", () => {
    render(
      <PaywallGate
        capability="productHistory"
        entitlements={entitlementsOf(user("radar"))}
        title="Vois l'historique"
        preview={<p>aperçu</p>}
      >
        <p>contenu</p>
      </PaywallGate>,
    );
    expect(screen.getByText("aperçu")).toBeTruthy();
    expect(screen.queryByText("contenu")).toBeNull();
  });

  // Le catalogue n'a pas encore de tarif : annoncer un montant inventé
  // serait pire que d'assumer que ce n'est pas ouvert.
  it("n'invente pas de prix tant qu'il n'est pas arrêté", () => {
    render(
      <PaywallGate
        capability="brief"
        entitlements={entitlementsOf(user("radar"))}
        title="Débloque le brief"
      >
        <p>contenu</p>
      </PaywallGate>,
    );
    expect(screen.getByText(/Bientôt/)).toBeTruthy();
  });

  it("un compte Pro n'est jamais bloqué", () => {
    render(
      <PaywallGate
        capability="rankingArchive"
        entitlements={entitlementsOf(user("pro"))}
        title="Archive"
      >
        <p>archive réelle</p>
      </PaywallGate>,
    );
    expect(screen.getByText("archive réelle")).toBeTruthy();
  });
});
