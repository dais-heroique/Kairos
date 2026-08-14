// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  CAPABILITY_INFO,
  entitlementsOf,
  formatPlanPrice,
  newCapabilitiesOf,
  planUnlocking,
  type User,
} from "@kairos/shared";
// `SubscribeButton` (le bouton de paiement du paywall) importe le client
// Firebase, qui valide sa configuration dès l'import — absente ici. On
// mocke donc le contexte d'authentification plutôt que le bouton lui-même,
// pour que le vrai composant reste rendu et que les tests continuent de
// vérifier ce qui est réellement affiché.
vi.mock("@/lib/firebase/auth-context", () => ({
  useAuth: () => ({ firebaseUser: null, userDoc: null }),
}));

vi.mock("@/lib/stripe/checkout", () => ({
  CheckoutError: class extends Error {},
  // Aucun identifiant de prix en environnement de test : le bouton
  // retombe sur son repli, exactement comme en production tant que
  // l'encaissement n'est pas branché.
  isCheckoutConfigured: () => false,
  startCheckout: vi.fn(),
}));

const { PaywallGate } = await import("./PaywallGate");

afterEach(cleanup);

/** « 19,00 € / mois » contient des caractères que RegExp interprète. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    // Dérivé du catalogue plutôt que recopié : ce test échouait dès qu'on
    // reformulait un libellé, alors que ce qu'il vérifie est qu'elles sont
    // *toutes* listées — pas leur rédaction.
    for (const capability of newCapabilitiesOf("creator")) {
      expect(screen.getByText(CAPABILITY_INFO[capability].label)).toBeTruthy();
    }
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
  // L'invariant n'est pas « aucun prix n'est affiché » — Creator est tarifé
  // depuis le 2026-08-10 — mais « le prix affiché est celui du catalogue ».
  // Un montant écrit en dur ici finirait par diverger de `plans.ts`, donc
  // de Stripe, donc de ce qui est réellement prélevé.
  it("affiche le tarif du catalogue, jamais un montant à lui", () => {
    const plan = planUnlocking("brief");
    render(
      <PaywallGate
        capability="brief"
        entitlements={entitlementsOf(user("radar"))}
        title="Débloque le brief"
      >
        <p>contenu</p>
      </PaywallGate>,
    );
    expect(screen.getByText(new RegExp(escapeRegExp(formatPlanPrice(plan))))).toBeTruthy();
  });

  it("propose Pro à son tarif quand la capacité lui est propre", () => {
    // Ce test attendait « Bientôt » tant que Pro n'avait pas de prix
    // Stripe. Il en a un depuis le 2026-08-11 : ce qui reste à garder,
    // c'est qu'un abonné Creator qui bute sur une capacité Pro se voie
    // proposer **Pro**, à son prix réel — et pas Creator, qu'il a déjà.
    const plan = planUnlocking("rankingArchive");
    expect(plan.slug).toBe("pro");
    render(
      <PaywallGate
        capability="rankingArchive"
        entitlements={entitlementsOf(user("creator"))}
        title="Débloque l'archive"
      >
        <p>contenu</p>
      </PaywallGate>,
    );
    expect(screen.getByText(new RegExp(escapeRegExp(formatPlanPrice(plan))))).toBeTruthy();
  });

  // Annoncer une fonctionnalité qui n'existe pas encore sans le dire
  // reviendrait à vendre du vide. L'invariant n'est pas « il en existe
  // une » — elles sont toutes livrées aujourd'hui — mais « s'il en existe
  // une, elle est signalée à l'endroit où elle est annoncée ».
  it("signale ce qui n'est pas encore disponible, et rien d'autre", () => {
    render(
      <PaywallGate
        capability="brief"
        entitlements={entitlementsOf(user("radar"))}
        title="Débloque le brief"
      >
        <p>contenu</p>
      </PaywallGate>,
    );

    const aVenir = newCapabilitiesOf("creator").filter(
      (c) => CAPABILITY_INFO[c].status === "soon",
    );
    expect(screen.queryAllByText("pas encore là")).toHaveLength(aVenir.length);
  });

  // Régression du 2026-08-14, signalée par l'utilisateur : le paywall
  // n'affichait que ce que le palier ajoute par rapport au précédent, pas
  // par rapport à ce que le compte détient vraiment. Un Radar qui bute sur
  // rankingArchive (propre à Pro) ne voyait que les 4 capacités de Pro,
  // jamais les 4 de Creator qu'il gagne aussi en sautant directement
  // dessus — Pro paraissait apporter moins que le plan gratuit affiché
  // juste à côté.
  it("un compte gratuit qui saute à Pro voit aussi ce que Creator apporte", () => {
    render(
      <PaywallGate
        capability="rankingArchive"
        entitlements={entitlementsOf(user("radar"))}
        title="Débloque l'archive"
      >
        <p>contenu</p>
      </PaywallGate>,
    );
    // Propre à Pro (vu depuis Creator) — devait déjà s'afficher.
    expect(screen.getByText(CAPABILITY_INFO.rankingArchive.label)).toBeTruthy();
    // Propre à Creator (vu depuis Radar) — c'est ce qui manquait.
    expect(screen.getByText(CAPABILITY_INFO.brief.label)).toBeTruthy();
    expect(screen.getByText(CAPABILITY_INFO.earningsAll.label)).toBeTruthy();
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
