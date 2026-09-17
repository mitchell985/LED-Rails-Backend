# Board topology: Te Huia's block chain, and what the AKL block model does (and doesn't) encode

Research for ticket [03](../issues/03-board-topology-block-chain.md). Sources are primary only:
`railNetworks/AKL/trackBlocks.kml` (146 placemarks), `trackBlocks.ts`, `gtfsTimetable.ts`,
`railNetworks/AKL/config.json`. Geometry was derived by parsing the KML and replaying
`isPointInPolygon` / `findAndSetTrainBlock` / `assignBlocksToTrains` exactly as `trackBlocks.ts`
implements them, in a throwaway script outside the repo.

No design decisions are made here. Open items are collected under
[Unknown / could not confirm](#unknown--could-not-confirm).

---

## 1. The ordered block chain

62 blocks, `300 - The Strand` → `207 - Pukekohe`, total polyline length **~50.9 km**.
Every consecutive pair is polygon-adjacent (boundaries within 20 m; most share vertices exactly).
All 19 user-supplied stations appear, in order.

Centroids are area centroids (shoelace) of the KML ring, in WGS84. Where a block is a long
curved strip the centroid is *not* on the track — see [§5](#5-centroid-polyline-sanity-check).

| # | block | KML placemark name | centroid lat | centroid lon | altBlock | routes[] |
|---|-------|--------------------|--------------|--------------|----------|----------|
| 1 | 300 | `300 - The Strand [OUT-OF-SERVICE]` | -36.848480 | 174.781042 | — | `OUT-OF-SERVICE` |
| 2 | 322 | `322` | -36.848045 | 174.786348 | — | — |
| 3 | 324 | `324` | -36.849508 | 174.793234 | — | — |
| 4 | 325 | `325` | -36.854479 | 174.799016 | — | — |
| 5 | 326 | `326` | -36.859926 | 174.805374 | — | — |
| 6 | 327 | `327 - Ōrākei` | -36.862363 | 174.809224 | — | — |
| 7 | 328 | `328` | -36.864470 | 174.814948 | — | — |
| 8 | 329 | `329 - Meadowbank` | -36.866276 | 174.820774 | — | — |
| 9 | 330 | `330` | -36.866311 | 174.831971 | — | — |
| 10 | 331 | `331` | -36.870381 | 174.845518 | — | — |
| 11 | 332 | `332` | -36.874783 | 174.851736 | — | — |
| 12 | 333 | `333 - Glen Innes` | -36.878912 | 174.854219 | — | — |
| 13 | 334 | `334` | -36.883473 | 174.855650 | — | — |
| 14 | 335 | `335` | -36.893738 | 174.852564 | — | — |
| 15 | 336 | `336 - Panmure` | -36.897877 | 174.849750 | — | — |
| 16 | 337 | `337` | -36.904171 | 174.845998 | — | — |
| 17 | 338 | `338` | -36.910690 | 174.843397 | — | — |
| 18 | 339 | `339 - Sylvia Park` | -36.914591 | 174.842569 | — | — |
| 19 | 340 | `340` | -36.919994 | 174.840652 | — | — |
| 20 | 341 | `341` | -36.927323 | 174.831791 | — | — |
| 21 | 159 | `159` | -36.933838 | 174.831054 | — | — |
| 22 | 160 | `160` | -36.941889 | 174.832511 | — | — |
| 23 | 162 | `162 - Otahuhu (+161)` | -36.947514 | 174.833332 | 161 | — |
| 24 | 163 | `163` | -36.953692 | 174.834694 | — | — |
| 25 | 164 | `164` | -36.959954 | 174.836901 | — | — |
| 26 | 165 | `165 - Middlemore` | -36.962908 | 174.839035 | — | — |
| 27 | 166 | `166` | -36.970397 | 174.844165 | — | — |
| 28 | 167 | `167 - Papatoetoe` | -36.977575 | 174.849303 | — | — |
| 29 | 168 | `168` | -36.983812 | 174.852869 | — | — |
| 30 | 170 | `170 - Puhinui (+169)` | -36.989968 | 174.856230 | 169 | — |
| 31 | 171 | `171` | -36.993866 | 174.858832 | — | — |
| 32 | 172 | `172 - Wiri Depot Platform` | -36.999954 | 174.861874 | — | — |
| 33 | 174 | `174` | -37.008306 | 174.867942 | — | — |
| 34 | 176 | `176 - Homai` | -37.013578 | 174.874984 | — | — |
| 35 | 177 | `177` | -37.017126 | 174.882849 | — | — |
| 36 | 178 | `178` | -37.020773 | 174.890982 | — | — |
| 37 | 179 | `179 - Manurewa` | -37.023462 | 174.896461 | — | — |
| 38 | 180 | `180` | -37.027948 | 174.902044 | — | — |
| 39 | 181 | `181 - Te Mahia` | -37.031341 | 174.906278 | — | — |
| 40 | 182 | `182` | -37.036141 | 174.912561 | — | — |
| 41 | 183 | `183 - Takaanini` | -37.040920 | 174.919067 | — | — |
| 42 | 184 | `184` | -37.044110 | 174.924195 | — | — |
| 43 | 185 | `185` | -37.050531 | 174.933248 | — | — |
| 44 | 186 | `186` | -37.057962 | 174.940784 | — | — |
| 45 | 188 | `188 - Papakura (+189)` | -37.065115 | 174.946634 | 189 | — |
| 46 | 190 | `190` | -37.073098 | 174.953896 | — | — |
| 47 | 191 | `191` | -37.080187 | 174.957018 | — | — |
| 48 | 192 | `192` | -37.089187 | 174.955328 | — | — |
| 49 | 193 | `193` | -37.100186 | 174.953373 | — | — |
| 50 | 194 | `194 - Drury` | -37.105095 | 174.951486 | — | — |
| 51 | 195 | `195` | -37.113723 | 174.943995 | — | — |
| 52 | 196 | `196 - Ngākōroa` | -37.123126 | 174.935525 | — | — |
| 53 | 197 | `197` | -37.125448 | 174.932021 | — | — |
| 54 | 198 | `198` | -37.129669 | 174.925876 | — | — |
| 55 | 199 | `199` | -37.138318 | 174.914768 | — | — |
| 56 | 200 | `200` | -37.149909 | 174.902664 | — | — |
| 57 | 201 | `201 - Paerātā` | -37.156492 | 174.897839 | — | — |
| 58 | 202 | `202` | -37.164527 | 174.896970 | — | — |
| 59 | 203 | `203` | -37.175562 | 174.900949 | — | — |
| 60 | 204 | `204` | -37.180704 | 174.904399 | — | — |
| 61 | 205 | `205` | -37.194987 | 174.906609 | — | — |
| 62 | 207 | `207 - Pukekohe (+206)` | -37.204743 | 174.912266 | 206 | — |

Config-ready list (north → south):

```json
[300, 322, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337,
 338, 339, 340, 341, 159, 160, 162, 163, 164, 165, 166, 167, 168, 170, 171, 172,
 174, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 188, 190, 191, 192,
 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 207]
```

### The Quay Park end — which of 318/319/320/321/322 the route uses

Answer: **only 322.** The chain is `300 → 322 → 324`. None of 318, 319, 320 or 321 is traversed.

Adjacency in the cluster, computed from the polygons:

```
315 Waitematā ── 318 (+317) ── 319 ─┬─ 320 Quay Park Triangle South:West ─┬─ 301 → 302 Parnell
                    │               │                                     │
                    └── 301         └─ 321 Quay Park Triangle East:West ───┼─ 300 The Strand
                                                                          └─ 322 → 324 → Ōrākei
```

* **318 `(+317)`** is the Britomart throat — it is the only block touching `315 - Waitematā`. Not on
  a Te Huia path that never enters Britomart.
* **319** is the block between the Britomart throat and the junction proper. Same reasoning.
* **320 `Quay Park Triangle South:West`** is the junction chord joining the **South** leg (301 →
  Parnell → Newmarket) to the **West** leg (Britomart). Te Huia uses neither leg.
* **321 `Quay Park Triangle East:West`** is the junction chord joining the **East** leg (322 →
  Ōrākei) to the **West** leg (Britomart). A train running east→Britomart occupies it; a train
  running east→The Strand does not.
* **322** is the East leg itself, and its polygon **overlaps** `300 - The Strand` over the longitude
  band 174.7823–174.7843. The two blocks are directly connected — nothing sits between them.

So 320 and 321 are the two triangle/junction blocks in this cluster, and **neither should ever be
occupied by Te Huia**. This matters, because the geometry makes it easy to light 321 by accident —
see [§5](#5-centroid-polyline-sanity-check).

`323 - West Car Exchange [OUT-OF-SERVICE]` also overlaps both 300 and 322 but is excluded by its
route allow-list as long as the Te Huia route id is *not* added to it.

### The Westfield end

`341` is the block that ends at Westfield Junction. It touches **both** `158` (the Penrose /
via-Newmarket leg of the NIMT) and `159` (the leg south to Ōtāhuhu). The Te Huia chain takes
`341 → 159 → 160 → 162`, matching the anchors in the ticket. **158 is not on the chain** — it is
the Southern-via-Penrose approach.

### Two non-obvious chain members

* **172 `Wiri Depot Platform`** is on the running line, not in the yard. Its polygon is a ~50 m-wide
  sliver following the main-line alignment from -36.9965 to -37.0031; blocks 171 and 174 do not
  touch each other, so the chain *must* pass through 172. The yard blocks are 173 (`Wiri Depot
  North`) and 175 (`Wiri Depot South`), both off-chain.
* **188 `Papakura`** is reached directly from 186 and leads directly to 190. `187 - Papakura
  Sidings` is off-chain but overlaps the 188→190 corridor.

Blocks explicitly *not* on the chain despite being adjacent to it: 150/151/157/158 (Penrose &
Onehunga), 173/175 (Wiri yard), 187 (Papakura sidings), 208 (Pukekohe sidings), 342/343/344
(Manukau branch), 318/319/320/321/323 (Quay Park / Britomart).

---

## 2. What the paired numbers mean — `162 - Otahuhu (+161)` etc.

**It is a second LED for a second train in the same block. It is not two tracks, not two platforms,
and it carries no direction information.**

Parsing (`trackBlocks.ts:222-226`):

```ts
// Parse altBlock from +N in the id string (e.g., "+402" means altBlock is 402)
const altBlockMatch = id.match(/\+(\d+)/);
```

`altBlock` is a bare integer on the `TrackBlock`, commented "Alternative block number (can be used
if multiple trains are same block)" (`trackBlocks.ts:47`). Its only consumer in the whole codebase
is `updateAltBlocks()` (`trackBlocks.ts:852-882`), which runs after all block assignment:

1. Collect visible trains whose `currentBlock` is this block.
2. If more than one, sort by route (`OUT-OF-SERVICE` last, otherwise `localeCompare`).
3. Index 0 keeps the block; **indices 1 and 2 are both moved to `block.altBlock`**; index 3+ are
   pushed onto `invisibleTrainIds` and disappear.

Three corroborating facts:

* The alt numbers **have no polygon of their own**. 109, 141, 161, 169, 189, 206, 316 and 317 do not
  appear as placemarks anywhere in the 146-placemark file. They exist only as LED designators.
* The tie-break is **route name alphabetical order**, not geography — so which of two trains gets the
  main LED and which gets the alt LED can flip between ticks.
* Because both index 1 and index 2 map to the same `altBlock`, two trains can be emitted onto the
  same alt LED simultaneously. (Looks like a latent bug; flagged, not acted on.)

All eight paired blocks in AKL are two-platform stations or double-track throats
(108 Henderson, 140 Newmarket, 162 Ōtāhuhu, 170 Puhinui, 188 Papakura, 207 Pukekohe, 315 Waitematā,
318), which is *why* the board has a spare LED there — but the model does not know that, and
nothing assigns a direction or a platform to the alt LED.

**Direction is not derivable from the pair.**

---

## 3. Direction and track information in the block model — there is none in AKL

The block model has one mechanism that could carry direction: `Platform.bearing`, parsed from the
placemark **description** (`trackBlocks.ts:159-176`), format
`102,"12260";"12261";,Default,-72deg,[ROUTE,…]`. `processBlock()` uses it at
`trackBlocks.ts:748-770`: a default platform whose bearing is within ±90° of
`train.position.bearing` wins.

**`railNetworks/AKL/trackBlocks.kml` contains zero `<description>` elements.**

```
$ grep -c '<description>' railNetworks/*/trackBlocks.kml
railNetworks/WLG/trackBlocks.kml:0
railNetworks/AKL/trackBlocks.kml:0
railNetworks/MEL/trackBlocks.kml:418
```

Consequences for AKL, all of them load-bearing for the conflict rules:

* Every AKL block has `platforms === undefined`, so `processBlock()` always takes the `else` branch
  and does `setTrainBlock(train, block.blockNumber, block.blockNumber, …)`. Platform selection,
  stop-id matching and bearing matching are **dead code in AKL**. The feature is MEL-only today.
* There is therefore **no per-block bearing, no track designation, and no platform designation** in
  AKL. A block is a single LED with a polygon, an optional alt LED, an optional route allow-list and
  an optional display threshold — nothing else.
* **Block adjacency is undirected.** Nothing in the KML or the loader records a "next" or "previous"
  block. Adjacency has to be *computed* from polygon geometry (as done here); the runtime never
  does. `findAndSetTrainBlock()` only exploits the *numeric* proximity heuristic `referenceBlock ±
  10` (`trackBlocks.ts:797-803`) — block numbers happen to run monotonically along each line, which
  is a numbering convention, not a modelled relation.
* `TrainInfo.previousBlock` is the only direction-ish signal the runtime keeps, and it is not a
  history: `setTrainBlock()` overwrites it with `currentBlock` on every assignment, and
  `assignBlocksToTrains()` step 2 sets `previousBlock = currentBlock` whenever the train hasn't
  moved (`trackBlocks.ts:670`). It exists to drive the `b: [prev, cur]` LED transition, nothing more.

`TrainInfo.position.bearing` is the only real direction datum, and it comes from the feed, not the
board:

* `addNewTrain()` copies `position.bearing` straight from GTFS-realtime; comment says "Can be
  undefined" (`trackBlocks.ts:613`).
* `updateExistingTrainPosition()` only refreshes it when the computed speed is > 2 m/s, "to avoid
  erratic bearing changes when stationary" (`trackBlocks.ts:564-567`). A stopped or slow AT train
  therefore carries a stale bearing, and a train that has never moved fast carries none.
* Its only *other* consumer is `trainPairs.ts` (`maxBearingDiff: 5`, `trainPairs.ts:9,119-120`),
  for detecting two coupled units.
* `map.html:305-307,395` renders it as an arrow, which is why the viewer looks like it knows
  direction even though the board model doesn't.

**Net:** a "same-direction train" rule cannot be built on the block model. The only available
direction signal is `TrainInfo.position.bearing` on the *other* (AT, realtime) trains, which is
feed-supplied, frequently `undefined`, and deliberately frozen below 2 m/s. An alternative that uses
only what exists: since the Te Huia chain is an ordered list, an AT train's position along that
chain can be compared between ticks to infer its direction, or its `previousBlock`/`currentBlock`
pair can be compared against chain order. Both are design choices for ticket 04, not settled here.

There is precedent worth reading before designing that: `gtfsTimetable.ts:434-500`
(`mapPointsToBlocks`) already walks a GTFS `shapes.txt` polyline, synthesises a bearing from each
point to the next, stuffs it into a fake `TrainInfo` (`trainId: 'estimate'`) and calls
`findAndSetTrainBlock()` to produce an ordered block sequence with time offsets. It is the same
shape of problem as the scheduled-train pipeline, one layer down.

---

## 4. Route allow-lists on the chain

`isRouteAllowed()` (`trackBlocks.ts:411-433`) applies to a block's `routes`: exclusions (`!X`) first,
then, **if any inclusion exists, the train's route must `String.includes()` at least one of them**.
Match is substring, not equality.

All eight blocks in AKL carrying a bracketed allow-list:

| block | name | routes[] | on Te Huia chain? |
|-------|------|----------|-------------------|
| 130 | `Morningside Sidings` | `OUT-OF-SERVICE` | no |
| 139 | `Newmarket Triangle South:West` | `OUT-OF-SERVICE,WEST-201` | no |
| 151 | `Penrose Platform 3` | `ONE-201,OUT-OF-SERVICE` | no |
| **300** | **`The Strand`** | **`OUT-OF-SERVICE`** | **yes — block 1 of 62** |
| 306 | `Newmarket Triangle North:West` | `OUT-OF-SERVICE` | no |
| 307 | `Maungawhau Triangle North:East` | `OUT-OF-SERVICE` | no |
| 308 | `Maungawhau Platform 1:2` | `OUT-OF-SERVICE` | no |
| 323 | `West Car Exchange` | `OUT-OF-SERVICE` | no — but **overlaps 300 and 322** |

**`300 - The Strand` is the only block on the chain with an allow-list.** The other 61 blocks are
unrestricted. Confirmed by replaying the walk with route id `TEHUIA`: with 300 left as-is the
simulated train is refused entry and lands in 321 instead; with `TEHUIA` appended it takes 300.

Two adjacent notes:

* **The allow-lists are stale relative to the live config.** `railNetworks/AKL/config.json` (modified
  in the working tree) now maps colours for `E-W-201`, `O-W-201`, `S-C-201`, having dropped
  `WEST-201`, `EAST-201`, `ONE-201`, `STH-201`. The KML still names `WEST-201` (block 139) and
  `ONE-201` (block 151). Under substring matching, `WEST-201` no longer matches anything AT
  publishes, so block 139 is currently reachable only by `OUT-OF-SERVICE`. Out of scope for this
  ticket, but it is the same class of edit as adding the Te Huia route id.
* Because matching is `includes()`, the chosen Te Huia route id must not be a substring of an AT
  route id (or vice versa) or it will silently gain or lose permissions.

---

## 5. Centroid-polyline sanity check

Method: join the 62 centroids into a polyline, sample 200 points per segment, and run each sample
through a faithful replay of `assignBlocksToTrains()` step 2 — first `processBlock()` on the current
parent block, then `findAndSetTrainBlock()` with its `ref ± 10` scan followed by the full
`trackBlocks` iteration in load order (allow-listed blocks first, then `priority` named blocks, then
the rest — `trackBlocks.ts:310-325`). Route `TEHUIA`, with `TEHUIA` assumed appended to 300.

**Verdict: 52 of 61 segments are clean. 9 break, in three distinct ways. The idea works for most of
the route but cannot be used as-is.**

### (a) Chord-cutting on curves — the train falls outside *every* polygon

The centroid of a long curved block sits inside the curve, so the straight line between two
centroids leaves the corridor. `findAndSetTrainBlock()` then matches nothing and clears
`currentBlock` **and** `previousBlock` (`trackBlocks.ts:833-836`), so `generateLedMap()` skips the
train entirely (`trackBlocks.ts:900`) — **the LED goes dark** until the next tick puts it back inside
a polygon.

| segment | segment length | max deviation | fraction of segment outside all polygons | approx off-polygon distance |
|---------|----------------|---------------|------------------------------------------|------------------------------|
| **205 → 207** (Pukekohe approach) | 1196 m | **59.5 m** | 35.7 % | ~430 m |
| **322 → 324** (Quay Park → Ōrākei curve) | 634 m | 33.3 m | 31.2 % | ~196 m |
| **341 → 159** (Westfield junction) | 727 m | 33.0 m | 27.9 % | ~204 m |
| **172 → 174** (Wiri) | 1074 m | 30.7 m | 19.2 % | ~204 m |
| **334 → 335** (Glen Innes → Panmure) | 1174 m | 26.6 m | 16.5 % | ~194 m |
| **203 → 204** | 649 m | 23.7 m | 15.7 % | ~101 m |
| **199 → 200** | 1679 m | 21.3 m | 9.5 % | ~160 m |

~1.5 km of the 50.9 km chain (≈3 %) lies outside every polygon. At 80 km/h that is roughly 20 s at
the worst spot (205→207) — a full `updateInterval` tick, i.e. a visible dropout, not a glitch.

### (b) Parallel blocks whose centroids are close — the wrong LED lights

| segment | intruding block | samples |
|---------|-----------------|---------|
| **188 → 190** | **187 `Papakura Sidings`** | 12 / 201 southbound, 12 / 201 northbound |
| **171 → 172** | **173 `Wiri Depot North`** | 3 / 201 southbound, 11 / 201 northbound |

The 188→190 chord clips the `Papakura Sidings` polygon (deviation from the main-line blocks is only
7 m, so this is genuine overlap, not a wide miss). The emitted LED sequence contains
`… 188, 190, 187, 190, 191 …` — the sidings LED flickers on mid-segment. 187 is also `priority`
(named), so it is searched before unnamed blocks, which makes the intrusion more likely, not less.

### (c) Overlapping junction blocks + the `ref ± 10` heuristic — direction-dependent failure

`300 - The Strand` is a ~540 m strip that runs right through the Quay Park triangle. Point-in-polygon
probes along it at lat -36.8485:

| longitude | blocks containing the point |
|-----------|------------------------------|
| 174.7785 | 300, **320** |
| 174.7805 | 300, **321** |
| 174.7815 | 300, **321** |
| 174.7825 | 300, **323**, **322** |
| 174.7845 | 323, 322 |

300's own centroid is inside **both 300 and 321**.

Southbound (The Strand → Pukekohe) this is harmless: the walk starts with no current block, the full
search runs in load order, and 300 — being allow-listed — is searched before everything except
130/139/151, none of which contain the point. Result: `300, 322, …`.

Northbound (Pukekohe → The Strand) it fails. The train is in 322; `findAndSetTrainBlock()` scans
`322 ± 10` = 312…332 **in ascending numeric order first**, and 321 contains the point while 300
(= 322 − 22) is outside the window and only reachable in the fallback scan. **The train terminates in
321 `Quay Park Triangle East:West` and never reaches 300 at all.** Full northbound tail:
`… 325, 324, None, 322, 321`.

So the same chain, walked in the two directions, yields different final blocks. Any use of the
centroid polyline has to deal with this; the ticket-04 direction model does not fix it, because the
cause is the `ref ± 10` numeric heuristic colliding with overlapping polygons, not a missing bearing.

### Where the approach is fine

The remaining 52 segments — the whole Eastern line between Ōrākei and Sylvia Park, all of Ōtāhuhu →
Papakura except the Wiri clip, and Papakura → Paerātā — sample cleanly inside the intended block
with zero deviation. The failure modes are localised and each one is identified above by block
number, so they are addressable (denser waypoints, explicit per-block sample points, or clamping the
search to the configured chain) — which is a ticket-05/06 decision, not one made here.

---

## Unknown / could not confirm

1. **Whether Te Huia physically uses block 321.** The conclusion that it does not rests on the
   placemark names (`Quay Park Triangle East:West` = the chord to Britomart) plus 300↔322 polygon
   adjacency. No signalling diagram or AT track plan was consulted — this is a geometry-and-naming
   inference, not a primary-source fact about the railway.
2. **There is no `Quay Park Triangle South:East` block.** Only South:West (320) and East:West (321)
   exist. Whether the board simply has no LED for the Parnell↔Eastern chord, or whether that
   movement is meant to be covered by 300 or 319, is unresolved. It does not affect Te Huia.
3. **Which end of block 300 The Strand's platform is at.** 300 is a ~540 m strip; the centroid is
   used above as the dwell point, but nothing in the KML marks the platform (no description, no
   `stop_ids`). Relevant because Te Huia dwells there.
4. **The correct Te Huia route id** (hence what to append to 300's allow-list, and whether it is
   substring-safe against `E-W-201` / `O-W-201` / `S-C-201`). Ticket 01 territory.
5. **Whether the chain should differ by direction.** The alt LEDs (161, 169, 189, 206) are *not*
   direction-specific, so a single ordered list is sufficient as far as the block model is concerned;
   whether the spec wants two lists anyway is a design call.
6. **Board revision 100 remapping.** `config.json` remaps 304-344 by −1 and 138-208 by −1 for version
   100. That shifts most of this chain's numbers on V1.0.0 hardware, and the two ranges are applied
   independently — not checked for collisions, and not checked against the 146 placemarks.
7. **The 2nd-and-3rd-train-share-one-altBlock behaviour** (`trackBlocks.ts:872`) looks like a bug but
   was not traced through `generateLedMap` to see whether it can actually emit two updates for the
   same LED in one payload.
8. **The stale `WEST-201` / `ONE-201` allow-lists** in blocks 139 and 151 were observed, not
   investigated. Neither is on the Te Huia chain.
