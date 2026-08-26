import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloneCase, DEFAULT_CASE } from "../../../src/data/defaultCase";
import { projectCaseForDetective } from "../../../src/ai/protocol";
import { GET, POST } from "./route";

const originalApiKey = process.env.OPENAI_API_KEY;

function request(body: Record<string, unknown>, origin = "http://127.0.0.1:4173", ip?: string) {
  return new Request("http://127.0.0.1:4173/api/detective", {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...(ip ? { "cf-connecting-ip": ip } : {}) },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    prompt: "What does not fit?",
    history: [],
    caseFile: projectCaseForDetective(cloneCase(DEFAULT_CASE)),
    clientId: `route-test-${crypto.randomUUID()}`,
    round: 0,
    toolResults: [],
    ...overrides,
  };
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key-not-a-secret";
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resident detective route", () => {
  it("reports availability without exposing credentials", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ available: true, model: "gpt-5.6-luna" });
  });

  it("rejects requests when the server secret is absent", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await POST(request(validBody()));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("test-key");
  });

  it("rejects cross-origin browser requests before inference", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(request(validBody(), "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized streamed body even without a content-length header", async () => {
    const oversized = new Request("http://127.0.0.1:4173/api/detective", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:4173" },
      body: JSON.stringify({ prompt: "x".repeat(97_000) }),
    });
    expect(oversized.headers.has("content-length")).toBe(false);
    const response = await POST(oversized);
    expect(response.status).toBe(413);
  });

  it("sends a bounded, stateless, strict-tool request and drops local attachments", async () => {
    const caseFile = projectCaseForDetective(cloneCase(DEFAULT_CASE)) as ReturnType<typeof projectCaseForDetective> & { attachments?: unknown };
    caseFile.attachments = [{ name: "private-local-file.jpg" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify({ reply: "The dry glove breaks the weather story.", mood: "discovery" }) }],
      }],
    }), { status: 200, headers: { "content-type": "application/json", "x-request-id": "req_test" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(validBody({ caseFile })));
    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody).toMatchObject({ mood: "discovery", model: "gpt-5.6-luna", toolCalls: [] });
    const upstreamInit = fetchMock.mock.calls[0][1] as RequestInit;
    const upstreamBody = JSON.parse(String(upstreamInit.body));
    expect(upstreamBody).toMatchObject({
      model: "gpt-5.6-luna",
      store: false,
      parallel_tool_calls: false,
      max_output_tokens: 700,
    });
    expect(upstreamBody.tools.length).toBe(7);
    expect(upstreamBody.tools.every((tool: Record<string, unknown>) => tool.strict === true)).toBe(true);
    expect(JSON.stringify(upstreamBody)).not.toContain("private-local-file.jpg");
  });

  it("returns only allowlisted function calls for browser execution", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: "function_call", call_id: "call_audit", name: "audit_evidence", arguments: "{}" }],
      output_text: "",
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const response = await POST(request(validBody()));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      toolCalls: [{ callId: "call_audit", name: "audit_evidence", arguments: {} }],
    });
  });

  it("rate limits by network identity even when the client ID changes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      output: [],
      output_text: JSON.stringify({ reply: "Still looking.", mood: "curious" }),
    }), { status: 200, headers: { "content-type": "application/json" } }))));

    const responses: Response[] = [];
    for (let index = 0; index < 13; index += 1) {
      responses.push(await POST(request(validBody({ clientId: `rotating-client-${index}` }), "http://127.0.0.1:4173", "203.0.113.77")));
    }

    expect(responses.slice(0, 12).every((response) => response.status === 200)).toBe(true);
    expect(responses[12].status).toBe(429);
  });
});
