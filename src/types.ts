export type CardKind = "source" | "observation" | "claim" | "hypothesis" | "question" | "person";

export type RelationKind = "supports" | "contradicts" | "precedes" | "implicates" | "same-entity" | "speculative";

export type ProposalStatus = "accepted" | "proposed";

export interface EvidenceCard {
  id: string;
  title: string;
  body: string;
  kind: CardKind;
  x: number;
  y: number;
  width: number;
  color: string;
  rotation: number;
  sourceUrl?: string;
  confidence?: number;
  tags: string[];
  createdBy: "human" | "agent";
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
}

export interface CaseFile {
  title: string;
  subtitle: string;
  cards: EvidenceCard[];
  threads: EvidenceThread[];
  circles: EvidenceCircle[];
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
