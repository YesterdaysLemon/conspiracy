# Architecture

## Shared state

`CaseFile` is the single source of truth. It contains typed cards, directional threads, and card clusters. The React interface and the WebMCP tools both mutate that same object through the action boundary in `App.tsx`.

```text
human drag / controls ─┐
                      ├─ WebMCPActions ─ case state ─ visible corkboard
model tool calls ─────┘                     │
                                           └─ deterministic audit
```

State is saved locally after each change. Before any mutation, a deep snapshot enters a bounded undo stack. No account or server database is required.

## Evidence semantics

Card kinds are deliberately not interchangeable:

- `source`: a document or record with optional URL;
- `observation`: a reported or directly observed event;
- `claim`: an asserted conclusion;
- `hypothesis`: a possible explanation;
- `question`: a known gap;
- `person`: an entity card.

Threads are directional and typed as `supports`, `contradicts`, `precedes`, `implicates`, `same-entity`, or `speculative`. Every thread records a rationale, confidence, creator, and proposal status.

The deterministic audit counts a claim or hypothesis as supported only when an accepted `supports` edge reaches it. Proposed edges never affect established reasoning.

## Rendering

Cards use normalized percentage coordinates. Their strings are SVG cubic Bézier curves generated from card-edge anchors. Distance influences sag; a seeded bend keeps parallel paths organic. Each line combines a dark physical shadow, colored body, animated highlight, and end marker. An SVG turbulence displacement supplies restrained movement without moving the underlying hit target.

Circles derive a padded bounding ellipse from their cards and render two offset, dashed strokes to resemble repeated marker passes.

The office is a generated raster backdrop. Everything the user or agent can manipulate remains real HTML or SVG.

## WebMCP

`registerWebMCPTools` progressively checks `document.modelContext`. Unsupported browsers receive the complete manual app and a preview tool manifest. Supported browsers receive 11 imperative tools registered under one `AbortController`, which is cleaned up on unmount.

All user-authored card text is treated as untrusted content. Tool schemas use stable card IDs, bounded depths, explicit enums, and `additionalProperties: false`. Agent-created conclusions enter the board as proposals.

## Optional model provider

The MVP intentionally has no client-side API secret. A hosted version may connect the detective prompt to a user-controlled OpenAI-compatible edge proxy. That proxy should return tool calls only; the page should discover its own tools, validate every call, execute through `document.modelContext`, and send results back for the next turn. Case content must not leave the browser without clear user consent.
