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

export interface OrganicRegionPath {
  cardIds: string[];
  d: string;
  label: BoardPoint;
  points: BoardPoint[];
}

const REGION_LINK_PADDING = 115;
const REGION_OUTLINE_PADDING = 44;

function expandedCardsTouch(a: EvidenceCard, b: EvidenceCard): boolean {
  const aBottom = a.y + (a.height ?? 180);
  const bBottom = b.y + (b.height ?? 180);
  return a.x - REGION_LINK_PADDING <= b.x + b.width + REGION_LINK_PADDING
    && a.x + a.width + REGION_LINK_PADDING >= b.x - REGION_LINK_PADDING
    && a.y - REGION_LINK_PADDING <= bBottom + REGION_LINK_PADDING
    && aBottom + REGION_LINK_PADDING >= b.y - REGION_LINK_PADDING;
}

function clusterCards(cards: EvidenceCard[]): EvidenceCard[][] {
  const unseen = new Set(cards.map((card) => card.id));
  const components: EvidenceCard[][] = [];

  for (const seed of cards) {
    if (!unseen.delete(seed.id)) continue;
    const component = [seed];
    const queue = [seed];
    while (queue.length) {
      const current = queue.shift()!;
      for (const candidate of cards) {
        if (!unseen.has(candidate.id) || !expandedCardsTouch(current, candidate)) continue;
        unseen.delete(candidate.id);
        component.push(candidate);
        queue.push(candidate);
      }
    }
    components.push(component);
  }

  return components;
}

function convexHull(points: BoardPoint[]): BoardPoint[] {
  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  if (sorted.length <= 2) return sorted;
  const cross = (origin: BoardPoint, a: BoardPoint, b: BoardPoint) => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  const lower: BoardPoint[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: BoardPoint[] = [];
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function seedNumber(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function smoothClosedPath(points: BoardPoint[]): string {
  if (points.length < 3) return pointsToPath(points, true);
  const midpoint = (a: BoardPoint, b: BoardPoint): BoardPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = midpoint(points.at(-1)!, points[0]);
  const curves = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const end = midpoint(point, next);
    return `Q ${point.x.toFixed(1)} ${point.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  });
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} ${curves.join(" ")} Z`;
}

type ContourSegment = [BoardPoint, BoardPoint];

function contourKey(point: BoardPoint): string {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

function metaballContours(cards: EvidenceCard[]): BoardPoint[][] {
  const halo = 70;
  const threshold = 0.55;
  const left = Math.min(...cards.map((card) => card.x)) - halo * 1.6;
  const top = Math.min(...cards.map((card) => card.y)) - halo * 1.6;
  const right = Math.max(...cards.map((card) => card.x + card.width)) + halo * 1.6;
  const bottom = Math.max(...cards.map((card) => card.y + (card.height ?? 180))) + halo * 1.6;
  const step = Math.max(12, Math.max(right - left, bottom - top) / 88);
  const columns = Math.ceil((right - left) / step) + 1;
  const rows = Math.ceil((bottom - top) / step) + 1;
  const field = (x: number, y: number) => cards.reduce((total, card) => {
    const height = card.height ?? 180;
    const radiusX = card.width / 2 + halo;
    const radiusY = height / 2 + halo;
    const normalized = Math.hypot((x - (card.x + card.width / 2)) / radiusX, (y - (card.y + height / 2)) / radiusY);
    const outsideCore = Math.max(0, normalized - 0.62) * 2.2;
    return total + 1 / (1 + outsideCore * outsideCore);
  }, 0);
  const values = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => field(left + column * step, top + row * step)));
  const segments: ContourSegment[] = [];
  const edgePoint = (column: number, row: number, edge: number): BoardPoint => {
    const corners = [
      { x: left + column * step, y: top + row * step, value: values[row][column] },
      { x: left + (column + 1) * step, y: top + row * step, value: values[row][column + 1] },
      { x: left + (column + 1) * step, y: top + (row + 1) * step, value: values[row + 1][column + 1] },
      { x: left + column * step, y: top + (row + 1) * step, value: values[row + 1][column] },
    ];
    const edgeCorners = [[0, 1], [1, 2], [3, 2], [0, 3]][edge];
    const a = corners[edgeCorners[0]];
    const b = corners[edgeCorners[1]];
    const amount = Math.max(0, Math.min(1, (threshold - a.value) / ((b.value - a.value) || Number.EPSILON)));
    return { x: a.x + (b.x - a.x) * amount, y: a.y + (b.y - a.y) * amount };
  };
  const cases: Record<number, number[][]> = {
    1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]],
    8: [[2, 3]], 9: [[0, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]],
  };
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const mask = (values[row][column] >= threshold ? 1 : 0)
        | (values[row][column + 1] >= threshold ? 2 : 0)
        | (values[row + 1][column + 1] >= threshold ? 4 : 0)
        | (values[row + 1][column] >= threshold ? 8 : 0);
      let pairs = cases[mask] ?? [];
      if (mask === 5 || mask === 10) {
        const centerInside = field(left + (column + 0.5) * step, top + (row + 0.5) * step) >= threshold;
        pairs = mask === 5
          ? (centerInside ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]])
          : (centerInside ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]]);
      }
      for (const pair of pairs) segments.push([edgePoint(column, row, pair[0]), edgePoint(column, row, pair[1])]);
    }
  }

  const adjacency = new Map<string, number[]>();
  segments.forEach((segment, index) => segment.forEach((point) => adjacency.set(contourKey(point), [...(adjacency.get(contourKey(point)) ?? []), index])));
  const used = new Set<number>();
  const contours: BoardPoint[][] = [];
  segments.forEach((segment, startIndex) => {
    if (used.has(startIndex)) return;
    used.add(startIndex);
    const line = [segment[0], segment[1]];
    while (contourKey(line.at(-1)!) !== contourKey(line[0]) && line.length <= segments.length + 2) {
      const currentKey = contourKey(line.at(-1)!);
      const nextIndex = (adjacency.get(currentKey) ?? []).find((index) => !used.has(index));
      if (nextIndex === undefined) break;
      used.add(nextIndex);
      const nextSegment = segments[nextIndex];
      line.push(contourKey(nextSegment[0]) === currentKey ? nextSegment[1] : nextSegment[0]);
    }
    if (line.length >= 8 && contourKey(line.at(-1)!) === contourKey(line[0])) contours.push(line.slice(0, -1));
  });
  return contours;
}

function fallbackOutline(cards: EvidenceCard[]): BoardPoint[] {
  return convexHull(cards.flatMap((card) => [
    { x: card.x - REGION_OUTLINE_PADDING, y: card.y - REGION_OUTLINE_PADDING },
    { x: card.x + card.width + REGION_OUTLINE_PADDING, y: card.y - REGION_OUTLINE_PADDING },
    { x: card.x + card.width + REGION_OUTLINE_PADDING, y: card.y + (card.height ?? 180) + REGION_OUTLINE_PADDING },
    { x: card.x - REGION_OUTLINE_PADDING, y: card.y + (card.height ?? 180) + REGION_OUTLINE_PADDING },
  ]));
}

function componentOutlines(cards: EvidenceCard[], seed: string): OrganicRegionPath[] {
  const hash = seedNumber(seed);
  const contours = metaballContours(cards);
  return (contours.length ? contours : [fallbackOutline(cards)]).map((contour) => {
    const stride = Math.max(1, Math.floor(contour.length / 48));
    const reduced = contour.filter((_, index) => index % stride === 0);
    const center = {
      x: reduced.reduce((total, point) => total + point.x, 0) / reduced.length,
      y: reduced.reduce((total, point) => total + point.y, 0) / reduced.length,
    };
    const organic = reduced.map((point, index) => {
      const length = Math.hypot(point.x - center.x, point.y - center.y) || 1;
      const wobble = Math.sin(hash * 0.0001 + index * 1.77) * 2.4;
      return { x: point.x + ((point.x - center.x) / length) * wobble, y: point.y + ((point.y - center.y) / length) * wobble };
    });
    const contained = cards.filter((card) => pointInPolygon(cardCenter(card), organic));
    return {
      cardIds: (contained.length ? contained : cards).map((card) => card.id),
      d: smoothClosedPath(organic),
      label: { x: Math.min(...organic.map((point) => point.x)) + 180, y: Math.min(...organic.map((point) => point.y)) + 36 },
      points: organic,
    };
  });
}

export function organicRegionPaths(caseFile: CaseFile, cardIds: string[], seed = "region"): OrganicRegionPath[] {
  const cards = caseFile.cards.filter((card) => cardIds.includes(card.id));
  return clusterCards(cards).flatMap((component, index) => componentOutlines(component, `${seed}-${index}-${component.map((card) => card.id).join("-")}`));
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
