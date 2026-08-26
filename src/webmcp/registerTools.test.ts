import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { auditBoard } from "../lib/board";
import type { BoardMutationResult, EvidenceThread } from "../types";
import { createWebMCPTools, registerWebMCPTools, type WebMCPActions } from "./registerTools";

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
    createCase: vi.fn(() => ({ message: "created", caseFile: cloneCase(DEFAULT_CASE) })),
    updateCase: vi.fn(() => ({ message: "updated case", caseFile: cloneCase(DEFAULT_CASE) })),
    switchCase: vi.fn(() => ({ message: "opened", caseFile: cloneCase(DEFAULT_CASE) })),
    addCard: vi.fn(() => ({ ...mutation("added"), card: DEFAULT_CASE.cards[0] })),
    populateCase: vi.fn(() => ({ ...mutation("populated"), cards: [DEFAULT_CASE.cards[0]], threads: [], circles: [], refs: { victim: DEFAULT_CASE.cards[0].id } })),
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
    await expect(registerWebMCPTools(actionMock())).resolves.toMatchObject({ supported: false, state: "preview", registeredCount: 0, names: expect.arrayContaining(["webmcp_status", "inspect_board", "populate_case"]) });
  });

  it("registers the complete case workflow with strict schemas", async () => {
    const registered: WebMCPToolDefinition[] = [];
    Object.defineProperty(globalThis, "document", { configurable: true, value: { modelContext: { registerTool: vi.fn(async (tool: WebMCPToolDefinition) => { registered.push(tool); }), getTools: vi.fn() } } });
    const actions = actionMock();
    const result = await registerWebMCPTools(actions);
    expect(result.supported).toBe(true);
    expect(result.state).toBe("live");
    expect(result.registeredCount).toBe(result.names.length);
    expect(result.names).toEqual([
      "webmcp_status", "inspect_board", "list_cases", "create_case", "update_case", "switch_case", "inspect_evidence", "search_cards", "audit_evidence", "trace_connections", "focus_card",
      "add_card", "populate_case", "update_card", "move_card", "remove_card", "propose_connection", "circle_cards", "resolve_proposal", "inspect_trash", "restore_trash", "undo_board_change",
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

    const create = registered.find((tool) => tool.name === "create_case")!;
    await create.execute({ title: "The Clockwork Wake", subtitle: "CASE 018" }, { signal: new AbortController().signal });
    expect(actions.createCase).toHaveBeenCalledWith({ title: "The Clockwork Wake", subtitle: "CASE 018" });

    const updateCase = registered.find((tool) => tool.name === "update_case")!;
    await updateCase.execute({ caseId: DEFAULT_CASE.id, title: "Renamed" }, { signal: new AbortController().signal });
    expect(actions.updateCase).toHaveBeenCalledWith(DEFAULT_CASE.id, { title: "Renamed" });
    await expect(updateCase.execute({ caseId: DEFAULT_CASE.id }, { signal: new AbortController().signal })).rejects.toThrow("Provide title or subtitle");

    const populate = registered.find((tool) => tool.name === "populate_case")!;
    await populate.execute({ cards: [{ ref: "victim", title: "Victim", body: "Found in the study", kind: "person" }] }, { signal: new AbortController().signal });
    expect(actions.populateCase).toHaveBeenCalledWith(undefined, { cards: [expect.objectContaining({ ref: "victim", kind: "person" })], connections: [], regions: [] });
    await expect(populate.execute({ cards: [{ ref: "bad", title: "Bad", body: "Bad", kind: "observation", xWorld: 4 }] }, { signal: new AbortController().signal })).rejects.toThrow("both xWorld and yWorld");
  });

  it("runs the same smoke definition locally and reports registration failures", async () => {
    const actions = actionMock();
    const smoke = createWebMCPTools(actions).find((tool) => tool.name === "webmcp_status")!;
    await expect(smoke.execute({}, { signal: new AbortController().signal })).resolves.toMatchObject({ ok: true, activeCaseId: DEFAULT_CASE.id, cardCount: DEFAULT_CASE.cards.length });

    Object.defineProperty(globalThis, "document", { configurable: true, value: { modelContext: { registerTool: vi.fn(async (tool: WebMCPToolDefinition) => { if (tool.name === "list_cases") throw new Error("bridge refused tool"); }) } } });
    await expect(registerWebMCPTools(actions)).resolves.toMatchObject({ supported: false, state: "error", registeredCount: 2, error: expect.stringContaining("bridge refused tool") });
  });
});
