import { describe, expect, it } from "vitest";
import { cloneCase, EMPTY_CASE } from "../data/defaultCase";
import { populateCaseFile } from "./authoring";

describe("bulk case authoring", () => {
  it("creates a readable graph with stable ref mappings in one transaction", () => {
    const result = populateCaseFile(cloneCase(EMPTY_CASE), {
      cards: Array.from({ length: 12 }, (_, index) => ({ ref: `clue-${index}`, title: `Clue ${index}`, body: "Evidence", kind: index === 0 ? "person" : "observation" })),
      connections: [{ from: "clue-1", to: "clue-0", relation: "implicates", rationale: "Points toward the suspect", confidence: 82 }],
      regions: [{ cardRefs: ["clue-1", "clue-2"], label: "physical evidence" }],
    }, { x: 600, y: 420 });

    expect(result.cards).toHaveLength(12);
    expect(new Set(result.cards.map((card) => `${card.x}:${card.y}`)).size).toBe(12);
    expect(result.threads[0]).toMatchObject({ fromId: result.refs["clue-1"], toId: result.refs["clue-0"], status: "proposed", createdBy: "agent" });
    expect(result.circles[0].cardIds).toEqual([result.refs["clue-1"], result.refs["clue-2"]]);
  });

  it("does not mutate the original case when a later reference is invalid", () => {
    const original = cloneCase(EMPTY_CASE);
    expect(() => populateCaseFile(original, {
      cards: [{ ref: "victim", title: "Victim", body: "Found in the study", kind: "person" }],
      connections: [{ from: "victim", to: "missing", relation: "supports", rationale: "Invalid", confidence: 50 }],
    }, { x: 600, y: 420 })).toThrow("Unknown card ref: missing");
    expect(original.cards).toEqual([]);
  });
});
