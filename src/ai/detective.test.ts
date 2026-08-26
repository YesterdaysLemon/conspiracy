import { describe, expect, it } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { localDetective } from "./detective";

describe("local detective fallback", () => {
  it("stages the flagship dry-glove contradiction", () => {
    const result = localDetective(cloneCase(DEFAULT_CASE), "What doesn't fit?");
    expect(result.reply).toMatch(/dry glove/i);
    expect(result.action).toMatchObject({ type: "thread", fromCardId: "rain-gauge", toCardId: "violet-glove", relation: "contradicts" });
  });

  it("can group timeline clues without a model", () => {
    const result = localDetective(cloneCase(DEFAULT_CASE), "Group the timeline");
    expect(result.action).toMatchObject({ type: "circle", label: "TIMELINE" });
  });
});
