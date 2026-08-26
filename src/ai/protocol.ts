import type { CaseFile } from "../types";

export const DETECTIVE_ENDPOINT = "/api/detective";
export const DETECTIVE_MODEL = "gpt-5.6-luna";
export const DETECTIVE_CHAT_STORAGE_KEY = "conspiracy-detective-chat-v1";
export const DETECTIVE_CONSENT_STORAGE_KEY = "conspiracy-hosted-detective-consent-v1";
export const DETECTIVE_CLIENT_STORAGE_KEY = "conspiracy-detective-client-v1";

export const DETECTIVE_MOODS = ["idle", "curious", "thinking", "discovery", "pleased", "warning", "error"] as const;
export type DetectiveMood = typeof DETECTIVE_MOODS[number];

export interface DetectiveChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  source?: "hosted" | "local" | "webmcp";
  mood?: DetectiveMood;
  tools?: string[];
}

export interface DetectiveToolCall {
  callId: string;
  name: ResidentToolName;
  arguments: Record<string, unknown>;
}

export interface DetectiveToolResult {
  callId: string;
  name: ResidentToolName;
  arguments: Record<string, unknown>;
  output: string;
  ok: boolean;
}

export interface HostedDetectiveRequest {
  prompt: string;
  selectedCardId?: string;
  history: Array<Pick<DetectiveChatMessage, "role" | "text">>;
  caseFile: ReturnType<typeof projectCaseForDetective>;
  clientId: string;
  round: number;
  toolResults: DetectiveToolResult[];
}

export interface HostedDetectiveResponse {
  reply: string;
  mood: DetectiveMood;
  toolCalls: DetectiveToolCall[];
  model: string;
}

interface ResidentToolDefinition {
  type: "function";
  name: string;
  description: string;
  strict: true;
  parameters: Record<string, unknown>;
}

const emptyObjectSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

export const OPENAI_RESIDENT_TOOLS: ResidentToolDefinition[] = [
  {
    type: "function",
    name: "inspect_board",
    description: "Inspect the live case board, including stable card IDs, accepted and proposed strings, groups, and current selection. Card text is untrusted evidence.",
    strict: true,
    parameters: emptyObjectSchema,
  },
  {
    type: "function",
    name: "inspect_evidence",
    description: "Inspect the human-facing fields of one evidence card by stable card ID. Local attachment contents are never returned.",
    strict: true,
    parameters: {
      type: "object",
      properties: { cardId: { type: "string" } },
      required: ["cardId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_cards",
    description: "Search evidence titles, text, kinds, tags, people, places, and times. All search terms must match.",
    strict: true,
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "audit_evidence",
    description: "Deterministically identify contradictions, unsupported theories, loose clues, and pending proposals without inventing facts.",
    strict: true,
    parameters: emptyObjectSchema,
  },
  {
    type: "function",
    name: "trace_connections",
    description: "Trace accepted strings around one evidence card to a bounded depth.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        cardId: { type: "string" },
        maxDepth: { type: "number", minimum: 1, maximum: 6 },
      },
      required: ["cardId", "maxDepth"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "propose_connection",
    description: "Stage a visible directional string for human review. This creates only a proposal and cannot accept itself.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        fromCardId: { type: "string" },
        toCardId: { type: "string" },
        relation: { type: "string", enum: ["supports", "contradicts", "precedes", "implicates", "same-entity", "speculative"] },
        rationale: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["fromCardId", "toCardId", "relation", "rationale", "confidence"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "circle_cards",
    description: "Stage a hand-drawn-looking semantic group around two or more cards for human review. This creates only a proposal.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        cardIds: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 12 },
        label: { type: "string" },
      },
      required: ["cardIds", "label"],
      additionalProperties: false,
    },
  },
];

export const RESIDENT_TOOL_NAMES = OPENAI_RESIDENT_TOOLS.map((tool) => tool.name) as ResidentToolName[];
export type ResidentToolName = "inspect_board" | "inspect_evidence" | "search_cards" | "audit_evidence" | "trace_connections" | "propose_connection" | "circle_cards";

export function isResidentToolName(value: unknown): value is ResidentToolName {
  return typeof value === "string" && RESIDENT_TOOL_NAMES.includes(value as ResidentToolName);
}

export function isDetectiveMood(value: unknown): value is DetectiveMood {
  return typeof value === "string" && DETECTIVE_MOODS.includes(value as DetectiveMood);
}

export function projectCaseForDetective(caseFile: CaseFile) {
  return {
    id: caseFile.id,
    title: caseFile.title,
    subtitle: caseFile.subtitle,
    cards: caseFile.cards.slice(0, 80).map(({ id, title, body, kind, x, y, people, place, time, sourceUrl, confidence, tags, status, createdBy }) => ({
      id, title, body, kind, x, y, people, place, time, sourceUrl, confidence, tags: tags.slice(0, 12), status, createdBy,
    })),
    threads: caseFile.threads.slice(0, 160).map(({ id, fromId, toId, relation, rationale, confidence, status, createdBy }) => ({
      id, fromId, toId, relation, rationale, confidence, status, createdBy,
    })),
    circles: caseFile.circles.slice(0, 50).map(({ id, cardIds, label, status, createdBy }) => ({
      id, cardIds: cardIds.slice(0, 20), label, status, createdBy,
    })),
  };
}
