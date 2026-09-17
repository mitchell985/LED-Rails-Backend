# 06 — Prototype: interpolation along the chain plus the hold/run-early clamp

Type: prototype
Status: resolved
Blocked by: — (03, 04 resolved); informed by 16
Map: ../map.md

## Question

Build a throwaway prototype (not production code) that makes the movement model concrete enough to react to:

- Distance-proportional interpolation along the centroid polyline between two scheduled times, driven by a fake clock.
- The conflict clamp: hold one clear block behind a train ahead; run early to stay a block ahead of one behind; both suspended while dwelling at The Strand / Puhinui / Pukekohe.
- Feed synthetic "real" trains in to force each rule to fire.
- The **speed cap** from ticket 04: no movement faster than track limits, or 110 km/h where none are known. This binds during catch-up after a hold, and under the run-early rule.

What it must answer: does distance-proportional interpolation over the long Puhinui–Pukekohe leg look plausible on the board, or does it need dwell holds / intermediate anchors? And does the clamp produce a stable LED sequence, or does it oscillate when a train ahead stops and starts?

Link the prototype from this ticket; do not merge it.

## Answer

**Prototype:** [`../prototypes/te-huia-movement-PROTOTYPE.html`](../prototypes/te-huia-movement-PROTOTYPE.html) — one self-contained file, opens by double-click. Six guided walkthroughs plus free play, with knobs for dwell duration and mode, clear-block separation, and the speed cap. The pure model lives in one `<script>` block with no DOM references and lifts out as-is.

### What it answered

**Distance-proportional interpolation holds up.** Over the 21.2 km Strand→Puhinui and 29.7 km Puhinui→Pukekohe legs the ghost moves steadily and crosses blocks at a plausible rate; it does not need intermediate timing anchors. The 110 km/h cap never binds on a clean run — the timetable's own average is roughly 50 km/h — so the cap matters only for catch-up after a hold, which is what ticket 16 should expect to conclude.

**The clamp is stable, not oscillating.** Held behind a stopped train for 90 simulated minutes it sits still at one block; when the blocker moves on it closes the gap at the capped rate and re-converges on schedule without overshoot.

### The defect it found

Three of the settled rules were written in terms of the **clock** when they are really about the **train's position**. Driving the hold scenario:

```
09:49  Held behind a train   block 322    +500s late
09:59  Held behind a train   block 322   +1100s late
10:09  Held behind a train   block 322   +1700s late
10:14  Running               block 174      0s late   ← teleported ~22 km
```

At 10:10 the clock entered Te Huia's scheduled Puhinui dwell. `isDwelling` consulted the timetable rather than the train, declared a dwell, snapped the position to the platform and **passed straight through the train blocking it** — the exact impossible pass the conflict rules exist to prevent. The same time-based reasoning ended visibility at the scheduled Pukekohe time, so a delayed run vanished mid-chain.

### Resolved with the owner

1. **Dwell is positional**: Te Huia is dwelling only when the clock is inside the window **and** it is in that station's block. A held train stays held, and dwells when it actually arrives. (Feeds ticket 13.)
2. **Visibility starts on the clock but ends on arrival**: southbound it stays on the board until it reaches the end of the chain, however late; northbound it clears 1 minute after arriving at The Strand. **This amends map note 11**, which defined both ends by the timetable.

Both fixes are implemented and verified in the prototype: the same 90-minute hold now produces zero position jumps, and a clean run dwells at Puhinui and arrives at Pukekohe at 10:47 exactly.

### Residual risk, flagged not decided

Because visibility now ends on *arrival*, a Te Huia held by a train that never moves **never leaves the board** — its LED stays lit indefinitely. A real in-service unit stabled on the chain (a terminated service sitting at a platform, say) could pin the ghost on overnight. The previously-offered grace period was declined in favour of arrival-based visibility; if that risk matters, a backstop is a separate small decision. Recorded in the map's fog.

### Capture

The prototype is **not** committed to a branch — the working tree has unrelated uncommitted changes and committing was not requested. It sits in `.scratch/` alongside the map.
