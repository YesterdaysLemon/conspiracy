import { describe, expect, it } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { auditBoard, buildStringPath, clampCard, searchCards, slugify, traceCard, uniqueId } from "./board";

describe("evidence board logic", () => {
  it("keeps cards inside the usable corkboard", () => {
    const card = DEFAULT_CASE.cards[0];
    expect(clampCard(card, -20, 130)).toEqual({ x: 1, y: 82 });
    expect(clampCard(card, 99, -10)).toEqual({ x: 79, y: 2 });
  });

  it("draws a directional, sagging cubic string between cards", () => {
    const first = DEFAULT_CASE.cards[0];
    const second = DEFAULT_CASE.cards[1];
    const path = buildStringPath(first, second, 2);
    expect(path).toMatch(/^M [\d.]+ [\d.]+ C /);
    expect(path.endsWith(`${second.x + second.width / 2} ${second.y + 9}`)).toBe(false);
  });

  it("audits only accepted reasoning as established", () => {
    const audit = auditBoard(DEFAULT_CASE);
    expect(audit.contradictionThreadIds).toEqual(["thread-weather-photo"]);
    expect(audit.unsupportedClaimIds).toEqual([]);
    expect(audit.orphanCardIds).toEqual(expect.arrayContaining(["mara-vale", "missing-ticket"]));
    expect(audit.score).toBe(83);
  });

  it("finds evidence by content and tags", () => {
    expect(searchCards(DEFAULT_CASE, "weather").map((card) => card.id)).toEqual(["clock-photo", "weather-note"]);
    expect(searchCards(DEFAULT_CASE, "station timeline").map((card) => card.id)).toEqual(["station-log"]);
  });

  it("traces a bounded accepted evidence neighborhood", () => {
    const trace = traceCard(DEFAULT_CASE, "clock-photo", 1);
    expect(trace.cards.map((card) => card.id)).toEqual(expect.arrayContaining(["clock-photo", "weather-note", "wrong-night"]));
    expect(trace.threads).toHaveLength(2);
  });

  it("does not mutate the sample when cloned", () => {
    const copy = cloneCase(DEFAULT_CASE);
    copy.cards[0].tags.push("changed");
    expect(DEFAULT_CASE.cards[0].tags).not.toContain("changed");
  });

  it("derives a new card ID from the tool result instead of a model guess", () => {
    const id = uniqueId(slugify("TICKET OFFICE CAMERA"), DEFAULT_CASE.cards.map((card) => card.id));
    expect(id).toBe("ticket-office-camera-8");
    expect(id).not.toBe("card-1");
  });
});
