# 04 — How do we decide a real train is "same direction" as Te Huia?

Type: grilling
Status: resolved
Blocked by: — (03 resolved)
Map: ../map.md

## What ticket 03 established

AKL's `trackBlocks.kml` contains **zero `<description>` elements** (WLG 0, MEL 418), so the AKL block model carries no bearing, no platform and no track data; `processBlock()`'s platform/bearing paths are dead code for this network. Adjacency is undirected and never computed at runtime — block proximity is a `ref ± 10` numeric heuristic. `(+N)` is an `altBlock` (a spare LED for a second train in the same block, `trackBlocks.ts:852-882`), **not** a per-direction track. So the prerequisite for a same-direction rule is not met by the *block* data as it stands.

## Question

The conflict rules (map notes 9) are stated in terms of a same-direction train ahead of or behind Te Huia. Decide:

- **Is a same-direction rule worth its cost at all**, given no direction data exists in the block model? The fallback is the weaker "same block" rule the user already rejected.
- What defines "ahead" and "behind" — position along Te Huia's own block chain, rather than geography?
- How is a realtime train's direction inferred: GTFS `bearing`, its `previousBlock → currentBlock` transition, its upcoming `stops`, or its `route_id`?
- What happens when direction is **unknown** for a real train (stale position, no bearing, just appeared): does Te Huia yield conservatively, or ignore it?
- Two trains on opposite tracks **do** share a block number (one polygon spans both tracks) — how do we stop Te Huia yielding to an opposite-direction train that is merely passing it?
- Which side of the chain counts as "ahead" for a southbound vs northbound Te Huia.

## Answer

**Direction comes from `direction_id`, on both sides.** Decided with the repo owner, 2026-09-17, after a live sample of AT's realtime feed contradicted this ticket's premise.

### The premise was half wrong

Ticket 03 established the *block* model carries no direction. It doesn't. But the *vehicle* feed does. A live sample of `api.at.govt.nz/realtime/legacy` (51 trains in the 59000–59999 range) found:

- **9 of 9 in-service trains carry `direction_id`**, alongside `trip_id` and `route_id`.
- 42 of 51 are out of service — no trip, no route, no direction, bearing 0.
- `bearing` is present on only 15 of 51, and is typed inconsistently: a **string** (`'264.7'`) when non-zero, `int 0` otherwise, while `TrainInfo.position.bearing` declares `number | undefined`. Not used by this design; recorded as a latent bug.

Te Huia's own direction needs no inference either: its static trips carry `direction_id` — `255-800005…` = 0 (northbound, Hamilton → The Strand) and `255-800006…` = 1 (southbound), per ticket 01. So both sides of every comparison come from the feed.

### Resolution

1. **Signal:** `direction_id` from the realtime trip descriptor for AT trains; `direction_id` from the distilled static trip for Te Huia. Bearing and chain-delta inference are both rejected.
2. **Calibration:** `direction_id` is 0/1 per route and means nothing geographic on its own, so the mapping from each AT rail route's `direction_id` to Te Huia's chain orientation is **derived from the static feed at ingest** (direction_id + stop sequence per route), not hand-written in config. **This amends ticket 12**: distillation is no longer Te Huia-only — it must also extract enough of the 7 AT rail routes' trips to compute that mapping.
3. **Unknown-direction trains are ignored entirely.** An out-of-service train has no direction and no route, and Te Huia moves straight past it. This is what stops a unit stabled in `172 Wiri Depot Platform` — a depot block that sits *on* the running line and therefore on Te Huia's chain — from holding Te Huia back indefinitely. The accepted cost: Te Huia can visibly pass an empty-stock or shunt move.
4. **No limit on schedule drift** while held. The ghost stays behind the train in front for as long as that takes, then closes the gap once the road clears — it can never be more wrong than the train physically ahead of it.
5. **But catch-up is speed-capped.** When running behind schedule (or ahead, under the run-early rule), Te Huia's movement is limited to **track speed limits where they can be found, otherwise a flat 110 km/h**. This is new, and it applies to interpolation generally, not just to catch-up: a scheduled position is never reached faster than a real train could. Sourcing the limits is **ticket 16**.

### Consequences

- **Ticket 12 amended** — distillation scope grows to cover AT rail route directions.
- **Ticket 11** (altBlock) is unblocked by this ticket and now has a narrower question: only in-service AT trains can ever conflict with Te Huia.
- **Ticket 06**'s prototype must include the speed cap, not just the hold/run-early clamp.
