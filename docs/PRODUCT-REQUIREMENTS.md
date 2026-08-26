# Conspiracy — Product Requirements Document

## Product Summary

Conspiracy is a tactile, noir mystery board where people arrange evidence by sight and an AI detective reasons over the same live case through WebMCP.

The app should feel like a physical corner of a smoke-filled private investigator's office rather than a conventional canvas UI. Notes flutter, strings sag between pushpins, rain and smoke move through the room, and accepted deductions become visible changes to the shared board. The AI may suggest; the person remains the detective in charge.

The flagship experience is playful and toy-like, but the product should imply a broader collaboration pattern for research synthesis, incident review, reporting, historical analysis, debugging, threat modeling, and story planning.

## Product Principles

1. **Diegetic before digital.** Controls should feel like objects in the room whenever that remains understandable.
2. **Physical before magical.** Cork, paper, pins, string, weight, occlusion, and wind should feel believable. Supernatural light and movement may then communicate meaning.
3. **Show, do not narrate.** On-board copy is kept to an absolute minimum. Motion, shape, color, and direct manipulation explain the product.
4. **Suggestions are not conclusions.** AI-created connections and regions remain visibly provisional until a person accepts them.
5. **The same case for human and agent.** Manual interaction and WebMCP tools read and change one shared, visible artifact.
6. **Private and local by default.** Cases autosave locally. Local attachments are not uploaded or included in shared case data.
7. **Reversible mischief.** Destructive actions are recoverable through undo and the wastebasket.

## Target Users

### Primary

- A hackathon judge or curious visitor who should understand and enjoy the interaction without instructions, an account, an API key, or a separate agent harness.
- A creative investigator building a fictional mystery from notes, images, files, connections, and hand-drawn regions.

### Secondary

- A WebMCP-capable agent demonstrating structured inspection and manipulation of a live website.
- Researchers, writers, incident responders, and analysts who recognize how the same interaction could map onto serious domains.

## Success Experience

Within 30 seconds, a new visitor should understand that they can move evidence, pull string between pins, and ask the terminal for help.

Within two minutes, a visitor should be able to ask what does not fit, watch the detective inspect the case, review a physical-looking suggestion, and accept or reject it.

The intended climax is an AI-proposed contradiction: a ghost string and marked region appear, the terminal gives a terse explanation, the visitor accepts the proposal, and the string ties itself to its pins as a bright directional pulse travels across the evidence.

## Core User Journeys

### Journey A: Open a demonstration case

1. The visitor chooses `OPEN A CASE`.
2. A populated Victorian mystery rolls into view on its corkboard.
3. The vintage detective terminal offers a minimal prompt or visible affordance.
4. The visitor asks, “What doesn't fit?”
5. The detective inspects the case and stages one or more visible proposals.
6. The visitor asks why, accepts, or rejects each proposal.
7. Accepted reasoning becomes a physical part of the board and remains undoable.

### Journey B: Start an empty case

1. The visitor chooses `START A CASE`.
2. An empty corkboard rolls into view; the detective waits quietly.
3. The visitor double-clicks or double-taps empty cork to add evidence.
4. The visitor drags notes, attaches local evidence, draws regions, and pulls strings between pushpins.
5. The case autosaves locally and can be exported as a local case file.

### Journey C: Inspect and edit evidence

1. The visitor selects a note.
2. The note lifts from the board, turns toward the viewer, and enlarges under a desk-lamp treatment while the board recedes.
3. A focused evidence UI exposes only human-relevant information and story actions.
4. Changes return to the same physical note on the board.

### Journey D: Switch cases

1. The visitor opens the case selector.
2. The current roller-mounted board retracts.
3. The selected case rolls into the room without navigating to a different application surface.
4. Its last position, zoom, evidence, and discarded items are restored.

## Functional Requirements

### 1. Entry and case management

- Offer both `OPEN A CASE` and `START A CASE` as equally complete entry paths.
- Both paths must use the same board workspace and capabilities.
- Support multiple named, locally autosaved cases.
- Present cases through a diegetic roller-board or case-file selector.
- Export and import a local case file containing board data.
- Restoring or importing a case must not require an account.
- The demonstration case must be an original, classic Victorian detective mystery with Sherlock-adjacent deductive pleasure, including at least one surprising connection and one contradiction.

### 2. Infinite evidence board

- Treat each corkboard as an effectively infinite plane that can grow with the case.
- Support smooth pan and zoom without imposing an arbitrary card-count boundary.
- Preserve understandable interaction at the expected range of approximately 5–40 notes.
- Provide a small, paper-like navigator for large cases.
- Provide search-and-jump so users can locate evidence outside the current viewport.
- Preserve the current viewport for each saved case.

### 3. Cork and room atmosphere

- The main board must use a convincingly varied cork texture with visible grain and imperfections.
- Texture assets must be original or licensed for free reuse with recorded attribution requirements.
- The room should read as grimy noir: rain, smoke, aged materials, imperfect light, and a private investigator's office.
- Atmosphere must remain subordinate to evidence legibility.
- The room should settle into subtle continuous motion when the user is inactive.

### 4. Evidence notes

- Notes must look handwritten rather than typeset as conventional application cards.
- Remove small uppercase category “eyebrow” labels from note previews.
- Preserve title and body text on the preview when legible.
- Offer rough marker presets such as an eye, lightbulb, question mark, clock, person, or location mark without coupling the visible mark to evidence type.
- Let a person draw a custom multi-stroke corner mark directly in the focused evidence interface, clear it, and replace it with a preset.
- Let paper corners lift and notes flex slightly in the shared room air.
- Notes must remain selectable, draggable, keyboard-movable, and readable.
- A note may contain a title, story text, doodle/type, people, place, time, source, confidence, status, tags, relationships, and local attachments.

### 5. Focused evidence interface

- Selecting a note must offer a clear path to a focused, enlarged view.
- The transition should resemble physically lifting evidence from the board rather than opening a generic settings modal.
- The focused view must be editable.
- Show only fields a person can understand and act on.
- Keep internal IDs, tool metadata, and model plumbing hidden.
- Do not place revision history inside the note.
- Provide story-facing actions including `ASK ABOUT THIS`, `MARK SUSPICIOUS`, `CONNECT`, and `CONTRADICTS…` or visually equivalent controls.
- Closing the focused view must return the visitor to the prior board position.

### 6. Pushpins and magical string

- Every visible connection must terminate at a visible pushpin rather than at an arbitrary card edge.
- Strings must render in front of the connected notes and visibly tie or wrap around their pins.
- String paths must sag and bend according to their span while remaining stylized and cartoony.
- Strings should wiggle in the same ambient air that moves the notes.
- Direction must be unmistakable through a conspicuous traveling pulse or equivalent motion along the string.
- Relationship colors must remain distinguishable and user-selectable at the moment the string is tied.
- Proposed strings must appear ghosted or otherwise provisional.
- Accepted strings should physically tie themselves into place.
- Avoid detached glow, tiny turbulence, and shadows that make string look like an augmented-reality overlay.
- Users must be able to create a connection by dragging directly from one pushpin to another.
- After the second pin is reached, ask what the connection means in a compact contextual tying interface; do not keep a disconnected relationship selector in the global toolbar.

### 7. Pencil, chalk, and semantic regions

- Keep **Chalk** as a clearly freehand drawing tool.
- Provide a separate **Group** tool whose lasso magnetically closes using a screen-space tolerance that remains forgiving at every zoom.
- Preview enclosed notes while the lasso is being drawn and refuse an empty group with visible feedback.
- Let the user name, recolor, and change membership of a semantic region, for example `ALIBI`, `MOTIVE`, or `DOESN'T FIT`.
- Clicking a region border or handwritten label must reopen the group editor; repeating a lasso around the same membership should edit rather than duplicate the group.
- The AI detective must be able to inspect and refer to semantic regions through WebMCP.
- AI-created regions must be proposals until accepted.
- Drawings and regions must autosave with the case and remain undoable.

### 8. AI detective terminal

- Present the detective as an Apple II–era computer or terminal with a small phosphor digital face.
- Hang a fedora from the side or corner of the terminal rather than placing a generic detective icon in the interface.
- Give the face a minimal expressive vocabulary, including a simple smile.
- Keep dialogue extremely terse and noir flavored, for example, “Three loose ends.” or “This alibi bends.”
- Let explanations and actions appear primarily on the board rather than inside a long chat transcript.
- The app must remain useful when no model is connected through a convincing deterministic/local fallback.
- The official contest build must also provide real, zero-setup AI for visitors without requiring their own API key or agent harness.
- The hosted AI path must use a low-cost model and fail gracefully into the local fallback.
- Before transmitting case content to a hosted model, obtain clear, compact consent and communicate whether local attachment contents are included.
- External WebMCP-capable agents must be able to provide the richer intelligence path through the same board operations.

### 9. AI proposals and human control

- The detective may inspect, search, trace, and audit without requesting confirmation.
- Board-changing deductions must first appear as visible proposals.
- Proposals may include ghost strings, translucent regions, contradiction marks, or suggested notes.
- A user must be able to accept, reject, or ask “Why?” before applying a proposal.
- Rejecting a proposal must leave established case reasoning unchanged.
- Model failure, malformed suggestions, and contradictory suggestions must not corrupt the case.
- Every accepted change must remain undoable.

### 10. Attachments and privacy

- Evidence may point to local images and files.
- Attachments must remain local and must not be uploaded merely because they were added to a note.
- Exported case files must contain attachment references or metadata, not the underlying private files.
- Importing a case on another device must not retrieve or expose the original attachments.
- A moved, missing, or inaccessible attachment must appear as unavailable evidence without preventing the rest of the case from loading.
- Missing images should use a torn or stamped placeholder and offer `RELINK`.
- The UI must not imply that a local file has been shared when it has not.

### 11. Wind and responsive atmosphere

- Mouse or pointer shaking must increase the room's wind intensity.
- Wind should build from pointer velocity and settle naturally after movement stops.
- Stronger wind may lift paper corners, sway hanging string, disturb smoke, and affect lightweight room details.
- The effect must have limits so it does not make the board unusable or nauseating.
- Provide a diegetic desk-fan control and keyboard-accessible alternative.
- Touch input should have an equivalent deliberate gesture or control.
- Reduced-motion mode must retain atmosphere through light, texture, and restrained effects without flapping, rapid string motion, or camera movement.

### 12. Wastebasket and undo

- Deleting a note, string, drawing, or region should visually crumple or discard it into a room wastebasket.
- The wastebasket must persist across refreshes and case switches.
- Users must be able to inspect and restore discarded items.
- Restoring an item should visually unfold or return it to its prior board position.
- Emptying the wastebasket is permanent and requires explicit confirmation.
- Ordinary undo may remain limited to the current session, provided the wastebasket remains the durable recovery path for deletion.

### 13. Minimal interface and explanatory page

- Keep narrative and instructional copy on the primary experience to an absolute minimum.
- Prefer recognizable objects, direct manipulation, animation, doodles, and short labels.
- Include a separate in-site essay or field-notes page explaining how the interaction generalizes beyond fictional mysteries.
- Spotlight several serious domains without turning the primary board into an enterprise dashboard.
- The explanatory page should make the broader WebMCP value evident: human spatial judgment and agent structured reasoning operating on one visible, reversible artifact.

### 14. Hosting and project identity

- The canonical public experience must be `https://conspiracy.alirezaafshan.com`.
- Publish the experience using ChatGPT Sites.
- The existing GitHub Pages address must not compete with the canonical domain; if retained, it should redirect or clearly point to the canonical experience.
- Keep the source repository public and open source.
- Preserve the GitHub Sponsor affordance.
- Preserve a footer backlink to `https://alirezaafshan.com`.

## Edge Cases

- A missing attachment displays a recoverable placeholder and never blocks case loading.
- A very large board remains navigable through pan, zoom, the paper navigator, and search-and-jump.
- An AI suggestion that references missing or stale evidence is rejected safely and explained tersely.
- Multiple conflicting AI suggestions remain independent, provisional objects.
- A model outage falls back without trapping the visitor in a broken chat state.
- Pointer shaking cannot increase wind indefinitely and does not trigger during ordinary precise dragging.
- Touch, keyboard, and reduced-motion users have equivalent access to essential actions.
- Switching cases during an active edit must either save the edit or ask the user to resolve it.
- Deleting a note with connected strings must make the full effect clear and permit restoration of the note and its relationships.
- Importing malformed case data must fail safely without overwriting valid local cases.
- Reopening a case with unavailable local file permissions must provide a relink path.
- Empty boards and one-note boards must still look intentional and provide an obvious next action without lengthy instructions.

## Acceptance Criteria for the MVP

- Both demonstration and empty-case entry flows are available and reach the same workspace.
- A user can create, edit, move, inspect, delete, restore, import, and export evidence without an account.
- A user can pan and zoom an effectively infinite board and switch among autosaved cases.
- Notes use handwriting and doodles without category eyebrows.
- Focused note inspection is editable and exposes human-relevant fields and story actions.
- Strings visibly tie to pushpins, layer over notes, react to wind, and communicate direction conspicuously.
- A user can draw freehand and convert a closed shape into an AI-readable region.
- AI-created changes remain proposals until accepted and can be rejected or questioned.
- The detective has a useful no-model fallback and the contest deployment offers zero-setup hosted AI.
- Local file attachments are never silently bundled or uploaded.
- Pointer shaking visibly raises wind, with alternate controls and reduced-motion behavior.
- Deleted evidence survives in a persistent, restorable wastebasket.
- The Victorian demonstration produces the complete contradiction-discovery climax.
- WebMCP clients can inspect the case and stage the same visible proposal types available to the detective.
- The primary interface remains sparse enough that the experience explains itself.
- The production experience is served from the canonical custom domain with sponsor and author links intact.

## Not in the MVP

- Accounts, authentication, or cloud-synchronized cases.
- Collaborative multiplayer editing.
- Public share links that include or retrieve local attachments.
- Full revision-history timelines inside evidence notes.
- Automatic acceptance of AI deductions.
- Uploading private files to make exported cases portable.
- Unbounded chat transcripts or a general-purpose chatbot experience.
- Mobile feature parity beyond functional touch access.

## Possible Later Extensions

- Encrypted cloud case sharing with explicit attachment selection.
- Real-time collaborative boards and investigator roles.
- Domain-specific board packs for research, incidents, legal cases, and story rooms.
- Evidence provenance, citations, and richer audit trails for serious investigations.
- Optional semantic search over user-approved attachment contents.
- Case templates and a community mystery gallery.

## Submission Proof Points

- The demo visibly proves that an AI agent can understand and manipulate a complex spatial web interface through WebMCP rather than screen-coordinate guessing.
- Typed, directional, provisional relationships demonstrate richer semantics than generic CRUD tools.
- Human approval, visible proposals, untrusted evidence handling, and complete reversibility make the agent collaboration legible and safe.
- The no-model fallback makes the project immediately judgeable; the hosted model demonstrates consumer usability; external WebMCP agents demonstrate extensibility.
- The fictional board is memorable while the field-notes page makes the general-purpose value obvious by implication.

## Requirements Status

This document captures the agreed product behavior from the requirements interview. It intentionally does not select the hosted model provider, persistence implementation, rendering library, texture source, deployment mechanism details, or WebMCP schema changes. Those decisions belong in the technical specification after this PRD is approved.
