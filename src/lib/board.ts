import type { BoardAudit, BoardFinding, BoardPoint, CardKind, CaseFile, EvidenceCard, EvidenceThread, RelationKind } from "../types";

export const CARD_KINDS: CardKind[] = ["source", "observation", "claim", "hypothesis", "question", "person"];
export const RELATIONS: RelationKind[] = ["supports", "contradicts", "precedes", "implicates", "same-entity", "speculative"];
export const THREAD_COLORS = ["#d64045", "#e3b04b", "#57a6c8", "#66a37c", "#a777c4", "#e9e1cf"];
export const WORLD_LIMIT = 50_000;

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

export function clampCard(_card: EvidenceCard, x: number, y: number): Pick<EvidenceCard, "x" | "y"> {
  return {
    x: Math.round(Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, x)) * 10) / 10,
    y: Math.round(Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, y)) * 10) / 10,
  };
}

export function cardCenter(card: EvidenceCard): BoardPoint {
  return { x: card.x + card.width / 2, y: card.y + (card.height ?? 180) / 2 };
}

export function cardPin(card: EvidenceCard): BoardPoint {
  return { x: card.x + card.width / 2, y: card.y + 14 };
}

export function buildStringPath(from: EvidenceCard, to: EvidenceCard, seed = 0): string {
  const start = cardPin(from);
  const end = cardPin(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const sag = Math.min(170, Math.max(34, distance * 0.12));
  const bend = ((seed % 7) - 3) * 9;
  const c1x = start.x + dx * 0.3 + bend;
  const c2x = start.x + dx * 0.7 - bend;
  const c1y = start.y + dy * 0.3 + sag;
  const c2y = start.y + dy * 0.7 + sag;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

export function circleBounds(caseFile: CaseFile, cardIds: string[]) {
  const cards = caseFile.cards.filter((card) => cardIds.includes(card.id));
  if (!cards.length) return null;
  const left = Math.min(...cards.map((card) => card.x)) - 42;
  const top = Math.min(...cards.map((card) => card.y)) - 50;
  const right = Math.max(...cards.map((card) => card.x + card.width)) + 42;
  const bottom = Math.max(...cards.map((card) => card.y + (card.height ?? 180))) + 50;
  return { cx: (left + right) / 2, cy: (top + bottom) / 2, rx: (right - left) / 2, ry: (bottom - top) / 2 };
}

export function pointsToPath(points: BoardPoint[], close = false): string {
  if (!points.length) return "";
  return `${points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ")}${close ? " Z" : ""}`;
}

export function strokeIsClosed(points: BoardPoint[], threshold = 58): boolean {
  if (points.length < 8) return false;
  return Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) <= threshold;
}

export function pointInPolygon(point: BoardPoint, polygon: BoardPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function cardsInsidePolygon(caseFile: CaseFile, points: BoardPoint[]): string[] {
  return caseFile.cards.filter((card) => pointInPolygon(cardCenter(card), points)).map((card) => card.id);
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
    const haystack = `${card.title} ${card.body} ${card.kind} ${card.tags.join(" ")} ${card.people ?? ""} ${card.place ?? ""} ${card.time ?? ""}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function summarizeThread(thread: EvidenceThread) {
  return { id: thread.id, fromCardId: thread.fromId, toCardId: thread.toId, relation: thread.relation, rationale: thread.rationale, confidence: thread.confidence, status: thread.status, createdBy: thread.createdBy };
}
