import { describe, expect, it } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { auditBoard, buildStringPath, cardPin, cardsInsidePolygon, clampCard, organicRegionPaths, pointInPolygon, searchCards, slugify, strokeIsClosed, traceCard, uniqueId, WORLD_LIMIT } from "./board";

describe("evidence board logic", () => {
  it("allows an infinite-feeling plane while rejecting absurd coordinates", () => {
    const card = DEFAULT_CASE.cards[0];
    expect(clampCard(card, -20, 130)).toEqual({ x: -20, y: 130 });
    expect(clampCard(card, WORLD_LIMIT + 99, -WORLD_LIMIT - 10)).toEqual({ x: WORLD_LIMIT, y: -WORLD_LIMIT });
  });

  it("ties directional sagging string to the actual pushpins", () => {
    const first = DEFAULT_CASE.cards[0];
    const second = DEFAULT_CASE.cards[1];
    const path = buildStringPath(first, second, 2);
    const start = cardPin(first);
    const end = cardPin(second);
    expect(path).toMatch(new RegExp(`^M ${start.x} ${start.y} C `));
    expect(path.endsWith(`${end.x} ${end.y}`)).toBe(true);
  });

  it("audits only accepted reasoning as established", () => {
    const audit = auditBoard(DEFAULT_CASE);
    expect(audit.contradictionThreadIds).toEqual(["thread-rain-window"]);
    expect(audit.unsupportedClaimIds).toEqual([]);
    expect(audit.orphanCardIds).toEqual(expect.arrayContaining(["ada-wren", "missing-cinder"]));
    expect(audit.score).toBe(83);
  });

  it("finds evidence by content, people, place, time, and tags", () => {
    expect(searchCards(DEFAULT_CASE, "weather").map((card) => card.id)).toEqual(["violet-glove", "rain-gauge"]);
    expect(searchCards(DEFAULT_CASE, "station timeline").map((card) => card.id)).toEqual(["station-ledger"]);
    expect(searchCards(DEFAULT_CASE, "Ada drawing").map((card) => card.id)).toEqual(["ada-wren"]);
  });

  it("traces a bounded accepted evidence neighborhood", () => {
    const trace = traceCard(DEFAULT_CASE, "window-sketch", 1);
    expect(trace.cards.map((card) => card.id)).toEqual(expect.arrayContaining(["window-sketch", "rain-gauge", "staged-entry"]));
    expect(trace.threads).toHaveLength(2);
  });

  it("recognizes closed chalk loops and the cards inside them", () => {
    const polygon = [{ x: 40, y: 50 }, { x: 450, y: 50 }, { x: 450, y: 370 }, { x: 40, y: 370 }, { x: 42, y: 52 }, { x: 40, y: 50 }, { x: 41, y: 51 }, { x: 40, y: 50 }];
    expect(strokeIsClosed(polygon)).toBe(true);
    expect(pointInPolygon({ x: 120, y: 120 }, polygon)).toBe(true);
    expect(cardsInsidePolygon(DEFAULT_CASE, polygon)).toContain("station-ledger");
  });

  it("wraps nearby clues in one organic cell", () => {
    const regions = organicRegionPaths(DEFAULT_CASE, ["violet-glove", "rain-gauge", "window-sketch"], "weather-cell");
    expect(regions).toHaveLength(1);
    expect(regions[0].cardIds).toEqual(expect.arrayContaining(["violet-glove", "rain-gauge", "window-sketch"]));
    expect(regions[0].d).toMatch(/^M .* Q .* Z$/);
  });

  it("splits distant clue groups like cells in mitosis", () => {
    const separated = cloneCase(DEFAULT_CASE);
    separated.cards = separated.cards.map((card) => card.id === "missing-cinder" ? { ...card, x: 4_000, y: 4_000 } : card);
    const regions = organicRegionPaths(separated, ["station-ledger", "missing-cinder"], "split-cell");
    expect(regions).toHaveLength(2);
    expect(regions.flatMap((region) => region.cardIds)).toEqual(expect.arrayContaining(["station-ledger", "missing-cinder"]));
  });

  it("deep-clones attachments, drawings, and trash", () => {
    const source = cloneCase(DEFAULT_CASE);
    source.cards[0].attachments = [{ id: "file-1", name: "ledger.jpg", mimeType: "image/jpeg", size: 2, lastModified: 1, available: false }];
    const copy = cloneCase(source);
    copy.cards[0].tags.push("changed");
    copy.cards[0].attachments![0].name = "changed.jpg";
    expect(source.cards[0].tags).not.toContain("changed");
    expect(source.cards[0].attachments![0].name).toBe("ledger.jpg");
  });

  it("derives new stable IDs from tool results instead of model guesses", () => {
    const id = uniqueId(slugify("TICKET OFFICE CAMERA"), DEFAULT_CASE.cards.map((card) => card.id));
    expect(id).toBe("ticket-office-camera-8");
    expect(id).not.toBe("card-1");
  });
});
