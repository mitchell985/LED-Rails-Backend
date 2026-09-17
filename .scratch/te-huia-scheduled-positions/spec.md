# Spec — Te Huia scheduled positions on the Auckland LED board

**Status:** ready to implement. Every decision below was settled on [the wayfinder map](map.md) across 17 tickets; nothing here is an open question except what §7 explicitly lists. Where a statement is a *chosen parameter* rather than a sourced fact, it says so.

**Two deliverables:**

1. A config-driven **scheduled train** pipeline that places Te Huia on the AKL board from static GTFS timetable data alone — there is no realtime feed for it.
2. A **simulated-time** setting for `/viewer`, so the result can be tested at any instant of any service day.

---

## 1. Context: the pipeline as it stands

```
GTFS-realtime  →  network.update()  →  updateTrackedTrains()  →  assignBlocksToTrains()
                                                              →  updateAltBlocks()
                                                              →  generateLedMap()  →  /akl-ltm/110.json  →  PCB
```

Everything downstream of `TrainInfo` is reused unchanged. A scheduled train is **a synthetic vehicle**: its position is computed per tick and injected as a `TrainInfo` alongside real ones, so block assignment, display thresholds, `map.html` and the LED payload all work without modification. See [`CONTEXT.md`](../../CONTEXT.md) for the glossary (*scheduled train*, *block chain*, *simulated time*).

The existing static-GTFS code (`staticGTFS.ts:generateTimetable`, `gtfsTimetable.ts:TripSimulator`) serves a **different** purpose — compiling a firmware timetable header for MEL — is currently commented out at `railNetwork.ts:184-191`, and is **routed around**, not extended. Two static-GTFS paths will coexist. That is deliberate.

---

## 2. Deliverable 1 — the scheduled-train pipeline

### 2.1 Config

New top-level optional key in `RailNetworkConfig`, sibling to `GTFSRealtimeAPI` (**not** nested under `GTFSStaticAPI`, which belongs to the MEL path):

```ts
scheduledTrains?: Array<{
    id: string;                     // "te-huia"
    routeId: string;                // "HUIA-404" — the FEED's route_id, verbatim
    source: {
        api: string;                // "https://api.at.govt.nz/gtfs/v3"
        zip: string;                // "https://gtfs.at.govt.nz/gtfs.zip"
        keyHeader?: string;         // "Ocp-Apim-Subscription-Key"; key from .env (AKL=)
        fetchIntervalDays: number;  // 7
        expectedTrips: number;      // 12 — staleness check
    };
    timetableFile: string;          // "teHuia.timetable.json" — distilled, committed
    noServiceFile: string;          // "noServiceDates.json"   — holidays + closures
    blockChain: number[];           // north → south; REVERSED for the other direction
    assumedDwellSeconds: number;    // 60 — CHOSEN, not sourced
    maxSpeedKmh: number;            // 100 — KiwiRail Exp P line speed
    conflict: { clearBlocks: number };  // 1
}>;
```

**Identity is `HUIA-404` everywhere** — the colours map, the KML allow-list and the LED payload. No alias, no mapping table.

**The block chain** (62 blocks, north → south; reverse it for southbound):

```json
[300, 322, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337,
 338, 339, 340, 341, 159, 160, 162, 163, 164, 165, 166, 167, 168, 170, 171, 172,
 174, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 188, 190, 191, 192,
 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 207]
```

Two members are non-obvious and correct: **`172 Wiri Depot Platform`** is on the running line (171 and 174 do not touch), and the Quay Park end uses **only `322`** — never the `320`/`321` triangle chords. `158` is *not* on the chain.

**Colour:** add `"HUIA-404": [255, 199, 0]` to `LEDRailsAPI.colors`. **Append it** — `colorId` is assigned sequentially from 0 in config key order (`railNetwork.ts:151`, a firmware limitation), so inserting it above existing entries renumbers every other colour. Adding a colour is otherwise safe for boards in the field: `output.colors` carries the whole table in every payload. *The exact yellow is still to be confirmed against the real board (§7).*

**KML:** `300 - The Strand [OUT-OF-SERVICE]` → `300 - The Strand [OUT-OF-SERVICE,HUIA-404]`. It is the only allow-listed block on the chain, and chain-constrained assignment does **not** bypass allow-lists.

### 2.2 Ingestion

Hybrid, because neither AT source is sufficient alone:

| What | Source | When |
| --- | --- | --- |
| 12 trips + 72 stop_times (~31 KB) | `GET {api}/routes/HUIA-404/trips` → `{api}/trips/{id}/stoptimes` | weekly |
| `calendar` + `calendar_dates` for `Weekday-3`, `Thursday-2`, `Saturday-2`, `Sunday-1` | the flat zip | on `feed_version` change |
| shapes `255-800005-c3980ac3` (NB, 4,108 pts), `255-800006-39fea4ac` (SB, 2,426 pts) | the flat zip | on `feed_version` change |
| `direction_id` + stop sequence for the **7 AT rail routes** | the flat zip | on `feed_version` change |

- v3 exposes **no** `calendar`, `calendar_dates`, `agency` or `shapes` resource, and `filter[service_id]` / `filter[date]` are accepted then **silently ignored** (200 with an unfiltered body). Do not trust them.
- Version detection: poll `GET {api}/versions` on the weekly cycle; a changed `feed_version` triggers the zip pull.
- Auth: the existing `AKL` key in `.env` works on every v3 endpoint. The zip is keyless.
- `downloadStaticGTFS()` **cannot** ingest v3 (it buffers into `AdmZip` and throws on JSON). It *can* fetch the flat zip unmodified.
- A failed or unreachable fetch changes nothing: the last good distilled file keeps running, and the failure is logged.

**Distillation** — every fetch writes the small committed file and **discards** the zip and unpacked feed. The distiller must **stream** `stop_times.txt` and `shapes.txt` line by line; `parseGTFSFileSync` reads whole files into one string, which is a 127 MB allocation to recover 72 rows.

### 2.3 Distilled file — `railNetworks/AKL/teHuia.timetable.json`

Committed (~190 KB, dominated by the two shapes), so a fresh clone works offline and timetable changes land as reviewable diffs. Contents:

- `feedVersion`, `generatedAt`
- the 12 trips: `tripId`, `serviceId`, `directionId`, and stop times against stop ids
  The Strand `9241-76884964` (both directions) · Puhinui `9216-200a650e` NB / `9217-28451e3b` SB · Pukekohe `9233-0f5634a3` NB / `9235-c5795c6a` SB
- the 4 service calendars plus their `calendar_dates` exceptions
- both shapes, as points with `shape_dist_traveled`
- the per-route `direction_id` → chain-orientation map for the 7 AT rail routes
- a precomputed **shape-point → chain-block-index** array (see §2.6)

### 2.4 Which days it runs

1. Resolve the service day for the instant in **`Pacific/Auckland`** (the feed's own agency timezone), so NZDT comes from the zone rather than a fixed offset. GTFS times past `24:00:00` mean an instant must be tested against service day *D* **and** *D-1*.
2. Take trips whose `service_id` is active that day per `calendar` + `calendar_dates`.
3. **Then apply `noServiceDates.json`, which overrides the feed.** The feed schedules a Sunday-pattern Te Huia on Christmas Day; the operator says it does not run on public holidays.

`railNetworks/AKL/noServiceDates.json` merges public holidays and planned track closures — they are the same thing to the board:

```json
{ "validThrough": "2027-12-31",
  "dates": [ { "date": "2026-12-28", "reason": "Boxing Day (observed)" },
             { "date": "2026-07-11", "reason": "Track maintenance — Matariki weekend" } ] }
```

Scope: the eleven national public holidays **plus Auckland Anniversary**, and **both the actual and the observed day** when Mondayised (Boxing Day 2026 falls on a Saturday, observed Monday 28 December — both are suppressed). A table, not computed rules, because **Matariki is legislated rather than computable**.

**When the table expires: fail open** — show the train, warn once `validThrough` is within 60 days and on every start past it. Suppressing every future date is a far worse failure than one phantom on one day.

A day with no trips simply shows nothing. There is no "no service" state on the board.

### 2.5 Where it should be — the movement model

**Times.** The feed gives one time per stop (`arrival_time == departure_time` on all 72 rows — AT encodes dwell elsewhere in the same file, so the zeroes are deliberate). Treat the published time as the **arrival**, with the dwell falling **after** it. At a trip's own origin nothing precedes departure, so the dwell precedes it there. Both termini dwell.

| | Northbound (Hamilton → The Strand) | Southbound (The Strand → Hamilton) |
| --- | --- | --- |
| The Strand | arrives 08:35, dwells to 08:36 | stands from 09:39, departs 09:40 |
| Puhinui | arrives 08:01, departs 08:02 | arrives 10:10, departs 10:11 |
| Pukekohe | arrives 07:27, departs 07:28 | arrives 10:47, departs 10:48 |

**Position.** Distance-proportional along the **GTFS shape** between the two bounding scheduled times: elapsed fraction of the interval → same fraction of `shape_dist_traveled`. Validated by prototype: it holds up over both long legs and needs no intermediate timing anchors. Leg distances come from the shape (~51.9 km), **not** from block centroids (50.83 km) — the centroid polyline cuts every curve.

**Speed cap: 100 km/h** (KiwiRail LNI L1.1 §1.20.5, class Exp P, uniform across all 62 blocks; the DLP passenger locomotive agrees). This is a **safety rail, not part of the model** — all 48 timetabled legs average 36.3–61.4 km/h, and distance-proportional interpolation makes 61.4 the unperturbed ceiling, so the cap binds only if the run-early clamp exceeds 1.63× schedule pace.

**Dwell and visibility are positional, not clock-based.** This is the defect the prototype caught: with time-based tests, a train held 22 km short of Puhinui teleported onto the platform — straight through the train blocking it — the moment its scheduled dwell came round.

- **Dwelling** ⟺ the clock is inside the dwell window **and** the train is in that station's block.
- **Visibility starts** on the clock: northbound at the scheduled Pukekohe arrival; southbound one minute before the scheduled Strand departure (this minute *is* the terminus dwell, not a separate rule).
- **Visibility ends on arrival**, not on the clock: when the train departs the last on-board block — after its dwell there. A delayed run finishes its journey instead of blinking out mid-chain.

### 2.6 Which block lights

**Chain-constrained.** A scheduled train resolves its block **only against its own 62 blocks**, never the whole board. Real trains keep the existing `findAndSetTrainBlock` geographic search, untouched.

This fixes two faults *by construction* that no amount of geometry could:

- `187 Papakura Sidings` is not on the chain, so it can never flicker on mid-segment. Its polygon genuinely overlaps the running-line corridor (7 m), so an accurate shape would have clipped it too — and it is a *named* block, hence searched before unnamed ones.
- `320`/`321`/`323` are not on the chain, so the northbound `ref ± 10` scan can no longer terminate Te Huia in a Britomart junction chord. `300 The Strand` is a 540 m strip whose own centroid lies inside both 300 **and** 321.

Resolve by precomputed shape-point → chain-index lookup (built at ingest, not per tick). **If a position falls outside every chain polygon, light the nearest chain block — never go dark.** A scheduled train's position is computed, not observed, so a dropout would be a bug chosen for display.

### 2.7 Conflicts — Te Huia always yields

Direction comes from **`direction_id` on both sides**: from the realtime trip descriptor for AT trains (present on 9/9 in-service trains in a live sample), and from the distilled static trip for Te Huia (`255-800005…` = 0 NB, `255-800006…` = 1 SB). Nothing is inferred from bearing or block history. Compare positions as **index along Te Huia's chain**, not geographically.

| situation | behaviour |
| --- | --- |
| Same-direction in-service train **ahead** | hold at least **one clear block** behind it; resume toward schedule when clear |
| Same-direction in-service train **closing from behind** | run **ahead of schedule** to stay a block in front |
| Either, **while dwelling** | rules suspended — it is platformed, AT traffic passes |
| **Out-of-service** train (no trip, no route, no direction) | **ignored entirely** — Te Huia passes it |
| Opposite direction | ignored — this is what `direction_id` is for |

Ignoring out-of-service trains is load-bearing: a unit stabled in `172 Wiri Depot Platform` sits on the chain and would otherwise hold Te Huia back on every run, forever.

**No limit on schedule drift** while held — the ghost can never be more wrong than the train physically in front of it. Catch-up afterwards is bounded only by the speed cap. Prototype-verified: held 90 simulated minutes behind a stopped train it sits still at one block, then re-converges without overshoot or oscillation.

A held ghost emits `b: [X, X]` — identical to any stationary real train — so the clamp needs no special handling in the LED payload.

### 2.8 Display priority

`updateAltBlocks` currently sorts trains sharing a block by `a.route.localeCompare(b.route)` with `OUT-OF-SERVICE` forced last, which means **the route key silently decides who disappears**. Replace with an explicit three-tier order:

1. real, in service — sorted among themselves by `localeCompare`, exactly as today
2. **scheduled (Te Huia)**
3. out of service

Te Huia therefore loses to every real in-service train and **outranks a stabled unit**. Tiers 1 and 3 reproduce today's behaviour exactly, so **no existing network changes**.

Te Huia **takes the alt LED** where one exists — only 4 of its 62 chain blocks have one (`162(+161)`, `170(+169)`, `188(+189)`, `207(+206)`), but two are Puhinui and Pukekohe, precisely where it dwells with conflict rules suspended — and is hidden where none exists.

Expect collisions to be **routine**: one polygon spans both tracks, so every opposite-direction AT train shares Te Huia's block for a tick or two, and in 58 of 62 blocks that means Te Huia briefly drops. That is correct under this rule, and it will be visible on the board.

---

## 3. Deliverable 2 — simulated time

### 3.1 Endpoint

`GET /akl-ltm/110.json?time=<epoch seconds>` → the board at that instant, containing **schedule-derived trains only** (deterministic and reproducible; real trains cannot be rewound).

- `timestamp` **is the simulated instant**, so each update's `t` offset stays relative to it exactly as the board expects.
- `simulated: true` is added to the payload.
- `update` keeps its configured meaning; the viewer ignores it in simulated mode.
- `b: [prev, cur]` is derived by evaluating the scheduled position at `time` and at `time - updateInterval`.
- Honoured on **any** instance — that is where testing needs to happen — with `Cache-Control: no-store`. No dev-only gate, no token. Boards never append query parameters.
- Also honoured on `/api/trackedtrains` and `/api/map`, reusing the same time-resolution code.
- Malformed `?time=` → `400` with a JSON error. An instant outside the calendar → `200` with empty `updates` (a legitimate board state, not an error).

> **Hard constraint.** `generateLedMap()` resets `api.output.updates` **in place** and returns the same object (`trackBlocks.ts:898-900`) — the object served to every real board on every poll. The simulated path **must build its own copy**. A bug here corrupts the live board for every PCB in the field, not just the caller.

### 3.2 Viewer control — the transport bar

A full-width bottom bar on `viewer.html`: date picker, slider spanning the service day, play/pause, 1×/10×/60× speed, and a LIVE↔SIMULATED pill. The bar turns amber while simulated, so the board's state is unmistakable without chrome over the board itself. Playback drives one request per simulated instant from a `requestAnimationFrame` loop — at 60× a 20 s tick is one request every 0.33 s.

`viewer.html` reads wall clock in **three places**, all of which misrender a simulated `timestamp`:

| line | what it does |
| --- | --- |
| `viewer.html:442` | decides whether a transition has happened, i.e. which of `b[0]`/`b[1]` lights |
| `viewer.html:503` | schedules the next fetch from `timestamp + update` |
| `viewer.html:517` | fetch-delay debug log |

Replace all three with a single **`nowSeconds()`** helper returning the simulated instant when the payload carries `simulated: true`, and wall clock otherwise. (The prototype instead overrides `Date.now()` globally — it works, and must not ship.)

> **Do not "fix" this:** `updateLEDsFromAPI` destructures `const [postBlock, preBlock] = update.b` (`viewer.html:414`) while the payload is `b: [pre, post]`. The local names are inverted; **the behaviour is correct**. Both sides were traced.

---

## 4. Files touched

| File | Change |
| --- | --- |
| `railNetwork.ts` | `scheduledTrains` in `RailNetworkConfig`; load + refresh the distilled timetable; inject synthetic `TrainInfo`s each tick |
| `trackBlocks.ts` | chain-constrained assignment for scheduled trains; three-tier priority in `updateAltBlocks`; **copy, don't mutate**, `api.output` on the simulated path |
| `server.ts` | `?time=` on the versioned endpoint, `/api/trackedtrains`, `/api/map`; `Cache-Control: no-store` |
| `viewer.html` | transport bar; `nowSeconds()` replacing the three wall-clock reads |
| `railNetworks/AKL/config.json` | `scheduledTrains` entry; **append** `"HUIA-404"` to `LEDRailsAPI.colors` |
| `railNetworks/AKL/trackBlocks.kml` | block 300 → `[OUT-OF-SERVICE,HUIA-404]` |
| `railNetworks/AKL/teHuia.timetable.json` | **new**, committed, generated by the distiller |
| `railNetworks/AKL/noServiceDates.json` | **new**, committed, hand-maintained |
| *new module* | ingestion + distillation + movement model (do **not** extend `staticGTFS.ts` / `gtfsTimetable.ts`) |

---

## 5. Acceptance checks

1. `?time=` at a scheduled instant lights exactly one LED on the chain, in Te Huia's colour, at the block the timetable implies.
2. Scrubbing a full southbound run shows a continuous progression `300 → … → 207` with **no dark gaps** and no LED outside the chain — in particular `187 Papakura Sidings` never lights, and northbound the run **terminates at 300, not 321**.
3. A real in-service train parked ahead holds Te Huia one clear block short indefinitely, with **no position jump** when its scheduled Puhinui dwell passes.
4. A unit stabled in block 172 does **not** hold Te Huia, and does not blank it.
5. On a date in `noServiceDates.json`, nothing lights — including 25 and 28 December 2026, where the feed schedules a service.
6. A live board request (no `?time=`) is byte-identical in shape to today's and carries no `simulated` key.
7. Two consecutive `?time=` requests for the same instant return identical payloads.

---

## 6. Open risks and to-dos

**To do before this is finished** (implementation, not decisions):

- **Compile `noServiceDates.json`** from an authoritative source. Ticket 15 fixed the rule, not the dates. Verify whether the Waikato region observes a different anniversary day and whether the operator suspends for it — if so it is one more row.
- **Confirm the yellow.** `[255, 199, 0]` is a starting point; judge it on the real board beside `E-W-201` green and `S-C-201` red. [`prototypes/viewer-time-PROTOTYPE.html`](prototypes/viewer-time-PROTOTYPE.html) shows it in place.

**Known risks, accepted:**

- **A ghost held indefinitely never leaves the board.** Because visibility ends on arrival, an in-service unit stabled on the chain could pin Te Huia's LED on overnight. A grace period was offered and declined; no backstop exists.
- **WRC's published times differ from the feed by up to ~15 minutes**, and nothing will detect it. The feed was chosen as authoritative (it is 14 months fresher); if it is wrong, the board is confidently wrong. Only the feed's self-checks (`feed_end_date`, trip count ≠ 12, `feed_version`) will fire.
- **Te Huia flickers off** whenever an opposite-direction train shares its block in the 58 chain blocks without an alt LED.
- **AT may publish realtime for Te Huia after all** — the check that found none sampled at 22:33 NZST, after the last service. A daytime sample would settle it; if one exists, §2.7's "no realtime" premise needs revisiting.

**Pre-existing issues noticed in passing, deliberately not fixed here:** `updateAltBlocks` assigns both the second *and* third train to the same `altBlock` (`trackBlocks.ts:871`); `TrainInfo.position.bearing` is typed `number` but AT sends a string when non-zero; blocks `139`/`151` carry pre-rename route ids in their allow-lists.

---

## 7. Out of scope

Realtime integration for Te Huia · schedule-derived ghosts for AT trains generally · any firmware or PCB change (the payload shape is unchanged) · scheduled services for WLG or MEL (the schema allows them; none is configured) · a hand-encoded timetable fallback · any cross-check against WRC's bot-protected site · feeding the offline firmware timetable path.

---

## 8. Sources

**Research** (primary sources, with explicit unknowns): [AT GTFS v3](research/at-gtfs-v3.md) · [Te Huia timetable & dwell](research/te-huia-timetable.md) · [board topology & block chain](research/board-topology.md) · [line speeds](research/line-speeds.md)

**Prototypes** (throwaway, not merged): [movement model](prototypes/te-huia-movement-PROTOTYPE.html) · [viewer time control](prototypes/viewer-time-PROTOTYPE.html)

**Decisions:** [the map](map.md) and its 17 [tickets](issues/), each carrying the reasoning and what was rejected.

---

## 9. Implementation notes (built 2026-09-18)

Implemented in `scheduledTrains.ts` (new), with edits to `railNetwork.ts`, `trackBlocks.ts`, `server.ts`, `viewer.html`, and AKL's `config.json`, `trackBlocks.kml` plus two new committed data files. Zero new TypeScript errors: the project reports the same 40 pre-existing strict-mode errors before and after.

### Deviations from this spec, and why

1. **`stop_times.txt` is never read.** §2.2 asked the distiller to stream the 127 MB file; it turned out v3 already supplies Te Huia's 72 stop times, so the zip is read only for `calendar`, `calendar_dates`, `trips`, `shapes`, `routes` and `stops`. Strictly better than the constraint it replaces.
2. **Shape → chain mapping is precomputed at load, not at ingest** (§2.6). The distilled file stays independent of the KML, and the cost is paid once at startup rather than per tick, which is what the constraint was protecting.
3. **`?time=` is not honoured on `/api/map`** (§3.1). `map.html` plots raw GTFS vehicle *entities*, and a scheduled train has no entity — only a `TrainInfo`. `/api/trackedtrains?time=` covers the debugging case; wiring `map.html` would mean teaching it a second data source.
4. **`/status` gained `scheduledServices` and `scheduledTrains`**, so the viewer only shows the transport bar on a board that has a scheduled service to look at.
5. **The distilled file is 193 KB**, against the 190 KB estimated.

### One defect found and fixed while building

The first cut used a single "which chain block is this?" helper that always fell back to the nearest block. That is right for *display* (§2.6, never go dark) but wrong for deciding whether a train is **on the board at all**: every Hamilton stop resolved to Pukekohe, so `boardStart` became the trip's origin and Te Huia sat lit at Pukekohe for the entire 80 km run up from Frankton. Containment and nearest-block are now separate operations — `chainIndexAt()` returns undefined off the board, `nearestChainIndex()` never does.

### Verified against §5

All seven acceptance checks pass, plus the conflict rules exercised directly:

| check | result |
| --- | --- |
| southbound run `300 → 207`, monotonic, no off-chain block | pass — 54 distinct blocks at 20 s sampling |
| northbound terminates at **300**, not 321 | pass |
| every chain block reachable | pass — at 2 s sampling all 62 appear; `327 Ōrākei` is occupied for ~10 s, which a 20 s poll cannot see (equally true of real trains) |
| held behind a stopped same-direction train | pass — stops at **328**, leaving 329 clear, and never passes it |
| opposite-direction train in the same block | pass — ignored, Te Huia runs through |
| out-of-service unit in `172 Wiri Depot Platform` | pass — ignored, Te Huia passes |
| Christmas Day and Boxing Day (observed) | pass — nothing lights, though the feed schedules a service |
| malformed / negative `?time=` | pass — `400` |
| instant outside the calendar | pass — `200`, empty `updates` |
| same instant twice | pass — identical payloads |
| live payload | pass — no `simulated` key, shape unchanged |

### Still outstanding

- **The yellow is unconfirmed.** `[255, 199, 0]` is live on the board now and can be judged in `/akl-ltm/api/viewer`.
- **`noServiceDates.json` covers 2026–2027 only**, transcribed from Employment New Zealand (fetched 2026-09-18). It expires 2027-12-31, after which the board fails open and warns. Whether Waikato observes a separate anniversary day is still unverified.
- The risks in §6 are unchanged: an indefinitely-held ghost never leaves the board; the WRC/feed 15-minute divergence is undetectable; Te Huia flickers when an opposite-direction train shares its block.
