import { localDetective } from "./detective";
import type { CaseFile, DetectiveProposal } from "../types";
import {
  DETECTIVE_ENDPOINT,
  isDetectiveMood,
  isResidentToolName,
  projectCaseForDetective,
  type DetectiveChatMessage,
  type DetectiveMood,
  type DetectiveToolCall,
  type DetectiveToolResult,
  type HostedDetectiveResponse,
} from "./protocol";

export interface DetectiveProviderRequest {
  caseFile: CaseFile;
  prompt: string;
  selectedCardId?: string;
  consentToHostedModel: boolean;
  history?: DetectiveChatMessage[];
  clientId?: string;
  executeTool?: (call: DetectiveToolCall) => Promise<unknown>;
}

export interface DetectiveProviderResponse extends DetectiveProposal {
  source: "hosted" | "local" | "webmcp";
  mood: DetectiveMood;
  tools: string[];
}

export interface HostedDetectiveAvailability {
  available: boolean;
  model?: string;
}

function validProposal(value: unknown): value is DetectiveProposal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DetectiveProposal;
  return typeof candidate.reply === "string" && candidate.reply.length > 0 && candidate.reply.length < 500;
}

function endpoint() {
  return (import.meta.env.VITE_DETECTIVE_ENDPOINT as string | undefined) ?? DETECTIVE_ENDPOINT;
}

function validHostedResponse(value: unknown): value is HostedDetectiveResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as HostedDetectiveResponse;
  if (typeof candidate.reply !== "string" || candidate.reply.length >= 500 || !isDetectiveMood(candidate.mood) || !Array.isArray(candidate.toolCalls)) return false;
  return candidate.toolCalls.length <= 4 && candidate.toolCalls.every((call) => (
    call && typeof call === "object"
    && typeof call.callId === "string"
    && isResidentToolName(call.name)
    && call.arguments && typeof call.arguments === "object" && !Array.isArray(call.arguments)
  ));
}

function withoutLocalAttachments(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutLocalAttachments);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => (
    key === "attachments" ? [] : [[key, withoutLocalAttachments(item)]]
  )));
}

function compactToolOutput(value: unknown): string {
  try {
    const serialized = JSON.stringify(withoutLocalAttachments(value));
    return (serialized || "null").slice(0, 6_000);
  } catch {
    return JSON.stringify({ error: "Tool returned a non-serializable result." });
  }
}

async function requestHostedDetective(request: DetectiveProviderRequest, round: number, toolResults: DetectiveToolResult[]): Promise<HostedDetectiveResponse> {
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: request.prompt,
      selectedCardId: request.selectedCardId,
      history: (request.history ?? []).slice(-12).map(({ role, text }) => ({ role, text })),
      caseFile: projectCaseForDetective(request.caseFile),
      clientId: request.clientId ?? "anonymous",
      round,
      toolResults,
    }),
  });
  if (!response.ok) throw new Error(`Hosted detective returned ${response.status}.`);
  const result = await response.json() as unknown;
  if (!validHostedResponse(result)) throw new Error("Hosted detective returned an invalid response.");
  return result;
}

export async function getHostedDetectiveAvailability(): Promise<HostedDetectiveAvailability> {
  try {
    const response = await fetch(endpoint(), { method: "GET", cache: "no-store", signal: AbortSignal.timeout(4_000) });
    if (!response.ok) return { available: false };
    const result = await response.json() as unknown;
    if (!result || typeof result !== "object") return { available: false };
    const candidate = result as HostedDetectiveAvailability;
    return { available: candidate.available === true, model: typeof candidate.model === "string" ? candidate.model : undefined };
  } catch {
    return { available: false };
  }
}

export async function askDetective(request: DetectiveProviderRequest): Promise<DetectiveProviderResponse> {
  if (request.consentToHostedModel) {
    const toolResults: DetectiveToolResult[] = [];
    const tools: string[] = [];
    let stagedSuggestion = false;
    try {
      for (let round = 0; round <= 2; round += 1) {
        const hosted = await requestHostedDetective(request, round, toolResults);
        if (hosted.toolCalls.length && request.executeTool && round < 2) {
          for (const call of hosted.toolCalls.slice(0, 2)) {
            if (toolResults.length >= 4) break;
            tools.push(call.name);
            stagedSuggestion ||= call.name === "propose_connection" || call.name === "circle_cards";
            try {
              const output = await request.executeTool(call);
              toolResults.push({ ...call, output: compactToolOutput(output), ok: true });
            } catch (error) {
              toolResults.push({ ...call, output: compactToolOutput({ error: error instanceof Error ? error.message : String(error) }), ok: false });
            }
          }
          continue;
        }
        if (hosted.reply.trim()) return { reply: hosted.reply, source: tools.length ? "webmcp" : "hosted", mood: hosted.mood, tools };
      }
      if (stagedSuggestion) return { reply: "I left a lead moving on the board.", source: "webmcp", mood: "pleased", tools };
    } catch {
      if (stagedSuggestion) return { reply: "The wire went quiet. The lead is still on the board.", source: "webmcp", mood: "warning", tools };
    }
  }
  const local = localDetective(request.caseFile, request.prompt, request.selectedCardId);
  return { ...local, source: "local", mood: local.action ? "discovery" : "curious", tools: [] };
}
