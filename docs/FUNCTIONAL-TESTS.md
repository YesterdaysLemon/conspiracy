# Functional tests

## Automated

Run:

```powershell
npm test
npm run build
```

Covered behaviors:

- card placement stays within the usable board;
- SVG strings are directional edge-to-edge cubic paths;
- only accepted support counts as support;
- proposed edges do not alter established reasoning;
- card search covers titles, bodies, kinds, and tags;
- graph tracing respects the requested depth;
- unsupported browsers degrade to the full manual app;
- all 11 tools register together;
- user evidence is annotated as untrusted content;
- model-shaped connection arguments reach the action layer.

## Browser replay

Verified locally at 1440×900 and 390×844, then replayed on the production GitHub Pages build:

- no desktop horizontal overflow;
- seven sample cards and four sample strings render;
- selecting two cards enables **String**;
- string creation changes the live SVG graph and Undo restores it;
- the new-card form pins a visible card;
- **Find the lie** focuses the accepted weather contradiction;
- **What's missing?** pins a question card;
- sample reset restores exactly seven cards;
- Field Notes renders all six domain translations;
- keyboard movement changes a card position and Undo restores the exact prior coordinate;
- the production asset path resolves under the repository subdirectory;
- no console errors or warnings during the replay.

Production: <https://yesterdayslemon.github.io/loose-thread-webmcp/>

## External model-client replay — completed

Claude and Qwen are used only as functional clients: each receives the public tool contract and a different mystery goal, emits concrete tool calls, and those calls are replayed against the registered schemas. Their prose is not treated as design feedback or evidence.

- `anthropic/claude-opus-4-6`: produced a seven-call inspect/search/trace/reject/circle/undo workflow. Every tool name, ID, input, and ordering dependency was valid. Search, trace, proposal rejection, circle creation, and two-step restoration were independently checked against the source, unit logic, and browser replay.
- `alibaba-token-plan/qwen3.7-max`: its inspect, audit, and add calls were valid, then the sequence correctly failed review. It guessed the add result would be `card-1`; the real deterministic result is `ticket-office-camera-8`, so its later move and connection target would throw `Unknown cardId`. It also incorrectly described `wrong-night` as unsupported even though an accepted `supports` thread reaches it.

This is the intended evaluation boundary: model output is an untrusted test vector. Schema-valid syntax is insufficient when a multi-step agent fails to consume the previous tool result. No raw provider reports are committed.
