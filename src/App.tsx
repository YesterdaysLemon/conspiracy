import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import detectiveTerminal from "./assets/detective-terminal.webp?url";
import { askDetective } from "./ai/provider";
import { cloneCase, DEFAULT_CASE, EMPTY_CASE } from "./data/defaultCase";
import {
  auditBoard,
  buildStringPath,
  CARD_KINDS,
  cardPin,
  cardsInsidePolygon,
  clampCard,
  organicRegionPaths,
  pointInPolygon,
  pointsToPath,
  RELATIONS,
  searchCards,
  strokeIsClosed,
  THREAD_COLORS,
  uniqueId,
} from "./lib/board";
import {
  exportableCase,
  initialLibrary,
  LEGACY_STORAGE_KEY,
  LIBRARY_STORAGE_KEY,
  newCardAt,
  normalizeCase,
  parseImportedCase,
  restoreTrash,
  trashCard,
} from "./lib/library";
import type {
  BoardMutationResult,
  BoardPoint,
  BoardSnapshot,
  CardKind,
  CaseFile,
  CaseLibrary,
  EvidenceCard,
  EvidenceCircle,
  EvidenceStatus,
  EvidenceStroke,
  EvidenceThread,
  RelationKind,
} from "./types";
import { registerWebMCPTools, type RegisteredTools, type WebMCPActions } from "./webmcp/registerTools";

const ENTERED_KEY = "loose-thread-entered-v2";
const CARD_COLORS = ["yellow", "paper", "rose", "blue", "green", "violet"];
const STATUS_OPTIONS: EvidenceStatus[] = ["open", "verified", "disputed", "closed"];
const CHALK_WIDTH = 12;

type ToolMode = "select" | "draw" | "erase";
type MobileView = "board" | "desk";

type Interaction =
  | { kind: "card"; cardId: string; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean; additive: boolean }
  | { kind: "pan"; startClientX: number; startClientY: number; originX: number; originY: number; moved: boolean };

interface CardFormState {
  title: string;
  body: string;
  kind: CardKind;
  color: string;
  sourceUrl: string;
}

const doodleMarks: Record<CardKind, string> = {
  source: "▱",
  observation: "◉",
  claim: "!",
  hypothesis: "✦",
  question: "?",
  person: "◎",
};

function AppFooter() {
  return (
    <footer className="app-footer">
      <a href="https://alirezaafshan.com" target="_blank" rel="noreferrer">alirezaafshan.com</a>
      <span>·</span>
      <a className="sponsor-link" href="https://github.com/sponsors/YesterdaysLemon" target="_blank" rel="noreferrer">♥ Sponsor</a>
      <span>·</span>
      <a href="https://github.com/YesterdaysLemon/loose-thread-webmcp" target="_blank" rel="noreferrer">Open source</a>
    </footer>
  );
}

function FieldNotes() {
  return (
    <div className="notes-page">
      <header className="notes-nav">
        <a className="brand-lockup" href="#/board"><span className="brand-thread" />LOOSE THREAD</a>
        <a className="back-to-board" href="#/board">← BOARD</a>
      </header>
      <main className="notes-copy">
        <p className="kicker">FIELD NOTES · 01</p>
        <h1>A silly board.<br />A serious primitive.</h1>
        <p className="lede">The red string is theater. The shared, inspectable reasoning underneath it is not.</p>
        <section><p className="section-number">01</p><div><h2>One surface. Two languages.</h2><p>People pin, group, circle, and connect. Agents need stable identities, typed relationships, and reversible actions. WebMCP lets both work on the same living artifact.</p></div></section>
        <section><p className="section-number">02</p><div><h2>Propose, don't pronounce.</h2><p>A machine may notice a pattern. It does not get to promote that pattern into truth. Every deduction arrives as a physical suggestion with a human decision attached.</p></div></section>
        <section><p className="section-number">03</p><div><h2>The toy scales sideways.</h2><div className="domain-grid"><article><b>REPORTING</b><span>claims ↔ sources</span></article><article><b>INCIDENTS</b><span>events ↔ causes</span></article><article><b>RESEARCH</b><span>findings ↔ hypotheses</span></article><article><b>THREAT MODELS</b><span>assets ↔ risks</span></article><article><b>DEBUGGING</b><span>symptoms ↔ changes</span></article><article><b>STORIES</b><span>characters ↔ motives</span></article></div></div></section>
        <blockquote>Make thought visible.<br />Keep judgment human.</blockquote>
      </main>
      <AppFooter />
    </div>
  );
}

function makeLibrary(): CaseLibrary {
  if (typeof window === "undefined") return initialLibrary(null, null);
  return initialLibrary(localStorage.getItem(LIBRARY_STORAGE_KEY), localStorage.getItem(LEGACY_STORAGE_KEY));
}

function pointToSegmentDistance(point: BoardPoint, start: BoardPoint, end: BoardPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y);
  const amount = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + dx * amount), point.y - (start.y + dy * amount));
}

function cardStyle(card: EvidenceCard): CSSProperties {
  const seed = [...card.id].reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const driftX = ((seed % 13) - 6) * 0.38;
  const driftY = -0.7 - ((seed >>> 4) % 12) * 0.18;
  const gustX = ((seed % 17) - 8) * 0.85;
  const gustLift = -8 - ((seed >>> 3) % 9);
  const gustRotate = ((seed % 13) - 6) * 0.52;
  const animations = ["paper-breathe-a", "paper-breathe-b", "paper-breathe-c"];
  return {
    left: card.x,
    top: card.y,
    width: card.width,
    height: card.height ?? 180,
    "--card-rotation": `${card.rotation}deg`,
    "--card-delay": `${-((seed % 73) / 10)}s`,
    "--card-duration": `${4.4 + (seed % 39) / 10}s`,
    "--card-drift-x": `${driftX}px`,
    "--card-drift-y": `${driftY}px`,
    "--card-return-x": `${driftX * -0.55}px`,
    "--card-return-y": `${driftY * -0.4}px`,
    "--card-tilt-a": `${((seed % 9) - 4) * 0.08}deg`,
    "--card-tilt-b": `${(((seed >>> 5) % 11) - 5) * 0.09}deg`,
    "--card-origin-x": `${42 + (seed % 17)}%`,
    "--card-animation": animations[seed % animations.length],
    "--gust-delay": `${(seed % 10) * 0.032}s`,
    "--gust-duration": `${0.52 + (seed % 8) * 0.055}s`,
    "--gust-x": `${gustX}px`,
    "--gust-lift": `${gustLift}px`,
    "--gust-rotate": `${gustRotate}deg`,
    "--gust-return-x": `${gustX * -0.32}px`,
    "--gust-return-y": `${gustLift * 0.34}px`,
    "--gust-return-rotate": `${gustRotate * -0.38}deg`,
  } as CSSProperties;
}

export default function App() {
  const [route, setRoute] = useState("#/board");
  const [library, setLibrary] = useState<CaseLibrary>(() => initialLibrary(null, null));
  const caseFile = useMemo(() => library.cases.find((item) => item.id === library.activeCaseId) ?? library.cases[0], [library]);
  const [showEntrance, setShowEntrance] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("board");
  const [showCases, setShowCases] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [inspectorDraft, setInspectorDraft] = useState<EvidenceCard | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [latest, setLatest] = useState("CASE OPENED");
  const [rolling, setRolling] = useState<"idle" | "out" | "in">("idle");
  const [toolMode, setToolMode] = useState<ToolMode>("select");
  const [threadColor, setThreadColor] = useState(THREAD_COLORS[0]);
  const [relation, setRelation] = useState<RelationKind>("supports");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectionPoint, setConnectionPoint] = useState<BoardPoint | null>(null);
  const [draftStroke, setDraftStroke] = useState<BoardPoint[]>([]);
  const [pendingRegion, setPendingRegion] = useState<EvidenceStroke | null>(null);
  const [regionLabel, setRegionLabel] = useState("MARKED");
  const [cardAnchor, setCardAnchor] = useState<BoardPoint>({ x: 480, y: 360 });
  const [cardForm, setCardForm] = useState<CardFormState>({ title: "", body: "", kind: "observation", color: "yellow", sourceUrl: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [detectivePrompt, setDetectivePrompt] = useState("");
  const [detectiveReply, setDetectiveReply] = useState("THE BOARD IS AWAKE.");
  const [detectiveSource, setDetectiveSource] = useState<"local" | "hosted" | "webmcp">("local");
  const [thinking, setThinking] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [toolState, setToolState] = useState<"checking" | "ready" | "preview">("checking");
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [showTools, setShowTools] = useState(false);
  const [relinkId, setRelinkId] = useState<string | null>(null);

  const appRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const caseRef = useRef(caseFile);
  const selectedRef = useRef(selectedIds);
  const historyRef = useRef<BoardSnapshot[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const attachmentUrlsRef = useRef<Record<string, string>>({});
  const boardFrameRef = useRef<number | null>(null);
  const queuedBoardWriteRef = useRef<CaseFile | null>(null);
  const cardOpenTimerRef = useRef<number | null>(null);
  const mobileFitRef = useRef(new Set<string>());
  caseRef.current = caseFile;
  selectedRef.current = selectedIds;

  useEffect(() => {
    setLibrary(makeLibrary());
    setShowEntrance(!localStorage.getItem(ENTERED_KEY));
    setStorageReady(true);
    const onHash = () => setRoute(window.location.hash || "#/board");
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library)), 220);
    return () => window.clearTimeout(timer);
  }, [library, storageReady]);

  useEffect(() => {
    if (!inspectorId) { setInspectorDraft(null); return; }
    const card = caseFile.cards.find((item) => item.id === inspectorId);
    setInspectorDraft(card ? { ...card, tags: [...card.tags], attachments: card.attachments?.map((item) => ({ ...item })) ?? [] } : null);
  }, [caseFile.id, inspectorId]);

  useEffect(() => () => {
    for (const url of Object.values(attachmentUrlsRef.current)) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const stopTouch = (event: TouchEvent) => event.stopPropagation();
    const containTouchMove = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
    };
    stage.addEventListener("touchstart", stopTouch, { passive: true });
    stage.addEventListener("touchmove", containTouchMove, { passive: false });
    stage.addEventListener("touchend", stopTouch, { passive: true });
    stage.addEventListener("touchcancel", stopTouch, { passive: true });
    return () => {
      stage.removeEventListener("touchstart", stopTouch);
      stage.removeEventListener("touchmove", containTouchMove);
      stage.removeEventListener("touchend", stopTouch);
      stage.removeEventListener("touchcancel", stopTouch);
    };
  }, [mobileView, route]);

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-39), { caseFile: cloneCase(caseRef.current), selectedIds: [...selectedRef.current] }];
    setHistoryCount(historyRef.current.length);
  }, []);

  const writeCase = useCallback((next: CaseFile) => {
    const stable = { ...cloneCase(next), updatedAt: new Date().toISOString() };
    caseRef.current = stable;
    setLibrary((current) => ({ ...current, cases: current.cases.map((item) => item.id === stable.id ? stable : item) }));
    return stable;
  }, []);

  const scheduleBoardWrite = useCallback((next: CaseFile) => {
    queuedBoardWriteRef.current = next;
    if (boardFrameRef.current !== null) return;
    boardFrameRef.current = window.requestAnimationFrame(() => {
      boardFrameRef.current = null;
      const queued = queuedBoardWriteRef.current;
      queuedBoardWriteRef.current = null;
      if (queued) writeCase(queued);
    });
  }, [writeCase]);

  useEffect(() => () => {
    if (boardFrameRef.current !== null) window.cancelAnimationFrame(boardFrameRef.current);
    if (cardOpenTimerRef.current !== null) window.clearTimeout(cardOpenTimerRef.current);
  }, []);

  const commitCase = useCallback((next: CaseFile, message: string, recordHistory = true): BoardMutationResult => {
    if (recordHistory) pushHistory();
    const stable = writeCase(next);
    setLatest(message.toUpperCase());
    return { message, caseFile: cloneCase(stable), audit: auditBoard(stable) };
  }, [pushHistory, writeCase]);

  const viewport = caseFile.viewport ?? { x: 85, y: 5, zoom: 0.58 };

  const screenToWorld = useCallback((clientX: number, clientY: number): BoardPoint => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - viewport.x) / viewport.zoom, y: (clientY - rect.top - viewport.y) / viewport.zoom };
  }, [viewport]);

  const visibleWorldCenter = useCallback((): BoardPoint => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 600, y: 420 };
    return { x: (rect.width / 2 - viewport.x) / viewport.zoom, y: (rect.height / 2 - viewport.y) / viewport.zoom };
  }, [viewport]);

  const fitBoard = useCallback((compact = false) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const cards = caseRef.current.cards;
    if (!rect || !cards.length || rect.width < 1 || rect.height < 1) return;
    const left = Math.min(...cards.map((card) => card.x));
    const top = Math.min(...cards.map((card) => card.y));
    const right = Math.max(...cards.map((card) => card.x + card.width));
    const bottom = Math.max(...cards.map((card) => card.y + (card.height ?? 180)));
    const worldWidth = Math.max(1, right - left);
    const worldHeight = Math.max(1, bottom - top);
    const padding = compact ? 34 : 100;
    const zoom = Math.max(0.28, Math.min(0.9, Math.min((rect.width - padding) / worldWidth, (rect.height - padding) / worldHeight)));
    writeCase({
      ...caseRef.current,
      viewport: {
        x: rect.width / 2 - (left + worldWidth / 2) * zoom,
        y: rect.height / 2 - (top + worldHeight / 2) * zoom,
        zoom,
      },
    });
  }, [writeCase]);

  useEffect(() => {
    const caseId = caseFile.id ?? "active-case";
    if (!storageReady || mobileView !== "board" || mobileFitRef.current.has(caseId) || !window.matchMedia("(max-width: 780px)").matches) return;
    mobileFitRef.current.add(caseId);
    const frame = window.requestAnimationFrame(() => fitBoard(true));
    return () => window.cancelAnimationFrame(frame);
  }, [caseFile.id, fitBoard, mobileView, storageReady]);

  const focusCard = useCallback((card: EvidenceCard, open = false) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const zoom = Math.max(0.55, Math.min(1.1, viewport.zoom));
    const x = rect.width / 2 - (card.x + card.width / 2) * zoom;
    const y = rect.height / 2 - (card.y + (card.height ?? 180) / 2) * zoom;
    writeCase({ ...caseRef.current, viewport: { x, y, zoom } });
    setSelectedIds([card.id]);
    selectedRef.current = [card.id];
    if (open) setInspectorId(card.id);
  }, [viewport.zoom, writeCase]);

  const actions = useMemo<WebMCPActions>(() => ({
    getCase: () => cloneCase(caseRef.current),
    getSelectedIds: () => [...selectedRef.current],
    getCases: () => library.cases.map((item) => ({ id: item.id!, title: item.title, subtitle: item.subtitle, cardCount: item.cards.length, active: item.id === library.activeCaseId })),
    switchCase: (caseId) => {
      const nextCase = library.cases.find((item) => item.id === caseId);
      if (!nextCase) throw new Error(`Unknown caseId: ${caseId}`);
      caseRef.current = nextCase;
      setLibrary((current) => ({ ...current, activeCaseId: caseId }));
      historyRef.current = [];
      setHistoryCount(0);
      setSelectedIds([]);
      selectedRef.current = [];
      setInspectorId(null);
      setLatest(`OPENED ${nextCase.title}`);
      return { caseFile: cloneCase(nextCase), message: `Opened ${nextCase.title}` };
    },
    updateCard: (cardId, patch) => {
      const current = caseRef.current;
      const card = current.cards.find((item) => item.id === cardId);
      if (!card) throw new Error(`Unknown cardId: ${cardId}`);
      const updated: EvidenceCard = { ...card, ...patch, tags: patch.tags ?? card.tags, attachments: card.attachments ?? [] };
      const result = commitCase({ ...current, cards: current.cards.map((item) => item.id === cardId ? updated : item) }, `Agent updated ${card.title}`);
      return { ...result, card: updated };
    },
    focusCard: (cardId) => {
      const card = caseRef.current.cards.find((item) => item.id === cardId);
      if (!card) throw new Error(`Unknown cardId: ${cardId}`);
      focusCard(card, true);
      return { message: `Focused ${card.title}`, card };
    },
    getTrash: () => cloneCase(caseRef.current).trash ?? [],
    restoreTrash: (trashId) => commitCase(restoreTrash(caseRef.current, trashId), `Restored ${trashId}`),
    addCard: ({ title, body, kind, sourceUrl, tags }) => {
      const current = caseRef.current;
      const center = visibleWorldCenter();
      const card = newCardAt(current, center.x - 122, center.y - 90, { title, body, kind, color: kind === "question" ? "violet" : kind === "hypothesis" ? "green" : "yellow" });
      card.sourceUrl = sourceUrl;
      card.tags = tags;
      card.createdBy = "agent";
      const result = commitCase({ ...current, cards: [...current.cards, card] }, `Agent pinned ${card.title}`);
      return { ...result, card };
    },
    moveCard: (cardId, xWorld, yWorld) => {
      const current = caseRef.current;
      const card = current.cards.find((item) => item.id === cardId);
      if (!card) throw new Error(`Unknown cardId: ${cardId}`);
      const moved = { ...card, ...clampCard(card, xWorld, yWorld) };
      const result = commitCase({ ...current, cards: current.cards.map((item) => item.id === cardId ? moved : item) }, `Agent moved ${card.title}`);
      return { ...result, card: moved };
    },
    removeCard: (cardId) => commitCase(trashCard(caseRef.current, cardId), `Discarded ${cardId}`),
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
      const id = uniqueId("region", current.circles.map((item) => item.id));
      const circle: EvidenceCircle = { id, cardIds, label: input.label.toUpperCase(), color: input.color ?? "#e3b04b", status: "proposed", createdBy: "agent" };
      const result = commitCase({ ...current, circles: [...current.circles, circle] }, `Agent marked ${circle.label}`);
      setSelectedProposalId(id);
      return { ...result, circle };
    },
    resolveProposal: (proposalId, decision) => {
      const current = caseRef.current;
      const thread = current.threads.find((item) => item.id === proposalId && item.status === "proposed");
      const circle = current.circles.find((item) => item.id === proposalId && item.status === "proposed");
      if (!thread && !circle) throw new Error(`Unknown proposed thread or region: ${proposalId}`);
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
  }), [commitCase, focusCard, library.activeCaseId, library.cases, visibleWorldCenter]);

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

  const triggerGust = useCallback(() => {
    const root = appRef.current;
    if (!root) return;
    root.dataset.gusting = "true";
    root.style.setProperty("--wind-lift", "-9px");
    root.style.setProperty("--wind-skew", "3.2deg");
    root.style.setProperty("--wind-speed", ".48s");
    window.setTimeout(() => {
      root.dataset.gusting = "false";
      root.style.setProperty("--wind-lift", "-1px");
      root.style.setProperty("--wind-skew", ".35deg");
      root.style.setProperty("--wind-speed", "5.8s");
    }, 1650);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let lastX = 0;
    let lastTime = performance.now();
    let lastSign = 0;
    let reversals: number[] = [];
    const onMove = (event: PointerEvent) => {
      const now = performance.now();
      const elapsed = Math.max(8, now - lastTime);
      const velocity = ((event.clientX - lastX) / elapsed) * 1000;
      const sign = Math.sign(velocity);
      if (Math.abs(velocity) > 850 && sign && lastSign && sign !== lastSign) {
        reversals = [...reversals.filter((time) => now - time < 520), now];
        if (reversals.length >= 3) { triggerGust(); reversals = []; }
      }
      if (Math.abs(velocity) > 260) lastSign = sign;
      lastX = event.clientX;
      lastTime = now;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [triggerGust]);

  const switchCase = (id: string) => {
    if (id === library.activeCaseId) { setShowCases(false); return; }
    setRolling("out");
    window.setTimeout(() => {
      setLibrary((current) => ({ ...current, activeCaseId: id }));
      historyRef.current = [];
      setHistoryCount(0);
      setSelectedIds([]);
      setInspectorId(null);
      setRolling("in");
      window.setTimeout(() => setRolling("idle"), 360);
    }, 280);
    setShowCases(false);
  };

  const enterDemo = () => {
    localStorage.setItem(ENTERED_KEY, "yes");
    const existing = library.cases.find((item) => item.id === DEFAULT_CASE.id);
    if (existing) switchCase(existing.id!);
    else {
      const demo = normalizeCase(DEFAULT_CASE, library.cases.map((item) => item.id!));
      setLibrary((current) => ({ ...current, activeCaseId: demo.id!, cases: [...current.cases, demo] }));
    }
    setShowEntrance(false);
  };

  const enterBlank = () => {
    localStorage.setItem(ENTERED_KEY, "yes");
    const blank = normalizeCase({ ...cloneCase(EMPTY_CASE), id: undefined, title: `UNTITLED CASE ${library.cases.length + 1}` }, library.cases.map((item) => item.id!));
    setLibrary((current) => ({ ...current, activeCaseId: blank.id!, cases: [...current.cases, blank] }));
    setShowEntrance(false);
  };

  const beginCardDrag = (event: ReactPointerEvent<HTMLButtonElement>, card: EvidenceCard) => {
    if (event.button !== 0 || toolMode !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    if (cardOpenTimerRef.current !== null) {
      window.clearTimeout(cardOpenTimerRef.current);
      cardOpenTimerRef.current = null;
    }
    const point = screenToWorld(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({ kind: "card", cardId: card.id, offsetX: point.x - card.x, offsetY: point.y - card.y, startX: point.x, startY: point.y, moved: false, additive: event.shiftKey });
  };

  const beginPinConnection = (event: ReactPointerEvent<HTMLButtonElement>, cardId: string) => {
    if (event.button !== 0 || toolMode !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    setConnectingFrom(cardId);
    setConnectionPoint(screenToWorld(event.clientX, event.clientY));
    setSelectedIds([cardId]);
    selectedRef.current = [cardId];
  };

  const finishPinConnection = (event: ReactPointerEvent<HTMLButtonElement>, toCardId: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (!connectingFrom || connectingFrom === toCardId) { setConnectingFrom(null); setConnectionPoint(null); return; }
    const current = caseRef.current;
    const id = uniqueId("thread", current.threads.map((item) => item.id));
    const thread: EvidenceThread = { id, fromId: connectingFrom, toId: toCardId, relation, color: threadColor, rationale: "Human-tied connection.", confidence: 100, status: "accepted", createdBy: "human" };
    commitCase({ ...current, threads: [...current.threads, thread] }, `Tied ${relation}`);
    setConnectingFrom(null);
    setConnectionPoint(null);
    setSelectedIds([]);
  };

  const beginStagePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(".evidence-card-position, .pin-anchor, .board-hud")) return;
    event.preventDefault();
    event.stopPropagation();
    if (toolMode === "draw") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraftStroke([screenToWorld(event.clientX, event.clientY)]);
      return;
    }
    if (toolMode === "erase") {
      eraseAtPoint(screenToWorld(event.clientX, event.clientY));
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({ kind: "pan", startClientX: event.clientX, startClientY: event.clientY, originX: viewport.x, originY: viewport.y, moved: false });
  };

  const continueStagePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (connectingFrom || draftStroke.length || interaction) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (connectingFrom) setConnectionPoint(screenToWorld(event.clientX, event.clientY));
    if (draftStroke.length) {
      const point = screenToWorld(event.clientX, event.clientY);
      const previous = draftStroke.at(-1)!;
      if (Math.hypot(point.x - previous.x, point.y - previous.y) > 7 / viewport.zoom) setDraftStroke((points) => [...points, point]);
      return;
    }
    if (!interaction) return;
    if (interaction.kind === "pan") {
      const dx = event.clientX - interaction.startClientX;
      const dy = event.clientY - interaction.startClientY;
      scheduleBoardWrite({ ...caseRef.current, viewport: { ...viewport, x: interaction.originX + dx, y: interaction.originY + dy } });
      if (!interaction.moved && Math.hypot(dx, dy) > 3) setInteraction({ ...interaction, moved: true });
      return;
    }
    const point = screenToWorld(event.clientX, event.clientY);
    const movedEnough = Math.hypot(point.x - interaction.startX, point.y - interaction.startY) > 4;
    if (!movedEnough) return;
    if (!interaction.moved) { pushHistory(); setInteraction({ ...interaction, moved: true }); }
    const card = caseRef.current.cards.find((item) => item.id === interaction.cardId);
    if (!card) return;
    const moved = { ...card, ...clampCard(card, point.x - interaction.offsetX, point.y - interaction.offsetY) };
    scheduleBoardWrite({ ...caseRef.current, cards: caseRef.current.cards.map((item) => item.id === card.id ? moved : item) });
  };

  const finishStagePointer = (event?: ReactPointerEvent<HTMLDivElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (draftStroke.length) {
      const closed = strokeIsClosed(draftStroke);
      const stroke: EvidenceStroke = { id: uniqueId("stroke", (caseRef.current.strokes ?? []).map((item) => item.id)), points: draftStroke, color: threadColor, width: CHALK_WIDTH, closed, cardIds: closed ? cardsInsidePolygon(caseRef.current, draftStroke) : [], status: "accepted", createdBy: "human" };
      setDraftStroke([]);
      if (closed && stroke.cardIds.length) { setPendingRegion(stroke); setRegionLabel("MARKED"); }
      else commitCase({ ...caseRef.current, strokes: [...(caseRef.current.strokes ?? []), stroke] }, "Drew on the board");
      return;
    }
    if (interaction?.kind === "card") {
      const card = caseRef.current.cards.find((item) => item.id === interaction.cardId);
      if (card && !interaction.moved) {
        if (interaction.additive) {
          const next = selectedRef.current.includes(card.id) ? selectedRef.current.filter((id) => id !== card.id) : [...selectedRef.current, card.id];
          setSelectedIds(next); selectedRef.current = next;
        } else {
          setSelectedIds([card.id]);
          selectedRef.current = [card.id];
          if (cardOpenTimerRef.current !== null) window.clearTimeout(cardOpenTimerRef.current);
          cardOpenTimerRef.current = window.setTimeout(() => {
            cardOpenTimerRef.current = null;
            setInspectorId(card.id);
          }, 220);
        }
      } else if (card) setLatest(`MOVED ${card.title}`);
    }
    setInteraction(null);
    setConnectingFrom(null);
    setConnectionPoint(null);
  };

  const addRegion = (event: FormEvent) => {
    event.preventDefault();
    if (!pendingRegion) return;
    const region: EvidenceCircle = { id: uniqueId("region", caseRef.current.circles.map((item) => item.id)), cardIds: pendingRegion.cardIds, color: pendingRegion.color, label: regionLabel.trim().toUpperCase() || "MARKED", points: pendingRegion.points, status: "accepted", createdBy: "human" };
    commitCase({ ...caseRef.current, circles: [...caseRef.current.circles, region] }, `Marked ${region.label}`);
    setPendingRegion(null);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const worldX = (localX - viewport.x) / viewport.zoom;
    const worldY = (localY - viewport.y) / viewport.zoom;
    const zoom = Math.max(0.28, Math.min(1.55, viewport.zoom * Math.exp(-event.deltaY * 0.0012)));
    writeCase({ ...caseRef.current, viewport: { x: localX - worldX * zoom, y: localY - worldY * zoom, zoom } });
  };

  const openNewCardAt = (point = visibleWorldCenter()) => {
    setCardAnchor({ x: point.x - 122, y: point.y - 90 });
    setCardForm({ title: "", body: "", kind: "observation", color: "yellow", sourceUrl: "" });
    setShowCardForm(true);
  };

  const handleBoardDoubleClick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (toolMode === "select" && !target.closest(".evidence-card-position, .pin-anchor, .board-hud")) openNewCardAt(screenToWorld(event.clientX, event.clientY));
  };

  const openCardOnDoubleClick = (event: ReactMouseEvent<HTMLButtonElement>, card: EvidenceCard) => {
    if (toolMode !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    if (cardOpenTimerRef.current !== null) window.clearTimeout(cardOpenTimerRef.current);
    cardOpenTimerRef.current = null;
    setSelectedIds([card.id]);
    selectedRef.current = [card.id];
    setInspectorId(card.id);
  };

  const eraseStroke = (strokeId: string) => {
    commitCase({ ...caseRef.current, strokes: (caseRef.current.strokes ?? []).filter((stroke) => stroke.id !== strokeId) }, "Erased chalk stroke");
  };

  const eraseRegion = (regionId: string) => {
    const region = caseRef.current.circles.find((circle) => circle.id === regionId);
    commitCase({ ...caseRef.current, circles: caseRef.current.circles.filter((circle) => circle.id !== regionId) }, `Erased ${region?.label ?? "marked region"}`);
  };

  const eraseAtPoint = (point: BoardPoint) => {
    const tolerance = 18 / Math.max(viewport.zoom, 0.28);
    const stroke = [...(caseRef.current.strokes ?? [])].reverse().find((item) => item.points.some((start, index) => {
      const end = item.points[index + 1];
      return end ? pointToSegmentDistance(point, start, end) <= Math.max(tolerance, item.width + 6) : false;
    }));
    if (stroke) { eraseStroke(stroke.id); return; }
    const region = [...caseRef.current.circles].reverse().find((circle) => organicRegionPaths(caseRef.current, circle.cardIds, circle.id).some((cell) => pointInPolygon(point, cell.points)));
    if (region) { eraseRegion(region.id); return; }
    setLatest("ERASER FOUND NO CHALK");
  };

  const addHumanCard = (event: FormEvent) => {
    event.preventDefault();
    const card = newCardAt(caseRef.current, cardAnchor.x, cardAnchor.y, { title: cardForm.title.trim() || "Untitled clue", body: cardForm.body.trim(), kind: cardForm.kind, color: cardForm.color });
    card.sourceUrl = cardForm.sourceUrl.trim() || undefined;
    commitCase({ ...caseRef.current, cards: [...caseRef.current.cards, card] }, `Pinned ${card.title}`);
    setShowCardForm(false);
    setInspectorId(card.id);
  };

  const moveCardByKey = (event: ReactKeyboardEvent<HTMLButtonElement>, card: EvidenceCard) => {
    const directions: Record<string, BoardPoint> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    if (directions[event.key]) {
      event.preventDefault();
      const scale = event.shiftKey ? 25 : 6;
      const delta = directions[event.key];
      const moved = { ...card, ...clampCard(card, card.x + delta.x * scale, card.y + delta.y * scale) };
      commitCase({ ...caseRef.current, cards: caseRef.current.cards.map((item) => item.id === card.id ? moved : item) }, `Moved ${card.title}`);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      discardCard(card.id);
    }
  };

  const discardCard = (cardId: string) => {
    const card = caseRef.current.cards.find((item) => item.id === cardId);
    if (!card) return;
    commitCase(trashCard(caseRef.current, card.id), `Discarded ${card.title}`);
    const nextSelected = selectedRef.current.filter((id) => id !== card.id);
    setSelectedIds(nextSelected);
    selectedRef.current = nextSelected;
    setInspectorId(null);
    setInspectorDraft(null);
    setShowTrash(true);
  };

  const saveInspector = (event: FormEvent) => {
    event.preventDefault();
    if (!inspectorDraft) return;
    commitCase({ ...caseRef.current, cards: caseRef.current.cards.map((item) => item.id === inspectorDraft.id ? inspectorDraft : item) }, `Filed ${inspectorDraft.title}`);
    setInspectorId(null);
  };

  const chooseAttachment = (id?: string) => {
    setRelinkId(id ?? null);
    attachmentInputRef.current?.click();
  };

  const attachLocalFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !inspectorDraft) return;
    const id = relinkId ?? `attachment-${Date.now()}`;
    if (attachmentUrlsRef.current[id]) URL.revokeObjectURL(attachmentUrlsRef.current[id]);
    attachmentUrlsRef.current[id] = URL.createObjectURL(file);
    const record = { id, name: file.name, mimeType: file.type || "application/octet-stream", size: file.size, lastModified: file.lastModified, available: true };
    const attachments = relinkId
      ? (inspectorDraft.attachments ?? []).map((item) => item.id === relinkId ? record : item)
      : [...(inspectorDraft.attachments ?? []), record];
    setInspectorDraft({ ...inspectorDraft, attachments });
    setRelinkId(null);
    event.target.value = "";
  };

  const storyAction = (action: "ask" | "suspicious" | "connect" | "contradicts") => {
    if (!inspectorDraft) return;
    if (action === "ask") { setDetectivePrompt(`What matters about ${inspectorDraft.title}?`); setInspectorId(null); setMobileView("desk"); }
    if (action === "suspicious") setInspectorDraft({ ...inspectorDraft, status: "disputed" });
    if (action === "connect" || action === "contradicts") {
      setSelectedIds([inspectorDraft.id]); selectedRef.current = [inspectorDraft.id];
      if (action === "contradicts") setRelation("contradicts");
      setInspectorId(null);
      setLatest(action === "contradicts" ? "PULL A CONTRADICTION FROM THIS PIN" : "PULL STRING FROM THIS PIN");
    }
  };

  const submitDetective = async (event?: FormEvent, suppliedPrompt?: string) => {
    event?.preventDefault();
    const prompt = (suppliedPrompt ?? detectivePrompt).trim();
    if (!prompt || thinking) return;
    setThinking(true);
    setDetectiveReply("...");
    const response = await askDetective({ caseFile: caseRef.current, prompt, selectedCardId: selectedRef.current[0], consentToHostedModel: false });
    setDetectiveSource(response.source);
    setDetectiveReply(response.reply.toUpperCase());
    if (response.action?.type === "thread") actions.proposeThread(response.action);
    if (response.action?.type === "circle") actions.circleCards(response.action);
    setDetectivePrompt("");
    setThinking(false);
  };

  const importCase = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseImportedCase(await file.text(), library.cases.map((item) => item.id!));
      setLibrary((current) => ({ ...current, activeCaseId: imported.id!, cases: [...current.cases, imported] }));
      setShowCases(false);
      setLatest("CASE IMPORTED");
    } catch (error) {
      setLatest(error instanceof Error ? error.message : "IMPORT FAILED");
    }
    event.target.value = "";
  };

  const downloadCase = () => {
    const blob = new Blob([JSON.stringify(exportableCase(caseRef.current), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${caseRef.current.id ?? "case"}.loose-thread.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const restoreItem = (id: string) => {
    commitCase(restoreTrash(caseRef.current, id), "Evidence restored");
    setShowTrash(false);
  };

  const emptyTrash = () => {
    if (!window.confirm("Empty this case's wastebasket permanently?")) return;
    commitCase({ ...caseRef.current, trash: [] }, "Wastebasket emptied");
  };

  if (route.includes("field-notes")) return <FieldNotes />;

  const audit = auditBoard(caseFile);
  const proposals = [...caseFile.threads.filter((item) => item.status === "proposed"), ...caseFile.circles.filter((item) => item.status === "proposed")];
  const selectedProposal = proposals.find((item) => item.id === selectedProposalId) ?? proposals[0];
  const searchResults = searchQuery.trim() ? searchCards(caseFile, searchQuery).slice(0, 6) : [];
  const bounds = caseFile.cards.length ? {
    left: Math.min(...caseFile.cards.map((card) => card.x)), top: Math.min(...caseFile.cards.map((card) => card.y)),
    right: Math.max(...caseFile.cards.map((card) => card.x + card.width)), bottom: Math.max(...caseFile.cards.map((card) => card.y + (card.height ?? 180))),
  } : { left: 0, top: 0, right: 1, bottom: 1 };

  return (
    <div ref={appRef} className="app-shell" data-gusting="false">
      <div className="rain-window" aria-hidden="true"><i /><i /><i /></div>
      <div className="room-smoke" aria-hidden="true" />

      <header className="topbar">
        <a className="brand-lockup" href="#/board" aria-label="Loose Thread"><span className="brand-thread" /><span>LOOSE THREAD</span></a>
        <button className="case-heading" onClick={() => setShowCases(true)}><small>{caseFile.subtitle}</small><strong>{caseFile.title}</strong></button>
        <nav>
          <a href="#/field-notes">FIELD NOTES</a>
          <button className={`status-pill ${toolState}`} onClick={() => setShowTools((value) => !value)}><i />{toolState === "ready" ? "WEBMCP LIVE" : "TOOL PREVIEW"}</button>
          <button className="new-case-button" onClick={() => setShowCases(true)}><span className="full-label">CASE FILES</span><span className="short-label">FILES</span></button>
        </nav>
      </header>

      <main className="case-room" data-mobile-view={mobileView}>
        <section className={`board-stage board-roll-${rolling}`}>
          <div
            ref={stageRef}
            className={`board-viewport mode-${toolMode}`}
            style={{ "--cork-x": `${viewport.x}px`, "--cork-y": `${viewport.y}px`, "--cork-size": `${520 * viewport.zoom}px` } as CSSProperties}
            onPointerDown={beginStagePointer}
            onPointerMove={continueStagePointer}
            onPointerUp={finishStagePointer}
            onPointerCancel={finishStagePointer}
            onDoubleClick={handleBoardDoubleClick}
            onWheel={handleWheel}
          >
            <div className="board-world" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
              <div className="world-cork" />

              <svg className="region-layer" aria-hidden="true">
                {caseFile.circles.map((circle) => {
                  const cells = organicRegionPaths(caseFile, circle.cardIds, circle.id);
                  if (!cells.length) return null;
                  return (
                    <g key={circle.id} className={circle.status === "proposed" ? "region proposed" : "region"} style={{ color: circle.color }}>
                      {cells.map((cell, index) => <g key={`${circle.id}-cell-${index}`}><path d={cell.d} /><text x={cell.label.x} y={cell.label.y}>{circle.label}{cells.length > 1 ? ` · ${index + 1}` : ""}</text></g>)}
                    </g>
                  );
                })}
                {(caseFile.strokes ?? []).map((stroke) => <path key={stroke.id} className="freehand-stroke" d={pointsToPath(stroke.points, stroke.closed)} style={{ color: stroke.color, strokeWidth: stroke.width }} />)}
                {draftStroke.length ? <path className="freehand-stroke live" d={pointsToPath(draftStroke)} style={{ color: threadColor, strokeWidth: CHALK_WIDTH }} /> : null}
              </svg>

              <div className="card-layer">
                {caseFile.cards.map((card) => (
                  <div key={card.id} className={`evidence-card-position ${selectedIds.includes(card.id) ? "selected" : ""}`} style={cardStyle(card)}>
                    <button
                      className={`evidence-card ${card.color} ${card.createdBy === "agent" ? "agent-card" : ""}`}
                      onPointerDown={(event) => beginCardDrag(event, card)}
                      onDoubleClick={(event) => openCardOnDoubleClick(event, card)}
                      onKeyDown={(event) => moveCardByKey(event, card)}
                      aria-label={`Inspect ${card.title}`}
                    >
                      <span className={`card-doodle doodle-${card.kind}`} aria-hidden="true">{doodleMarks[card.doodle ?? card.kind]}</span>
                      <strong>{card.title}</strong>
                      <span className="card-body">{card.body || "…"}</span>
                      {card.time || card.place ? <span className="card-whisper">{card.time ?? card.place}</span> : null}
                    </button>
                  </div>
                ))}
              </div>

              <svg className="thread-layer" aria-hidden="true">
                <defs>
                  <filter id="fiber-wiggle" x="-25%" y="-25%" width="150%" height="150%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.016 0.07" numOctaves="1" seed="4" result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                  {THREAD_COLORS.map((color, index) => <marker key={color} id={`arrow-${index}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 L 2.5 5 Z" fill={color} /></marker>)}
                </defs>
                {caseFile.threads.map((thread, index) => {
                  const from = caseFile.cards.find((card) => card.id === thread.fromId);
                  const to = caseFile.cards.find((card) => card.id === thread.toId);
                  if (!from || !to) return null;
                  const path = buildStringPath(from, to, index);
                  const start = cardPin(from);
                  const end = cardPin(to);
                  const colorIndex = Math.max(0, THREAD_COLORS.indexOf(thread.color));
                  return (
                    <g key={thread.id} className={`thread ${thread.status}`} style={{ color: thread.color }}>
                      <path className="thread-contact" d={path} />
                      <path className="thread-fiber" d={path} markerEnd={`url(#arrow-${colorIndex})`} />
                      <path className="thread-twist" d={path} pathLength="1" />
                      <circle className="thread-knot" cx={start.x} cy={start.y} r="13" />
                      <circle className="thread-knot" cx={end.x} cy={end.y} r="13" />
                    </g>
                  );
                })}
                {connectingFrom && connectionPoint ? (() => {
                  const from = caseFile.cards.find((card) => card.id === connectingFrom);
                  if (!from) return null;
                  const start = cardPin(from);
                  return <path className="connection-preview" d={`M ${start.x} ${start.y} Q ${(start.x + connectionPoint.x) / 2} ${Math.max(start.y, connectionPoint.y) + 70}, ${connectionPoint.x} ${connectionPoint.y}`} style={{ color: threadColor }} />;
                })() : null}
              </svg>

              <div className="pin-layer">
                {caseFile.cards.map((card) => {
                  const pin = cardPin(card);
                  return <button key={card.id} className={`pin-anchor ${connectingFrom === card.id ? "pulling" : ""}`} style={{ left: pin.x, top: pin.y }} onPointerDown={(event) => beginPinConnection(event, card.id)} onPointerUp={(event) => finishPinConnection(event, card.id)} aria-label={`Pull string from ${card.title}`}><i /></button>;
                })}
              </div>
            </div>

            {!caseFile.cards.length ? <button className="empty-board" onClick={() => openNewCardAt()}><span>＋</span>PIN FIRST CLUE</button> : null}

            <div className="board-hud zoom-controls">
              <button onClick={() => writeCase({ ...caseRef.current, viewport: { ...viewport, zoom: Math.max(0.28, viewport.zoom - 0.1) } })}>−</button>
              <span>{Math.round(viewport.zoom * 100)}%</span>
              <button onClick={() => writeCase({ ...caseRef.current, viewport: { ...viewport, zoom: Math.min(1.55, viewport.zoom + 0.1) } })}>+</button>
            </div>
            <div className="board-hud board-search">
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Find a clue…" aria-label="Search evidence" />
              {searchResults.length ? <div>{searchResults.map((card) => <button key={card.id} onClick={() => { focusCard(card, true); setSearchQuery(""); }}>{card.title}</button>)}</div> : null}
            </div>
            <button className="board-hud paper-map" onClick={() => fitBoard(false)} aria-label="Fit case on board">
              {caseFile.cards.map((card) => <i key={card.id} style={{ left: `${((card.x - bounds.left) / Math.max(1, bounds.right - bounds.left)) * 88 + 6}%`, top: `${((card.y - bounds.top) / Math.max(1, bounds.bottom - bounds.top)) * 76 + 10}%` }} />)}
            </button>
          </div>

          <div className="board-toolbar">
            <button className="tool-button add" onClick={() => openNewCardAt()}><span>＋</span> CLUE</button>
            <button className={`tool-button pencil ${toolMode === "draw" ? "active" : ""}`} onClick={() => setToolMode((mode) => mode === "draw" ? "select" : "draw")}>✎ CHALK</button>
            <button className={`tool-button eraser ${toolMode === "erase" ? "active" : ""}`} onClick={() => setToolMode((mode) => mode === "erase" ? "select" : "erase")}>▱ ERASER</button>
            <select value={relation} onChange={(event) => setRelation(event.target.value as RelationKind)} aria-label="Connection type">{RELATIONS.map((item) => <option key={item}>{item}</option>)}</select>
            <div className="marker-rack" aria-label="Marker colors">{THREAD_COLORS.map((color) => <button key={color} className={threadColor === color ? "active" : ""} style={{ "--marker": color } as CSSProperties} onClick={() => setThreadColor(color)} aria-label={`Use ${color}`} />)}</div>
            <button className="tool-button" onClick={triggerGust}>◒ FAN</button>
            <button className="tool-button" disabled={!historyCount} onClick={() => actions.undo()}>↶ UNDO</button>
            <button className="tool-button throw-button" disabled={!selectedIds.length} onClick={() => discardCard(selectedIds[0])}>↘ THROW AWAY</button>
            <button className="tool-button trash-button" onClick={() => setShowTrash(true)}>⌫ BIN <b>{caseFile.trash?.length ?? 0}</b></button>
            <span className="latest-action">{latest}</span>
          </div>
        </section>

        <aside className="detective-desk">
          <div className="desk-header">
            <div className="terminal-character">
              <img src={detectiveTerminal} alt="Vintage robot detective terminal with a fedora" />
              <span className={`terminal-busy ${thinking ? "thinking" : ""}`} />
            </div>
            <div className="terminal-copy">
              <small>AI DETECTIVE · {detectiveSource === "local" ? "LOCAL FALLBACK" : detectiveSource.toUpperCase()}</small>
              <strong>THE DESK</strong>
            </div>
          </div>
          <div className={`detective-reply ${thinking ? "thinking" : ""}`}><span aria-hidden="true">›</span><p>{detectiveReply}</p></div>
          <div className="prompt-shortcuts">
            <button onClick={() => submitDetective(undefined, "What doesn't fit?")}>WHAT DOESN'T FIT?</button>
            <button onClick={() => submitDetective(undefined, "Group the timeline")}>TIMELINE</button>
            <button onClick={() => submitDetective(undefined, "What's missing?")}>LOOSE ENDS</button>
          </div>
          <form className="detective-form" onSubmit={(event) => submitDetective(event)}>
            <input value={detectivePrompt} onChange={(event) => setDetectivePrompt(event.target.value)} placeholder="Ask the board…" aria-label="Ask the detective" />
            <button disabled={!detectivePrompt.trim() || thinking}>↗</button>
          </form>
          <div className="desk-divider" />
          <div className="audit-dial"><div style={{ "--score": `${audit.score * 3.6}deg` } as CSSProperties}><strong>{audit.score}</strong></div><span>CASE<br />INTEGRITY</span></div>
          <div className="audit-tally"><span><b>{audit.contradictionThreadIds.length}</b>CONFLICT</span><span><b>{audit.unsupportedClaimIds.length}</b>UNSUPPORTED</span><span><b>{audit.orphanCardIds.length}</b>LOOSE</span></div>
          <div className="proposals">
            <div className="proposal-title">SUGGESTIONS <b>{proposals.length}</b></div>
            {selectedProposal ? <div className="proposal-card"><small>{"relation" in selectedProposal ? selectedProposal.relation : selectedProposal.label}</small><strong>{"rationale" in selectedProposal ? selectedProposal.rationale : `${selectedProposal.cardIds.length} clues marked.`}</strong><div><button onClick={() => setDetectiveReply(("rationale" in selectedProposal ? selectedProposal.rationale : selectedProposal.label).toUpperCase())}>WHY?</button><button onClick={() => actions.resolveProposal(selectedProposal.id, "reject")}>REJECT</button><button className="accept" onClick={() => actions.resolveProposal(selectedProposal.id, "accept")}>ACCEPT</button></div></div> : <p className="no-proposals">NO GHOSTS ON THE BOARD.</p>}
          </div>
        </aside>
      </main>
      <nav className="mobile-tabs" aria-label="Workspace view">
        <button className={mobileView === "board" ? "active" : ""} aria-pressed={mobileView === "board"} onClick={() => setMobileView("board")}><span>⌁</span>BOARD</button>
        <button className={mobileView === "desk" ? "active" : ""} aria-pressed={mobileView === "desk"} onClick={() => setMobileView("desk")}><span>▣</span>DESK{proposals.length ? <b>{proposals.length}</b> : null}</button>
        <button onClick={() => setShowCases(true)}><span>▤</span>FILES</button>
      </nav>
      <AppFooter />

      {showEntrance ? <div className="entrance-scrim"><div className="entrance-card"><span className="entrance-thread" /><small>LOOSE THREAD</small><h1>Every clue<br />pulls somewhere.</h1><div><button onClick={enterDemo}><b>OPEN A CASE</b><span>Victorian mystery</span></button><button onClick={enterBlank}><b>START A CASE</b><span>Empty cork</span></button></div></div></div> : null}

      {showCases ? <div className="modal-scrim" onPointerDown={(event) => { if (event.target === event.currentTarget) setShowCases(false); }}><section className="case-files-modal"><button className="modal-close" onClick={() => setShowCases(false)}>×</button><p>CASE FILES</p><div className="roller-list">{library.cases.map((item) => <button key={item.id} className={item.id === caseFile.id ? "active" : ""} onClick={() => switchCase(item.id!)}><span>{item.subtitle}</span><b>{item.title}</b><i>{item.cards.length} clues</i></button>)}</div><div className="case-file-actions"><button onClick={enterBlank}>＋ BLANK</button><button onClick={() => importInputRef.current?.click()}>⇧ IMPORT</button><button onClick={downloadCase}>⇩ EXPORT</button></div><input ref={importInputRef} className="visually-hidden" type="file" accept=".json,.loose-thread" onChange={importCase} /></section></div> : null}

      {showCardForm ? <div className="modal-scrim"><form className="case-modal clue-form" onSubmit={addHumanCard}><button type="button" className="modal-close" onClick={() => setShowCardForm(false)}>×</button><p>PIN A CLUE</p><input autoFocus value={cardForm.title} onChange={(event) => setCardForm({ ...cardForm, title: event.target.value })} placeholder="Title" required /><textarea value={cardForm.body} onChange={(event) => setCardForm({ ...cardForm, body: event.target.value })} placeholder="What do we know?" /><div className="form-row"><select value={cardForm.kind} onChange={(event) => setCardForm({ ...cardForm, kind: event.target.value as CardKind })}>{CARD_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select><input value={cardForm.sourceUrl} onChange={(event) => setCardForm({ ...cardForm, sourceUrl: event.target.value })} placeholder="Source URL (optional)" /></div><div className="paper-swatches">{CARD_COLORS.map((color) => <button type="button" key={color} className={`${color} ${cardForm.color === color ? "active" : ""}`} onClick={() => setCardForm({ ...cardForm, color })} aria-label={`${color} paper`} />)}</div><button className="modal-submit">PIN IT</button></form></div> : null}

      {inspectorDraft ? <div className="inspector-scrim" onPointerDown={(event) => { if (event.target === event.currentTarget) setInspectorId(null); }}><form className="evidence-inspector" onSubmit={saveInspector}><button type="button" className="modal-close" onClick={() => setInspectorId(null)}>×</button><div className={`lifted-note ${inspectorDraft.color}`}><span className="inspector-pin" /><span className="card-doodle">{doodleMarks[inspectorDraft.doodle ?? inspectorDraft.kind]}</span><strong>{inspectorDraft.title}</strong><p>{inspectorDraft.body}</p></div><div className="inspector-fields"><small>EVIDENCE IN HAND</small><input className="inspector-title" value={inspectorDraft.title} onChange={(event) => setInspectorDraft({ ...inspectorDraft, title: event.target.value })} aria-label="Evidence title" /><textarea value={inspectorDraft.body} onChange={(event) => setInspectorDraft({ ...inspectorDraft, body: event.target.value })} aria-label="Evidence story" /><div className="inspector-grid"><label>MARK<select value={inspectorDraft.kind} onChange={(event) => setInspectorDraft({ ...inspectorDraft, kind: event.target.value as CardKind, doodle: event.target.value as CardKind })}>{CARD_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></label><label>STATUS<select value={inspectorDraft.status ?? "open"} onChange={(event) => setInspectorDraft({ ...inspectorDraft, status: event.target.value as EvidenceStatus })}>{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label><label>PEOPLE<input value={inspectorDraft.people ?? ""} onChange={(event) => setInspectorDraft({ ...inspectorDraft, people: event.target.value })} /></label><label>PLACE<input value={inspectorDraft.place ?? ""} onChange={(event) => setInspectorDraft({ ...inspectorDraft, place: event.target.value })} /></label><label>TIME<input value={inspectorDraft.time ?? ""} onChange={(event) => setInspectorDraft({ ...inspectorDraft, time: event.target.value })} /></label><label>CONFIDENCE<input type="number" min="0" max="100" value={inspectorDraft.confidence ?? ""} onChange={(event) => setInspectorDraft({ ...inspectorDraft, confidence: event.target.value === "" ? undefined : Number(event.target.value) })} /></label></div><label className="wide-field">SOURCE<input value={inspectorDraft.sourceUrl ?? ""} onChange={(event) => setInspectorDraft({ ...inspectorDraft, sourceUrl: event.target.value })} /></label><label className="wide-field">TAGS<input value={inspectorDraft.tags.join(", ")} onChange={(event) => setInspectorDraft({ ...inspectorDraft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label><div className="attachment-list">{(inspectorDraft.attachments ?? []).map((attachment) => <article key={attachment.id} className={attachment.available ? "available" : "missing"}>{attachment.mimeType.startsWith("image/") && attachmentUrlsRef.current[attachment.id] ? <img src={attachmentUrlsRef.current[attachment.id]} alt="Local evidence preview" /> : <span>{attachment.available ? "FILE" : "MISSING"}</span>}<div><b>{attachment.name}</b><small>LOCAL ONLY</small></div>{!attachment.available ? <button type="button" onClick={() => chooseAttachment(attachment.id)}>RELINK</button> : null}</article>)}<button type="button" className="attach-button" onClick={() => chooseAttachment()}>＋ LOCAL FILE</button><input ref={attachmentInputRef} className="visually-hidden" type="file" onChange={attachLocalFile} /></div><div className="story-actions"><button type="button" onClick={() => storyAction("ask")}>ASK ABOUT THIS</button><button type="button" onClick={() => storyAction("suspicious")}>MARK SUSPICIOUS</button><button type="button" onClick={() => storyAction("connect")}>CONNECT</button><button type="button" onClick={() => storyAction("contradicts")}>CONTRADICTS…</button></div><div className="inspector-submit-row"><button type="button" className="inspector-discard" onClick={() => discardCard(inspectorDraft.id)}>↘ THROW IN BIN</button><button className="modal-submit">RETURN TO BOARD</button></div></div></form></div> : null}

      {pendingRegion ? <div className="modal-scrim"><form className="region-modal" onSubmit={addRegion}><span className="region-preview" style={{ color: pendingRegion.color }}>◯</span><p>NAME THE REGION</p><input autoFocus value={regionLabel} onChange={(event) => setRegionLabel(event.target.value)} maxLength={34} /><small>{pendingRegion.cardIds.length} CLUES INSIDE</small><div><button type="button" onClick={() => { commitCase({ ...caseRef.current, strokes: [...(caseRef.current.strokes ?? []), pendingRegion] }, "Drew on the board"); setPendingRegion(null); }}>JUST A SCRIBBLE</button><button>MAKE IT MEAN SOMETHING</button></div></form></div> : null}

      {showTrash ? <div className="trash-drawer"><button className="modal-close" onClick={() => setShowTrash(false)}>×</button><div className="trash-rim" /><p>WASTEBASKET</p>{caseFile.trash?.length ? <div className="trash-pile">{caseFile.trash.map((item, index) => <article key={item.id} style={{ transform: `rotate(${(index % 5) * 2 - 4}deg)` }}><b>{item.label}</b><span>{item.kind}</span><button onClick={() => restoreItem(item.id)}>UNCRUMPLE</button></article>)}</div> : <span className="empty-trash">EMPTY.</span>}{caseFile.trash?.length ? <button className="empty-trash-button" onClick={emptyTrash}>EMPTY PERMANENTLY</button> : null}</div> : null}

      {showTools ? <aside className="tool-drawer"><button onClick={() => setShowTools(false)}>×</button><small>{toolState === "ready" ? "LIVE SURFACE" : "BROWSER PREVIEW"}</small><strong>{toolNames.length || 18} WEBMCP TOOLS</strong><div>{(toolNames.length ? toolNames : ["inspect_board", "list_cases", "switch_case", "inspect_evidence", "search_cards", "audit_evidence", "trace_connections", "focus_card", "add_card", "update_card", "move_card", "remove_card", "propose_connection", "circle_cards", "resolve_proposal", "inspect_trash", "restore_trash", "undo_board_change"]).map((name) => <code key={name}>{name}</code>)}</div></aside> : null}
    </div>
  );
}
