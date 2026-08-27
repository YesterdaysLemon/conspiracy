import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { askDetective } from "./provider";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detective provider", () => {
  it("never calls the hosted model without consent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await askDetective({
      caseFile: cloneCase(DEFAULT_CASE),
      prompt: "What doesn't fit?",
      consentToHostedModel: false,
    });

    expect(result.source).toBe("local");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("executes allowlisted board tools and strips attachment metadata from model-bound output", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        reply: "",
        mood: "thinking",
        model: "gpt-5.6-luna",
        toolCalls: [{ callId: "call_board", name: "inspect_board", arguments: {} }],
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        reply: "The dry glove deserves another look.",
        mood: "discovery",
        model: "gpt-5.6-luna",
        toolCalls: [],
      }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const executeTool = vi.fn().mockResolvedValue({
      cards: [{ id: "violet-glove", attachments: [{ name: "private-photo.jpg", size: 1234 }] }],
    });

    const result = await askDetective({
      caseFile: cloneCase(DEFAULT_CASE),
      prompt: "Inspect the board.",
      consentToHostedModel: true,
      clientId: "browser-test-client-0001",
      executeTool,
    });

    expect(result).toMatchObject({ source: "webmcp", mood: "discovery", tools: ["inspect_board"] });
    expect(executeTool).toHaveBeenCalledWith({ callId: "call_board", name: "inspect_board", arguments: {} });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(JSON.stringify(firstBody.caseFile)).not.toContain("attachments");
    expect(secondBody.toolResults[0].output).not.toContain("attachments");
    expect(secondBody.toolResults[0].output).not.toContain("private-photo.jpg");
  });

  it("allows three tool rounds so one turn can inspect, group, and connect before replying", async () => {
    const hostedResponses = [
      { reply: "", mood: "thinking", toolCalls: [{ callId: "call_inspect", name: "inspect_board", arguments: {} }] },
      { reply: "", mood: "thinking", toolCalls: [{ callId: "call_group", name: "circle_cards", arguments: { cardIds: ["a", "b"], label: "TIMELINE" } }] },
      { reply: "", mood: "thinking", toolCalls: [{ callId: "call_connect", name: "propose_connection", arguments: { fromCardId: "a", toCardId: "b", relation: "supports", rationale: "The sequence matches.", confidence: 82 } }] },
      { reply: "Both suggestions are staged for review.", mood: "pleased", toolCalls: [] },
    ];
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(hostedResponses.shift()), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));
    vi.stubGlobal("fetch", fetchMock);
    const executeTool = vi.fn().mockResolvedValue({ message: "ok" });

    const result = await askDetective({
      caseFile: cloneCase(DEFAULT_CASE),
      prompt: "Group the timeline and connect it.",
      consentToHostedModel: true,
      executeTool,
    });

    expect(result).toMatchObject({
      source: "webmcp",
      reply: "Both suggestions are staged for review.",
      tools: ["inspect_board", "circle_cards", "propose_connection"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(executeTool).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toMatchObject({ round: 3, toolResults: [{ ok: true }, { ok: true }, { ok: true }] });
  });

  it("does not report a failed write as an executed tool or staged suggestion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        reply: "",
        mood: "thinking",
        toolCalls: [{ callId: "call_connect", name: "propose_connection", arguments: { fromCardId: "missing", toCardId: "also-missing", relation: "supports", rationale: "Nope", confidence: 10 } }],
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        reply: "That connection could not be staged.",
        mood: "warning",
        toolCalls: [],
      }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await askDetective({
      caseFile: cloneCase(DEFAULT_CASE),
      prompt: "Connect the missing cards.",
      consentToHostedModel: true,
      executeTool: vi.fn().mockRejectedValue(new Error("Unknown cardId")),
    });

    expect(result).toMatchObject({ source: "hosted", reply: "That connection could not be staged.", tools: [] });
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(secondBody.toolResults).toMatchObject([{ name: "propose_connection", ok: false }]);
  });

  it("falls back locally when the hosted model is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await askDetective({
      caseFile: cloneCase(DEFAULT_CASE),
      prompt: "Group the timeline",
      consentToHostedModel: true,
    });
    expect(result.source).toBe("local");
    expect(result.action).toMatchObject({ type: "circle", label: "TIMELINE" });
  });
});
