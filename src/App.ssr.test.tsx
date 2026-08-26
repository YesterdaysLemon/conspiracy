import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("server rendering", () => {
  it("renders a fresh visit without browser-only globals", () => {
    const html = renderToString(<App />);

    expect(html).toContain("LOOSE THREAD");
    expect(html).toContain("Every clue");
  });
});
