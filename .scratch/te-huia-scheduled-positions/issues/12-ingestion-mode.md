# 12 — How is the Te Huia timetable ingested?

Type: grilling
Status: resolved
Blocked by: — (graduated from fog by 01)
Map: ../map.md

## Question

Ticket 01 established that AT publishes the same feed two ways, and that neither alone is sufficient:

- **GTFS v3 JSON:API** (`/gtfs/v3/routes/HUIA-404/trips` → `/trips/{id}/stoptimes`): ~31 KB for Te Huia's entire timetable, authenticated with the `Ocp-Apim-Subscription-Key` already in `.env`. But it exposes **no calendar, calendar_dates, agency or shapes resource**, so a `service_id` like `Weekday-3` cannot be resolved to actual service days — and `filter[service_id]` / `filter[date]` are silently ignored (200 with an unfiltered body).
- **Flat GTFS zip** (`https://gtfs.at.govt.nz/gtfs.zip`): 35.8 MiB, unauthenticated, same `feed_version`, and it does carry `calendar.txt` / `calendar_dates.txt`.

Decide:

- Which source(s) feed the scheduled-train pipeline.
- Whether 35.8 MiB weekly for three stop times a day is acceptable.
- `downloadStaticGTFS()` (`staticGTFS.ts:171`) buffers the body into `gtfsStatic.zip` and hands it to `AdmZip`, so it **cannot** ingest v3. Does v3 get a second ingestion mode, or do we avoid v3 entirely?
- Three downstream facts bite if we use the zip: `generateTimetable()` hardcodes `gtfsFolders = ['1','2']` (MEL's nested layout; AT's zip is flat), `staticGTFSQuery` never reads `calendar_dates.txt`, and both `updateStaticGTFS()` and `generateTimetable()` are commented out at `railNetwork.ts:184-191`. Which does this effort fix, and which does it route around?
- Refresh cadence, and behaviour when the feed is unreachable or `feed_version` changes mid-day.

## Answer

**Hybrid: the v3 API carries the timetable; the zip is pulled rarely, only for what v3 cannot express.** Decided with the repo owner, 2026-09-17.

### The split

| What | Source | Cadence |
| --- | --- | --- |
| 12 trips, 72 stop_times | `GET /gtfs/v3/routes/HUIA-404/trips` → `/gtfs/v3/trips/{id}/stoptimes` (~31 KB total) | weekly |
| `calendar` / `calendar_dates` rows for `Weekday-3`, `Thursday-2`, `Saturday-2`, `Sunday-1` | `https://gtfs.at.govt.nz/gtfs.zip` | only when `feed_version` changes |
| shapes `255-800005-c3980ac3` (NB) and `255-800006-39fea4ac` (SB) | same zip | same |

v3 exposes no `calendar`, `calendar_dates`, `agency` or `shapes` resource, and `filter[service_id]` / `filter[date]` are accepted then silently ignored — so the zip is not optional if ticket 14's "calendars follow the feed" is to hold. Deriving service days by parsing `service_id` names was rejected: it is an undocumented naming convention, and it would miss AT's own added-Friday exception on `Thursday-2`, dropping a real service from the board.

**Version detection:** `GET /gtfs/v3/versions` is cheap enough to poll on the weekly cycle; a changed `feed_version` is what triggers a zip pull. This also feeds ticket 14's staleness checks (`feed_end_date` passed, trip count ≠ 12, `feed_version` changed).

**Auth:** the existing `AKL` subscription key in `.env` already works on every v3 endpoint (verified, ticket 01) — no new AT product subscription. The zip is keyless.

### Distillation

Every fetch distills to a small Te Huia-only file under `railNetworks/AKL` — 12 trips, 72 stop_times, the matching calendar rows and the 2 shapes — and the zip and unpacked feed are then **discarded**. Runtime never touches the 127 MB `stop_times.txt`. The distilled file is small enough to read, diff and commit.

**Constraint for the implementer:** the distiller must *stream* `stop_times.txt` and `shapes.txt` line by line. The existing `parseGTFSFileSync` reads an entire file into one string, which is a 127 MB allocation to recover 72 rows.

### Relationship to the existing static pipeline

This effort **routes around** it. `generateTimetable()` serves a different purpose (compiling a firmware timetable header for MEL), is currently commented out at `railNetwork.ts:184-191`, and carries assumptions that don't fit — `gtfsFolders` hardcoded to `['1','2']` for MEL's nested layout, and `staticGTFSQuery` never reading `calendar_dates.txt`. None of that is fixed here; the new ingest reads `calendar_dates.txt` itself. Two static-GTFS paths will coexist, which is the accepted cost of not disturbing MEL.

Note `downloadStaticGTFS()` would ingest AT's flat zip unmodified (it unzips, finds no nested `google_transit.zip`, and stops) — it is the *distillation* that is new, not the download.

### Refresh and failure

Weekly, matching MEL's existing `fetchIntervalDays: 7` and the feed's own rhythm. A failed or unreachable fetch changes nothing: the last good distilled timetable keeps running and the failure is logged. Te Huia is **not** suppressed on staleness alone — ticket 14's warnings surface it instead.

### Amendment (ticket 04, 2026-09-17)

Distillation is **no longer Te Huia-only**. Ticket 04 decided the per-route `direction_id` → chain-orientation mapping is derived from the static feed rather than hand-written, so the distiller must also extract enough of the **7 AT rail routes'** trips (direction_id + stop sequence) to compute it. The distilled file stays small — it is a 7-row mapping, not the trips themselves — but the *parse* now scans more of `trips.txt` and `stop_times.txt`, which reinforces the streaming constraint above.

### Consequence recorded for ticket 10

Because the zip is being pulled anyway, the verified GTFS shape **is** available, so ticket 10 keeps its cheapest option. The owner also stated a contingent preference: if ticket 10 decides not to use the shape, fix the 9 broken segments with **hand-placed waypoints** rather than switching to chain-constrained block lookup. Ticket 10 must still answer the northbound Strand/321 terminus bug separately — waypoints do not fix it.
