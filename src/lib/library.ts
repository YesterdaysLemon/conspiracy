import { cloneCase, DEFAULT_CASE } from "../data/defaultCase";
import { slugify, uniqueId } from "./board";
import type { CaseFile, CaseLibrary, EvidenceCard, TrashedEvidence } from "../types";

export const LIBRARY_STORAGE_KEY = "loose-thread-library-v2";
export const LEGACY_STORAGE_KEY = "loose-thread-case-v1";

const DEFAULT_VIEWPORT = { x: 85, y: 5, zoom: 0.58 };

function isCaseLike(value: unknown): value is CaseFile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CaseFile>;
  return typeof candidate.title === "string" && Array.isArray(candidate.cards) && Array.isArray(candidate.threads) && Array.isArray(candidate.circles);
}

export function normalizeCase(input: CaseFile, existingIds: string[] = []): CaseFile {
  const cloned = cloneCase(input);
  const appearsLegacy = cloned.cards.length > 0 && cloned.cards.every((card) => Math.abs(card.x) <= 100 && Math.abs(card.y) <= 100 && card.width <= 100);
  const id = cloned.id && !existingIds.includes(cloned.id) ? cloned.id : uniqueId(slugify(cloned.title), existingIds);
  const now = new Date().toISOString();
  return {
    ...cloned,
    id,
    viewport: cloned.viewport ?? DEFAULT_VIEWPORT,
    cards: cloned.cards.map((card, index) => ({
      ...card,
      title: card.title || `Untitled clue ${index + 1}`,
      x: appearsLegacy ? card.x * 14 : card.x,
      y: appearsLegacy ? card.y * 13 : card.y,
      width: appearsLegacy ? Math.max(220, card.width * 13) : card.width,
      height: card.height ?? 180,
      doodle: card.doodle ?? card.kind,
      status: card.status ?? "open",
      attachments: card.attachments?.map((attachment) => ({ ...attachment, available: false })) ?? [],
    })),
    strokes: cloned.strokes ?? [],
    trash: cloned.trash ?? [],
    createdAt: cloned.createdAt ?? now,
    updatedAt: cloned.updatedAt ?? now,
  };
}

export function initialLibrary(savedLibrary: string | null, legacyCase: string | null): CaseLibrary {
  try {
    if (savedLibrary) {
      const parsed = JSON.parse(savedLibrary) as Partial<CaseLibrary>;
      if (parsed.version === 2 && Array.isArray(parsed.cases) && parsed.cases.length) {
        const cases: CaseFile[] = [];
        for (const item of parsed.cases) if (isCaseLike(item)) cases.push(normalizeCase(item, cases.map((entry) => entry.id!)));
        if (cases.length) return { version: 2, activeCaseId: cases.some((item) => item.id === parsed.activeCaseId) ? parsed.activeCaseId! : cases[0].id!, cases };
      }
    }
  } catch { /* fall through to legacy or demo */ }
  try {
    if (legacyCase) {
      const parsed = JSON.parse(legacyCase) as CaseFile;
      if (isCaseLike(parsed)) {
        const migrated = normalizeCase(parsed);
        return { version: 2, activeCaseId: migrated.id!, cases: [migrated, normalizeCase(DEFAULT_CASE, [migrated.id!])] };
      }
    }
  } catch { /* fall through to demo */ }
  const demo = normalizeCase(DEFAULT_CASE);
  return { version: 2, activeCaseId: demo.id!, cases: [demo] };
}

export function exportableCase(caseFile: CaseFile): CaseFile {
  const clean = normalizeCase(caseFile);
  return { ...clean, cards: clean.cards.map((card) => ({ ...card, attachments: card.attachments?.map((attachment) => ({ ...attachment, available: false })) ?? [] })) };
}

export function parseImportedCase(raw: string, existingIds: string[]): CaseFile {
  const parsed = JSON.parse(raw) as unknown;
  if (!isCaseLike(parsed)) throw new Error("That file is not a Loose Thread case.");
  if ((parsed as CaseFile).cards.length > 500 || (parsed as CaseFile).threads.length > 1_500) throw new Error("That case is too large to import safely.");
  return normalizeCase({ ...(parsed as CaseFile), id: undefined, title: (parsed as CaseFile).title || "IMPORTED CASE" }, existingIds);
}

export function trashCard(caseFile: CaseFile, cardId: string): CaseFile {
  const card = caseFile.cards.find((item) => item.id === cardId);
  if (!card) throw new Error(`Unknown cardId: ${cardId}`);
  const dependentThreads = caseFile.threads.filter((item) => item.fromId === cardId || item.toId === cardId);
  const dependentCircles = caseFile.circles.filter((item) => item.cardIds.includes(cardId));
  const trashed: TrashedEvidence = {
    id: `trash-${card.id}-${Date.now()}`,
    kind: "card",
    label: card.title,
    discardedAt: new Date().toISOString(),
    card: { ...card, tags: [...card.tags], attachments: card.attachments?.map((attachment) => ({ ...attachment })) ?? [] },
    dependentThreads: dependentThreads.map((item) => ({ ...item })),
    dependentCircles: dependentCircles.map((item) => ({ ...item, cardIds: [...item.cardIds], points: item.points?.map((point) => ({ ...point })) })),
  };
  return {
    ...caseFile,
    cards: caseFile.cards.filter((item) => item.id !== cardId),
    threads: caseFile.threads.filter((item) => item.fromId !== cardId && item.toId !== cardId),
    circles: caseFile.circles.map((item) => ({ ...item, cardIds: item.cardIds.filter((id) => id !== cardId) })).filter((item) => item.cardIds.length >= 2),
    trash: [trashed, ...(caseFile.trash ?? [])],
    updatedAt: new Date().toISOString(),
  };
}

export function restoreTrash(caseFile: CaseFile, trashId: string): CaseFile {
  const item = (caseFile.trash ?? []).find((entry) => entry.id === trashId);
  if (!item) throw new Error(`Unknown trash item: ${trashId}`);
  if (item.kind !== "card" || !item.card) throw new Error("Only discarded cards can be restored in this build.");
  const existingCardIds = new Set(caseFile.cards.map((card) => card.id));
  if (existingCardIds.has(item.card.id)) throw new Error("A card with that ID already exists.");
  const threads = [...caseFile.threads, ...(item.dependentThreads ?? []).filter((thread) => {
    const otherId = thread.fromId === item.card!.id ? thread.toId : thread.fromId;
    return existingCardIds.has(otherId);
  })];
  const restorableCircles = [...new Map((item.dependentCircles ?? [])
    .filter((circle) => circle.cardIds.every((id) => id === item.card!.id || existingCardIds.has(id)))
    .map((circle) => [circle.id, circle])).values()];
  const restoredCircleIds = new Set(restorableCircles.map((circle) => circle.id));
  const circles = [...caseFile.circles.filter((circle) => !restoredCircleIds.has(circle.id)), ...restorableCircles];
  return { ...caseFile, cards: [...caseFile.cards, item.card], threads, circles, trash: (caseFile.trash ?? []).filter((entry) => entry.id !== trashId), updatedAt: new Date().toISOString() };
}

export function newCardAt(caseFile: CaseFile, x: number, y: number, partial: Pick<EvidenceCard, "title" | "body" | "kind" | "color">): EvidenceCard {
  const id = uniqueId(slugify(partial.title), caseFile.cards.map((card) => card.id));
  return { id, ...partial, doodle: partial.kind, x, y, width: 244, height: 180, rotation: ((caseFile.cards.length % 5) - 2) * 0.7, tags: [], status: "open", attachments: [], createdBy: "human" };
}
