# Architecture

## Shared local state

`CaseLibrary` owns the local roller boards and active case. Each `CaseFile` contains world-space cards (including optional normalized corner-mark strokes), directional threads, semantic regions, freehand strokes, recoverable trash, and its last viewport. The React interface and WebMCP tools both cross the same `WebMCPActions` boundary in `App.tsx`.

```text
human drag / draw / edit ─┐
                          ├─ WebMCPActions ─ case library ─ visible corkboard
model tool calls ─────────┘                      │
                                                └─ deterministic audit
```

State autosaves in `localStorage`. Mutations enter an in-memory undo stack. Cases import/export as JSON, but local attachment availability is stripped from exported data.

## Evidence semantics

Cards are typed as `source`, `observation`, `claim`, `hypothesis`, `question`, or `person`. Threads are directional and typed as `supports`, `contradicts`, `precedes`, `implicates`, `same-entity`, or `speculative`. Every thread records a rationale, confidence, creator, and proposal status.

The deterministic audit counts a theory as supported only when an accepted `supports` edge reaches it. Proposed edges never change established reasoning. Agent-created strings and regions always begin as `proposed`.

## Infinite board rendering

Cards use world coordinates bounded to ±50,000 units. A viewport transform supplies panning and zooming while `MAP` fits the active evidence. Cards, chalk, string, and pins use separate layers:

1. cork texture and semantic/freehand regions;
2. evidence notes;
3. physical string above the note faces;
4. independent red pushpins and their drag targets.

Each string is a directional cubic curve between pushpin centers. A dark contact strand, colored body, animated highlight, and endpoint marker create thickness and direction. CSS motion supplies idle sway, traveling energy, and mouse/fan-driven gusts. Reduced-motion preferences disable nonessential animation.

## Local files

An attachment record stores only human-facing metadata plus a transient availability flag. The selected browser file becomes a local object URL for preview. Raw bytes, filesystem paths, and object URLs are never serialized, exported, sent to the deterministic detective, or returned through WebMCP. Imported placeholders can be relinked locally.

## WebMCP

`registerWebMCPTools` builds one shared 22-tool catalog, then checks `document.modelContext` progressively. Supported browsers register that catalog under one abort controller. Unsupported browsers keep the entire manual application and expose the same definitions through a clearly labeled local test harness. The drawer reports live, preview-only, and registration-error states separately, shows schemas and annotations, and can execute the exact definitions locally for diagnosis.

Schemas use stable IDs, world-space bounds, strict enums, six-digit colors, and `additionalProperties: false`. User-authored evidence carries `untrustedContentHint`. Destructive intent is annotated, and the application routes discarded evidence into recoverable trash.

## Resident detective

`src/ai/detective.ts` is the zero-key deterministic fallback. After explicit consent, `src/ai/provider.ts` sends a bounded attachment-free projection to the same-origin `/api/detective` route. The server keeps `OPENAI_API_KEY` private, calls the Responses API with `store: false`, validates structured replies, and exposes seven strict tools: inspect, search, audit, trace, propose a string, and propose a group.

Tool requests return to the browser and execute through the same catalog created by `registerWebMCPTools`, even when the browser lacks the experimental `document.modelContext` bridge. Attachment records are stripped from model-bound tool output. All write tools stage proposals; the resident model cannot accept, reject, delete, edit evidence, or manage cases. Per-case conversation history and consent live only in local storage. Same-origin checks, pseudonymous safety identifiers, rate limits, size caps, a short timeout, and deterministic fallback bound failure and abuse.

## Hosting

Vinext builds the app router into a Node production server inside a non-root Docker container. Caddy terminates HTTPS and proxies the canonical origin to the container's loopback-only port; Cloudflare proxies the public hostname. The VPS Deploy Manager is the sole production lane: an exact green `main` SHA is built as a candidate, checked through `/healthz`, promoted, and rolled back automatically if production health fails. Runtime secrets are installed on the VPS and never travel through Git or the browser bundle.
