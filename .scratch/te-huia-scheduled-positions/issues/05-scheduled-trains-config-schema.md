# 05 — The `scheduledTrains` config schema

Type: grilling
Status: resolved
Blocked by: 01, 02, 03
Map: ../map.md

## Question

Design the config-driven shape (map note 3) that a second network could later reuse. Decide:

- Where it lives in `RailNetworkConfig` and how it relates to the existing `GTFSStaticAPI` block.
- How a service is selected from the static feed (route id / agency / trip id pattern) and how the feed is refreshed.
- How the **ordered block chain** is expressed per direction, and whether the two directions are one list reversed or two explicit lists.
- Where colour and route key live, and how they reach `LEDRailsAPI.routeToColorId` and the KML allow-lists.
- How the **visibility window** is expressed (appear at scheduled Pukekohe time; ±1 min around The Strand) — generic rule or per-service literals.
- Where the distilled timetable file from ticket 12 lives, its format, and whether it is committed to the repo or treated as cache.
- Where the public-holiday suppression rule and the feed self-check thresholds live in the schema (see tickets 14, 15).
- What happens on a service day with no Te Huia trips.

## Answer

Decided with the repo owner, 2026-09-18. This is where every other decision on the map lands.

### Placement in `RailNetworkConfig`

A top-level optional `scheduledTrains` array, sibling to `GTFSRealtimeAPI` / `GTFSStaticAPI`, so a second service (or a second network) needs no schema change. It does **not** nest under `GTFSStaticAPI`: that block belongs to the MEL firmware-timetable path this effort routes around (ticket 12).

```ts
scheduledTrains?: Array<{
    id: string;                    // internal name, e.g. "te-huia"
    routeId: string;               // the FEED's route_id, verbatim — "HUIA-404"
    source: {
        api: string;               // GTFS v3 base — trips + stop_times, weekly
        zip: string;               // flat zip — calendars + shapes, on feed_version change
        keyHeader?: string;        // "Ocp-Apim-Subscription-Key"; key comes from .env
        fetchIntervalDays: number; // 7
        expectedTrips: number;     // 12 — staleness check (ticket 14)
    };
    timetableFile: string;         // distilled, committed alongside config.json
    blockChain: number[];          // north → south; REVERSED for the other direction
    assumedDwellSeconds: number;   // 60 — chosen, not sourced (ticket 13)
    maxSpeedKmh: number;           // 100 — Exp P line speed (ticket 16)
    conflict: { clearBlocks: number };   // 1 (ticket 04)
    noServiceFile: string;         // "noServiceDates.json" — holidays + planned closures (ticket 15)
}>;
```

### The four decisions

1. **Identity is the feed's `route_id`, `HUIA-404`, verbatim** — no alias, no mapping table. The colours map, the KML allow-list on block 300 and the LED payload all say what the feed says, so one grep finds everything that cares if AT ever changes it.
2. **One block chain, north → south, reversed for the opposite direction.** Ticket 03 found both directions traverse the same 62 blocks; the only asymmetry was the northbound terminus bug, which chain-constrained assignment (ticket 10) has since fixed. One list means the directions cannot silently drift apart.
3. **The distilled timetable is committed** under `railNetworks/AKL/`, so a fresh clone works with no network and every timetable change lands as a reviewable diff.
4. **Colour lives in the existing `LEDRailsAPI.colors` map**, keyed `"HUIA-404"`, beside the AT routes — so `routeToColorId` needs no special case. **Visibility is not configured at all**: ticket 13 made the Strand window a consequence of the terminus dwell and ticket 06 made its end positional, so it has no free parameters left.

Adding a colour key is safe for boards in the field: `output.colors` carries the whole table in every payload, so a board learns the new id the moment it polls. Note `colorId` is assigned sequentially from 0 in config key order (a firmware limitation), so **append** the Te Huia entry rather than inserting it, or every existing colour id shifts.

### The chain

```json
[300, 322, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337,
 338, 339, 340, 341, 159, 160, 162, 163, 164, 165, 166, 167, 168, 170, 171, 172,
 174, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 188, 190, 191, 192,
 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 207]
```

### Also required, outside config.json

- **KML edit:** `300 - The Strand [OUT-OF-SERVICE]` → `[OUT-OF-SERVICE,HUIA-404]`. The only allow-listed block on the chain (ticket 03), and chain-constrained assignment does not bypass allow-lists (ticket 10).
- **Colour value:** Te Huia brand yellow. A starting point is `[255, 199, 0]`, but it should be **eyeballed against the real board** next to `E-W-201`'s green and `S-C-201`'s red before it is called final.

### Distilled file

Holds the 12 trips with stop times, the 4 service calendars plus exceptions, both shapes, and the per-route `direction_id` → chain-orientation mapping from ticket 04.

**Size correction:** when this was put to the owner it was described as "a few KB". That is true of the timetable, but the two shapes are 6,534 points and dominate at roughly **190 KB** of JSON. Still small enough to commit and it only changes on `feed_version`, but if that is unwelcome the natural split is to commit the timetable and cache the shapes.

### Edge case

A service day with no Te Huia trips — a Sunday pattern with one return, a suppressed public holiday, or an empty calendar — simply shows nothing. There is no "no service" state on the board; the LED is just never lit. This is the same path a `?time=` request outside the calendar takes (ticket 07).


## Amendment (ticket 15, 2026-09-18)

`suppressOnPublicHolidays: boolean` is replaced by `noServiceFile: string`, pointing at a committed
list of dates that merges public holidays and planned track closures, each with a reason. See
[ticket 15](15-public-holiday-suppression.md).
