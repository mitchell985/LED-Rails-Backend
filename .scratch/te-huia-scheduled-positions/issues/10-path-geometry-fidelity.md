# 10 — Fixing the 9 broken centroid-polyline segments

Type: grilling
Status: resolved
Blocked by: — (graduated from fog by 03)
Map: ../map.md

## Question

Ticket 03 validated the settled geometry approach (map note 6) and found it 85% sound: 52 of 61 segments are clean, 9 are not. Decide how to close the gap.

Three distinct failure modes, from [research/board-topology.md](../research/board-topology.md):

1. **Chord-cutting** — a straight line between two centroids leaves both polygons on a curve. Worst case `205 → 207`, 59.5 m deviation, ~430 m of dark track (about a full update tick at 80 km/h). Also `322→324`, `341→159`, `172→174`, `334→335`, `203→204`, `199→200`.
2. **Wrong-block lighting** — `188→190` passes through `187 Papakura Sidings`; `171→172` clips `173`.
3. **The terminus hazard** — `300 - The Strand` physically overlaps blocks 320, 321, 322 and 323. Running northbound, `findAndSetTrainBlock`'s ascending `ref ± 10` scan resolves the 322→300 overlap to **321** (a Britomart junction chord), so Te Huia terminates in the wrong block and never reaches The Strand at all.

**Ticket 02 changed the option set here.** Te Huia's GTFS `shape` exists in AT's flat zip and was *verified accurate*: it passes within ~100 m of every station on the chain and stays 2,357 m clear of Newmarket. Map note 6 chose the centroid polyline when it was unknown whether a usable shape existed. It does. Using it would replace all 9 broken segments at once — at the cost of reintroducing a dependency on feed geometry, and of needing the zip (see ticket 12) rather than just v3.

Options to weigh: use the verified GTFS shape; densify the polyline with intermediate waypoints from the block polygon vertices; hand-place a handful of waypoints only on the 9 bad segments; drive block occupancy from the chain directly and use position only for display; or constrain block assignment to the next block *in the chain* rather than a geographic search. Note `gtfsTimetable.ts:434-500` (`mapPointsToBlocks`) is existing precedent for walking a polyline into blocks.

**Ticket 12 settled the supply question**: the zip is being pulled anyway (for calendars), so the verified GTFS shape *is* available — this ticket's cheapest option stands. The owner also stated a contingent preference: if the shape is not used, fix the 9 segments with **hand-placed waypoints** rather than chain-constrained block lookup.

The terminus hazard needs its own answer regardless — **hand-placed waypoints do not fix it**, because the fault is in how `findAndSetTrainBlock` resolves the 300/320/321/322 overlap, not in where the polyline runs. The terminus hazard may need its own answer — a chain-constrained lookup fixes it, waypoints do not.

## Answer

Decided with the repo owner, 2026-09-18. The nine failures were three distinct problems, and they get two distinct fixes.

### 1. Geometry: the verified GTFS shape

Both Te Huia shapes — `255-800005-c3980ac3` (NB, 4,108 points) and `255-800006-39fea4ac` (SB, 2,426 points) — come from the zip ticket 12 already pulls, so they cost nothing extra. Ticket 02 verified them against AT's own station coordinates: within ~100 m of every station on the chain, and 2,357 m clear of Newmarket. Following the real curves eliminates **failure (a), chord-cutting**, everywhere at once, and gives `map.html` a geographically true position.

**Consequence for interpolation:** distances now come from the shape, not the centroid polyline. The shape carries `shape_dist_traveled` in km, and its Auckland section measures ~51.9 km against the centroid polyline's 50.83 km — about 2% longer, because the polyline cuts every curve. Leg distances used for distance-proportional interpolation must be re-derived from the shape; the prototype's figures are centroid-based and will shift slightly.

### 2. Block assignment: chain-constrained

A scheduled train's block is resolved **only against its own 62-block chain**, never the full board. This is what actually fixes the other two failures, and it fixes them by construction rather than by tuning geometry:

- **(b) wrong LED** — `187 Papakura Sidings` is not on the chain, so it can never light. This mattered because the sidings polygon genuinely overlaps the running-line corridor (7 m deviation), meaning even a perfectly accurate shape would plausibly have clipped it; geometry alone could not have fixed this.
- **(c) the terminus** — `320`/`321`/`323` are not on the chain, so the `ref ± 10` scan that terminated northbound Te Huia in a Britomart junction chord cannot occur. The northbound and southbound walks now agree.

Realtime trains keep the existing `findAndSetTrainBlock` geographic search, untouched.

**The KML allow-list edit still stands.** Constraining the *search* to the chain does not bypass a block's `routes` allow-list, and `300 - The Strand [OUT-OF-SERVICE]` is the one allow-listed block on the chain. Map note 10's edit — appending the Te Huia route — remains required.

### 3. Fallback: nearest chain block, never dark

If the computed position falls outside every chain polygon, the nearest chain block lights. A scheduled train's position is computed rather than observed, so a dropout would be a bug chosen for display. This removes the dark-LED failure class outright, independently of how good the geometry is.

### Note on the prototype

[`../prototypes/te-huia-movement-PROTOTYPE.html`](../prototypes/te-huia-movement-PROTOTYPE.html) already assigns blocks by nearest chain centroid, which is this decision's fallback rule. That is why it never went dark and never lit Papakura Sidings across any scenario — it had been quietly demonstrating the chosen approach.

### For the implementer

Mapping shape points to chain blocks is a **precompute at ingest**, not per-tick work: each shape point resolves once to a chain index, and the runtime then interpolates along `shape_dist_traveled` and reads the block off the precomputed array.
