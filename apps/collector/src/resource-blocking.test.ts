import { describe, expect, it, vi } from "vitest";
import type { Page, Route } from "playwright";
import { blockNonEssentialResources, shouldBlockResource } from "./resource-blocking.js";

describe("shouldBlockResource", () => {
  it("blocks image/font/stylesheet/media", () => {
    for (const type of ["image", "font", "stylesheet", "media"]) {
      expect(shouldBlockResource(type)).toBe(true);
    }
  });

  it("lets document/script/xhr/fetch through", () => {
    for (const type of ["document", "script", "xhr", "fetch"]) {
      expect(shouldBlockResource(type)).toBe(false);
    }
  });
});

describe("blockNonEssentialResources", () => {
  it("registers a route handler that aborts blocked types and continues the rest", async () => {
    let handler: ((route: Route) => unknown) | undefined;
    const page = {
      route: vi.fn((_pattern: string, h: (route: Route) => unknown) => {
        handler = h;
        return Promise.resolve();
      }),
    } as unknown as Page;

    await blockNonEssentialResources(page);
    expect(page.route).toHaveBeenCalledWith("**/*", expect.any(Function));

    const abort = vi.fn();
    const continueFn = vi.fn();
    const makeRoute = (resourceType: string): Route =>
      ({
        request: () => ({ resourceType: () => resourceType }),
        abort,
        continue: continueFn,
      }) as unknown as Route;

    handler!(makeRoute("image"));
    expect(abort).toHaveBeenCalledTimes(1);
    expect(continueFn).not.toHaveBeenCalled();

    handler!(makeRoute("document"));
    expect(continueFn).toHaveBeenCalledTimes(1);
  });
});
