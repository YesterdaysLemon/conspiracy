import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cloneCase, DEFAULT_CASE, EMPTY_CASE } from "./data/defaultCase";
import {
  auditBoard,
  buildStringPath,
  CARD_KINDS,
  circleBounds,
  clampCard,
  RELATIONS,
  slugify,
  THREAD_COLORS,
  uniqueId,
} from "./lib/board";
import type {
  BoardMutationResult,
  BoardSnapshot,
  CardKind,
  CaseFile,
  EvidenceCard,
  EvidenceCircle,
  EvidenceThread,
  RelationKind,
} from "./types";
import { registerWebMCPTools, type RegisteredTools, type WebMCPActions } from "./webmcp/registerTools";

const STORAGE_KEY = "loose-thread-case-v1";
const CARD_COLORS = ["yellow", "paper", "rose", "blue", "green", "violet"];
const kindMarks: Record<CardKind, string> = {
  source: "SOURCE",
  observation: "SEEN",
  claim: "CLAIM",
  hypothesis: "MAYBE",
  question: "?",
  person: "PERSON",
};

function loadSavedCase(): CaseFile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CaseFile;
    if (!parsed?.title || !Array.isArray(parsed.cards) || !Array.isArray(parsed.threads) || !Array.isArray(parsed.circles)) return null;
    return cloneCase(parsed);
  } catch {
    return null;
  }
}

function Fedora({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? "fedora fedora-small" : "fedora"} viewBox="0 0 88 64" aria-hidden="true">
      <path d="M26 39c1-15 7-27 18-28 12 1 17 13 18 28" fill="currentColor" />
      <path d="M22 32c11 5 33 5 44 0l-3 10c-13 4-26 4-39 0z" fill="var(--hatband, #a33735)" />
      <path d="M7 40c17 3 27 4 38 4s24-2 36-6c4 2 3 8-2 10-21 8-50 8-71 2-6-2-6-8-1-10z" fill="currentColor" />
      <path d="M34 13c6 4 14 4 21 0-2-4-6-7-11-7-4 0-8 3-10 7z" fill="#fff" opacity=".08" />
    </svg>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <a href="https://alirezaafshan.com" target="_blank" rel="noreferrer">alirezaafshan.com</a>
      <span>·</span>
      <a className="sponsor-link" href="https://github.com/sponsors/YesterdaysLemon" target="_blank" rel="noreferrer">♥ Sponsor</a>
      <span>·</span>
      <a href="https://github.com/YesterdaysLemon" target="_blank" rel="noreferrer">Open source</a>
    </footer>
  );
}

function FieldNotes() {
  return (
    <div className="notes-page">
      <header className="notes-nav">
        <a className="brand-lockup" href="#/board"><Fedora small /><span>LOOSE THREAD</span></a>
        <a className="back-to-board" href="#/board">← BOARD</a>
      </header>
      <main className="notes-copy">
        <p className="kicker">FIELD NOTES · 01</p>
        <h1>A silly board.<br />A serious primitive.</h1>
        <p className="lede">The red string is theater. The shared, inspectable reasoning underneath it is not.</p>

        <section>
          <p className="section-number">01</p>
          <div><h2>One surface. Two languages.</h2><p>People think spatially: pin, group, circle, connect. Agents need stable identities, typed relationships, provenance, and reversible actions. WebMCP lets both work on the same living artifact without turning the human interface into a database form.</p></div>
        </section>
        <section>
          <p className="section-number">02</p>
          <div><h2>Propose, don’t pronounce.</h2><p>An agent may notice a pattern. It does not get to promote that pattern into truth. Every machine-made line arrives visibly staged, with a direction, relation, rationale, confidence, and explicit human decision.</p></div>
        </section>
        <section>
          <p className="section-number">03</p>
          <div><h2>The toy scales sideways.</h2><div className="domain-grid"><article><b>REPORTING</b><span>claims ↔ sources</span></article><article><b>INCIDENTS</b><span>events ↔ causes</span></article><article><b>RESEARCH</b><span>findings ↔ hypotheses</span></article><article><b>THREAT MODELS</b><span>assets ↔ risks</span></article><article><b>HISTORY</b><span>people ↔ records</span></article><article><b>STORIES</b><span>characters ↔ motives</span></article></div></div>
        </section>
        <section>
          <p className="section-number">04</p>
          <div><h2>The contract stays small.</h2><p>Inspect. Search. Trace. Audit. Add. Move. Propose. Circle. Resolve. Undo. Swap the cork texture for any domain and the collaboration model survives.</p></div>
        </section>
        <blockquote>Make thought visible.<br />Keep judgment human.</blockquote>
      </main>
      <AppFooter />
    </div>
  );
}

interface CardFormState {
  title: string;
  body: string;
  kind: CardKind;
  color: string;
  sourceUrl: string;
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || "#/board");
  const saved = useMemo(loadSavedCase, []);
  const [caseFile, setCaseFile] = useState<CaseFile>(() => cloneCase(saved ?? DEFAULT_CASE));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [threadColor, setThreadColor] = useState(THREAD_COLORS[0]);
  const [relation, setRelation] = useState<RelationKind>("supports");
  const [latest, setLatest] = useState("CASE OPENED");
  const [toolState, setToolState] = useState<"checking" | "ready" | "preview">("checking");
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [showTools, setShowTools] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [detectivePrompt, setDetectivePrompt] = useState("");
  const [detectiveReply, setDetectiveReply] = useState("I SEE THE BOARD.");
  const [thinking, setThinking] = useState(false);
  const [cardForm, setCardForm] = useState<CardFormState>({ title: "", body: "", kind: "observation", color: "yellow", sourceUrl: "" });
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [drag, setDrag] = useState<{ cardId: string; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const caseRef = useRef(caseFile);
  const selectedRef = useRef(selectedIds);
  const historyRef = useRef<BoardSnapshot[]>([]);
  caseRef.current = caseFile;
  selectedRef.current = selectedIds;

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || "#/board");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(caseFile)), [caseFile]);

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-39), { caseFile: cloneCase(caseRef.current), selectedIds: [...selectedRef.current] }];
    setHistoryCount(historyRef.current.length);
  }, []);

  const commitCase = useCallback((next: CaseFile, message: string, recordHistory = true): BoardMutationResult => {
    if (recordHistory) pushHistory();
    const stable = cloneCase(next);
    caseRef.current = stable;
    setCaseFile(stable);
    setLatest(message.toUpperCase());
    return { message, caseFile: cloneCase(stable), audit: auditBoard(stable) };
  }, [pushHistory]);

  const actions = useMemo<WebMCPActions>(() => ({
    getCase: () => cloneCase(caseRef.current),
    getSelectedIds: () => [...selectedRef.current],
    addCard: ({ title, body, kind, sourceUrl, tags }) => {
      const current = caseRef.current;
      const id = uniqueId(slugify(title), current.cards.map((item) => item.id));
      const index = current.cards.length;
      const card: EvidenceCard = { id, title: title.toUpperCase(), body, kind, sourceUrl, tags, x: 12 + (index * 13) % 68, y: 14 + (index * 17) % 56, width: 19, color: kind === "question" ? "violet" : kind === "hypothesis" ? "green" : "yellow", rotation: ((index % 5) - 2) * 0.7, confidence: kind === "question" ? undefined : 50, createdBy: "agent" };
      const result = commitCase({ ...current, cards: [...current.cards, card] }, `Agent pinned ${card.title}`);
      return { ...result, card };
    },
    moveCard: (cardId, xPercent, yPercent) => {
      const current = caseRef.current;
      const card = current.cards.find((item) => item.id === cardId);
      if (!card) throw new Error(`Unknown cardId: ${cardId}`);
      const moved = { ...card, ...clampCard(card, xPercent, yPercent) };
      const result = commitCase({ ...current, cards: current.cards.map((item) => item.id === cardId ? moved : item) }, `Agent moved ${card.title}`);
      return { ...result, card: moved };
    },
    removeCard: (cardId) => {
      const current = caseRef.current;
      const card = current.cards.find((item) => item.id === cardId);
      if (!card) throw new Error(`Unknown cardId: ${cardId}`);
      const next: CaseFile = {
        ...current,
        cards: current.cards.filter((item) => item.id !== cardId),
        threads: current.threads.filter((item) => item.fromId !== cardId && item.toId !== cardId),
        circles: current.circles.map((item) => ({ ...item, cardIds: item.cardIds.filter((id) => id !== cardId) })).filter((item) => item.cardIds.length >= 2),
      };
      setSelectedIds(selectedRef.current.filter((id) => id !== cardId));
      selectedRef.current = selectedRef.current.filter((id) => id !== cardId);
      return commitCase(next, `Removed ${card.title}`);
    },
    proposeThread: (input) => {
      const current = caseRef.current;
      if (input.fromCardId === input.toCardId) throw new Error("A connection needs two different cards.");
      for (const id of [input.fromCardId, input.toCardId]) if (!current.cards.some((card) => card.id === id)) throw new Error(`Unknown cardId: ${id}`);
      const id = uniqueId("thread", current.threads.map((item) => item.id));
      const thread: EvidenceThread = { id, fromId: input.fromCardId, toId: input.toCardId, relation: input.relation, rationale: input.rationale, confidence: input.confidence, color: input.color ?? THREAD_COLORS[0], status: "proposed", createdBy: "agent" };
      const result = commitCase({ ...current, threads: [...current.threads, thread] }, `Agent staged ${thread.relation}`);
      setSelectedProposalId(id);
      return { ...result, thread };
    },
    circleCards: (input) => {
      const current = caseRef.current;
      const cardIds = [...new Set(input.cardIds)];
      if (cardIds.length < 2) throw new Error("circle_cards needs at least two different cards.");
      for (const id of cardIds) if (!current.cards.some((card) => card.id === id)) throw new Error(`Unknown cardId: ${id}`);
      const id = uniqueId("circle", current.circles.map((item) => item.id));
      const circle: EvidenceCircle = { id, cardIds, label: input.label.toUpperCase(), color: input.color ?? "#e3b04b", status: "proposed", createdBy: "agent" };
      const result = commitCase({ ...current, circles: [...current.circles, circle] }, `Agent circled ${circle.label}`);
      setSelectedProposalId(id);
      return { ...result, circle };
    },
    resolveProposal: (proposalId, decision) => {
      const current = caseRef.current;
      const thread = current.threads.find((item) => item.id === proposalId && item.status === "proposed");
      const circle = current.circles.find((item) => item.id === proposalId && item.status === "proposed");
      if (!thread && !circle) throw new Error(`Unknown proposed thread or circle: ${proposalId}`);
      const next = decision === "accept"
        ? { ...current, threads: current.threads.map((item) => item.id === proposalId ? { ...item, status: "accepted" as const } : item), circles: current.circles.map((item) => item.id === proposalId ? { ...item, status: "accepted" as const } : item) }
        : { ...current, threads: current.threads.filter((item) => item.id !== proposalId), circles: current.circles.filter((item) => item.id !== proposalId) };
      setSelectedProposalId(null);
      return commitCase(next, `${decision === "accept" ? "Accepted" : "Rejected"} ${proposalId}`);
    },
    undo: () => {
      const previous = historyRef.current.at(-1);
      if (!previous) return { message: "Nothing to undo", caseFile: cloneCase(caseRef.current), audit: auditBoard(caseRef.current) };
      historyRef.current = historyRef.current.slice(0, -1);
      setHistoryCount(historyRef.current.length);
      setSelectedIds(previous.selectedIds);
      selectedRef.current = previous.selectedIds;
      return commitCase(previous.caseFile, "Restored the last board", false);
    },
  }), [commitCase]);

  useEffect(() => {
    let disposed = false;
    let registration: RegisteredTools | undefined;
    registerWebMCPTools(actions).then((result) => {
      registration = result;
      if (disposed) return result.dispose();
      setToolState(result.supported ? "ready" : "preview");
      setToolNames(result.names);
    }).catch(() => setToolState("preview"));
    return () => { disposed = true; registration?.dispose(); };
  }, [actions]);

  if (route.includes("field-notes")) return <FieldNotes />;

  const audit = auditBoard(caseFile);
  const proposals = [
    ...caseFile.threads.filter((item) => item.status === "proposed"),
    ...caseFile.circles.filter((item) => item.status === "proposed"),
  ];
  const selectedProposal = proposals.find((item) => item.id === selectedProposalId) ?? proposals[0];

  const pointFromEvent = (event: ReactPointerEvent) => {
    const rect = boardRef.current!.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 };
  };

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, card: EvidenceCard) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (event.shiftKey && selectedRef.current.includes(card.id)) {
      const next = selectedRef.current.filter((id) => id !== card.id);
      selectedRef.current = next;
      setSelectedIds(next);
    } else if (!selectedRef.current.includes(card.id)) {
      const next = event.shiftKey || selectedRef.current.length === 1 ? [...selectedRef.current, card.id] : [card.id];
      selectedRef.current = next;
      setSelectedIds(next);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ cardId: card.id, offsetX: point.x - card.x, offsetY: point.y - card.y, startX: point.x, startY: point.y, moved: false });
  };

  const continueDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const point = pointFromEvent(event);
    const movedEnough = Math.abs(point.x - drag.startX) > .25 || Math.abs(point.y - drag.startY) > .25;
    if (!movedEnough) return;
    if (!drag.moved) {
      pushHistory();
      setDrag({ ...drag, moved: true });
    }
    const card = caseRef.current.cards.find((item) => item.id === drag.cardId);
    if (!card) return;
    const moved = { ...card, ...clampCard(card, point.x - drag.offsetX, point.y - drag.offsetY) };
    const next = { ...caseRef.current, cards: caseRef.current.cards.map((item) => item.id === card.id ? moved : item) };
    caseRef.current = next;
    setCaseFile(next);
  };

  const finishDrag = () => {
    if (!drag) return;
    if (drag.moved) setLatest(`MOVED ${caseRef.current.cards.find((card) => card.id === drag.cardId)?.title ?? "CARD"}`);
    setDrag(null);
  };

  const moveCardByKey = (event: ReactKeyboardEvent<HTMLButtonElement>, card: EvidenceCard) => {
    const directions: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    if (directions[event.key]) {
      event.preventDefault();
      const scale = event.shiftKey ? 5 : 1;
      const delta = directions[event.key];
      const moved = { ...card, ...clampCard(card, card.x + delta.x * scale, card.y + delta.y * scale) };
      commitCase({ ...caseRef.current, cards: caseRef.current.cards.map((item) => item.id === card.id ? moved : item) }, `Moved ${card.title}`);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      actions.removeCard(card.id);
    }
  };

  const addHumanCard = (event: FormEvent) => {
    event.preventDefault();
    const current = caseRef.current;
    const id = uniqueId(slugify(cardForm.title), current.cards.map((card) => card.id));
    const index = current.cards.length;
    const card: EvidenceCard = { id, title: cardForm.title.trim().toUpperCase(), body: cardForm.body.trim(), kind: cardForm.kind, color: cardForm.color, sourceUrl: cardForm.sourceUrl.trim() || undefined, x: 7 + (index * 14) % 70, y: 12 + (index * 19) % 60, width: 19, rotation: ((index % 5) - 2) * 0.8, confidence: cardForm.kind === "question" ? undefined : 70, tags: [], createdBy: "human" };
    commitCase({ ...current, cards: [...current.cards, card] }, `Pinned ${card.title}`);
    setCardForm({ title: "", body: "", kind: "observation", color: "yellow", sourceUrl: "" });
    setShowCardForm(false);
  };

  const tieSelected = () => {
    if (selectedIds.length !== 2) return;
    const current = caseRef.current;
    const id = uniqueId("thread", current.threads.map((item) => item.id));
    const thread: EvidenceThread = { id, fromId: selectedIds[0], toId: selectedIds[1], relation, color: threadColor, rationale: "Human-made connection.", confidence: 100, status: "accepted", createdBy: "human" };
    commitCase({ ...current, threads: [...current.threads, thread] }, `Tied ${relation}`);
    setSelectedIds([]);
    selectedRef.current = [];
  };

  const circleSelected = () => {
    if (selectedIds.length < 2) return;
    const current = caseRef.current;
    const id = uniqueId("circle", current.circles.map((item) => item.id));
    const circle: EvidenceCircle = { id, cardIds: selectedIds, label: "MARKED", color: threadColor, status: "accepted", createdBy: "human" };
    commitCase({ ...current, circles: [...current.circles, circle] }, "Circled selection");
    setSelectedIds([]);
    selectedRef.current = [];
  };

  const removeSelected = () => {
    if (!selectedIds.length) return;
    const current = caseRef.current;
    const removing = new Set(selectedIds);
    const next: CaseFile = {
      ...current,
      cards: current.cards.filter((card) => !removing.has(card.id)),
      threads: current.threads.filter((thread) => !removing.has(thread.fromId) && !removing.has(thread.toId)),
      circles: current.circles.map((circle) => ({ ...circle, cardIds: circle.cardIds.filter((id) => !removing.has(id)) })).filter((circle) => circle.cardIds.length >= 2),
    };
    commitCase(next, `Removed ${selectedIds.length} clue${selectedIds.length === 1 ? "" : "s"}`);
    setSelectedIds([]);
    selectedRef.current = [];
  };

  const startCase = (sample: boolean) => {
    const next = sample ? cloneCase(DEFAULT_CASE) : { ...cloneCase(EMPTY_CASE), title: newCaseTitle.trim().toUpperCase() || "UNTITLED CASE" };
    commitCase(next, sample ? "Sample case restored" : "New case opened");
    setSelectedIds([]);
    selectedRef.current = [];
    setShowCaseForm(false);
    setNewCaseTitle("");
  };

  const runDetective = (rawPrompt?: string) => {
    const prompt = (rawPrompt ?? detectivePrompt).trim();
    if (!prompt) return;
    setDetectivePrompt(prompt);
    setThinking(true);
    window.setTimeout(() => {
      const lower = prompt.toLowerCase();
      const currentAudit = auditBoard(caseRef.current);
      if (lower.includes("lie") || lower.includes("contradict")) {
        const thread = caseRef.current.threads.find((item) => currentAudit.contradictionThreadIds.includes(item.id));
        if (thread) {
          setSelectedIds([thread.fromId, thread.toId]);
          selectedRef.current = [thread.fromId, thread.toId];
          setDetectiveReply("THE WEATHER DOESN'T MATCH.");
        } else setDetectiveReply("NO CLEAN CONTRADICTION. YET.");
      } else if (lower.includes("group") || lower.includes("circle") || lower.includes("timeline")) {
        const cards = caseRef.current.cards.filter((card) => card.tags.includes("timeline")).map((card) => card.id);
        if (cards.length >= 2 && !caseRef.current.circles.some((circle) => circle.cardIds.every((id) => cards.includes(id)))) {
          actions.circleCards({ cardIds: cards, label: "TIMELINE", color: "#e3b04b" });
          setDetectiveReply("TIMELINE MARKED. YOUR CALL.");
        } else {
          setSelectedIds(cards);
          selectedRef.current = cards;
          setDetectiveReply("TIMELINE IS ALREADY ON THE WALL.");
        }
      } else if (lower.includes("missing") || lower.includes("question")) {
        const existing = caseRef.current.cards.find((card) => card.id.startsWith("rain-gap"));
        if (!existing) actions.addCard({ title: "RAIN GAP", body: "Who verified the weather desk's timestamp?", kind: "question", tags: ["weather", "unresolved"] });
        setDetectiveReply(existing ? "THE RAIN GAP IS STILL OPEN." : "ONE QUESTION WASN'T ON THE WALL.");
      } else {
        setDetectiveReply(`${currentAudit.contradictionThreadIds.length} CONFLICT · ${currentAudit.unsupportedClaimIds.length} UNSUPPORTED · ${currentAudit.orphanCardIds.length} LOOSE`);
      }
      setThinking(false);
    }, 520);
  };

  return (
    <div className="app-shell">
      <div className="rain" aria-hidden="true" />
      <div className="smoke" aria-hidden="true" />
      <header className="topbar">
        <a className="brand-lockup" href="#/board"><Fedora small /><span>LOOSE THREAD</span></a>
        <button className="case-title" onClick={() => setShowCaseForm(true)}><span>{caseFile.subtitle}</span><strong>{caseFile.title}</strong></button>
        <nav>
          <button onClick={() => setShowTools(!showTools)} className={`status-pill ${toolState}`}><i />{toolState === "ready" ? `${toolNames.length} TOOLS` : toolState === "checking" ? "CHECKING" : "WEBMCP PREVIEW"}</button>
          <a href="#/field-notes">FIELD NOTES</a>
          <button className="new-case" onClick={() => setShowCaseForm(true)}>NEW CASE</button>
        </nav>
      </header>

      <main className="case-room">
        <section className="board-stage" aria-label="Interactive evidence board">
          <div className="board-frame">
            <div className="frame-label">{caseFile.subtitle}</div>
            <div
              ref={boardRef}
              className="evidence-board"
              onPointerMove={continueDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onDoubleClick={(event) => { if (event.target === event.currentTarget) setShowCardForm(true); }}
            >
              <svg className="string-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <filter id="string-wobble" x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.08" numOctaves="1" seed="4" result="noise">
                      <animate attributeName="baseFrequency" dur="8s" values="0.018 0.08;0.024 0.06;0.018 0.08" repeatCount="indefinite" />
                    </feTurbulence>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.75" xChannelSelector="R" yChannelSelector="B" />
                  </filter>
                  {caseFile.threads.map((thread) => <marker key={thread.id} id={`arrow-${thread.id}`} markerWidth="5.5" markerHeight="5.5" refX="4.5" refY="2.75" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L5.5,2.75 L0,5.5 z" fill={thread.color} /></marker>)}
                </defs>
                {caseFile.circles.map((circle) => {
                  const bounds = circleBounds(caseFile, circle.cardIds);
                  if (!bounds) return null;
                  return <g key={circle.id} className={`chalk-circle ${circle.status}`} onClick={() => circle.status === "proposed" && setSelectedProposalId(circle.id)}><ellipse cx={bounds.cx} cy={bounds.cy} rx={bounds.rx} ry={bounds.ry} stroke={circle.color} /><ellipse className="echo" cx={bounds.cx + .3} cy={bounds.cy - .4} rx={bounds.rx - .5} ry={bounds.ry + .7} stroke={circle.color} /><text x={bounds.cx} y={Math.max(3, bounds.cy - bounds.ry - 1.1)} fill={circle.color}>{circle.label}</text></g>;
                })}
                {caseFile.threads.map((thread, index) => {
                  const from = caseFile.cards.find((card) => card.id === thread.fromId);
                  const to = caseFile.cards.find((card) => card.id === thread.toId);
                  if (!from || !to) return null;
                  const d = buildStringPath(from, to, index);
                  return <g key={thread.id} className={`evidence-string ${thread.status} ${selectedProposalId === thread.id ? "active" : ""}`} style={{ "--thread": thread.color } as React.CSSProperties} onClick={() => thread.status === "proposed" && setSelectedProposalId(thread.id)}><path className="string-shadow" d={d} /><path className="string-body" d={d} markerEnd={`url(#arrow-${thread.id})`} filter="url(#string-wobble)" pathLength="100" /><path className="string-pulse" d={d} pathLength="100" /></g>;
                })}
              </svg>

              {caseFile.cards.map((card) => (
                <button
                  key={card.id}
                  className={`evidence-card ${card.color} ${selectedIds.includes(card.id) ? "selected" : ""} ${card.createdBy === "agent" ? "agent-card" : ""}`}
                  style={{ left: `${card.x}%`, top: `${card.y}%`, width: `${card.width}%`, transform: `rotate(${card.rotation}deg)` }}
                  onPointerDown={(event) => beginDrag(event, card)}
                  onKeyDown={(event) => moveCardByKey(event, card)}
                  aria-pressed={selectedIds.includes(card.id)}
                >
                  <span className="pushpin" />
                  <span className="card-kind">{kindMarks[card.kind]}</span>
                  <strong>{card.title}</strong>
                  <span className="card-body">{card.body}</span>
                  <span className="card-meta">{card.confidence !== undefined ? `${card.confidence}%` : "OPEN"}{card.createdBy === "agent" ? " · AI" : ""}</span>
                </button>
              ))}

              {!caseFile.cards.length && <button className="empty-board" onClick={() => setShowCardForm(true)}><span>＋</span>PIN FIRST CLUE</button>}
            </div>
          </div>

          <div className="board-toolbar">
            <button className="tool-button add" onClick={() => setShowCardForm(true)}><span>＋</span>CLUE</button>
            <div className="marker-rack" aria-label="Thread color">
              {THREAD_COLORS.map((color) => <button key={color} aria-label={`Use ${color} thread`} className={threadColor === color ? "active" : ""} style={{ "--marker": color } as React.CSSProperties} onClick={() => setThreadColor(color)} />)}
            </div>
            <select value={relation} onChange={(event) => setRelation(event.target.value as RelationKind)} aria-label="Relationship type">{RELATIONS.map((item) => <option key={item}>{item}</option>)}</select>
            <button className="tool-button" onClick={tieSelected} disabled={selectedIds.length !== 2}>↗ STRING</button>
            <button className="tool-button" onClick={circleSelected} disabled={selectedIds.length < 2}>◯ CIRCLE</button>
            <button className="tool-button" onClick={removeSelected} disabled={!selectedIds.length}>× REMOVE</button>
            <button className="tool-button" onClick={() => actions.undo()} disabled={!historyCount}>↶ UNDO</button>
            <span className="latest-action">{latest}</span>
          </div>
        </section>

        <aside className="detective-desk">
          <div className="desk-lamp-glow" />
          <div className="detective-head">
            <div className="detective-avatar"><Fedora /><span className={thinking ? "thinking" : ""} /></div>
            <div><small>AI DETECTIVE</small><strong>THE DESK</strong></div>
            <i className={toolState} />
          </div>
          <div className="detective-reply" aria-live="polite"><span>“</span>{thinking ? "..." : detectiveReply}</div>
          <div className="prompt-shortcuts">
            {["Find the lie", "Group the timeline", "What's missing?"].map((prompt) => <button key={prompt} onClick={() => runDetective(prompt)}>{prompt}</button>)}
          </div>
          <form className="detective-form" onSubmit={(event) => { event.preventDefault(); runDetective(); }}>
            <input value={detectivePrompt} onChange={(event) => setDetectivePrompt(event.target.value)} placeholder="Ask the board…" aria-label="Ask the AI detective" />
            <button aria-label="Send">↗</button>
          </form>

          <div className="desk-divider" />
          <div className="audit-dial"><div style={{ "--score": `${audit.score * 3.6}deg` } as React.CSSProperties}><strong>{audit.score}</strong></div><span>CASE<br />INTEGRITY</span></div>
          <div className="audit-tally"><span><b>{audit.contradictionThreadIds.length}</b> CONFLICT</span><span><b>{audit.unsupportedClaimIds.length}</b> UNSUPPORTED</span><span><b>{audit.orphanCardIds.length}</b> LOOSE</span></div>

          <div className="proposals">
            <div className="proposal-title"><span>PROPOSALS</span><b>{proposals.length}</b></div>
            {selectedProposal ? <article className="proposal-card">
              <small>AGENT · {"relation" in selectedProposal ? selectedProposal.relation : "cluster"}</small>
              <strong>{"rationale" in selectedProposal ? selectedProposal.rationale : selectedProposal.label}</strong>
              <div><button onClick={() => actions.resolveProposal(selectedProposal.id, "reject")}>× REJECT</button><button className="accept" onClick={() => actions.resolveProposal(selectedProposal.id, "accept")}>✓ ACCEPT</button></div>
            </article> : <p className="no-proposals">WALL IS YOURS.</p>}
          </div>
        </aside>
      </main>

      {showTools && <div className="tool-drawer"><button onClick={() => setShowTools(false)}>×</button><small>WEBMCP</small><strong>{toolState === "ready" ? "LIVE" : "PREVIEW"}</strong><div>{(toolNames.length ? toolNames : ["inspect_board", "search_cards", "audit_evidence", "trace_connections", "add_card", "move_card", "remove_card", "propose_connection", "circle_cards", "resolve_proposal", "undo_board_change"]).map((name) => <code key={name}>{name}</code>)}</div></div>}

      {showCardForm && <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && setShowCardForm(false)}><form className="case-modal card-modal" onSubmit={addHumanCard}><button type="button" className="modal-close" onClick={() => setShowCardForm(false)}>×</button><p>PIN A CLUE</p><input autoFocus required maxLength={48} placeholder="TITLE" value={cardForm.title} onChange={(event) => setCardForm({ ...cardForm, title: event.target.value })} /><textarea required maxLength={180} placeholder="WHAT DO WE KNOW?" value={cardForm.body} onChange={(event) => setCardForm({ ...cardForm, body: event.target.value })} /><div className="form-row"><select value={cardForm.kind} onChange={(event) => setCardForm({ ...cardForm, kind: event.target.value as CardKind })}>{CARD_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select><input placeholder="SOURCE URL (OPTIONAL)" type="url" value={cardForm.sourceUrl} onChange={(event) => setCardForm({ ...cardForm, sourceUrl: event.target.value })} /></div><div className="paper-swatches">{CARD_COLORS.map((color) => <button key={color} type="button" aria-label={`${color} paper`} className={`${color} ${cardForm.color === color ? "active" : ""}`} onClick={() => setCardForm({ ...cardForm, color })} />)}</div><button className="modal-submit">PIN IT</button></form></div>}

      {showCaseForm && <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && setShowCaseForm(false)}><div className="case-modal new-case-modal"><button className="modal-close" onClick={() => setShowCaseForm(false)}>×</button><p>OPEN A CASE</p><input autoFocus maxLength={50} placeholder="CASE NAME" value={newCaseTitle} onChange={(event) => setNewCaseTitle(event.target.value)} /><div className="case-choices"><button onClick={() => startCase(false)} disabled={!newCaseTitle.trim()}><b>EMPTY WALL</b><span>START CLEAN</span></button><button onClick={() => startCase(true)}><b>11:47 TRAIN</b><span>LOAD SAMPLE</span></button></div></div></div>}

      <AppFooter />
    </div>
  );
}
