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

`registerWebMCPTools` checks `document.modelContext` progressively. Unsupported browsers keep the entire manual application and expose a tool preview. Supported browsers receive 18 imperative tools under one abort controller.

Schemas use stable IDs, world-space bounds, strict enums, six-digit colors, and `additionalProperties: false`. User-authored evidence carries `untrustedContentHint`. Destructive intent is annotated, and the application routes discarded evidence into recoverable trash.

## Detective provider seam

`src/ai/detective.ts` is the zero-key deterministic fallback. `src/ai/provider.ts` is the hosted seam. If a future `VITE_DETECTIVE_ENDPOINT` is configured and the person explicitly consents, it sends an attachment-free case projection to that service. Secrets belong at the hosted boundary, never in the browser bundle. Until then, the local fallback remains the production behavior.

## Hosting

Vinext builds the app router into a Cloudflare-compatible Sites worker. `@openai/sites-vite-plugin` copies `.openai/hosting.json` into the build. A valid release contains both `dist/server/index.js` and `dist/.openai/hosting.json` and is deployed through ChatGPT Sites to the canonical domain.
