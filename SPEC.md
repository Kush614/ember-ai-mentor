# EMBER — Build Spec (reference)

**Event:** AI for Education Hackathon @ Stanford · Autonomous Learning Agents.
**Pitch:** Every AI tutor answers questions. Ember remembers you as a person — and knows when to hand you back to a human.
**Judged on:** pedagogy, deployment, trust (not model capability).

Mandatory sponsors: **Butterbase** (backend + MCP submission), **EverOS** (memory), **Nebius** (inference credits). All three are behind adapter files so the app runs on mocks without them — see `README.md` → "Wiring the sponsors".

## Product

Split screen: **Chat (Mentor)** left · **Memory Canvas** (live d3-force graph) right. Canvas animates in real time as the Observer writes to EverOS.

## Three agents

| Agent | Runs | Role | Output |
|---|---|---|---|
| Mentor | every message (streamed) | warm Socratic tutor; gets a memory digest in its system prompt | chat reply |
| Observer | after every exchange (JSON) | extracts concept mastery deltas, emotion, people, goals | JSON → EverOS → Canvas animation |
| Connector | when a rule trips (JSON) | decides when a human beats an AI, drafts the handoff | Connector card + Canvas pulse |

Prompts live verbatim in `src/lib/prompts.ts`.

## Connector rules (deterministic — `src/lib/connector.ts`)

1. 3 failed attempts on one concept in a session → draft a question for the teacher.
2. Frustration ≥ 0.7 two exchanges in a row → suggest a break + parent note.
3. Peer-match: mastered a concept a seeded classmate struggles with → suggest helping them.
4. Decay: mastered concept untouched > 7 days → gentle review nudge.

Merge rule: `mastery = clamp(old + 0.3 · mastery_delta)`.

## Data

**EverOS memory envelope:** `{ learner_id, type: concept|emotion|person|goal|pattern|session, key, data, confidence, created_at, updated_at, source_session }`. Type payloads and Maya's seed: `src/data/seed.ts`.

**Butterbase tables:** `users(id,email,display_name,role)`, `transcripts(id,learner_id,session_id,role,content,ts)`, `connector_events(id,learner_id,rule_fired,card_json,ts)`.

## Canvas (`src/components/Canvas.tsx`)

d3-force, dark, glow. Concepts green(≥.75)/amber(.35–.75)/red-pulse(<.35 or decaying); people = blue circles w/ initials; goals = gold stars (filled = achieved); patterns = purple diamonds. Radius ∝ confidence. Observer write → node scales 1.4× + glow ring; new nodes fly in from the chat edge. **Connector fire = person node pulses blue + glowing edge draws from the concept (the money shot).** Hover tooltip; header stat strip. Capped for 60fps.

## Demo & cut order

Demo script and the **Director bar** stage safety net: see `README.md`. Cut order if behind (drop from bottom): peer-match → decay → tooltips → parent note. **Never cut:** Canvas live animation, the 3-fail teacher handoff, the login-bloom moment.

## Status

Milestones 2–5 (Mentor loop, Observer pipeline, Canvas, Connector) are implemented and run on mocks today. Remaining for "deployment" judging: real Butterbase auth + deploy + MCP submission, real EverOS creds, real Claude/Nebius key (all drop-in via `.env`).
