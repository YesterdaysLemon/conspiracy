import type { BoardAudit, BoardFinding, CardKind, CaseFile, EvidenceCard, EvidenceThread, RelationKind } from "../types";

export const CARD_KINDS: CardKind[] = ["source", "observation", "claim", "hypothesis", "question", "person"];
export const RELATIONS: RelationKind[] = ["supports", "contradicts", "precedes", "implicates", "same-entity", "speculative"];
export const THREAD_COLORS = ["#d64045", "#e3b04b", "#57a6c8", "#66a37c", "#a777c4"];

export function slugify(value: string): string {
  const clean = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return clean || "clue";
}

export function uniqueId(prefix: string, existing: string[]): string {
  let index = existing.length + 1;
  let candidate = `${prefix}-${index}`;
  while (existing.includes(candidate)) candidate = `${prefix}-${++index}`;
  return candidate;
}

export function clampCard(card: EvidenceCard, x: number, y: number): Pick<EvidenceCard, "x" | "y"> {
  return {
    x: Math.round(Math.max(1, Math.min(97 - card.width, x)) * 10) / 10,
    y: Math.round(Math.max(2, Math.min(82, y)) * 10) / 10,
  };
}

export function cardCenter(card: EvidenceCard): { x: number; y: number } {
  return { x: card.x + card.width / 2, y: card.y + 9 };
}

function edgeAnchor(card: EvidenceCard, toward: { x: number; y: number }) {
  const center = cardCenter(card);
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scaleX = Math.abs(dx) > 0.001 ? (card.width / 2 + .65) / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(dy) > 0.001 ? 9.5 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

export function buildStringPath(from: EvidenceCard, to: EvidenceCard, seed = 0): string {
  const fromCenter = cardCenter(from);
  const toCenter = cardCenter(to);
  const start = edgeAnchor(from, toCenter);
  const end = edgeAnchor(to, fromCenter);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const sag = Math.min(9, 2.8 + distance * 0.085);
  const bend = ((seed % 5) - 2) * 0.7;
  const c1x = start.x + dx * 0.28 + bend;
  const c2x = start.x + dx * 0.72 - bend;
  const c1y = start.y + dy * 0.28 + sag;
  const c2y = start.y + dy * 0.72 + sag;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

export function circleBounds(caseFile: CaseFile, cardIds: string[]) {
  const cards = caseFile.cards.filter((card) => cardIds.includes(card.id));
  if (!cards.length) return null;
  const left = Math.min(...cards.map((card) => card.x)) - 2;
  const top = Math.min(...cards.map((card) => card.y)) - 4;
  const right = Math.max(...cards.map((card) => card.x + card.width)) + 2;
  const bottom = Math.max(...cards.map((card) => card.y + 19)) + 4;
  return { cx: (left + right) / 2, cy: (top + bottom) / 2, rx: (right - left) / 2, ry: (bottom - top) / 2 };
}

export function auditBoard(caseFile: CaseFile): BoardAudit {
  const findings: BoardFinding[] = [];
  const accepted = caseFile.threads.filter((thread) => thread.status === "accepted");
  const supportedTargets = new Set(accepted.filter((thread) => thread.relation === "supports").map((thread) => thread.toId));
  const unsupportedClaimIds = caseFile.cards.filter((card) => (card.kind === "claim" || card.kind === "hypothesis") && !supportedTargets.has(card.id)).map((card) => card.id);
  const contradictionThreadIds = accepted.filter((thread) => thread.relation === "contradicts").map((thread) => thread.id);
  const connected = new Set(accepted.flatMap((thread) => [thread.fromId, thread.toId]));
  const orphanCardIds = caseFile.cards.filter((card) => !connected.has(card.id)).map((card) => card.id);

  if (contradictionThreadIds.length) findings.push({ id: "contradictions", severity: "lead", title: `${contradictionThreadIds.length} contradiction${contradictionThreadIds.length === 1 ? "" : "s"}`, detail: "Conflicting evidence deserves the next look.", cardIds: accepted.filter((thread) => contradictionThreadIds.includes(thread.id)).flatMap((thread) => [thread.fromId, thread.toId]), threadIds: contradictionThreadIds });
  if (unsupportedClaimIds.length) findings.push({ id: "unsupported", severity: "warning", title: `${unsupportedClaimIds.length} unsupported theor${unsupportedClaimIds.length === 1 ? "y" : "ies"}`, detail: "No accepted supporting thread reaches these cards.", cardIds: unsupportedClaimIds, threadIds: [] });
  if (orphanCardIds.length) findings.push({ id: "orphans", severity: "warning", title: `${orphanCardIds.length} loose clue${orphanCardIds.length === 1 ? "" : "s"}`, detail: "These cards have no accepted connection yet.", cardIds: orphanCardIds, threadIds: [] });
  const sourcedClaims = caseFile.cards.filter((card) => card.kind === "claim" || card.kind === "hypothesis").length - unsupportedClaimIds.length;
  if (sourcedClaims > 0) findings.push({ id: "sourced", severity: "clear", title: `${sourcedClaims} supported theor${sourcedClaims === 1 ? "y" : "ies"}`, detail: "Accepted evidence reaches these conclusions.", cardIds: [...supportedTargets], threadIds: accepted.filter((thread) => thread.relation === "supports").map((thread) => thread.id) });
  const penalty = unsupportedClaimIds.length * 16 + orphanCardIds.length * 7 + caseFile.threads.filter((thread) => thread.status === "proposed").length * 3;
  return { score: Math.max(0, Math.min(100, 100 - penalty)), findings, unsupportedClaimIds, contradictionThreadIds, orphanCardIds, checkedAt: new Date().toISOString() };
}

export function traceCard(caseFile: CaseFile, startId: string, maxDepth = 4) {
  if (!caseFile.cards.some((card) => card.id === startId)) throw new Error(`Unknown cardId: ${startId}`);
  const nodes = new Set<string>([startId]);
  const edges: EvidenceThread[] = [];
  let frontier = [startId];
  for (let depth = 0; depth < maxDepth && frontier.length; depth += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const thread of caseFile.threads.filter((item) => item.status === "accepted" && (item.fromId === id || item.toId === id))) {
        if (!edges.some((edge) => edge.id === thread.id)) edges.push(thread);
        const neighbor = thread.fromId === id ? thread.toId : thread.fromId;
        if (!nodes.has(neighbor)) { nodes.add(neighbor); next.push(neighbor); }
      }
    }
    frontier = next;
  }
  return { cards: caseFile.cards.filter((card) => nodes.has(card.id)), threads: edges };
}

export function searchCards(caseFile: CaseFile, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return caseFile.cards.filter((card) => {
    const haystack = `${card.title} ${card.body} ${card.kind} ${card.tags.join(" ")}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function summarizeThread(thread: EvidenceThread) {
  return { id: thread.id, fromCardId: thread.fromId, toCardId: thread.toId, relation: thread.relation, rationale: thread.rationale, confidence: thread.confidence, status: thread.status, createdBy: thread.createdBy };
}
