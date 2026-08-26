import { auditBoard } from "../lib/board";
import type { CaseFile, DetectiveProposal } from "../types";

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function localDetective(caseFile: CaseFile, prompt: string, selectedCardId?: string): DetectiveProposal {
  const query = prompt.toLowerCase();
  const audit = auditBoard(caseFile);
  const selected = selectedCardId ? caseFile.cards.find((card) => card.id === selectedCardId) : undefined;

  if (includesAny(query, ["timeline", "when", "order"])) {
    const timeline = caseFile.cards.filter((card) => card.time || card.tags.includes("timeline")).slice(0, 6);
    if (timeline.length >= 2) return { reply: "Time leaves fingerprints.", action: { type: "circle", cardIds: timeline.map((card) => card.id), label: "TIMELINE", color: "#e3b04b" } };
  }

  if (includesAny(query, ["missing", "loose", "unanswered"])) {
    const cards = caseFile.cards.filter((card) => audit.orphanCardIds.includes(card.id) || card.kind === "question").slice(0, 5);
    if (cards.length >= 2) return { reply: "These clues sit alone.", action: { type: "circle", cardIds: cards.map((card) => card.id), label: "LOOSE ENDS", color: "#a777c4" } };
    return { reply: cards[0] ? `${cards[0].title}. Still alone.` : "No clean gap. Yet." };
  }

  if (includesAny(query, ["lie", "wrong", "doesn't fit", "does not fit", "contradiction", "conflict"])) {
    const rain = caseFile.cards.find((card) => card.id === "rain-gauge") ?? caseFile.cards.find((card) => card.tags.includes("weather"));
    const glove = caseFile.cards.find((card) => card.id === "violet-glove") ?? caseFile.cards.find((card) => card.body.toLowerCase().includes("dry"));
    if (rain && glove && rain.id !== glove.id && !caseFile.threads.some((thread) => thread.fromId === rain.id && thread.toId === glove.id)) {
      return {
        reply: "Rain everywhere. One dry glove.",
        action: { type: "thread", fromCardId: rain.id, toCardId: glove.id, relation: "contradicts", rationale: "The glove remained dry after the garden paths were soaked, suggesting it was placed later or never crossed the garden.", confidence: 92, color: "#d64045" },
      };
    }
    const contradiction = caseFile.threads.find((thread) => thread.relation === "contradicts");
    if (contradiction) return { reply: contradiction.rationale };
  }

  if (selected) return { reply: `${selected.title}. ${selected.status === "disputed" ? "It bends." : "Pull its nearest thread."}` };
  if (audit.contradictionThreadIds.length) return { reply: `${audit.contradictionThreadIds.length} contradiction${audit.contradictionThreadIds.length === 1 ? "" : "s"}. Start there.` };
  if (audit.orphanCardIds.length) return { reply: `${audit.orphanCardIds.length} loose end${audit.orphanCardIds.length === 1 ? "" : "s"}.` };
  return { reply: "The board holds. For now." };
}
