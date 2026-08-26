import { describe, expect, it } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { exportableCase, initialLibrary, normalizeCase, parseImportedCase, restoreTrash, trashCard } from "./library";

describe("local case library", () => {
  it("wraps a legacy percentage case and migrates it to world coordinates", () => {
    const legacy = cloneCase(DEFAULT_CASE);
    legacy.id = undefined;
    legacy.viewport = undefined;
    legacy.cards = legacy.cards.map((card) => ({ ...card, x: card.x / 14, y: card.y / 13, width: 18 }));
    const library = initialLibrary(null, JSON.stringify(legacy));
    expect(library.version).toBe(2);
    expect(library.cases[0].cards[0].width).toBeGreaterThan(200);
    expect(library.cases[0].viewport?.zoom).toBeGreaterThan(0);
  });

  it("keeps attachments as unavailable local pointers in exports", () => {
    const source = normalizeCase(cloneCase(DEFAULT_CASE));
    source.cards[0].attachments = [{ id: "local", name: "secret.png", mimeType: "image/png", size: 44, lastModified: 1, available: true }];
    expect(exportableCase(source).cards[0].attachments).toEqual([expect.objectContaining({ name: "secret.png", available: false })]);
  });

  it("validates imported case shape without overwriting existing IDs", () => {
    const imported = parseImportedCase(JSON.stringify(DEFAULT_CASE), [DEFAULT_CASE.id!]);
    expect(imported.id).not.toBe(DEFAULT_CASE.id);
    expect(() => parseImportedCase(JSON.stringify({ title: "bad" }), [])).toThrow(/not a Loose Thread case/i);
  });

  it("persists discarded evidence and restores recoverable relationships", () => {
    const discarded = trashCard(cloneCase(DEFAULT_CASE), "window-sketch");
    expect(discarded.cards.some((card) => card.id === "window-sketch")).toBe(false);
    expect(discarded.trash).toHaveLength(1);
    const restored = restoreTrash(discarded, discarded.trash![0].id);
    expect(restored.cards.some((card) => card.id === "window-sketch")).toBe(true);
    expect(restored.threads.some((thread) => thread.id === "thread-rain-window")).toBe(true);
  });
});
