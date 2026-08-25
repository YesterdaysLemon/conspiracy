import type { CaseFile, EvidenceCard } from "../types";

const card = (value: EvidenceCard): EvidenceCard => value;

export const EMPTY_CASE: CaseFile = {
  title: "UNTITLED CASE",
  subtitle: "OPEN FILE",
  cards: [],
  threads: [],
  circles: [],
};

export const DEFAULT_CASE: CaseFile = {
  title: "THE 11:47 TRAIN",
  subtitle: "CASE 017 · RAIN DISTRICT",
  cards: [
    card({ id: "station-log", title: "STATION LOG", body: "Last freight cleared Platform 4 at 11:47 PM.", kind: "source", x: 8, y: 12, width: 18, color: "paper", rotation: -2, sourceUrl: "https://example.com/station-log", confidence: 94, tags: ["station", "timeline"], createdBy: "human" }),
    card({ id: "red-umbrella", title: "RED UMBRELLA", body: "Witness saw it cross the east footbridge after midnight.", kind: "observation", x: 38, y: 8, width: 18, color: "rose", rotation: 1.5, confidence: 61, tags: ["witness", "station"], createdBy: "human" }),
    card({ id: "mara-vale", title: "MARA VALE", body: "Night clerk. Says she never left the ticket office.", kind: "person", x: 70, y: 13, width: 18, color: "blue", rotation: -1, tags: ["clerk", "alibi"], createdBy: "human" }),
    card({ id: "clock-photo", title: "CLOCK PHOTO", body: "Platform clock reads 12:03. Rain has not started.", kind: "source", x: 13, y: 53, width: 20, color: "photo", rotation: 2, confidence: 88, tags: ["timeline", "weather"], createdBy: "human" }),
    card({ id: "weather-note", title: "WEATHER DESK", body: "Heavy rain began at 11:51 PM across the district.", kind: "observation", x: 42, y: 48, width: 20, color: "yellow", rotation: -1.4, confidence: 97, tags: ["weather", "timeline"], createdBy: "human" }),
    card({ id: "wrong-night", title: "WRONG NIGHT?", body: "The clock photo may predate the disappearance.", kind: "hypothesis", x: 71, y: 52, width: 19, color: "green", rotation: 1.8, confidence: 38, tags: ["photo", "timeline"], createdBy: "human" }),
    card({ id: "missing-ticket", title: "TICKET 0431", body: "Who punched it—and why is the destination blank?", kind: "question", x: 43, y: 76, width: 20, color: "violet", rotation: 0.6, tags: ["ticket", "unresolved"], createdBy: "human" }),
  ],
  threads: [
    { id: "thread-log-umbrella", fromId: "station-log", toId: "red-umbrella", relation: "precedes", color: "#d64045", rationale: "The reported crossing follows the final logged train.", confidence: 72, status: "accepted", createdBy: "human" },
    { id: "thread-umbrella-mara", fromId: "red-umbrella", toId: "mara-vale", relation: "implicates", color: "#d64045", rationale: "The clerk owned a similar umbrella; identity is unconfirmed.", confidence: 41, status: "proposed", createdBy: "agent" },
    { id: "thread-weather-photo", fromId: "weather-note", toId: "clock-photo", relation: "contradicts", color: "#f0b541", rationale: "A dry platform at 12:03 conflicts with rain beginning at 11:51.", confidence: 91, status: "accepted", createdBy: "human" },
    { id: "thread-photo-night", fromId: "clock-photo", toId: "wrong-night", relation: "supports", color: "#57a6c8", rationale: "The weather mismatch supports a date or time error.", confidence: 79, status: "accepted", createdBy: "human" },
  ],
  circles: [
    { id: "circle-timeline", cardIds: ["station-log", "clock-photo", "weather-note"], color: "#e3b04b", label: "TIMELINE", status: "accepted", createdBy: "human" },
  ],
};

export function cloneCase(caseFile: CaseFile): CaseFile {
  return {
    ...caseFile,
    cards: caseFile.cards.map((item) => ({ ...item, tags: [...item.tags] })),
    threads: caseFile.threads.map((item) => ({ ...item })),
    circles: caseFile.circles.map((item) => ({ ...item, cardIds: [...item.cardIds] })),
  };
}
