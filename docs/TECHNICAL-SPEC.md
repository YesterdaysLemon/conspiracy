# Conspiracy — Technical Specification

## Build Direction

The existing React application remains the product core, but its single-case percentage board becomes a local multi-case workspace with an infinite world coordinate system. Human UI actions and WebMCP tools continue to share one canonical case model.

The contest deployment remains keyless for this phase. The detective uses a deterministic local reasoning adapter, while a provider interface and server-only endpoint seam allow a low-cost hosted model to be added later without changing the UI or WebMCP surface.

## Runtime Architecture

```text
case library in localStorage
          |
          v
active CaseFile <---- board actions ----> React UI
      |                    ^
      |                    |
      +---- WebMCP tools --+
      |
      +---- local audit ----> detective fallback
      |
      +---- provider seam --> optional hosted model endpoint
```

## Data Model

### Case library

- `CaseLibrary`
  - `version`
  - `activeCaseId`
  - `cases[]`
- Each case stores its viewport, evidence, connections, semantic regions, freehand strokes, and trash.
- A migration accepts the existing single-case `localStorage` payload and wraps it in the library.

### Board coordinates

- Card positions are world-space pixels rather than percentages.
- The viewport stores `{ x, y, zoom }` and renders the world with a transform.
- The board has no user-visible boundary. Practical numeric bounds exist only to reject malformed data.
- Cards preserve a stable width in world units; zoom affects the complete board uniformly.

### Evidence

- Extend `EvidenceCard` with optional human-facing fields: people, place, time, status, notes, preset doodle, normalized custom doodle strokes, and attachment metadata.
- Attachment records contain name, type, size, modified time, and availability only.
- Runtime `File` objects and object URLs live outside serialized case state.
- Exported case files intentionally omit bytes and local object URLs.

### Drawing and regions

- `EvidenceStroke` stores world-space points, color, width, closed state, optional label, included card IDs, creator, and proposal status.
- An open stroke is decorative.
- A sufficiently closed stroke becomes a semantic region after confirmation or automatic labeling.
- Existing elliptical circles remain readable and are migrated into semantic regions where practical.

### Trash

- `TrashItem` stores a typed snapshot of a deleted card, thread, or region plus dependent objects needed for restoration.
- Trash persists per case.
- Session undo remains a separate bounded snapshot stack.

## Interaction Model

### Camera and board

- Empty-space pointer drag pans.
- Wheel or explicit controls zoom around the pointer or viewport center.
- Double-clicking empty cork creates a note at that world position.
- A paper minimap and evidence search recenter the camera.

### Notes

- Pointer drag moves a note.
- A click without movement opens the evidence inspector.
- Shift-click supports multi-selection for compatibility and bulk operations.
- Arrow keys nudge the focused note.
- The pushpin is an independent hit target for drawing a connection.

### Strings

- SVG is rendered above paper and below pushpins.
- Every connection begins and ends at the top-center pushpin coordinate.
- The visual stack is: restrained contact shadow, fiber body, animated directional highlight, endpoint knots, and arrow/pulse marker.
- Proposed connections use lower opacity and animated ghost fibers.
- Physics movement is applied to the visual path only; the semantic hit path remains stable.

### Wind

- Pointer movement samples velocity and horizontal direction changes.
- Several high-speed reversals inside a short window trigger a decaying gust value.
- CSS variables drive paper flap, string displacement, smoke, and rain response.
- A fan control provides pointer-independent activation.
- Reduced-motion mode clamps movement while retaining light and texture changes.

### Inspector

- The selected note animates into a desk-lamp evidence view.
- Inputs edit only human-facing fields.
- Attach/relink creates runtime-local file pointers.
- Story actions can prefill a detective prompt or begin a connection.

### Cases

- `OPEN A CASE` seeds the Victorian demo.
- `START A CASE` creates an empty board.
- Switching cases applies an outgoing/incoming roller-board animation and restores camera state.
- Import validates before adding a new case; it never overwrites valid cases implicitly.

## Detective and Provider Seam

### Local adapter

- Reads the deterministic audit and graph utilities.
- Supports the primary prompts: find the contradiction, group the timeline, identify what is missing, and explain a selected proposal.
- Produces terse copy and stages proposals through the same action boundary used by WebMCP.

### Optional hosted adapter

- `DetectiveProvider` accepts a compact, attachment-free case projection and a user prompt.
- The browser calls a same-origin server endpoint only after explicit consent.
- The adapter returns structured proposed actions, never arbitrary code.
- If the endpoint is absent, unavailable, or invalid, the local adapter handles the request.
- No API secret is compiled into browser assets.

## WebMCP Surface

Preserve existing tool names for compatibility and add or extend tools for the new product behavior:

- Existing reads: inspect, search, audit, trace.
- Existing writes: add, move, remove, propose connection, circle, resolve, undo.
- New behaviors: list/switch cases, inspect a single evidence record, update human-facing evidence fields, draw/propose a region, search-and-focus, inspect/restore trash.
- Every schema rejects undeclared fields.
- User-authored strings remain untrusted content.
- Agent-created deductions remain proposals.
- Tool responses include stable IDs and enough visible state for an external model to chain calls.

## Hosting

- Preserve the Sites-compatible Vinext build while packaging the production server in a non-root Docker image.
- Expose `/healthz` for both GET and HEAD probes and validate the exact origin-trial header and meta token against the running image.
- Deploy through the existing signed, exact-SHA VPS Deploy Manager with candidate health checks and automatic rollback.
- Terminate HTTPS at Caddy and proxy the canonical hostname through Cloudflare to the loopback-only application port.
- Keep browser state in local storage; no D1 or R2 binding is required for the MVP.
- The canonical origin is `https://conspiracy.alirezaafshan.com`.
- The prior ChatGPT Sites deployment remains a temporary rollback target during migration, not the authoritative production lane.

## Asset Policy

- Cork color map: ambientCG `Cork001`, CC0.
- Detective terminal: original generated project asset with transparent background.
- Record third-party asset provenance in `docs/ASSETS.md`.
- Optimize raster dimensions and formats before final deployment without discarding source provenance.

## Verification

### Automated

- Data migration, deep cloning of custom corner marks, camera coordinate transforms, zoom-aware region closure, point-in-polygon, trash restoration, import validation, and deterministic detective output.
- Registration and schemas for every WebMCP tool.
- Proposal safety and untrusted-content annotations.
- Production container passes `/healthz` and the origin-trial response/meta postflight.

### Browser

- Both entry paths.
- Pan, zoom, drag, inspect, edit, draw or select a corner mark, attach/relink placeholder, magnetic Group lasso and group editing, contextual string typing from pins, delete/restore, and switch/import/export cases.
- Mouse-shake and fan wind, plus reduced-motion mode.
- Desktop and compact viewport behavior.
- No console errors during the flagship demo.

### External models

- Use subscription-backed Claude and Qwen through the installed OMP harness only as WebMCP clients for functional testing.
- Do not use external models for design critique or council review.
- Record sanitized tool-call replays and whether each model successfully chained live IDs.

## Delivery Gates

1. PRD-critical interactions work locally and remain reversible.
2. Automated test and production build are green.
3. Visual QA shows physical cork, pin-tied foreground string, readable handwriting, visible breathing motion, and the intended terminal character.
4. External-model WebMCP replays exercise the live tools.
5. Deploy Manager promotes the exact green SHA after candidate health succeeds.
6. Canonical custom domain resolves over HTTPS and serves the verified build.
