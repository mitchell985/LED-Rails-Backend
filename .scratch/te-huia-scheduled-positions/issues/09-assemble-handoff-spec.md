# 09 — Assemble the handoff spec

Type: task
Status: resolved
Blocked by: 04, 05, 06, 07, 08, 10, 11, 12, 13, 15
Map: ../map.md

## Question

Nothing to decide. Collect every resolved decision on this map into a single spec an implementing session can build from: the scheduled-train pipeline, the Te Huia configuration, the KML allow-list edits, the conflict rules, the `?time=` contract and the viewer control — with the open risks named.

It must also carry two pieces of work that are implementation, not decisions, and would otherwise be
lost: **compiling `noServiceDates.json`** from an authoritative source (ticket 15 fixed the rule, not
the dates), and **picking the exact yellow** against the real board (ticket 05 left `[255, 199, 0]`
as a starting point only).

Publish to `.scratch/te-huia-scheduled-positions/spec.md`. Reaching this ticket's resolution is the destination.

## Answer

**Spec published: [`../spec.md`](../spec.md)** (21.8 KB). Assembled 2026-09-18 from 16 resolved tickets, 4 research documents and 2 prototypes.

Structure: the pipeline as it stands · the scheduled-train pipeline (config, ingestion, distilled file, service days, movement model, block assignment, conflicts, display priority) · simulated time (endpoint contract, viewer control) · a files-touched table · 7 acceptance checks · open risks and to-dos · out of scope · sources.

Two fog items resolved while writing rather than carried forward:

- **The clamp and the `[prev, cur]` payload** — a held ghost emits `b: [X, X]`, identical to any stationary real train, so the clamp needs no special handling. The fog item anticipated a problem that does not exist.
- **Timezone and GTFS times past 24:00:00** — folded into §2.4 as `Pacific/Auckland` service-day resolution against days *D* and *D-1*, rather than left as a separate question.

Carried into the spec's §6 rather than silently dropped: the two implementation to-dos (compiling the date table, confirming the yellow) and four accepted risks (the indefinitely-held ghost, the WRC/feed 15-minute divergence with no detection, opposite-direction flicker, and the unconfirmed absence of realtime).

**The map's destination is reached.**
