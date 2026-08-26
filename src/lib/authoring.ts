import { cloneCase } from "../data/defaultCase";
import type { BoardPoint, CardKind, CaseFile, EvidenceCard, EvidenceCircle, EvidenceThread, RelationKind } from "../types";
import { clampCard, findOpenCardPosition, THREAD_COLORS, uniqueId } from "./board";
import { newCardAt } from "./library";

export const CARD_PAPERS = ["yellow", "paper", "rose", "blue", "green", "violet"] as const;
export type CardPaper = typeof CARD_PAPERS[number];

export interface BulkCardInput {
  ref: string;
  title: string;
  body: string;
  kind: CardKind;
  color?: CardPaper;
  sourceUrl?: string;
  tags?: string[];
  xWorld?: number;
  yWorld?: number;
}

export interface BulkConnectionInput {
  from: string;
  to: string;
  relation: RelationKind;
  rationale: string;
  confidence: number;
  color?: string;
}

export interface BulkRegionInput {
  cardRefs: string[];
  label: string;
  color?: string;
}

export interface PopulateCaseInput {
  cards: BulkCardInput[];
  connections?: BulkConnectionInput[];
  regions?: BulkRegionInput[];
}

export interface PopulateCaseResult {
  caseFile: CaseFile;
  cards: EvidenceCard[];
  threads: EvidenceThread[];
  circles: EvidenceCircle[];
  refs: Record<string, string>;
}

export function defaultPaperForKind(kind: CardKind): CardPaper {
  if (kind === "question") return "violet";
  if (kind === "hypothesis") return "green";
  if (kind === "person") return "rose";
  if (kind === "source") return "paper";
  return "yellow";
}

export function populateCaseFile(caseFile: CaseFile, input: PopulateCaseInput, origin: BoardPoint): PopulateCaseResult {
  if (!input.cards.length) throw new Error("populate_case needs at least one card.");
  if (input.cards.length > 100) throw new Error("populate_case accepts at most 100 cards per call.");
  if ((input.connections?.length ?? 0) > 300) throw new Error("populate_case accepts at most 300 connections per call.");
  if ((input.regions?.length ?? 0) > 50) throw new Error("populate_case accepts at most 50 regions per call.");

  let next = cloneCase(caseFile);
  const createdCards: EvidenceCard[] = [];
  const createdThreads: EvidenceThread[] = [];
  const createdCircles: EvidenceCircle[] = [];
  const refs = new Map(next.cards.map((card) => [card.id, card.id]));
  const createdRefs = new Map<string, string>();
  const preferred = { x: origin.x - 122, y: origin.y - 90 };

  for (const item of input.cards) {
    if (refs.has(item.ref)) throw new Error(`Duplicate or existing card ref: ${item.ref}`);
    if ((item.xWorld === undefined) !== (item.yWorld === undefined)) throw new Error(`Card ${item.ref} must provide both xWorld and yWorld.`);
    const position = item.xWorld === undefined
      ? findOpenCardPosition(next, preferred)
      : { x: item.xWorld, y: item.yWorld! };
    const card = newCardAt(next, position.x, position.y, {
      title: item.title,
      body: item.body,
      kind: item.kind,
      color: item.color ?? defaultPaperForKind(item.kind),
    });
    Object.assign(card, clampCard(card, position.x, position.y));
    card.sourceUrl = item.sourceUrl;
    card.tags = [...(item.tags ?? [])];
    card.createdBy = "agent";
    refs.set(item.ref, card.id);
    createdRefs.set(item.ref, card.id);
    createdCards.push(card);
    next.cards.push(card);
  }

  const resolveRef = (ref: string) => {
    const cardId = refs.get(ref);
    if (!cardId) throw new Error(`Unknown card ref: ${ref}`);
    return cardId;
  };

  for (const item of input.connections ?? []) {
    const fromId = resolveRef(item.from);
    const toId = resolveRef(item.to);
    if (fromId === toId) throw new Error("A connection needs two different cards.");
    const thread: EvidenceThread = {
      id: uniqueId("thread", next.threads.map((thread) => thread.id)),
      fromId,
      toId,
      relation: item.relation,
      rationale: item.rationale,
      confidence: Math.max(0, Math.min(100, item.confidence)),
      color: item.color ?? THREAD_COLORS[0],
      status: "proposed",
      createdBy: "agent",
    };
    createdThreads.push(thread);
    next.threads.push(thread);
  }

  for (const item of input.regions ?? []) {
    const cardIds = [...new Set(item.cardRefs.map(resolveRef))];
    if (cardIds.length < 2) throw new Error("A region needs at least two different cards.");
    const circle: EvidenceCircle = {
      id: uniqueId("region", next.circles.map((region) => region.id)),
      cardIds,
      label: item.label.toUpperCase(),
      color: item.color ?? THREAD_COLORS[1],
      status: "proposed",
      createdBy: "agent",
    };
    createdCircles.push(circle);
    next.circles.push(circle);
  }

  next.updatedAt = new Date().toISOString();
  return { caseFile: next, cards: createdCards, threads: createdThreads, circles: createdCircles, refs: Object.fromEntries(createdRefs) };
}
