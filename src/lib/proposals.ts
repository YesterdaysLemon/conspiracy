import type { CaseFile, EvidenceCircle, EvidenceThread, RelationKind } from "../types";

function sameCardSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const expected = new Set(left);
  return expected.size === right.length && right.every((id) => expected.has(id));
}

export function findMatchingThread(caseFile: CaseFile, input: { fromCardId: string; toCardId: string; relation: RelationKind }): EvidenceThread | undefined {
  return caseFile.threads.find((thread) => (
    thread.fromId === input.fromCardId
    && thread.toId === input.toCardId
    && thread.relation === input.relation
  ));
}

export function findMatchingCircle(caseFile: CaseFile, input: { cardIds: string[]; label: string }): EvidenceCircle | undefined {
  const label = input.label.trim().toUpperCase();
  return caseFile.circles.find((circle) => circle.label.trim().toUpperCase() === label && sameCardSet(circle.cardIds, input.cardIds));
}
