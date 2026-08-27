# Building Conspiracy: a corkboard that agents can actually understand

## The frustration

Visual workspaces are expressive for people and opaque to agents. A person sees a cluster, a direction, a suspicious gap, or a provisional idea. A browser agent often sees pixels, coordinates, and brittle labels.

Conspiracy began as a playful noir mystery board, but the real experiment is broader: can a website expose the meaning of a spatial interface without replacing the human interface?

## The WebMCP approach

The board has one canonical case model and one shared catalog of typed operations. Human gestures and agent calls cross the same action boundary. An agent can inspect evidence, search, trace accepted strings, focus cards, manage cases, and stage directional connections or semantic groups using stable IDs.

The interesting operations are richer than generic CRUD. A string has direction, relation, rationale, confidence, provenance, and proposal status. A chalk “meatball” is a semantic region whose outline can split around distant clusters. Both remain visible and reversible.

## WIRE, the resident detective

The hosted resident detective gives judges a zero-setup way to try the tool surface. WIRE receives only bounded case text and relationship metadata after explicit consent; local attachment contents stay on-device. Its write access is restricted to proposals. It cannot accept, reject, delete evidence, or manage cases.

WIRE uses the same catalog even when the current browser does not expose the external `document.modelContext` bridge. That distinction produced an important UX lesson: “WebMCP unavailable” sounded as if the tools themselves were broken. The interface now reports the two capabilities separately:

- **WebMCP bridge:** whether an external browser agent can discover the page tools.
- **WIRE tools:** whether the resident detective can execute the shared catalog.

## What agent testing broke

Real usage exposed failures that unit tests and a polished screenshot did not:

1. A multi-action turn inspected the board and staged a group, then claimed a directional connection that had not executed.
2. The tool layer allowed identical proposed groups and strings to stack on top of each other.
3. Opening the mobile desk could scroll past the terminal header because the chat’s `scrollIntoView` moved its ancestor container too.
4. Enlarging the conversation made the human approval card easy to miss below the audit display.
5. A complete inspect–group–connect turn could take roughly 34 seconds.

The fixes make tool success—not model prose—the source of truth, reserve a bounded third tool round, reject duplicate semantic proposals, scroll only the conversation container, and move suggestions ahead of the audit block. Independent safe proposal calls can now be requested together. In one local QA replay, the same three-tool pattern completed in about 7.1 seconds; that is an observed run, not a latency guarantee.

## Safety is part of the interaction

Case contents stay in local storage. Attachments are local pointers whose bytes and object URLs are excluded from exports, WebMCP results, and hosted-model requests. The server keeps the API key private, uses same-origin checks, request caps, rate limits, timeouts, strict allowlisted tools, `store: false`, and a pseudonymous safety identifier.

Most importantly, agent deductions arrive as wind-tossed ghost proposals. The person can inspect the rationale, accept, reject, or undo. The product boundary is not “AI gets the answer.” It is “AI makes its reasoning legible enough for a person to judge.”

## What the demo needs to prove

The final video should show three things in one continuous story:

1. The corkboard remains tactile and useful without an agent.
2. WIRE inspects and stages visible proposals through the shared catalog.
3. An external WebMCP-capable agent discovers those tools and changes the same live artifact without coordinate guessing.

That last shot is the heart of the submission. The noir room earns attention; the shared, typed, human-governed interface is the actual project.
