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
  const proposed: EvidenceThread = { id: "thread-test", fromId: "station-log", toId: "red-umbrella", relation: "supports", rationale: "Test", confidence: 75, color: "#d64045", status: "proposed", createdBy: "agent" };
  return {
    getCase: () => cloneCase(DEFAULT_CASE),
    getSelectedIds: () => ["station-log"],
    addCard: vi.fn(() => ({ ...mutation("added"), card: DEFAULT_CASE.cards[0] })),
    moveCard: vi.fn(() => ({ ...mutation("moved"), card: DEFAULT_CASE.cards[0] })),
    removeCard: vi.fn(() => mutation("removed")),
    proposeThread: vi.fn(() => ({ ...mutation("proposed"), thread: proposed })),
    circleCards: vi.fn(() => ({ ...mutation("circled"), circle: DEFAULT_CASE.circles[0] })),
    resolveProposal: vi.fn(() => mutation("resolved")),
    undo: vi.fn(() => mutation("undone")),
  };
}

describe("WebMCP registration", () => {
  it("falls back cleanly when WebMCP is unavailable", async () => {
    Object.defineProperty(globalThis, "document", { configurable: true, value: {} });
    await expect(registerWebMCPTools(actionMock())).resolves.toMatchObject({ supported: false, names: [] });
  });

  it("registers the complete mystery workflow and executes model inputs", async () => {
    const registered: WebMCPToolDefinition[] = [];
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { modelContext: { registerTool: vi.fn(async (tool: WebMCPToolDefinition) => { registered.push(tool); }), getTools: vi.fn() } },
    });
    const actions = actionMock();
    const result = await registerWebMCPTools(actions);
    expect(result.supported).toBe(true);
    expect(result.names).toEqual([
      "inspect_board", "search_cards", "audit_evidence", "trace_connections", "add_card",
      "move_card", "remove_card", "propose_connection", "circle_cards", "resolve_proposal", "undo_board_change",
    ]);
    const inspect = registered.find((tool) => tool.name === "inspect_board")!;
    const inspectResult = await inspect.execute({}, { signal: new AbortController().signal }) as { selectedCardIds: string[] };
    expect(inspectResult.selectedCardIds).toEqual(["station-log"]);
    expect(inspect.annotations?.untrustedContentHint).toBe(true);

    const connect = registered.find((tool) => tool.name === "propose_connection")!;
    await connect.execute({ fromCardId: "station-log", toCardId: "red-umbrella", relation: "supports", rationale: "Same timestamp", confidence: 75 }, { signal: new AbortController().signal });
    expect(actions.proposeThread).toHaveBeenCalledWith(expect.objectContaining({ relation: "supports", confidence: 75 }));
  });
});
