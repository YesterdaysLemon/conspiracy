import { afterEach, describe, expect, it } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { auditBoard, uniqueId } from "../lib/board";
import type { BoardMutationResult, CaseFile, EvidenceCircle, EvidenceThread } from "../types";
import { registerWebMCPTools, type WebMCPActions } from "./registerTools";

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
});

async function liveHarness() {
  let current = cloneCase(DEFAULT_CASE);
  const registered: WebMCPToolDefinition[] = [];
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { modelContext: { registerTool: async (tool: WebMCPToolDefinition) => { registered.push(tool); } } },
  });

  const mutation = (next: CaseFile, message: string): BoardMutationResult => {
    current = cloneCase(next);
    return { message, caseFile: cloneCase(current), audit: auditBoard(current) };
  };

  const unused = () => { throw new Error("Unexpected tool action in replay."); };
  const actions: WebMCPActions = {
    getCase: () => cloneCase(current),
    getSelectedIds: () => [],
    getCases: () => [{ id: current.id!, title: current.title, subtitle: current.subtitle, cardCount: current.cards.length, active: true }],
    createCase: unused,
    updateCase: unused,
    switchCase: unused,
    addCard: unused,
    populateCase: unused,
    updateCard: unused,
    moveCard: unused,
    focusCard: unused,
    removeCard: unused,
    proposeThread: (input) => {
      for (const cardId of [input.fromCardId, input.toCardId]) if (!current.cards.some((card) => card.id === cardId)) throw new Error(`Unknown cardId: ${cardId}`);
      const thread: EvidenceThread = {
        id: uniqueId("thread", current.threads.map((item) => item.id)),
        fromId: input.fromCardId,
        toId: input.toCardId,
        relation: input.relation,
        rationale: input.rationale,
        confidence: input.confidence,
        color: input.color ?? "#d64045",
        status: "proposed",
        createdBy: "agent",
      };
      return { ...mutation({ ...current, threads: [...current.threads, thread] }, "proposed"), thread };
    },
    circleCards: (input) => {
      const cardIds = [...new Set(input.cardIds)];
      if (cardIds.length < 2) throw new Error("circle_cards needs at least two different cards.");
      for (const cardId of cardIds) if (!current.cards.some((card) => card.id === cardId)) throw new Error(`Unknown cardId: ${cardId}`);
      const circle: EvidenceCircle = {
        id: uniqueId("region", current.circles.map((item) => item.id)),
        cardIds,
        label: input.label.toUpperCase(),
        color: input.color ?? "#e3b04b",
        status: "proposed",
        createdBy: "agent",
      };
      return { ...mutation({ ...current, circles: [...current.circles, circle] }, "circled"), circle };
    },
    resolveProposal: (proposalId, decision) => {
      const proposed = current.threads.some((item) => item.id === proposalId && item.status === "proposed") || current.circles.some((item) => item.id === proposalId && item.status === "proposed");
      if (!proposed) throw new Error(`Unknown proposed thread or region: ${proposalId}`);
      return mutation(decision === "accept"
        ? { ...current, threads: current.threads.map((item) => item.id === proposalId ? { ...item, status: "accepted" } : item), circles: current.circles.map((item) => item.id === proposalId ? { ...item, status: "accepted" } : item) }
        : { ...current, threads: current.threads.filter((item) => item.id !== proposalId), circles: current.circles.filter((item) => item.id !== proposalId) }, decision);
    },
    getTrash: () => current.trash ?? [],
    restoreTrash: unused,
    undo: unused,
  };

  await registerWebMCPTools(actions);
  const byName = new Map(registered.map((tool) => [tool.name, tool]));
  const call = async (name: string, input: Record<string, unknown>) => {
    const tool = byName.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.execute(input, { signal: new AbortController().signal });
  };
  return { call, getCase: () => cloneCase(current) };
}

describe("subscription model functional client replays", () => {
  it("replays a Claude-shaped dry-glove investigation with human review preserved", async () => {
    const client = await liveHarness();
    await client.call("inspect_board", {});
    await client.call("inspect_evidence", { cardId: "violet-glove" });
    await client.call("trace_connections", { cardId: "violet-glove", maxDepth: 3 });
    await client.call("propose_connection", { fromCardId: "violet-glove", toCardId: "staged-entry", relation: "supports", rationale: "The dry glove is consistent with a staged scene.", confidence: 72, color: "#8B5CF6" });
    await client.call("resolve_proposal", { proposalId: "thread-glove-ada", decision: "reject" });
    const final = await client.call("inspect_board", {}) as { threads: Array<{ id: string; fromCardId: string; toCardId: string; status: string }> };

    expect(final.threads.some((thread) => thread.id === "thread-glove-ada")).toBe(false);
    expect(final.threads.some((thread) => thread.fromCardId === "violet-glove" && thread.toCardId === "staged-entry" && thread.status === "proposed")).toBe(true);
    expect(final.threads.some((thread) => thread.fromCardId === "violet-glove" && thread.toCardId === "staged-entry" && thread.status === "accepted")).toBe(false);
  });

  it("replays a Qwen-shaped staged-entry investigation without auto-accepting deductions", async () => {
    const client = await liveHarness();
    for (const cardId of ["violet-glove", "window-sketch", "rain-gauge"]) await client.call("inspect_evidence", { cardId });
    await client.call("trace_connections", { cardId: "staged-entry", maxDepth: 2 });
    const search = await client.call("search_cards", { query: "window" }) as { matches: Array<{ id: string }> };
    await client.call("circle_cards", { cardIds: ["violet-glove", "window-sketch", "rain-gauge", "staged-entry"], label: "staged-entry core evidence", color: "#e67e22" });
    await client.call("propose_connection", { fromCardId: "violet-glove", toCardId: "window-sketch", relation: "supports", rationale: "The dry glove and clean sill may belong to the same staged scene.", confidence: 78, color: "#9b59b6" });
    const audit = await client.call("audit_evidence", {}) as { score: number; findings: unknown[] };
    const final = client.getCase();

    expect(search.matches.map((card) => card.id)).toEqual(expect.arrayContaining(["window-sketch", "staged-entry"]));
    expect(final.circles.at(-1)?.status).toBe("proposed");
    expect(final.threads.at(-1)?.status).toBe("proposed");
    expect(audit.score).toBeLessThan(100);
    expect(audit.findings.length).toBeGreaterThan(0);
  });
});
