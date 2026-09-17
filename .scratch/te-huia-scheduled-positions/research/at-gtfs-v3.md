# AT GTFS v3: does it carry Te Huia, and how would we fetch it?

Research for ticket [01](../issues/01-at-gtfs-v3-te-huia.md).

Sources are primary only: live responses from AT's own API host (`https://api.at.govt.nz`), AT's own
static GTFS zip (`https://gtfs.at.govt.nz/gtfs.zip`), the GTFS reference at `gtfs.org`, and the
repo's own code. Every API response quoted below was fetched on **2026-09-17** using the
subscription key already in `/Users/mitchell/LED-Rails-Backend/.env` as `AKL=`. Feed version at the
time of capture: `VDV_Merge_118_5_H_1_328.08584120448611919867428665414CU51`, valid `20260909`–`20261231`.

No design decisions are made here. Open items are collected under
[Unknown / could not confirm](#unknown--could-not-confirm).

> **Note on the developer portal.** `https://dev-portal.at.govt.nz` is an Azure API Management
> developer portal whose API catalogue is **not readable anonymously**: the SPA's own data call
> `GET https://dev-portal.at.govt.nz/developer/apis?$top=100&$skip=0&skipWorkspaces=true&api-version=2022-04-01-preview`
> returns `{"value":[],"nextLink":null}` without a session, and rendering `/apis` in a browser shows
> "No APIs found" (`/token` returns 401). Signing in was out of scope, so **nothing below is sourced
> from the portal's prose documentation** — it is all sourced from the live API's behaviour. Where
> that leaves a question open it is listed as unknown.

---

## 1. Te Huia is in the feed — route, agency, trips, stop_times

**Yes.** Te Huia is present as a `route_type = 2` (Rail) route operated by a separate agency.

`GET https://api.at.govt.nz/gtfs/v3/routes?filter[route_type]=2` returns exactly 8 rail routes;
one of them is Te Huia:

```json
{"type":"route","id":"HUIA-404","attributes":{
  "agency_id":"WRC","route_color":"000000","route_id":"HUIA-404",
  "route_long_name":"HUIA","route_short_name":"HUIA",
  "route_text_color":"FFFFFF","route_type":2}}
```

The other seven are AT Metro's own (`agency_id: "AM"`): `STH-201`, `E-W-201`, `EAST-201`,
`O-W-201`, `S-C-201`, `ONE-201`, `WEST-201`.

`agency_id = "WRC"` resolves, in the zip's `agency.txt`, to:

```
WRC,Waikato Regional Council,http://www.aucklandtransport.govt.nz,Pacific/Auckland,en,(09)355-3553,,
```

WRC is the only route in the entire feed under that agency (1 of 536 routes).
`routes.txt` in the zip additionally carries `contract_id = TRAIN`, a non-standard AT column that
the v3 JSON does **not** expose:

```
HUIA-404,WRC,HUIA,HUIA,,2,,000000,FFFFFF,,TRAIN
```

Source: `GET /gtfs/v3/routes`, `GET /gtfs/v3/routes?filter[route_type]=2`, `agency.txt` and
`routes.txt` inside `https://gtfs.at.govt.nz/gtfs.zip`.

### Identifier patterns

`GET https://api.at.govt.nz/gtfs/v3/routes/HUIA-404/trips` returns **12 trips** — the entire Te Huia
timetable. All 12 in full:

| dir | service_id | trip_id | shape_id | headsign |
|-----|-----------|---------|----------|----------|
| 0 | `Weekday-3` | `255-800005-21900-1-199-3e0f9879` | `255-800005-c3980ac3` | Hamilton To The Strand Auckland Via Pukekohe |
| 0 | `Saturday-2` | `255-800005-27300-1-799-f0881beb` | `255-800005-c3980ac3` | " |
| 0 | `Saturday-2` | `255-800005-32700-1-899-32d5d53a` | `255-800005-c3980ac3` | " |
| 0 | `Thursday-2` | `255-800005-34500-1-299-30b267b2` | `255-800005-c3980ac3` | " |
| 0 | `Weekday-3` | `255-800005-50700-1-399-53b7c532` | `255-800005-c3980ac3` | " |
| 0 | `Sunday-1` | `255-800005-52500-1-1199-3eee017d` | `255-800005-c3980ac3` | " |
| 1 | `Weekday-3` | `255-800006-34800-1-499-426a2e04` | `255-800006-39fea4ac` | The Strand Auckland To Hamilton Via Pukekohe |
| 1 | `Saturday-2` | `255-800006-54600-1-999-007d4775` | `255-800006-39fea4ac` | " |
| 1 | `Thursday-2` | `255-800006-56400-1-599-548a3be9` | `255-800006-39fea4ac` | " |
| 1 | `Saturday-2` | `255-800006-63600-1-1099-3e24b49c` | `255-800006-39fea4ac` | " |
| 1 | `Weekday-3` | `255-800006-63600-1-699-fdd28938` | `255-800006-39fea4ac` | " |
| 1 | `Sunday-1` | `255-800006-65400-1-1299-72b177b3` | `255-800006-39fea4ac` | " |

Observable patterns (all verified against the 12 rows above, not inferred from the spec):

- **`route_id`**: literal `HUIA-404`. The `-404` suffix distinguishes it from the AT Metro rail
  routes' `-201` suffix.
- **`agency_id`**: literal `WRC`.
- **`trip_id`**: `255-<pattern>-<seconds>-1-<n>-<8 hex>` where
  - `255` is constant across all 12 Te Huia trips,
  - `<pattern>` is `800005` for `direction_id = 0` (northbound, Hamilton → The Strand) and `800006`
    for `direction_id = 1` (southbound, The Strand → Hamilton),
  - `<seconds>` is the trip's first departure in seconds after midnight
    (`21900` = 06:05:00, `34800` = 09:40:00, `65400` = 18:10:00 — confirmed against `stop_times`),
  - the trailing 8 hex characters differ per trip and are not decodable here.
  - Note `255-800006-63600-...` occurs twice (Weekday-3 and Saturday-2) — the `<seconds>` prefix is
    not unique on its own.
- **`shape_id`**: exactly two, `255-800005-c3980ac3` (NB) and `255-800006-39fea4ac` (SB). Same
  `255-<pattern>` stem as the trips.
- **`service_id`**: `Weekday-3`, `Saturday-2`, `Sunday-1`, `Thursday-2` — these are **generic
  network-wide service ids, not Te Huia-specific**, and are shared with AT bus/rail trips.

`direction_id = 0` is northbound (towards Auckland) and `1` is southbound, confirmed by the
headsigns and by the stop sequences in §5.

### The 59000–59999 entity ID filter

Confirmed relevant, and confirmed to be a realtime-only concern:

`railNetworks/AKL/config.json` sets `trainFilter.entityID = {start: "59000", end: "59999"}`. A
sample of `GET https://api.at.govt.nz/realtime/legacy` taken at 2026-09-17 10:33 UTC returned 2117
entities, of which 1033 had purely numeric ids and **70 fell in 59000–59999**. In that same sample,
**zero entities referenced `HUIA-404` or any `255-8000…` trip_id**.

Caveat: 10:33 UTC is 22:33 NZST, by which time the last Te Huia service of the day has already
arrived in Hamilton (20:40 — see §5), so this single sample **cannot distinguish "AT publishes no
realtime for Te Huia" from "Te Huia wasn't running"**. See
[Unknown / could not confirm](#unknown--could-not-confirm).

---

## 2. Transport shape: JSON REST *and* a separate unauthenticated zip

### 2a. v3 is a JSON:API REST API, not a zip

`https://api.at.govt.nz/gtfs/v3/...` returns `Content-Type: application/vnd.api+json` with a
JSON:API envelope: `{"data":[{"type":"<resource>","id":"<id>","attributes":{...}}]}`. Errors use the
JSON:API error shape, e.g. `{"errors":[{"title":"Resource Not Found","status":"404","source":{"parameter":"id"},"code":"not-found"}]}`.

**There is no zip endpoint under `/gtfs/v3`.** `/gtfs/v3/download` and `/gtfs/v2/gtfs.zip` both
return `{"statusCode":404,"message":"Resource not found"}`.

Endpoint surface, established by probing (200 = exists, 404 = no such APIM operation). Sizes and
times are from single measurements on 2026-09-17:

| Path | Status | Bytes | Time | Notes |
|------|--------|-------|------|-------|
| `GET /gtfs/v3/versions` | 200 | 281 | 0.15 s | one `feed_info` object |
| `GET /gtfs/v3/routes` | 200 | 84,021 | 0.40 s | 536 routes, **entire list in one response** |
| `GET /gtfs/v3/routes?filter[route_type]=2` | 200 | 1,624 | 0.15 s | 8 rail routes |
| `GET /gtfs/v3/routes/{route_id}` | 200 | 214 | — | single route |
| `GET /gtfs/v3/routes/{route_id}/trips` | 200 | 3,837 | 0.24 s | 12 trips for `HUIA-404` |
| `GET /gtfs/v3/trips/{trip_id}` | 200 | 327 | — | single trip |
| `GET /gtfs/v3/trips/{trip_id}/stoptimes` | 200 | 2,299 | 0.15 s | 6 stoptimes for a Te Huia trip |
| `GET /gtfs/v3/stops` | 200 | 1,511,190 | 2.75 s | **all stops, one response** |
| `GET /gtfs/v3/stops/{stop_id}` | 200 | 285 | — | single stop |
| `GET /gtfs/v3/stops?filter[stop_code]=9241` | 200 | 285 | — | filter works |

Returning 404 (i.e. **do not exist**, checked with a valid key):
`/gtfs/v3`, `/gtfs/v3/trips`, `/gtfs/v3/stoptimes`, `/gtfs/v3/shapes`, `/gtfs/v3/shapes/{shape_id}`,
`/gtfs/v3/agency`, `/gtfs/v3/agencies`, `/gtfs/v3/calendar`, `/gtfs/v3/calendars`,
`/gtfs/v3/calendarDates`, `/gtfs/v3/calendar_dates`, `/gtfs/v3/services`, `/gtfs/v3/servicecalendars`,
`/gtfs/v3/feedinfo`, `/gtfs/v3/transfers`, `/gtfs/v3/frequencies`, `/gtfs/v3/blocks`,
`/gtfs/v3/levels`, `/gtfs/v3/routes/{id}/stops`, `/gtfs/v3/routes/{id}/stoptimes`,
`/gtfs/v3/trips/{id}/shape`, `/gtfs/v3/trips/{id}/route`, `/gtfs/v3/stops/{id}/trips`,
`/gtfs/v3/stops/{id}/stoptimes`, `/gtfs/v3/stops/{id}/routes`.

Paths like `/gtfs/v3/routes/search` and `/gtfs/v3/routes/geosearch` are **not** operations — they
match the `{id}` template and return the JSON:API `not-found` body with `"source":{"parameter":"id"}`.

**Consequences for what v3 alone can answer.** There is no `calendar` / `calendar_dates` /
`agency` / `shapes` resource. A trip's `service_id` (`Weekday-3` etc.) is returned but **cannot be
resolved to service days through the v3 API**. That information exists only in the zip.

### 2b. AT also publishes an unauthenticated flat GTFS zip

`https://gtfs.at.govt.nz/gtfs.zip` — **no key required**. Response headers on 2026-09-17:

```
HTTP/2 200
content-type: application/x-zip-compressed
content-length: 35846846
last-modified: Wed, 16 Sep 2026 12:49:05 GMT
etag: 0x8DF13F0E460EE2D
x-ms-version: 2009-09-19
```

It is a **flat** archive (13 files at the root, no per-agency subfolders, no nested
`google_transit.zip`):

| file | bytes |
|------|-------|
| `feed_info.txt` | 227 |
| `agency.txt` | 1,677 |
| `calendar.txt` | 5,633 |
| `calendar_dates.txt` | 17,857 |
| `routes.txt` | 7,174 |
| `trips.txt` | 5,781,088 |
| `fare_attributes.txt` | 81 |
| `fare_rules.txt` | 54 |
| `frequencies.txt` | 53 |
| `shapes.txt` | 32,984,800 |
| `stops.txt` | 607,003 |
| `transfers.txt` | 379 |
| `stop_times.txt` | 127,506,277 |

**35.8 MiB compressed, ~159 MiB uncompressed**; 1,502,756 `stop_times` rows and 728 distinct shapes.

The zip and the v3 API are **the same feed release**: `feed_info.txt` and `GET /gtfs/v3/versions`
both report `feed_version = VDV_Merge_118_5_H_1_328.08584120448611919867428665414CU51`,
`feed_start_date = 20260909`, `feed_end_date = 20261231`, and the Te Huia `stop_times` rows are
byte-for-byte equivalent between the two.

---

## 3. Auth: one subscription key, same value as realtime

- **Header name:** `Ocp-Apim-Subscription-Key`. This is stated by the API itself — an unauthenticated
  `GET https://api.at.govt.nz/gtfs/v3/routes` returns
  `401 Access Denied` with
  `WWW-Authenticate: AzureApiManagementKey realm="https://api.at.govt.nz/gtfs",name="Ocp-Apim-Subscription-Key",type="header"`.
- **Same key as realtime:** the key already in `.env` as `AKL=` — the one
  `railNetworks/AKL/config.json` uses for `https://api.at.govt.nz/realtime/legacy` — returns
  **HTTP 200** on every `/gtfs/v3/*` endpoint listed in §2a. The same key also returned HTTP 200
  (956,374 bytes) from `/realtime/legacy` in the same session. So **no second key or second
  subscription needs to be provisioned** for this repo; the existing one already has access.
- The zip at `https://gtfs.at.govt.nz/gtfs.zip` needs **no key at all** (it is served from Azure
  Blob Storage; `curl -I` with no headers returns 200).

Caveat: this establishes that *this* key works for both. It does **not** establish whether AT sells
them as one APIM *product* or two, because the portal's product page is behind sign-in. If AT ever
splits them, the config would need two keys. Listed as unknown.

---

## 4. Rate limits, pagination, payload sizes

### Pagination — there is none

- `GET /gtfs/v3/routes` returns all 536 routes in one body. The response has **only** a `data` key:
  no `meta`, no `links`, no `next`.
- `GET /gtfs/v3/stops` returns 1.51 MB in one body.
- JSON:API pagination parameters are **silently ignored**: `?page[limit]=5` on `/gtfs/v3/routes`
  returns the identical 84,021-byte full body.

### Filtering — partial, and silently ignored when unsupported

| query | effect |
|-------|--------|
| `/gtfs/v3/routes?filter[route_type]=2` | **works** — 1,624 bytes, 8 routes |
| `/gtfs/v3/stops?filter[stop_code]=9241` | **works** — 285 bytes, 1 stop |
| `/gtfs/v3/routes?filter[agency_id]=WRC` | **ignored** — returns all 536 routes (84,021 bytes) |
| `/gtfs/v3/routes?route_type=2` (no `filter[]`) | **ignored** — all 536 |
| `/gtfs/v3/routes/HUIA-404/trips?filter[service_id]=Weekday-3` | **ignored** — all 12 trips |
| `/gtfs/v3/routes/HUIA-404/trips?filter[date]=2026-09-18` / `?date=...` | **ignored** — all 12 trips |

Unsupported filters return 200 with the unfiltered body rather than an error, so a client cannot
detect the difference except by counting rows.

### Payload sizes for the resources this project needs

Te Huia's entire timetable costs **two requests and ~6 KB**:
`/gtfs/v3/routes/HUIA-404/trips` (3,837 B) + one `/gtfs/v3/trips/{id}/stoptimes` per trip
(2,299 B each × 12 ≈ 27.6 KB), or ~31 KB for all 12 trips. Add `/gtfs/v3/routes/HUIA-404` (214 B).
Stops can be fetched individually (285 B each × 9 = ~2.6 KB) rather than pulling the 1.51 MB
`/gtfs/v3/stops`.

Comparable via the zip: 35.8 MiB download, ~159 MiB on disk, of which Te Huia is 12 trip rows,
12 × 6 = 72 `stop_times` rows, 2 shapes (4,109 + 2,427 points), 9 stop rows and 4 calendar rows.

For reference, trip counts per rail route via `/gtfs/v3/routes/{id}/trips`:
`E-W-201` 388, `S-C-201` 341, `STH-201` 271, `WEST-201` 264, `EAST-201` 259, `O-W-201` 233,
`ONE-201` 153, **`HUIA-404` 12**.

### Rate limits — no evidence found

- No `X-RateLimit-*`, `RateLimit-*` or `Retry-After` headers appear on any `/gtfs/v3` response. The
  full header set on a 200 is: `Content-Type`, `Content-Length`, `ETag`, `Strict-Transport-Security`,
  `Request-Context`, `Date`.
- 40 back-to-back `GET /gtfs/v3/versions` requests all returned 200; no 429 was observed.
- No published figure was found (the portal's docs are behind sign-in; web search turned up
  nothing first-party). **Treat "no rate limit" as unproven, not established.**

Responses carry a **weak `ETag`** (`W/"64-..."`), so conditional GETs are likely supported —
untested, see unknowns.

---

## 5. Auckland stops, and whether arrival ≠ departure

### The stops (resolved via `GET /gtfs/v3/stops/{stop_id}`)

Te Huia calls at **6 stops per trip**, and Auckland-region stops are **platform-specific and differ
by direction**:

| stop_id | stop_code | stop_name | platform | parent_station | lat | lon |
|---------|-----------|-----------|----------|----------------|-----|-----|
| `9241-76884964` | 9241 | The Strand Train Station 1 | 1 | `135-b78afdd1` | -36.84853 | 174.77934 |
| `9216-200a650e` | 9216 | Puhinui Train Station 1 | 1 | `108-5ab242b5` | -36.98975 | 174.85608 |
| `9217-28451e3b` | 9217 | Puhinui Train Station 2 | 2 | `108-5ab242b5` | -36.98973 | 174.85614 |
| `9233-0f5634a3` | 9233 | Pukekohe Train Station 2 | 2 | `134-b31c4580` | -37.20331 | 174.91015 |
| `9235-c5795c6a` | 9235 | Pukekohe Train Station 4 | 4 | `134-b31c4580` | -37.20351 | 174.91064 |
| `9031-740bc002` | 9031 | Huntly Train Station 1 | 1 | `143-7bbaa65d` | -37.55787 | 175.15971 |
| `9021-9fccfa2b` | 9021 | Hamilton Rotokauri Train Station 1 | 1 | `142-1587ee51` | -37.74902 | 175.23005 |
| `9022-94c9d774` | 9022 | Hamilton Rotokauri Train Station 2 | 2 | `142-1587ee51` | -37.74906 | 175.23024 |
| `9011-cf8cc006` | 9011 | Hamilton Frankton Train Station 1 | 1 | `141-e3c20ef1` | -37.79121 | 175.26538 |

Direction mapping:

- **Northbound (`direction_id = 0`)**: Hamilton Frankton `9011` → Rotokauri **P1** `9021` → Huntly
  `9031` → Pukekohe **P2** `9233` → Puhinui **P1** `9216` → The Strand **P1** `9241`.
- **Southbound (`direction_id = 1`)**: The Strand **P1** `9241` → Puhinui **P2** `9217` → Pukekohe
  **P4** `9235` → Huntly `9031` → Rotokauri **P2** `9022` → Hamilton Frankton `9011`.

So The Strand and Huntly use one stop_id in both directions; **Puhinui, Pukekohe and Rotokauri use
different platform stop_ids per direction**. All three Auckland stations expose a `parent_station`.

There are **no intermediate Auckland stops** — nothing between The Strand and Puhinui, or Puhinui
and Pukekohe, appears in `stop_times`. This matches map note 5 ("Stops only at The Strand, Puhinui
and Pukekohe"), and it means the feed supplies **three timing points inside the Auckland board**
per trip (two of which, Pukekohe and Puhinui, bracket a 34-minute leg).

### Arrival vs departure: identical at every stop

**No.** `arrival_time == departure_time` for **all 72** Te Huia `stop_times` rows, in both the v3
API and the zip. Full northbound example (`255-800005-21900-1-199-3e0f9879`, `/gtfs/v3/trips/{id}/stoptimes`):

| seq | stop_id | arrival | departure | shape_dist_traveled | pickup_type | drop_off_type | timepoint |
|-----|---------|---------|-----------|---------------------|-------------|---------------|-----------|
| 1 | `9011-cf8cc006` | 06:05:00 | 06:05:00 | 0 | 0 | 0 | 0 |
| 2 | `9021-9fccfa2b` | 06:15:00 | 06:15:00 | 5.709 | 0 | 0 | 0 |
| 3 | `9031-740bc002` | 06:39:00 | 06:39:00 | 32.291 | 0 | 0 | 0 |
| 4 | `9233-0f5634a3` | 07:27:00 | 07:27:00 | 87.036 | **1** | 0 | 0 |
| 5 | `9216-200a650e` | 08:01:00 | 08:01:00 | 117.286 | **1** | 0 | 0 |
| 6 | `9241-76884964` | 08:35:00 | 08:35:00 | 139.094 | **1** | 0 | 0 |

Southbound (`255-800006-34800-1-499-426a2e04`) mirrors it, with `drop_off_type = 1` at Puhinui and
Pukekohe and `pickup_type = 1` at Hamilton Frankton. Per the GTFS reference, `pickup_type = 1` is
"No pickup available" and `drop_off_type = 1` is "No drop off available" — i.e. northbound trains
set down only in Auckland, southbound trains pick up only in Auckland.

`shape_dist_traveled` is present and in **kilometres** (139.094 for the full 139 km Hamilton→Auckland
run), so it is directly usable as a fraction-along-trip.

`timepoint = 0` on every Te Huia row. Per the GTFS reference, `0` means "Times are considered
approximate"; `1` means "Times are considered exact". This is not Te Huia-specific sloppiness but it
is not universal either — across the whole AT feed, 1,476,140 rows have `timepoint = 0` and 26,616
have `timepoint = 1`.

**Implication for interpolation:** there is no dwell time anywhere in the feed. The scheduled dwell
at The Strand, Puhinui and Pukekohe (map notes 9 and 11) cannot be read from GTFS — it is zero by
construction in this data.

### Service days

`service_id` values and their `calendar.txt` rows (zip only — v3 exposes no calendar resource):

```
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
Weekday-3,1,1,1,1,1,0,0,20260909,20261231
Saturday-2,0,0,0,0,0,1,0,20260909,20261231
Sunday-1,0,0,0,0,0,0,1,20260909,20261231
Thursday-2,0,0,0,1,0,0,0,20260909,20261231
```

`Thursday-2` runs **in addition to** `Weekday-3` on Thursdays, so Thursday gets an extra pair of
Te Huia services. `calendar_dates.txt` has 21 rows touching these four services, e.g.
`Weekday-3,20261026,2` (removed — Labour Day), `Weekday-3,20261225,2`, `Weekday-3,20261228,2`,
matching `Sunday-1,20261026,1` / `Sunday-1,20261225,1` / `Sunday-1,20261228,1` (added), plus
`Thursday-2,<every Thursday>,1` (added, 15 rows).

### Full Te Huia timetable (from the feed, arrival times)

Northbound (`direction_id = 0`, Hamilton → The Strand):

| service | Hamilton Frankton | Rotokauri P1 | Huntly | Pukekohe P2 | Puhinui P1 | The Strand P1 |
|---------|------|------|------|------|------|------|
| Weekday-3 | 06:05 | 06:15 | 06:39 | 07:27 | 08:01 | **08:35** |
| Saturday-2 | 07:35 | 07:45 | 08:09 | 08:57 | 09:31 | **10:00** |
| Saturday-2 | 09:05 | 09:15 | 09:39 | 10:27 | 11:01 | **11:30** |
| Thursday-2 | 09:35 | 09:45 | 10:09 | 10:57 | 11:31 | **12:00** |
| Weekday-3 | 14:05 | 14:15 | 14:39 | 15:27 | 16:01 | **16:35** |
| Sunday-1 | 14:35 | 14:45 | 15:09 | 15:57 | 16:31 | **17:05** |

Southbound (`direction_id = 1`, The Strand → Hamilton):

| service | The Strand P1 | Puhinui P2 | Pukekohe P4 | Huntly | Rotokauri P2 | Hamilton Frankton |
|---------|------|------|------|------|------|------|
| Weekday-3 | **09:40** | 10:10 | 10:47 | 11:36 | 12:02 | 12:10 |
| Saturday-2 | **15:10** | 15:40 | 16:17 | 17:06 | 17:32 | 17:40 |
| Thursday-2 | **15:40** | 16:10 | 16:47 | 17:36 | 18:02 | 18:10 |
| Saturday-2 | **17:40** | 18:10 | 18:47 | 19:36 | 20:02 | 20:10 |
| Weekday-3 | **17:40** | 18:10 | 18:47 | 19:36 | 20:02 | 20:10 |
| Sunday-1 | **18:10** | 18:40 | 19:17 | 20:06 | 20:32 | 20:40 |

No time exceeds 24:00:00, so the "GTFS times past 24:00:00" concern noted in the map does not arise
for Te Huia in this feed release.

---

## 6. Can the existing zip ingestion path be pointed at AT v3?

Reading `staticGTFS.ts` (`downloadStaticGTFS`, line 171), `railNetwork.ts`
(`RailNetworkConfig.GTFSStaticAPI` lines 38–43, `updateStaticGTFS` lines 197–208) and
`gtfsTimetable.ts` (`staticGTFSQuery`, line 71):

**Plainly: `downloadStaticGTFS` cannot be pointed at the v3 REST API.** It does
`fetch(url)` → `response.arrayBuffer()` → write to `cache/<id>/gtfsStatic.zip` →
`unzipArchive(...)`. Given a JSON:API response it would write JSON bytes to a `.zip` and
`AdmZip` would throw; the function catches, logs and returns `false`. Consuming v3 therefore
requires **a second ingestion mode** — a JSON fetcher that walks
`/routes/{id}/trips` → `/trips/{id}/stoptimes` → `/stops/{id}` and materialises the result. Nothing
in `GTFSStaticAPI`'s current shape (`{ url, keyHeader, key, fetchIntervalDays }`) distinguishes the
two modes.

**But `downloadStaticGTFS` *can* be pointed, unmodified, at `https://gtfs.at.govt.nz/gtfs.zip`.**
Adding `GTFSStaticAPI: { url: "https://gtfs.at.govt.nz/gtfs.zip", fetchIntervalDays: N }` to
`railNetworks/AKL/config.json` would download and unzip it as-is: the URL returns a real zip, and
`keyHeader`/`key` are already optional (the AT blob needs neither). AKL currently has **no**
`GTFSStaticAPI` block at all; MEL has one (`opendata.transport.vic.gov.au/.../gtfs.zip`, 7 days);
WLG has none.

Four caveats about the downstream path, all factual, none of them a decision:

1. **`generateTimetable()` hardcodes `const gtfsFolders = ['1', '2']`** (`staticGTFS.ts`) and
   resolves `cache/<id>/gtfsStatic/1` and `/2`. That matches the Victorian (MEL) archive's nested
   layout — `downloadStaticGTFS` explicitly handles an outer zip containing folders each holding a
   `google_transit.zip`. **AT's zip is flat**, so its `.txt` files land directly in
   `cache/AKL/gtfsStatic/` and `gtfsFolders = ['1','2']` would resolve to nonexistent directories.
   The nested-unzip loop in `downloadStaticGTFS` is a no-op on a flat archive (it iterates
   `fs.readdirSync(unzipPath)` and skips non-directories), so the download itself is fine; only the
   folder assumption in `generateTimetable` is wrong for AT.
2. **`staticGTFSQuery` reads `calendar.txt` but never `calendar_dates.txt`** (lines 119, 149, 170,
   196, 220, 271 read `calendar.txt`, `trips.txt`, `stop_times.txt`, `shapes.txt`, `stops.txt`
   only). The 21 Te Huia-relevant `calendar_dates` exceptions in §5 would be invisible to it.
3. **Both `updateStaticGTFS()` and `generateTimetable(this)` are currently commented out** in
   `railNetwork.ts` (lines 184–191), so the static path is dormant, not merely unconfigured.
4. **Scale:** 35.8 MiB download / ~159 MiB unpacked, of which Te Huia needs ~30 KB. `parseGTFSFileSync`
   reads whole files into memory with `fs.readFileSync(filePath, 'utf8')`, so `stop_times.txt`
   (127.5 MB) and `shapes.txt` (33 MB) would be fully materialised as strings; `parseStopTimesForTripsSync`
   exists precisely to avoid that for `stop_times`. The v3 REST path fetches the same Te Huia data
   in ~31 KB total.

---

## Unknown / could not confirm

1. **The portal's own prose documentation.** `dev-portal.at.govt.nz` requires sign-in to list APIs
   (`/developer/apis?...` returns `{"value":[]}` anonymously; `/token` returns 401). No AT-authored
   description of "General Transit Feed V3 APIs - v3", no OpenAPI document, and no operation list
   was obtained. Everything in §2a is derived from probing the live API, so the endpoint list may be
   **incomplete** — a path I did not guess would look identical to one that does not exist.
2. **Published rate limits.** None found, none advertised in headers, and 40 rapid requests did not
   trip one. Whether a quota exists (daily cap, burst limit, per-product throttle) is unknown.
3. **Whether GTFS v3 and `realtime/legacy` are the same APIM *product*.** Confirmed only that the
   one key in `.env` works for both. Whether AT could later require separate subscriptions is
   unknown without portal access.
4. **Whether AT publishes realtime for Te Huia at all.** The `realtime/legacy` sample was taken at
   22:33 NZST when no Te Huia service was running, so its absence proves nothing. Re-check between
   06:05 and 20:40 NZST — ideally with both `/realtime/legacy` and any trip-updates feed — before
   relying on map note 8.
5. **Conditional GET / caching.** Weak `ETag`s are returned but `If-None-Match` was not tested, and
   the zip's `Last-Modified` / `ETag` behaviour under `If-Modified-Since` was not tested.
6. **How often the v3 feed rolls over.** `feed_end_date` is `20261231`; how far ahead AT publishes a
   successor release, and whether `trip_id`s / `shape_id`s are stable across releases, is unknown.
   The hash suffixes in `255-800005-21900-1-199-3e0f9879` suggest they may not be.
7. **Which `filter[...]` keys the API actually supports.** Only `filter[route_type]` (routes) and
   `filter[stop_code]` (stops) were confirmed working; `filter[agency_id]`, `filter[service_id]`,
   `filter[date]` are silently ignored. There is no discoverable list.
8. **Any `/gtfs/v2` or non-`/v3` variant.** Not surveyed beyond confirming `/gtfs/v2/gtfs.zip` 404s.
9. **A first-party citation for `https://gtfs.at.govt.nz/gtfs.zip`.** The URL works and serves AT's
   own feed (`feed_publisher_name = Auckland Transport`, matching `feed_version`), but no AT page
   documenting it as the supported static endpoint was located; `at.govt.nz/about-us/at-data-sources`
   fetched as a navigation shell with no data-source content. Treat the URL as verified-by-behaviour,
   not verified-as-supported.
10. **Te Huia dwell times.** Zero in the feed (arrival == departure everywhere). AT/WRC's published
    timetable may show separate arrive/depart at The Strand, Puhinui and Pukekohe; that was not
    checked against a WRC primary source.

---

## Source list

- `https://api.at.govt.nz/gtfs/v3/routes`, `/routes?filter[route_type]=2`, `/routes/HUIA-404`,
  `/routes/HUIA-404/trips`, `/trips/{trip_id}`, `/trips/{trip_id}/stoptimes`, `/stops`,
  `/stops/{stop_id}`, `/stops?filter[stop_code]=9241`, `/versions` — fetched 2026-09-17 with
  `Ocp-Apim-Subscription-Key`.
- `https://api.at.govt.nz/gtfs/v3/routes` with no key — for the `WWW-Authenticate` challenge.
- `https://api.at.govt.nz/realtime/legacy` — fetched 2026-09-17 10:33 UTC.
- `https://gtfs.at.govt.nz/gtfs.zip` — downloaded 2026-09-17 (35,846,846 B,
  `last-modified: Wed, 16 Sep 2026 12:49:05 GMT`); `feed_info.txt`, `agency.txt`, `routes.txt`,
  `trips.txt`, `stop_times.txt`, `stops.txt`, `calendar.txt`, `calendar_dates.txt`, `shapes.txt`.
- `https://dev-portal.at.govt.nz/apis` and
  `https://dev-portal.at.govt.nz/developer/apis?$top=100&$skip=0&skipWorkspaces=true&api-version=2022-04-01-preview`
  — both empty without sign-in.
- `https://gtfs.org/documentation/schedule/reference/` — GTFS reference, for `timepoint`,
  `pickup_type`, `drop_off_type`, `shape_dist_traveled` and `route_type = 2`.
- Repo: `staticGTFS.ts` (`downloadStaticGTFS` line 171, `generateTimetable`, `parseGTFSFileSync`,
  `parseStopTimesForTripsSync`), `railNetwork.ts` (`RailNetworkConfig.GTFSStaticAPI` lines 38–43,
  `updateStaticGTFS` lines 197–208, commented-out wiring lines 184–191), `gtfsTimetable.ts`
  (`staticGTFSQuery` line 71), `railNetworks/AKL/config.json`, `railNetworks/MEL/config.json`.
