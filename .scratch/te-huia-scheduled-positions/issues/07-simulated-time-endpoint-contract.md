# 07 — The `?time=` endpoint contract

Type: grilling
Status: resolved
Blocked by: —
Map: ../map.md

## Question

`?time=<epoch seconds>` on `/akl-ltm/110.json` returns a schedule-only board for that instant (map note 12). Decide:

- Exact parameter name, format and validation; rejection behaviour for a malformed or out-of-range value.
- Service-day resolution from an epoch: NZST/NZDT, GTFS times past 24:00:00, and which `calendar` / `calendar_dates` entry applies.
- What `timestamp` and `update` should contain in a simulated response — the simulated instant or the real one — given a real PCB polls the same URL.
- How a real board is protected from a stray `?time=`: dev-only guard, separate response headers, `development` flag, or nothing.
- Whether responses are cacheable and at what granularity (e.g. rounded to the second / to the update interval).
- Whether the same parameter should work on `/api/trackedtrains` and `/api/map` for debugging.

## Answer

Decided with the repo owner, 2026-09-17.

### The contract

`GET /akl-ltm/110.json?time=<epoch seconds>` returns the board as it would be at that instant, containing **schedule-derived trains only** (map note 12).

- **`timestamp` is the simulated instant**, so every update's `t` offset stays relative to it exactly as the board expects, and the payload is internally consistent.
- **`simulated: true`** is added to the response. Nothing downstream — viewer, logs, screenshots, a stray cache — can mistake it for live data, and the viewer keys its behaviour off the flag rather than inferring it from a wild `Date.now() - timestamp` delta.
- **`update`** keeps its configured meaning (the network's `fetchIntervalSeconds`); the viewer ignores it in simulated mode and paces itself from its own playback clock. It is not repurposed to mean "simulated seconds until the next transition".
- **`b: [prev, cur]`** transitions are derived by evaluating the scheduled position at `time` and at `time - updateInterval`, which is what the live path effectively does across two ticks.

### Availability and guard

Honoured on **any** instance, including a deployed one — that is where testing actually needs to happen. Boards never append query parameters, and the defences are that the response is explicitly marked and served with **`Cache-Control: no-store`** so no intermediary can retain it. No dev-only gate, no shared token.

### Scope

`?time=` is also honoured on **`/api/trackedtrains`** and **`/api/map`**, reusing the same time-resolution code. When a Te Huia LED looks wrong, those are how you find out why — the computed position and block, and the geographic plot — rather than debugging from LED numbers alone.

### Granularity

**One request per simulated instant.** The viewer polls as it plays; at 60× a 20s tick is one request every 0.33s, trivial for a local Bun server. This exercises the same code path production runs, so what the viewer shows is what the board will do. No bulk day payload, no second serialisation to keep in step.

### Hard implementation constraint

The simulated path must **not** mutate the shared `api.output`. `generateLedMap()` resets `api.output.updates` in place and returns the same object (`trackBlocks.ts:898-900`), which is the object served to real boards on every poll. A simulated request must build its own copy; a bug here corrupts the live board for every PCB in the field, not just the caller.

### Settled as routine detail (flagged, not grilled)

- **Parameter**: `time`, integer epoch seconds, rounded to the second. A malformed or unparseable value is a `400` with a JSON error body — silently falling back to live would be worse than failing.
- **Out of range**: an instant outside the distilled calendar's validity returns `200` with an empty `updates` array and the `simulated` marker, not an error. "No service at this time" is a legitimate board state and the viewer can say so.
- **Service day**: resolved in `Pacific/Auckland` (the agency timezone in the feed's `agency.txt`), so NZDT is handled by the zone rather than a fixed offset. GTFS times past `24:00:00` mean an instant must be tested against both service day *D* and *D-1*.
- **Per-request cost**: negligible. One scheduled train, a distilled timetable and a 62-block chain — this is why the fog item about recompute cost is now closed.
