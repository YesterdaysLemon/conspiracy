export type CardKind = "source" | "observation" | "claim" | "hypothesis" | "question" | "person";

export type DoodleKind = CardKind | "lightbulb" | "eye" | "clock" | "place" | "star" | "custom" | "none";

export type RelationKind = "supports" | "contradicts" | "precedes" | "implicates" | "same-entity" | "speculative";

export type ProposalStatus = "accepted" | "proposed";

export type EvidenceStatus = "open" | "verified" | "disputed" | "closed";

export interface BoardPoint {
  x: number;
  y: number;
}

export interface BoardViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface LocalAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  lastModified: number;
  available: boolean;
}

export interface EvidenceCard {
  id: string;
  title: string;
  body: string;
  kind: CardKind;
  x: number;
  y: number;
  width: number;
  height?: number;
  color: string;
  rotation: number;
  sourceUrl?: string;
  confidence?: number;
  tags: string[];
  createdBy: "human" | "agent";
  doodle?: DoodleKind;
  doodleStrokes?: BoardPoint[][];
  people?: string;
  place?: string;
  time?: string;
  status?: EvidenceStatus;
  notes?: string;
  attachments?: LocalAttachment[];
}

export interface EvidenceThread {
  id: string;
  fromId: string;
  toId: string;
  relation: RelationKind;
  color: string;
  rationale: string;
  confidence: number;
  status: ProposalStatus;
  createdBy: "human" | "agent";
}

export interface EvidenceCircle {
  id: string;
  cardIds: string[];
  color: string;
  label: string;
  status: ProposalStatus;
  createdBy: "human" | "agent";
  points?: BoardPoint[];
}

export interface EvidenceStroke {
  id: string;
  points: BoardPoint[];
  color: string;
  width: number;
  closed: boolean;
  label?: string;
  cardIds: string[];
  status: ProposalStatus;
  createdBy: "human" | "agent";
}

export interface TrashedEvidence {
  id: string;
  kind: "card" | "thread" | "circle" | "stroke";
  label: string;
  discardedAt: string;
  card?: EvidenceCard;
  thread?: EvidenceThread;
  circle?: EvidenceCircle;
  stroke?: EvidenceStroke;
  dependentThreads?: EvidenceThread[];
  dependentCircles?: EvidenceCircle[];
}

export interface CaseFile {
  id?: string;
  title: string;
  subtitle: string;
  viewport?: BoardViewport;
  cards: EvidenceCard[];
  threads: EvidenceThread[];
  circles: EvidenceCircle[];
  strokes?: EvidenceStroke[];
  trash?: TrashedEvidence[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CaseLibrary {
  version: 2;
  activeCaseId: string;
  cases: CaseFile[];
}

export type AuditSeverity = "clear" | "lead" | "warning";

export interface BoardFinding {
  id: string;
  severity: AuditSeverity;
  title: string;
  detail: string;
  cardIds: string[];
  threadIds: string[];
}

export interface BoardAudit {
  score: number;
  findings: BoardFinding[];
  unsupportedClaimIds: string[];
  contradictionThreadIds: string[];
  orphanCardIds: string[];
  checkedAt: string;
}

export interface BoardSnapshot {
  caseFile: CaseFile;
  selectedIds: string[];
}

export interface BoardMutationResult {
  message: string;
  caseFile: CaseFile;
  audit: BoardAudit;
}

export interface DetectiveProposal {
  reply: string;
  action?:
    | { type: "thread"; fromCardId: string; toCardId: string; relation: RelationKind; rationale: string; confidence: number; color?: string }
    | { type: "circle"; cardIds: string[]; label: string; color?: string };
}
