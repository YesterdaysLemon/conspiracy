# Loose Thread

![MIT licensed](https://img.shields.io/badge/license-MIT-b08a55)
![WebMCP tools](https://img.shields.io/badge/WebMCP-11_tools-5b8f72)
![Tests](https://img.shields.io/badge/tests-9_passing-6b9c78)

**Pin clues. Pull thread. Keep judgment human.**

Loose Thread is a tactile noir evidence board built for the [WebMCP Challenge](https://webmcp.devpost.com/). A person can arrange a mystery by sight and feel while an agent reads and changes the exact same live case through narrow, typed WebMCP tools.

**[Open the live case board →](https://yesterdayslemon.github.io/loose-thread-webmcp/)**

The board deliberately separates sources, observations, claims, hypotheses, questions, and people. Agent-made strings and circles arrive as visible proposals. They do not become accepted reasoning until a person says so.

## Try it

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:4173/`.

- Drag a card.
- Focus a card and use the arrow keys to nudge it; hold Shift for a larger move.
- Select two cards, choose a relation and marker, then press **String**.
- Select two or more cards and press **Circle**.
- Pin a new clue or open an empty case.
- Ask **The Desk** to find the lie, group the timeline, or identify what is missing.
- Open the WebMCP status pill to see the live tool surface.

The interface works as a normal local-first web app when WebMCP is unavailable. Its small built-in detective routine is a deterministic, zero-key demonstration—not a hidden generative model. In a WebMCP-capable browser, ChatGPT or another compatible agent supplies the actual model intelligence and uses the registered page tools.

## WebMCP surface

| Tool | Kind | What it does |
| --- | --- | --- |
| `inspect_board` | Read | Returns the case, cards, typed threads, circles, and selection |
| `search_cards` | Read | Searches titles, bodies, kinds, and tags |
| `audit_evidence` | Read | Finds contradictions, unsupported theories, and loose clues deterministically |
| `trace_connections` | Read | Walks accepted relationships around a card to a bounded depth |
| `add_card` | Write | Pins a typed agent-created card |
| `move_card` | Write | Moves a card with bounded percentage coordinates |
| `remove_card` | Destructive | Removes a card and attached strings; undoable |
| `propose_connection` | Write | Stages a directional, typed string with rationale and confidence |
| `circle_cards` | Write | Stages a labeled cluster for review |
| `resolve_proposal` | Write | Accepts or rejects one agent proposal |
| `undo_board_change` | Write | Restores the previous shared board state |

Registration lives in [`src/webmcp/registerTools.ts`](src/webmcp/registerTools.ts). User-authored evidence is marked with `untrustedContentHint`; it is data, never agent instruction. Read operations are annotated read-only, deletion is marked destructive, all schemas reject undeclared fields, and every mutation is visible and reversible.

## Why this is more than red string

The playful board is a compact demonstration of a general collaboration primitive:

```text
human spatial judgment ─┐
                       ├─ one visible, undoable artifact
agent structured tools ─┘
```

The same contract translates to reporting, incident review, research synthesis, threat models, historical analysis, and story planning. The in-app **Field Notes** page explains that extension without cluttering the toy itself.

## Architecture

- React + TypeScript + Vite; no application runtime dependencies beyond React.
- Normalized board coordinates keep cards responsive and agent-friendly.
- SVG cubic Bézier strings terminate at card edges, sag with distance, carry directional markers, and animate a subtle traveling pulse.
- Proposed relationships remain visually dashed until accepted.
- Evidence audit logic is deterministic and tested separately from the UI.
- State is local-first in `localStorage`, with a bounded in-memory undo history.
- The generated office background is a project asset; all interactive elements are HTML/SVG rather than pixels baked into the image.

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Verify

```powershell
npm test
npm run build
```

Current automated coverage includes board bounds, string construction, evidence semantics, card search, bounded graph tracing, deep cloning, progressive enhancement, registration of all 11 tools, untrusted-content annotations, and a model-shaped connection call. The production build is continuously tested and deployed by [GitHub Actions](.github/workflows/pages.yml).

See [`docs/FUNCTIONAL-TESTS.md`](docs/FUNCTIONAL-TESTS.md) for the browser and model-client matrix.

## Safety model

- A `claim` is not a `source`; a `hypothesis` is not an `observation`.
- Agent-created relationships are proposals by default.
- Accepted support is the only relationship counted as support by the audit.
- Card text and imported source text are untrusted content.
- Cloud model integration should be opt-in because case contents may be sensitive.
- The sample is fictional and makes no claims about real people.

## Project notes

- [Demo script](docs/DEMO-SCRIPT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Functional tests](docs/FUNCTIONAL-TESTS.md)
- [Submission checklist](docs/SUBMISSION-CHECKLIST.md)
- [Contributing](CONTRIBUTING.md)

## Support

If this kind of strange little open-source tool is your thing, [sponsor YesterdaysLemon](https://github.com/sponsors/YesterdaysLemon). GitHub’s repository Sponsor control is configured through [`.github/FUNDING.yml`](.github/FUNDING.yml).

Made by [Alireza Afshan](https://alirezaafshan.com). Released under the [MIT License](LICENSE).
