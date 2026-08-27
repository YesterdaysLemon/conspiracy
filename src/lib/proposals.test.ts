import { describe, expect, it } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { findMatchingCircle, findMatchingThread } from "./proposals";

describe("proposal duplicate detection", () => {
  it("matches directional connections without collapsing the reverse direction", () => {
    const caseFile = cloneCase(DEFAULT_CASE);
    const thread = caseFile.threads[0];

    expect(findMatchingThread(caseFile, { fromCardId: thread.fromId, toCardId: thread.toId, relation: thread.relation })).toBe(thread);
    expect(findMatchingThread(caseFile, { fromCardId: thread.toId, toCardId: thread.fromId, relation: thread.relation })).toBeUndefined();
  });

  it("matches group labels and members independent of case and member order", () => {
    const caseFile = cloneCase(DEFAULT_CASE);
    const circle = caseFile.circles[0];

    expect(findMatchingCircle(caseFile, { cardIds: [...circle.cardIds].reverse(), label: circle.label.toLowerCase() })).toBe(circle);
    expect(findMatchingCircle(caseFile, { cardIds: circle.cardIds.slice(1), label: circle.label })).toBeUndefined();
  });
});
