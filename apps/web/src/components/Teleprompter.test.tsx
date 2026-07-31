// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { Teleprompter } from "./Teleprompter";

afterEach(cleanup);

describe("Teleprompter", () => {
  it("renders the script text", () => {
    render(<Teleprompter script="Bonjour tout le monde" />);
    expect(screen.getByText("Bonjour tout le monde")).toBeTruthy();
  });

  it("toggles mirror mode, flipping the scroll area horizontally", () => {
    render(<Teleprompter script="test" />);
    const scrollArea = screen.getByTestId("scroll-area") as HTMLElement;
    expect(scrollArea.style.transform).toBe("");

    fireEvent.click(screen.getByTestId("mirror-toggle"));

    expect(scrollArea.style.transform).toBe("scaleX(-1)");
  });

  it("defaults to high contrast and can toggle it off", () => {
    render(<Teleprompter script="test" />);
    const root = screen.getByTestId("teleprompter") as HTMLElement;
    expect(root.style.backgroundColor).toBe("rgb(0, 0, 0)");

    fireEvent.click(screen.getByTestId("contrast-toggle"));

    expect(root.style.backgroundColor).not.toBe("rgb(0, 0, 0)");
  });

  it("lets the speed slider change value within [20, 200]", () => {
    render(<Teleprompter script="test" />);
    const slider = screen.getByTestId("speed-slider") as HTMLInputElement;
    expect(slider.min).toBe("20");
    expect(slider.max).toBe("200");

    fireEvent.change(slider, { target: { value: "150" } });

    expect(slider.value).toBe("150");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<Teleprompter script="test" onClose={onClose} />);

    fireEvent.click(screen.getByTestId("close-button"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render a close button when onClose is not provided", () => {
    render(<Teleprompter script="test" />);
    expect(screen.queryByTestId("close-button")).toBeNull();
  });
});
