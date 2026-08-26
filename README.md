# Conspiracy

![MIT licensed](https://img.shields.io/badge/license-MIT-b08a55)
![WebMCP tools](https://img.shields.io/badge/WebMCP-22_tools-5b8f72)
![Tests](https://img.shields.io/badge/tests-39_passing-6b9c78)

**Pin clues. Pull thread. Keep judgment human.**

Conspiracy is a tactile noir mystery board built for the [WebMCP Challenge](https://webmcp.devpost.com/). People investigate by arranging, drawing, grouping, and connecting evidence; an agent reads and changes that same live artifact through narrow WebMCP tools.

**[Open the live case board →](https://conspiracy.alirezaafshan.com/)**

The board distinguishes sources, observations, claims, hypotheses, questions, and people. Agent-made strings and regions arrive as visible, windblown proposals. They do not become accepted reasoning until a person decides.

## Try it

```powershell
npm install
npm run dev
```

The board works without credentials. To enable the hosted resident detective, copy `.env.example` to `.env.local`, set `OPENAI_API_KEY`, and restart the development server. Never expose that variable through a `VITE_`-prefixed client setting.

For the canonical VPS, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-vps-runtime-secret.ps1` from the repository root. The one-time installer transfers only the required runtime values over SSH, prompts for sudo normally, and configures Deploy Manager's root-owned container env file without printing the key.

Open `http://127.0.0.1:4173/`, then choose the Victorian demo or an empty local case.

- Pan and zoom the effectively infinite cork plane.
- Drag evidence cards or open one to edit its human-facing fields.
- Pull directional string directly from one pushpin to another, then name its relationship and choose its color in context.
- Draw freely with **Chalk**, or use **Group** to lasso clues into a named, editable semantic region.
- Open a clue to choose a corner-mark preset or draw a custom symbol directly on the note.
- Add local-only file/image pointers that never enter exports or tool results.
- Shake the mouse or press **Fan** to wake the notes and string.
- Connect **The Desk** to the hosted resident detective, or use the automatic deterministic fallback, then accept or reject its physical proposal.
- Switch autosaved cases with the roller-board transition; restore discarded evidence from the wastebasket.

The app is fully useful without a connected model. After compact consent, the resident detective uses a same-origin server route backed by `gpt-5.6-luna`, then executes only seven allowlisted reads and proposal actions through the exact shared board-tool catalog. Chats persist per case in local storage. If inference fails, the deterministic zero-key detective takes over without trapping the conversation. No API secret is shipped in the client.

## WebMCP surface

| Tool | Kind | What it does |
| --- | --- | --- |
| `inspect_board` | Read | Reads the active world, typed strings, regions, viewport, and selection |
| `list_cases` | Read | Lists local roller boards without exposing attachment contents |
| `switch_case` | Write | Rolls a selected local case into view |
| `inspect_evidence` | Read | Reads one note and safe local-file metadata |
| `search_cards` | Read | Searches story text and human-facing metadata |
| `audit_evidence` | Read | Deterministically finds contradictions, unsupported theories, and loose clues |
| `trace_connections` | Read | Walks accepted relationships to a bounded depth |
| `focus_card` | Write | Pans to one note and opens its editable evidence view |
| `add_card` | Write | Pins a typed proposed note |
| `update_card` | Write | Edits only human-facing evidence fields |
| `move_card` | Write | Moves a note in world-space coordinates |
| `remove_card` | Destructive | Moves evidence and dependent strings into recoverable trash |
| `propose_connection` | Write | Stages a directional string with rationale and confidence |
| `circle_cards` | Write | Stages a labeled semantic region |
| `resolve_proposal` | Write | Accepts or rejects one agent proposal |
| `inspect_trash` | Read | Lists recoverable wastebasket items |
| `restore_trash` | Write | Restores a discarded item and recoverable relationships |
| `undo_board_change` | Write | Restores the previous shared board state |

Registration lives in [`src/webmcp/registerTools.ts`](src/webmcp/registerTools.ts). User evidence is annotated as untrusted content; deletion is marked destructive; colors, enums, bounds, and IDs are validated; every agent deduction is visible and reversible.

## Why this is more than red string

```text
human spatial judgment ─┐
                       ├─ one visible, undoable artifact
agent structured tools ─┘
```

The same contract translates to reporting, incident review, research synthesis, threat models, debugging, and story planning. The in-app **Field Notes** page makes that implication explicit without cluttering the toy.

## Architecture

- React 19 + TypeScript + Vinext, packaged as a health-checked container behind Caddy.
- World-space cards live on a ±50,000-unit plane with pan, zoom, and map-to-fit.
- SVG strings tie directly to independent pushpins, sit above the notes, carry direction, and animate both physical sway and a traveling pulse.
- Chalk remains freehand; the magnetic Group lasso creates editable data-bearing regions with visible membership.
- Multiple case files, trash, viewport, and evidence metadata autosave locally.
- Local attachments use browser object URLs; exports and WebMCP reveal metadata only, never bytes or machine paths.
- Hosted inference is stateless (`store: false`), attachment-free, same-origin checked, rate limited, and bounded by strict tool schemas and request/output caps.
- The generated detective terminal, generated office backdrop, and CC0 cork texture are documented in [`docs/ASSETS.md`](docs/ASSETS.md).

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Verify

```powershell
npm test
npx tsc --noEmit
npm run build
docker build --tag conspiracy:local .
docker run --rm --publish 127.0.0.1:3000:3000 conspiracy:local
npm run check:production -- http://127.0.0.1:3000/
```

The suite covers server rendering, board geometry, semantic auditing, case migration/trash, hosted consent and privacy boundaries, the provider fallback, strict WebMCP registration and case lifecycle operations, and independently replayed Claude/Qwen-shaped tool sequences. The production check exercises the real container's health route plus the exact WebMCP origin-trial header and bootstrap meta tag.

Every pull request and push to `main` runs the tests, type-check, production audit, Vinext build, and a container smoke test. Enabled `main` deployments send a signed exact-SHA request to the VPS Deploy Manager, which builds a candidate, checks `/healthz`, swaps production, and rolls back on failure. GitHub stores only the app-specific webhook secret; the server keeps Docker, runtime secrets, and privileged rollout access outside CI.

See [`docs/FUNCTIONAL-TESTS.md`](docs/FUNCTIONAL-TESTS.md) for the browser and model-client matrix.

## Safety and privacy

- A `claim` is not a `source`; a `hypothesis` is not an `observation`.
- Agent relationships and regions are proposals by default.
- Only accepted support counts as established support in the deterministic audit.
- Card text and imported case text are untrusted content, never instructions.
- Local attachment bytes and paths stay local.
- Hosted inference requires explicit, locally remembered consent before case text leaves the browser.
- Resident-model tools can inspect, search, audit, trace, propose a string, or propose a group; they cannot edit evidence, delete, accept their own proposals, or manage cases.
- The sample mystery is fictional and makes no claims about real people.

## Project notes

- [Product requirements](docs/PRODUCT-REQUIREMENTS.md)
- [Technical spec](docs/TECHNICAL-SPEC.md)
- [Demo script](docs/DEMO-SCRIPT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Functional tests](docs/FUNCTIONAL-TESTS.md)
- [Submission checklist](docs/SUBMISSION-CHECKLIST.md)
- [Contributing](CONTRIBUTING.md)

## Support

If this kind of strange little open-source tool is your thing, [sponsor YesterdaysLemon](https://github.com/sponsors/YesterdaysLemon). GitHub’s repository Sponsor control is configured through [`.github/FUNDING.yml`](.github/FUNDING.yml).

Made by [Alireza Afshan](https://alirezaafshan.com). Released under the [MIT License](LICENSE).
