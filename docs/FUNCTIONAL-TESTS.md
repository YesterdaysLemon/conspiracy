# Functional tests

## Automated

Run:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Current result: 5 test files, 18 tests passing.

Covered behaviors include world bounds, pin-to-pin strings, closed-loop regions, semantic auditing, case migration, local trash/restore, the zero-key detective fallback, progressive enhancement, all strict tool registrations, case lifecycle operations, color validation, untrusted evidence annotations, and two complete model-client replays.

## Clean browser replay

The Vinext production bundle was replayed from a fresh origin at 1440×950 and 390×844:

- entrance offers both demo and blank-case flows;
- the clean demo renders seven notes, four directional strings, independent pushpins, and a semantic region;
- cork, note faces, string, and terminal art render as separate layers;
- card inspection opens an editable evidence UI at desktop and mobile widths;
- string dragging, chalk-to-region, fan gusts, local detective proposals, case rolling, trash/restore, and blank case creation work through the visible UI;
- Field Notes renders all six domain translations and the sponsor/backlink footer;
- the fresh production session produced no console warnings or errors.

## Subscription model-client replay

Claude and Qwen were used only as functional clients. Each received a sanitized public tool contract and fictional case facts, emitted concrete calls, and had those call sequences replayed through the registered execution layer. Their prose was treated as untrusted test input, never product or narrative authority.

- Claude exercised inspect → evidence → trace → propose → reject → inspect. Its first call used an ambiguous named color, which led to a tightened six-digit-hex schema and runtime validator. The corrected replay staged a new deduction, rejected the weak existing proposal, and never auto-accepted its own connection.
- Qwen exercised inspect-evidence → trace → search → circle → propose → audit. The replay created both deductions as proposals and left human review intact.

The checked tool-call fixtures live in `src/webmcp/modelClientReplay.test.ts`. Raw provider reports and subscription data are not committed.

## Remaining production gate

After deployment, replay the canonical HTTPS URL in a browser that exposes `document.modelContext`, verify the 20-tool registration, and run one visible create/inspect/propose/reject sequence.
