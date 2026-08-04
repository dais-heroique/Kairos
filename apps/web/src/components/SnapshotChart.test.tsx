// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ProductSnapshot } from "@kairos/shared";
import { SnapshotChart } from "./SnapshotChart";

afterEach(cleanup);

function series(count: number, shape: (i: number) => Partial<ProductSnapshot> = () => ({})) {
  return Array.from({ length: count }, (_, i) => ({
    productId: "p",
    capturedDate: `2026-07-${String(i + 1).padStart(2, "0")}`,
    priceCents: 1690,
    reviewCount: 100 + i * 10,
    ratingAvg: 4.6,
    activeCreatorCount: 5 + i,
    videoCount: 20 + i,
    competingShopCount: 3 + i,
    estSalesLow: 80 + i * 10,
    estSalesHigh: 120 + i * 10,
    confidence: 0.6,
    ...shape(i),
  })) as ProductSnapshot[];
}

describe("SnapshotChart", () => {
  it("refuse de tracer une courbe avec un seul point", () => {
    render(<SnapshotChart snapshots={series(1)} />);
    expect(screen.getByText(/au moins deux relevés/i)).toBeTruthy();
  });

  it("trace une courbe par indicateur suivi", () => {
    const { container } = render(<SnapshotChart snapshots={series(10)} />);
    // Ventes, boutiques concurrentes, créateurs actifs.
    expect(container.querySelectorAll("path")).toHaveLength(3);
    expect(screen.getByText("Ventes estimées")).toBeTruthy();
    expect(screen.getByText("Boutiques concurrentes")).toBeTruthy();
  });

  it("borne l'affichage à 45 relevés et le dit", () => {
    render(<SnapshotChart snapshots={series(60)} />);
    expect(screen.getByText(/45 relevés \(sur 60\)/)).toBeTruthy();
  });

  it("résume la variation de la période en clair", () => {
    render(<SnapshotChart snapshots={series(10)} />);
    expect(screen.getByText(/ventes \+/i)).toBeTruthy();
  });

  // Une série parfaitement plate met min === max : sans garde, la mise à
  // l'échelle divise par zéro et le tracé devient "NaN".
  it("ne produit pas de NaN sur une série plate", () => {
    const flat = series(6, () => ({
      estSalesLow: 100,
      estSalesHigh: 100,
      competingShopCount: 4,
      activeCreatorCount: 9,
    }));
    const { container } = render(<SnapshotChart snapshots={flat} />);
    for (const path of container.querySelectorAll("path")) {
      expect(path.getAttribute("d")).not.toContain("NaN");
    }
  });
});
