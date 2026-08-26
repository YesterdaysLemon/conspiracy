import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { auditBoard } from "../lib/board";
import type { BoardMutationResult, EvidenceThread } from "../types";
import { registerWebMCPTools, type WebMCPActions } from "./registerTools";

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
});

function mutation(message: string): BoardMutationResult {
  const caseFile = cloneCase(DEFAULT_CASE);
  return { message, caseFile, audit: auditBoard(caseFile) };
}

function actionMock(): WebMCPActions {
  const proposed: EvidenceThread = { id: "thread-test", fromId: "station-ledger", toId: "violet-glove", relation: "supports", rationale: "Test", confidence: 75, color: "#d64045", status: "proposed", createdBy: "agent" };
  return {
    getCase: () => cloneCase(DEFAULT_CASE),
    getSelectedIds: () => ["station-ledger"],
    getCases: () => [{ id: DEFAULT_CASE.id!, title: DEFAULT_CASE.title, subtitle: DEFAULT_CASE.subtitle, cardCount: DEFAULT_CASE.cards.length, active: true }],
    switchCase: vi.fn(() => ({ message: "opened", caseFile: cloneCase(DEFAULT_CASE) })),
    addCard: vi.fn(() => ({ ...mutation("added"), card: DEFAULT_CASE.cards[0] })),
    updateCard: vi.fn(() => ({ ...mutation("updated"), card: DEFAULT_CASE.cards[0] })),
    moveCard: vi.fn(() => ({ ...mutation("moved"), card: DEFAULT_CASE.cards[0] })),
    focusCard: vi.fn(() => ({ message: "focused", card: DEFAULT_CASE.cards[0] })),
    removeCard: vi.fn(() => mutation("removed")),
    proposeThread: vi.fn(() => ({ ...mutation("proposed"), thread: proposed })),
    circleCards: vi.fn(() => ({ ...mutation("circled"), circle: DEFAULT_CASE.circles[0] })),
    resolveProposal: vi.fn(() => mutation("resolved")),
    getTrash: vi.fn(() => []),
    restoreTrash: vi.fn(() => mutation("restored")),
    undo: vi.fn(() => mutation("undone")),
  };
}

describe("WebMCP registration", () => {
  it("falls back cleanly when WebMCP is unavailable", async () => {
    Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
    await expect(registerWebMCPTools(actionMock())).resolves.toMatchObject({ supported: false, names: [] });
  });

  it("registers the complete case workflow with strict schemas", async () => {
    const registered: WebMCPToolDefinition[] = [];
    Object.defineProperty(globalThis, "document", { configurable: true, value: { modelContext: { registerTool: vi.fn(async (tool: WebMCPToolDefinition) => { registered.push(tool); }), getTools: vi.fn() } } });
    const actions = actionMock();
    const result = await registerWebMCPTools(actions);
    expect(result.supported).toBe(true);
    expect(result.names).toEqual([
      "inspect_board", "list_cases", "switch_case", "inspect_evidence", "search_cards", "audit_evidence", "trace_connections", "focus_card",
      "add_card", "update_card", "move_card", "remove_card", "propose_connection", "circle_cards", "resolve_proposal", "inspect_trash", "restore_trash", "undo_board_change",
    ]);
    expect(registered.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true);

    const inspect = registered.find((tool) => tool.name === "inspect_board")!;
    const inspectResult = await inspect.execute({}, { signal: new AbortController().signal }) as { selectedCardIds: string[]; cards: Array<{ body: string }> };
    expect(inspectResult.selectedCardIds).toEqual(["station-ledger"]);
    expect(inspect.annotations?.untrustedContentHint).toBe(true);

    const connect = registered.find((tool) => tool.name === "propose_connection")!;
    await connect.execute({ fromCardId: "station-ledger", toCardId: "violet-glove", relation: "supports", rationale: "Same timestamp", confidence: 75 }, { signal: new AbortController().signal });
    expect(actions.proposeThread).toHaveBeenCalledWith(expect.objectContaining({ relation: "supports", confidence: 75 }));
    await expect(connect.execute({ fromCardId: "station-ledger", toCardId: "violet-glove", relation: "supports", rationale: "Same timestamp", confidence: 75, color: "amber" }, { signal: new AbortController().signal })).rejects.toThrow("six-digit hex color");

    const move = registered.find((tool) => tool.name === "move_card")!;
    await move.execute({ cardId: "station-ledger", xWorld: 220, yWorld: -40 }, { signal: new AbortController().signal });
    expect(actions.moveCard).toHaveBeenCalledWith("station-ledger", 220, -40);
  });
});
