# WebMCP Challenge submission checklist

Re-read the [official rules](https://webmcp.devpost.com/rules) before submission; event details can change.

- Submission deadline: September 3, 2026 at 1:00 PM Pacific Time.
- Use one conservative solo submission unless Devpost resolves the contradictory multiple-submission wording.

## Deliverables

- [x] HTTPS live URL deployed and manually smoke-tested
- [ ] Live URL tested with an external WebMCP-capable agent browser
- [x] Public-ready source and MIT license
- [x] Setup, architecture, safety, and testing documentation
- [x] GitHub Sponsors metadata and in-app sponsor link
- [x] Public repository created and pushed
- [ ] English Devpost description
- [ ] Public YouTube demo under three minutes
- [ ] Final Devpost entry saved before the deadline

## Product gates

- [x] Full manual case creation loop
- [x] Directional multi-color animated strings
- [x] Draggable cards and labeled circles
- [x] Agent proposals require a human decision
- [x] Deterministic evidence audit
- [x] Undo for human and agent mutations
- [x] Progressive WebMCP enhancement
- [x] Separate implications essay
- [x] Desktop and narrow viewport browser replay
- [ ] Claude and Qwen functional tool-call replay
- [x] Production cold-start smoke test
- [ ] Production WebMCP agent smoke test

## Final freeze

1. Run `npm test` and `npm run build` from a clean checkout.
2. Test the deployed URL in the supported agent browser.
3. Reset to the exact sample case and record the video.
4. Confirm the public repository visibly shows its license and Sponsor control.
5. Tag the submitted commit and record the deployment identifier.
6. Do not alter submitted artifacts during judging.
