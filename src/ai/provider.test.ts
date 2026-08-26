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
