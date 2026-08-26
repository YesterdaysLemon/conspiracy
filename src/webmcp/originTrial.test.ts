import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureWebMCPOriginTrial, WEBMCP_ORIGIN_TRIAL_TOKEN } from "./originTrial";

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
});

describe("WebMCP origin trial", () => {
  it("injects the production token once before tool registration", () => {
    const prepend = vi.fn();
    const head = { querySelector: vi.fn().mockReturnValue(null), prepend };
    const meta = { httpEquiv: "", content: "" };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { head, createElement: vi.fn().mockReturnValue(meta) },
    });

    ensureWebMCPOriginTrial();

    expect(meta).toEqual({ httpEquiv: "origin-trial", content: WEBMCP_ORIGIN_TRIAL_TOKEN });
    expect(prepend).toHaveBeenCalledWith(meta);
  });

  it("preserves an existing origin-trial tag", () => {
    const head = { querySelector: vi.fn().mockReturnValue({}), prepend: vi.fn() };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { head, createElement: vi.fn() },
    });

    ensureWebMCPOriginTrial();

    expect(head.prepend).not.toHaveBeenCalled();
  });
});
