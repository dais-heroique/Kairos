// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { User } from "@kairos/shared";
import type { ProductRankItem } from "@/types/product-rank-item";

// Le composant ne lit Firestore que si un utilisateur Firebase est
// connecté ; `firebaseUser: null` suffit à couper la watchlist, mais le
// module est tout de même remplacé pour ne pas charger le SDK en jsdom.
const userDoc: User = {
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
    postsPerDay: 1,
    experienceLevel: "intermediaire",
    onboardingCompletedAt: new Date().toISOString(),
    timezone: "Europe/Paris",
  },
  // Plan gratuit : c'est lui qui déclenche le verrou au-delà du top 10.
  plan: { slug: "radar", status: "active", currentPeriodEnd: null, stripeCustomerId: null },
  stats: { briefsGenerated: 0, videosPosted: 0, estimatedEarningsCents: 0 },
  referredByCode: null,
  appliedInviteCode: null,
} as User;

vi.mock("@/lib/firebase/auth-context", () => ({
  useAuth: () => ({ firebaseUser: null, userDoc }),
}));

vi.mock("@/lib/firestore/watchlist", () => ({
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(),
  getWatchlistIds: vi.fn(async () => new Set<string>()),
}));

const { RankingList } = await import("./RankingList");

afterEach(cleanup);

function items(count: number, from = 1): ProductRankItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${from + i}`,
    rank: from + i,
    title: `Produit ${from + i}`,
    shopName: "Boutique",
    priceCents: 1990,
    verdict: "avec_un_angle" as const,
    salesTrend: "up" as const,
    commissionRatePct: 20,
  }));
}

// Compte les lignes dont le gain est masqué — « débloquer » est le libellé
// de LockedValue, le seul rendu visible d'une ligne verrouillée.
function lockedRows(): number {
  return screen.queryAllByText("débloquer").length;
}

describe("RankingList — verrou du plan gratuit", () => {
  it("déverrouille les 10 premières lignes et masque le reste", () => {
    render(<RankingList items={items(14)} />);
    expect(lockedRows()).toBe(4);
  });

  // Régression : le classement « Opportunités » est rendu en plusieurs
  // tranches (jouables / pas encore classables / à éviter). Sans décalage,
  // chaque tranche repartait de zéro et rouvrait son propre top 10 —
  // c'est-à-dire donnait gratuitement ce que le plan Creator vend.
  it("ne rouvre pas un top 10 par tranche", () => {
    const tout = items(14);
    const { unmount } = render(
      <RankingList items={tout.slice(0, 6)} startIndex={0} totalCount={14} showLockedSummary={false} />,
    );
    expect(lockedRows()).toBe(0);
    unmount();

    render(
      <RankingList items={tout.slice(6)} startIndex={6} totalCount={14} showLockedSummary={false} />,
    );
    // Positions 7 à 14 : les quatre premières restent offertes, les quatre
    // suivantes sont au-delà du top 10.
    expect(lockedRows()).toBe(4);
  });

  it("compte les gains masqués sur le classement entier, pas sur la tranche", () => {
    render(
      <RankingList items={items(4, 11)} startIndex={10} totalCount={14} showLockedSummary />,
    );
    expect(screen.getByText("4 gains encore masqués")).toBeDefined();
  });

  it("n'affiche le récapitulatif qu'une fois par page", () => {
    render(
      <RankingList items={items(4, 11)} startIndex={10} totalCount={14} showLockedSummary={false} />,
    );
    expect(screen.queryByText("4 gains encore masqués")).toBeNull();
  });
});
