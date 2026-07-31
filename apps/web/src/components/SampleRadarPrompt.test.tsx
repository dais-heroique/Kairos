// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SampleRadarPrompt } from "./SampleRadarPrompt";

afterEach(cleanup);

describe("SampleRadarPrompt", () => {
  it("shows the product title in the prompt", () => {
    render(
      <SampleRadarPrompt productId="p1" productTitle="Sérum visage" onRespond={vi.fn()} />,
    );
    expect(screen.getByText(/Sérum visage/)).toBeTruthy();
  });

  it("calls onRespond(productId, true) when 'Oui' is tapped", async () => {
    const onRespond = vi.fn().mockResolvedValue(undefined);
    render(<SampleRadarPrompt productId="p1" onRespond={onRespond} />);

    fireEvent.click(screen.getByTestId("sample-radar-yes"));

    expect(onRespond).toHaveBeenCalledWith("p1", true);
  });

  it("calls onRespond(productId, false) when 'Pas encore' is tapped", async () => {
    const onRespond = vi.fn().mockResolvedValue(undefined);
    render(<SampleRadarPrompt productId="p1" onRespond={onRespond} />);

    fireEvent.click(screen.getByTestId("sample-radar-no"));

    expect(onRespond).toHaveBeenCalledWith("p1", false);
  });

  it("shows a thank-you state after a single tap, hiding the prompt", async () => {
    const onRespond = vi.fn().mockResolvedValue(undefined);
    render(<SampleRadarPrompt productId="p1" onRespond={onRespond} />);

    fireEvent.click(screen.getByTestId("sample-radar-yes"));
    await vi.waitFor(() => {
      expect(screen.getByTestId("sample-radar-thanks")).toBeTruthy();
    });

    expect(screen.queryByTestId("sample-radar-prompt")).toBeNull();
  });
});
