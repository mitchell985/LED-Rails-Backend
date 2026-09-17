# 01 — Does AT's GTFS v3 static API carry Te Huia, and how do we fetch it?

Type: research
Status: resolved
Blocked by: —
Map: ../map.md

## Question

The feed is AT's dev portal, *General Transit Feed V3 APIs - v3* (`https://dev-portal.at.govt.nz`). Establish:

1. Does the v3 static feed contain Te Huia — as a route, agency, trips and `stop_times`? Record the exact `route_id` / `agency_id` / `trip_id` patterns, since the AKL config currently filters trains by entity ID range 59000–59999 and Te Huia will not match.
2. What is the transport shape: a REST/JSON API per resource (`/gtfs/routes`, `/gtfs/trips`, `/gtfs/stopTimes`…), or a downloadable zip? `staticGTFS.ts:171 downloadStaticGTFS()` assumes a **zip URL** and `RailNetworkConfig.GTFSStaticAPI` has `{ url, keyHeader, key, fetchIntervalDays }`. State plainly whether that existing path works against v3 or needs a second ingestion mode.
3. Auth: which header and key. Is it the same subscription key as the realtime legacy endpoint (`Ocp-Apim-Subscription-Key`, already in `.env` as `AKL=`) or a separate product subscription?
4. Rate limits, pagination, and payload size for the resources we need.
5. Which Auckland stop_ids Te Huia uses (The Strand, Puhinui, Pukekohe) and whether `stop_times` gives both arrival and departure at each.

Answer feeds ticket 05 (config schema) and, if the feed lacks Te Huia, promotes the hand-encoded-timetable fallback.

## Findings

[../research/at-gtfs-v3.md](../research/at-gtfs-v3.md)

## Answer

**Resolved — the feed carries Te Huia, and the existing zip path needs a second mode.** Full findings, with source URLs and an explicit unknowns list: [../research/at-gtfs-v3.md](../research/at-gtfs-v3.md).

1. **Yes.** `route_id = HUIA-404`, `agency_id = WRC` (Waikato Regional Council, its only route), `route_type = 2`. Exactly **12 trips**, `trip_id` pattern `255-<800005 NB | 800006 SB>-<first-departure seconds>-1-<n>-<8 hex>`; two `shape_id`s; generic network `service_id`s (`Weekday-3`, `Saturday-2`, `Sunday-1`, `Thursday-2`). The 59000–59999 entity filter is realtime-only and irrelevant here — Te Huia has no realtime entity (though the one sample was taken outside operating hours, so that is not proven).
2. **REST/JSON:API**, not a zip: `GET https://api.at.govt.nz/gtfs/v3/{versions,routes,routes/{id},routes/{id}/trips,trips/{id},trips/{id}/stoptimes,stops,stops/{id}}` returning `application/vnd.api+json`. There is **no** `calendar`, `calendar_dates`, `agency` or `shapes` resource, so `service_id` cannot be resolved to service days through v3. Separately, AT also serves a **flat, unauthenticated GTFS zip at `https://gtfs.at.govt.nz/gtfs.zip`** (35.8 MiB, same `feed_version`).
3. **`Ocp-Apim-Subscription-Key`**, and the key already in `.env` as `AKL=` — the realtime one — returns 200 on every v3 endpoint. **No new subscription needed.** The zip needs no key at all.
4. **No pagination** (full collections in one body; `page[limit]` ignored), **partial filtering** (`filter[route_type]`, `filter[stop_code]` work; `filter[agency_id]`/`[service_id]`/`[date]` are silently ignored), **no rate-limit headers and no 429 in a 40-request burst** — but no published limit was found either, so treat it as unproven. Te Huia's whole timetable costs ~31 KB over 13 requests vs 35.8 MiB for the zip.
5. **The Strand P1 `9241-76884964`** (both directions); **Puhinui P1 `9216-200a650e`** NB / **P2 `9217-28451e3b`** SB; **Pukekohe P2 `9233-0f5634a3`** NB / **P4 `9235-c5795c6a`** SB. No intermediate Auckland stops. **`arrival_time == departure_time` on all 72 stop_times rows** — the feed encodes **zero dwell**, and `timepoint = 0` throughout (GTFS: "times are approximate"). `shape_dist_traveled` is present, in km.

**Ingestion:** `downloadStaticGTFS()` (`staticGTFS.ts:171`) cannot be pointed at v3 — it writes the body to `gtfsStatic.zip` and hands it to `AdmZip`, so a JSON:API response throws and it returns `false`. Consuming v3 needs **a second ingestion mode**. It *can* be pointed unmodified at `https://gtfs.at.govt.nz/gtfs.zip`, but downstream `generateTimetable()` hardcodes `gtfsFolders = ['1','2']` (the MEL nested layout; AT's zip is flat), `staticGTFSQuery` never reads `calendar_dates.txt`, and both `updateStaticGTFS()` and `generateTimetable()` are currently commented out in `railNetwork.ts:184-191`.

