import { localDetective } from "./detective";
import type { CaseFile, DetectiveProposal } from "../types";

export interface DetectiveProviderRequest {
  caseFile: CaseFile;
  prompt: string;
  selectedCardId?: string;
  consentToHostedModel: boolean;
}

function caseProjection(caseFile: CaseFile) {
  return {
    id: caseFile.id,
    title: caseFile.title,
    cards: caseFile.cards.map(({ id, title, body, kind, people, place, time, sourceUrl, confidence, tags, status }) => ({ id, title, body, kind, people, place, time, sourceUrl, confidence, tags, status })),
    threads: caseFile.threads,
    circles: caseFile.circles.map(({ id, cardIds, label, status, createdBy }) => ({ id, cardIds, label, status, createdBy })),
  };
}

function validProposal(value: unknown): value is DetectiveProposal {
  if (!value || typeof value !== "object") return false;
  const candidate = value as DetectiveProposal;
  return typeof candidate.reply === "string" && candidate.reply.length > 0 && candidate.reply.length < 500;
}

export async function askDetective(request: DetectiveProviderRequest): Promise<DetectiveProposal & { source: "hosted" | "local" }> {
  const endpoint = import.meta.env.VITE_DETECTIVE_ENDPOINT as string | undefined;
  if (endpoint && request.consentToHostedModel) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: request.prompt, selectedCardId: request.selectedCardId, caseFile: caseProjection(request.caseFile) }),
      });
      if (response.ok) {
        const result = await response.json() as unknown;
        if (validProposal(result)) return { ...result, source: "hosted" };
      }
    } catch { /* the keyless build deliberately falls through */ }
  }
  return { ...localDetective(request.caseFile, request.prompt, request.selectedCardId), source: "local" };
}
