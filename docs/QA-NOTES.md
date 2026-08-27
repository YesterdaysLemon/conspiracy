# QA notes

## 2026-08-27 · Resident detective cleanup

| Finding | Reproduction | Resolution | Verification |
| --- | --- | --- | --- |
| Browser status contradicted WIRE behavior | An unsupported browser said `WEBMCP UNAVAILABLE · LOCAL TOOLS`, while WIRE successfully called the shared catalog. | Split the external browser bridge from resident tool readiness in the header, desk, and workbench copy. | Local browser showed `WEBMCP BRIDGE OFF` and `EXTERNAL BRIDGE OFF · WIRE TOOLS READY`; the same session completed a WIRE tool turn. |
| Multi-action prose could get ahead of state | An inspect–group–connect request exhausted the old tool rounds after the group. | Added a bounded third tool round, counts only successful executions in the visible trace, and explicitly grounds success language in `ok=true` results. | A local replay returned `inspect_board · circle_cards · propose_connection`, and both proposals appeared. |
| Complex WIRE turns felt slow | The first sequential three-tool replay took roughly 34 seconds. | Allow up to two independent safe proposal calls in one model response. | One local replay of the same three-tool pattern completed in about 7.1 seconds. This is a single observation, not a benchmark. |
| Identical regions and strings could stack | Running the same `circle_cards` input twice created `region-4` and `region-5`. | Reject matching card-set/label groups and matching directional relation edges with the existing proposal ID. | The local workbench returned `That proposed group already exists` and `That proposed precedes connection already exists`; WIRE then reported that neither duplicate created anything new. |
| Mobile Desk opened past its header | Chat `scrollIntoView` also scrolled the outer desk. | Scroll only the chat element and place suggestions before the audit block. | At 390×844, desk `scrollTop` remained `0`, chat stayed at its latest message, and page width remained 390px with no horizontal overflow. |

## Remaining pre-video checks

- Deploy this branch and repeat the resident flow against the canonical HTTPS URL.
- Record a genuine external-agent WebMCP call in a supported browser; do not substitute the local workbench for that proof.
- Reset the sample case and chat before filming.
- Confirm the selected suggestion is visible and comfortably reachable at the recording viewport.
- Inspect console warnings and errors during the final desktop and mobile run.
