import type { CaseFile, EvidenceCard } from "../types";

const card = (value: EvidenceCard): EvidenceCard => value;
const openedAt = "2026-08-25T12:00:00.000Z";

export const EMPTY_CASE: CaseFile = {
  id: "untitled-case",
  title: "UNTITLED CASE",
  subtitle: "OPEN FILE",
  viewport: { x: 100, y: 80, zoom: 0.72 },
  cards: [],
  threads: [],
  circles: [],
  strokes: [],
  trash: [],
  createdAt: openedAt,
  updatedAt: openedAt,
};

export const DEFAULT_CASE: CaseFile = {
  id: "case-briar-window",
  title: "THE BRIAR WINDOW",
  subtitle: "CASE 017 · BLOOMSBURY, 1893",
  viewport: { x: 85, y: 5, zoom: 0.58 },
  cards: [
    card({ id: "station-ledger", title: "The station ledger", body: "The 11:47 goods train passed Briar Lane without stopping.", kind: "source", doodle: "source", x: 110, y: 120, width: 245, height: 176, color: "paper", rotation: -2.2, sourceUrl: "case://station-ledger", confidence: 94, tags: ["station", "timeline"], people: "Porter Elias Finch", place: "Briar Lane station", time: "11:47 PM", status: "verified", attachments: [], createdBy: "human" }),
    card({ id: "violet-glove", title: "A violet glove", body: "Found beneath the library window. Dry, though the garden was soaked.", kind: "observation", doodle: "observation", x: 540, y: 92, width: 236, height: 182, color: "rose", rotation: 1.4, confidence: 87, tags: ["garden", "weather"], place: "Library garden", time: "12:18 AM", status: "open", attachments: [], createdBy: "human" }),
    card({ id: "ada-wren", title: "Miss Ada Wren", body: "Claims she read beside the fire from eleven until the alarm.", kind: "person", doodle: "person", x: 990, y: 138, width: 238, height: 178, color: "blue", rotation: -1.1, tags: ["alibi", "household"], people: "Ada Wren", place: "Drawing room", time: "11:00 PM–12:15 AM", status: "disputed", attachments: [], createdBy: "human" }),
    card({ id: "window-sketch", title: "Window latch sketch", body: "The latch was broken outward. No mud marks appear on the sill.", kind: "source", doodle: "source", x: 155, y: 540, width: 258, height: 190, color: "photo", rotation: 1.8, confidence: 91, tags: ["window", "entry"], place: "Library", time: "12:22 AM", status: "verified", attachments: [], createdBy: "human" }),
    card({ id: "rain-gauge", title: "The rain gauge", body: "Heavy rain began at 11:51. Every path was soft by midnight.", kind: "observation", doodle: "observation", x: 585, y: 500, width: 248, height: 180, color: "yellow", rotation: -1.5, confidence: 97, tags: ["weather", "timeline"], place: "Wren House garden", time: "11:51 PM", status: "verified", attachments: [], createdBy: "human" }),
    card({ id: "staged-entry", title: "The window was staged", body: "An intruder crossing the garden should have carried mud inside.", kind: "hypothesis", doodle: "hypothesis", x: 1040, y: 515, width: 252, height: 184, color: "green", rotation: 1.7, confidence: 62, tags: ["window", "theory"], status: "open", attachments: [], createdBy: "human" }),
    card({ id: "missing-cinder", title: "Why no cinders?", body: "A goods train passed, yet the station coat bears fresh passenger-engine cinders.", kind: "question", doodle: "question", x: 600, y: 700, width: 260, height: 180, color: "violet", rotation: 0.5, tags: ["train", "unresolved"], status: "open", attachments: [], createdBy: "human" }),
  ],
  threads: [
    { id: "thread-ledger-glove", fromId: "station-ledger", toId: "violet-glove", relation: "precedes", color: "#d64045", rationale: "The station record fixes the last train before the glove was found.", confidence: 72, status: "accepted", createdBy: "human" },
    { id: "thread-glove-ada", fromId: "violet-glove", toId: "ada-wren", relation: "implicates", color: "#d64045", rationale: "Ada owns violet gloves, but the recovered glove may have been planted.", confidence: 46, status: "proposed", createdBy: "agent" },
    { id: "thread-rain-window", fromId: "rain-gauge", toId: "window-sketch", relation: "contradicts", color: "#e3b04b", rationale: "A garden entry after the rain should have left wet mud at the sill.", confidence: 94, status: "accepted", createdBy: "human" },
    { id: "thread-window-stage", fromId: "window-sketch", toId: "staged-entry", relation: "supports", color: "#57a6c8", rationale: "The outward break and clean sill support an inside job.", confidence: 86, status: "accepted", createdBy: "human" },
  ],
  circles: [
    { id: "circle-weather", cardIds: ["violet-glove", "window-sketch", "rain-gauge"], color: "#e3b04b", label: "WEATHER DOESN'T FIT", status: "accepted", createdBy: "human" },
  ],
  strokes: [],
  trash: [],
  createdAt: openedAt,
  updatedAt: openedAt,
};

export function cloneCase(caseFile: CaseFile): CaseFile {
  return {
    ...caseFile,
    viewport: caseFile.viewport ? { ...caseFile.viewport } : undefined,
    cards: caseFile.cards.map((item) => ({ ...item, tags: [...item.tags], attachments: item.attachments?.map((attachment) => ({ ...attachment })) ?? [] })),
    threads: caseFile.threads.map((item) => ({ ...item })),
    circles: caseFile.circles.map((item) => ({ ...item, cardIds: [...item.cardIds], points: item.points?.map((point) => ({ ...point })) })),
    strokes: caseFile.strokes?.map((item) => ({ ...item, points: item.points.map((point) => ({ ...point })), cardIds: [...item.cardIds] })) ?? [],
    trash: caseFile.trash?.map((item) => ({
      ...item,
      card: item.card ? { ...item.card, tags: [...item.card.tags], attachments: item.card.attachments?.map((attachment) => ({ ...attachment })) ?? [] } : undefined,
      thread: item.thread ? { ...item.thread } : undefined,
      circle: item.circle ? { ...item.circle, cardIds: [...item.circle.cardIds], points: item.circle.points?.map((point) => ({ ...point })) } : undefined,
      stroke: item.stroke ? { ...item.stroke, points: item.stroke.points.map((point) => ({ ...point })), cardIds: [...item.stroke.cardIds] } : undefined,
      dependentThreads: item.dependentThreads?.map((thread) => ({ ...thread })),
      dependentCircles: item.dependentCircles?.map((circle) => ({ ...circle, cardIds: [...circle.cardIds], points: circle.points?.map((point) => ({ ...point })) })),
    })) ?? [],
  };
}
