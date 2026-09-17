# 13 — Where does dwell come from, given the feed encodes none?

Type: grilling
Status: resolved
Blocked by: — (02 resolved: no published dwell figure exists)
Map: ../map.md

## Question

Map notes 9 and 11 both rest on Te Huia standing still at its stops: the conflict rules are **suspended while dwelling**, and visibility at The Strand is defined as 1 min before departure / 1 min after arrival. Ticket 01 found that AT's feed gives us nothing to build that on — **`arrival_time == departure_time` on all 72 stop_times rows**, with `timepoint = 0` throughout. The feed says Te Huia dwells for zero seconds.

Ticket 02 searched and found **no published dwell figure anywhere** — and established that AT encodes non-zero dwell on ~1.4% of rows in the same `stop_times.txt`, so the zeroes here are deliberate, not missing data. The number is ours to choose and to label as a parameter. Decide:

- Where the dwell number lives: config per service, a constant, or per-stop values.
- Whether dwell is taken *before* the scheduled time, *after* it, or straddles it — this shifts every interpolated position between stops, and decides whether the scheduled time means arrival or departure.
- Note `TripSimulator.derivePointTimings` already assumes `DWELL_TIME_SECONDS = 30` when arrival equals departure (`gtfsTimetable.ts:322`). Do we reuse that convention, override it for Te Huia, or ignore that code path entirely?
- What "is dwelling" means for the conflict-suspension rule: inside the station block, or within the dwell window either side of the scheduled time?
- The visibility window's ±1 min at The Strand — is that independent of dwell, or derived from it?

## Answer

Decided with the repo owner, 2026-09-18. Every figure here is a **chosen parameter**, not a sourced fact — ticket 02 established no published dwell exists, and the feed encodes zero deliberately.

1. **Duration: 60 seconds**, one value for the service. Config must name it as an assumption (e.g. `assumedDwellSeconds`) so nobody later mistakes it for feed data. Note this deliberately differs from the `DWELL_TIME_SECONDS = 30` already in `derivePointTimings` (`gtfsTimetable.ts:322`) — that constant belongs to the MEL firmware path this effort routes around (ticket 12), and is not shared.
2. **The scheduled time is the ARRIVAL; the dwell falls after it.** Te Huia arrives at the published time and departs 60s later. The preceding leg therefore matches the feed exactly, and each onward leg starts a minute late and runs fractionally faster to make it up.
3. **Both termini dwell too** — all three stops are treated alike.
4. **The Strand's visibility window is derived from the terminus dwell**, not an independent display rule. One number governs both how long the ghost stands there and how long it is lit.

### How the ends resolve, given (2) and (3)

The "dwell after the scheduled time" rule is about *intermediate* stops, where the published time is an arrival. At a trip's own origin nothing precedes the departure, so the dwell necessarily sits *before* it. Working the three stops through, in both directions:

| | Northbound (Hamilton → The Strand) | Southbound (The Strand → Hamilton) |
| --- | --- | --- |
| The Strand | arrives 08:35, dwells to 08:36, lit until 08:36 | stands from 09:39, departs 09:40 |
| Puhinui | arrives 08:01, departs 08:02 | arrives 10:10, departs 10:11 |
| Pukekohe | arrives 07:27, departs 07:28 | arrives 10:47, departs 10:48 |

This lands exactly on map note 11's original wording — lit 1 minute before departing The Strand, and 1 minute after arriving — but now as a *consequence* of the dwell rather than a separate rule.

**Flagged, not decided:** ticket 06 made visibility end on *arrival* at the end of the chain. Read together with (3) and (4), the consistent reading is that it ends when the train **departs** the last on-board block — i.e. after its dwell there — so a southbound run stays lit through its Pukekohe stand and clears at 10:48. Called out here so the spec (ticket 09) states it explicitly rather than leaving two rules to be reconciled by whoever implements it.

**Prototype note:** [`../prototypes/te-huia-movement-PROTOTYPE.html`](../prototypes/te-huia-movement-PROTOTYPE.html) predates points (3) and (4) — it dwells at intermediate stops only and treats the Strand window as independent. Its dwell-mode knob was what made point (2) concrete; it was not rebuilt afterwards.
