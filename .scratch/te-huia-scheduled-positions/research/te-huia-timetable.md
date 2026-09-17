# Research: Te Huia's published timetable, Pukekohe calls, dwell and Auckland routing

Ticket: [`../issues/02-te-huia-timetable-and-dwell.md`](../issues/02-te-huia-timetable-and-dwell.md)
Researched: 2026-09-17. No design decisions made here, no code touched.

## Sources used (and their status)

| Source | URL | Status |
| --- | --- | --- |
| Te Huia official timetable page (Waikato Regional Council) | https://www.tehuiatrain.co.nz/timetables/ — read via Internet Archive snapshot `20260807063501`: http://web.archive.org/web/20260807063501/https://www.tehuiatrain.co.nz/timetables/ | Primary (operator). The live site sits behind an Imperva bot-check that serves a CAPTCHA, which I did not attempt to pass; the archived copy of the operator's own page was used instead. |
| Te Huia printed timetable & service info booklet (PDF) | https://www.tehuiatrain.co.nz/assets/Te-Huia/TeHuiaBooklet.pdf | Primary. Fetched **live** today (the asset path is not bot-blocked). Back page states *"Valid from 14 July 2025"*. |
| AT GTFS static feed (Auckland Transport) | https://gtfs.at.govt.nz/gtfs.zip | Primary. Public, no API key. `feed_info.txt`: publisher Auckland Transport, `feed_start_date=20260909`, `feed_end_date=20261231`, version `VDV_Merge_118_5_H_1_328.08584120448611919867428665414CU51`; files dated 2026-09-16. |
| AT "Te Huia regional train service" page | https://at.govt.nz/bus-train-ferry/train-services/te-huia-regional-train-service/ | Primary (AT). |
| Te Huia station pages (Pukekohe / Puhinui / Strand) | https://www.tehuiatrain.co.nz/stations/pukekohe/ , /puhinui/ , /strand/ (via Internet Archive, 2026 snapshots) | Primary (operator). |
| Te Huia media-release index | https://www.tehuiatrain.co.nz/news-and-events/media-releases/ (via Internet Archive, 2026 snapshot) | Primary (operator). |
| WRC media release "Te Huia calling at Pukekohe from February" (11 Dec 2024) | https://www.scoop.co.nz/stories/AK2412/S00384/te-huia-calling-at-pukekohe-from-february.htm | WRC's own release, redistributed verbatim by Scoop. The tehuiatrain.co.nz original is bot-blocked. |
| KiwiRail media release "Te Huia to stop at Papakura" (11 July 2023) | https://www.kiwirail.co.nz/media/te-huia-to-stop-at-papakura/ | Primary (operator). |
| Greater Auckland, "Te Huia — what comes next?" (23 Mar 2026) | https://www.greaterauckland.org.nz/2026/03/23/te-huia-what-comes-next/ | **Secondary** — used only where flagged. |

> Note: the Internet Archive went offline part-way through this session ("Internet Archive services are temporarily offline"), which cut short the historical work in §5. Snapshots already retrieved are quoted above with their timestamps.

---

## 1. The published timetable

**Operating pattern** (identical in the WRC web timetable and the booklet): daily return services, Frankton (Hamilton) ↔ The Strand (Auckland), Monday to Sunday. Stops: Frankton, Rotokauri, Raahui Pookeka | Huntly, Pukekohe, Puhinui, Strand. Estimated running time quoted as **2 h 30 min** Frankton→Strand.

- Monday–Wednesday: 2 return services
- Thursday–Friday: 3 return services
- Saturday: 2 return services
- Sunday: 1 return service

Booklet: *"Te Huia will not run on public holidays (actual or observed) due to track maintenance."* The web page also lists a planned closure: Fri 10 – Sun 12 July 2026 (Matariki weekend), normal service from Mon 13 July 2026.

### 1a. WRC published times (tehuiatrain.co.nz + booklet, valid from 14 July 2025)

Auckland stops only; all times as printed (12-hour, no am/pm marker in the source table — the column headings carry AM/PM).

**To Auckland**

| | Mon–Wed 1 | Mon–Wed 2 | Thu–Fri 1 | Thu–Fri 2 | Thu–Fri 3 | Sat 1 | Sat 2 | Sun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pukekohe (Platform 2) | 7.25 | 3.26 | 7.27 | 10.50 | 3.26 | 8.59 | 10.27 | 4.06 |
| Puhinui | 8.03 | 4.03 | 8.03 | 11.26 | 4.03 | 9.34 | 11.01 | 4.43 |
| Strand | 8.30 | 4.34 | 8.30 | 11.54 | 4.34 | 10.03 | 11.29 | 5.15 |

**To Waikato**

| | Mon–Wed 1 | Mon–Wed 2 | Thu–Fri 1 | Thu–Fri 2 | Thu–Fri 3 | Sat 1 | Sat 2 | Sun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Strand | 9.45 | 5.45 | 9.45 | 3.25 | 5.45 | 3.05 | 5.30 | 6.15 |
| Puhinui | 10.15 | 6.20 | 10.15 | 3.59 | 6.20 | 3.38 | 5.57 | 6.42 |
| Pukekohe (Platform 4) | 10.47 | 6.57 | 10.47 | 4.29 | 6.57 | 4.07 | 6.27 | 7.12 |

(Full Waikato-end times are in the sources; e.g. Mon–Wed trip 1 is Frankton 6.05 → Rotokauri 6.15 → Huntly 6.37 → Pukekohe 7.25 → Puhinui 8.03 → Strand 8.30.)

### 1b. AT GTFS times — **these differ from the published timetable**

Route `HUIA-404`, `agency_id=WRC` ("Waikato Regional Council"), `route_short_name=HUIA`, `route_type=2` (rail). **12 trips**, 6 per direction, 6 stops each, matching the same service pattern.

| trip_id | service_id | dir | Pukekohe | Puhinui | Strand |
| --- | --- | --- | --- | --- | --- |
| `255-800005-21900-1-199-3e0f9879` | Weekday-3 | 0 (NB) | 07:27 | 08:01 | 08:35 |
| `255-800005-50700-1-399-53b7c532` | Weekday-3 | 0 | 15:27 | 16:01 | 16:35 |
| `255-800005-34500-1-299-30b267b2` | Thursday-2 | 0 | 10:57 | 11:31 | 12:00 |
| `255-800005-27300-1-799-f0881beb` | Saturday-2 | 0 | 08:57 | 09:31 | 10:00 |
| `255-800005-32700-1-899-32d5d53a` | Saturday-2 | 0 | 10:27 | 11:01 | 11:30 |
| `255-800005-52500-1-1199-3eee017d` | Sunday-1 | 0 | 15:57 | 16:31 | 17:05 |
| `255-800006-34800-1-499-426a2e04` | Weekday-3 | 1 (SB) | 10:47 | 10:10 | 09:40 |
| `255-800006-63600-1-699-fdd28938` | Weekday-3 | 1 | 18:47 | 18:10 | 17:40 |
| `255-800006-56400-1-599-548a3be9` | Thursday-2 | 1 | 16:47 | 16:10 | 15:40 |
| `255-800006-54600-1-999-007d4775` | Saturday-2 | 1 | 16:17 | 15:40 | 15:10 |
| `255-800006-63600-1-1099-3e24b49c` | Saturday-2 | 1 | 18:47 | 18:10 | 17:40 |
| `255-800006-65400-1-1299-72b177b3` | Sunday-1 | 1 | 19:17 | 18:40 | 18:10 |

Calendars: `Weekday-3` Mon–Fri, `Thursday-2` Thursday in `calendar.txt` **plus** an added-exception for every Friday to 18 Dec 2026 (so Thu+Fri = the third trip), `Saturday-2`, `Sunday-1`; all `20260909`–`20261231`.

Stop identity in the feed:

| Stop | NB `stop_id` (code, platform) | SB `stop_id` (code, platform) |
| --- | --- | --- |
| Pukekohe | `9233-0f5634a3` (9233, plat 2) | `9235-c5795c6a` (9235, plat 4) |
| Puhinui | `9216-200a650e` (9216, plat 1) | `9217-28451e3b` (9217, plat 2) |
| The Strand | `9241-76884964` (9241, plat 1) | same stop, `9241-76884964` |

Boarding restrictions encoded in the feed match the operator's rule (*"Te Huia does not pick up northbound passengers at Puhinui for travel to Strand station, or take southbound passengers from Strand station to drop off in Puhinui"* — /stations/puhinui/): northbound `pickup_type=1` at Pukekohe, Puhinui and Strand; southbound `drop_off_type=1` at Puhinui and Pukekohe.

**⚠ Discrepancy — flagged, not resolved.** WRC's published times and AT's GTFS times disagree by up to ~15 minutes on the same trip (e.g. southbound Thu–Fri 2: published Strand dep **3.25pm**, GTFS **15:40**; Saturday 1: published **3.05pm**, GTFS **15:10**; northbound Mon–Wed 1 Strand arr: published **8.30**, GTFS **08:35**). The offsets are not a uniform shift (Pukekohe +2 min, Puhinui −2 min, Strand +5 min on the same trip), so this is two different schedules rather than a rounding convention. Both artefacts are current as of today: the booklet was downloaded live today (marked "valid from 14 July 2025") and the archived web timetable (7 Aug 2026) agrees with it, while the GTFS feed is dated 16 Sep 2026 and is valid 9 Sep – 31 Dec 2026. Which one the train actually runs to is **unknown**; I could not read the live tehuiatrain.co.nz timetable page to check whether it has changed since 7 Aug 2026.

## 2. Does it call at Pukekohe on every service?

**Yes — every service, both directions, no exceptions**, on both sources:
- WRC timetable/booklet: every one of the 8 columns in each direction has a Pukekohe time.
- AT GTFS: all 12 trips include a Pukekohe stop; both trip headsigns literally read *"Hamilton To The Strand Auckland Via Pukekohe"* / *"The Strand Auckland To Hamilton Via Pukekohe"*.

Pukekohe was added from **Monday 10 February 2025**, at which point the **Papakura** stop was removed (last Papakura call Sat 8 Feb 2025, 6.21pm southbound) — WRC media release 11 Dec 2024 (https://www.scoop.co.nz/stories/AK2412/S00384/te-huia-calling-at-pukekohe-from-february.htm).

Platform: the WRC timetable page says **Platform 2** northbound and **Platform 4** southbound, and the AT GTFS stop records agree (platform_code 2 / 4). Note the WRC *station* page for Pukekohe says "Southbound to Hamilton | Platform 3", which contradicts its own timetable page and the feed — treat the feed (platform 4) as authoritative and the station page as stale.

## 3. Station dwell at an intermediate station — **no source found for ~1 minute**

I could not find any published dwell or stop-duration figure for Te Huia from WRC, AT, KiwiRail or NZTA. The best available evidence:

1. **The published timetable gives one time per station**, not an arrival and a departure — WRC web timetable and booklet alike. It therefore contains no dwell information at all.
2. **The AT GTFS feed explicitly encodes zero dwell.** For all **72** Te Huia `stop_times` rows, `arrival_time == departure_time` (verified: 0 rows where they differ). This is not just a feed-wide convention — in a 500,000-row sample of the same `stop_times.txt`, 7,194 rows (~1.4%) *do* carry a non-zero dwell, so AT does encode dwell where a schedule has one, and has encoded none for Te Huia.
3. Nothing in the WRC media releases index (back to Apr 2024), the KiwiRail Te Huia releases, or the Te Huia station pages states a dwell or turnaround figure for an intermediate stop.

**Conclusion: the ~1 minute working assumption has no primary source.** The only primary number that exists is **0 seconds**, and that is a data-encoding artefact rather than an operational measurement — a real train plainly stands for some non-zero time. Any dwell used in the implementation is therefore a chosen parameter, not a sourced fact, and should be labelled as such in config.

*(Indirect cross-check available but not pursued: run-time arithmetic can't isolate dwell either, because the published segment times already fold dwell into the station-to-station gap — e.g. Pukekohe→Puhinui is 38 min published / 34 min GTFS with no way to split running from standing.)*

## 4. Terminus dwell at The Strand

No published turnaround figure either. It is, however, **derivable** from the timetables, because The Strand is the terminus and the arrival of one trip is followed by the departure of the next:

| Service day | Arrive Strand | Depart Strand | Layover (published) | Layover (GTFS) |
| --- | --- | --- | --- | --- |
| Mon–Wed / Weekday trip 1 | 8.30 / 08:35 | 9.45 / 09:40 | 75 min | 65 min |
| Mon–Wed / Weekday trip 2 | 4.34pm / 16:35 | 5.45pm / 17:40 | 71 min | 65 min |
| Thu–Fri mid-day | 11.54am / 12:00 | 3.25pm / 15:40 | 211 min | 220 min |
| Saturday trip 1 | 10.03 / 10:00 | 3.05pm / 15:10 | 302 min | 310 min |
| Saturday trip 2 | 11.29 / 11:30 | 5.30pm / 17:40 | 361 min | 370 min |
| Sunday | 5.15pm / 17:05 | 6.15pm / 18:10 | 60 min | 65 min |

So the **shortest terminus layover is ~60–65 minutes** and most are far longer. Caveat: GTFS `trips.txt` has an **empty `block_id`** for every Te Huia trip, so the feed does not formally link an arriving trip to the next departing one — the pairing above is inferred from the fact that The Strand is a terminus with a single platform (`9241`) used in both directions.

Relevance to the map's visibility rule (1 min before departure / 1 min after arrival): there is no risk of the two windows overlapping at The Strand — the gap is an hour or more in every case.

Secondary note (Greater Auckland, 23 Mar 2026): commentary there says that from August 2026 ETCS-fitted locomotives haul Te Huia, "requiring different turnaround procedures than the current push-pull configuration". I found **no primary source** confirming this or any resulting change to Strand turnaround time.

## 5. Auckland routing and terminus

### Routing: Eastern line — **confirmed from primary data**

The AT GTFS shapes for the two Te Huia trip patterns (`255-800005-c3980ac3` northbound, 4,108 points, 139.094 km; `255-800006-39fea4ac` southbound, 2,426 points, 138.885 km) were matched against AT's own rail-station coordinates in `stops.txt`. Minimum perpendicular offsets, northbound, in order of `shape_dist_traveled` (km from Frankton):

| km | Station | offset |
| --- | --- | --- |
| 87.036 | **Pukekohe** (stop) | 0 m |
| 92.712 | Paerata | 27 m |
| 100.297 | Drury | 5 m |
| 105.229 | Papakura | 4 m |
| 108.798 | Takaanini | 2 m |
| 110.467 | Te Mahia | 2 m |
| 111.747 | Manurewa | 2 m |
| 113.990 | Homai | 1 m |
| 117.286 | **Puhinui** (stop) | 0 m |
| 118.840 | Papatoetoe | 80 m |
| 120.515 | Middlemore | 110 m |
| 122.469 | Ōtāhuhu | 68 m |
| 126.687 | Sylvia Park | 30 m |
| 128.837 | **Panmure** | 70 m |
| 131.091 | **Glen Innes** | 89 m |
| 134.685 | **Meadowbank** | 27 m |
| 135.800 | **Ōrākei** | 48 m |
| 139.094 | **The Strand** (terminus) | 0 m |

And the stations that rule out the alternative: **Newmarket 2,357 m**, Remuera 2,951 m, Penrose 2,276 m, Grafton 2,079 m, Maungawhau 2,785 m — i.e. the shape never goes near the Newmarket route. The southbound shape is the mirror image (Strand → Ōrākei 3.3 km → Meadowbank 4.5 → Glen Innes 8.1 → Panmure 10.3 → Sylvia Park 12.4 → Ōtāhuhu 16.5 → Middlemore 18.3 → Papatoetoe 20.2 → Puhinui 21.8 → Homai 25.0 → Manurewa 27.2 → Te Mahia 28.5 → Takaanini 30.2 → Papakura 33.7 → Drury 38.6 → Paerata 46.2 → Pukekohe 51.9).

**This matches map.md decision 5 exactly**: Eastern line (Westfield – Panmure – Ōrākei – Quay Park) into The Strand, *not* via Newmarket.

Secondary caveat: the Greater Auckland piece above describes a post-CRL plan phrased as "Pukekohe, Puhinui, The Strand, Newmarket, Puhinui and Pukekohe". Whatever that refers to, it is **not** what the current AT feed encodes, and I found no primary source for a Newmarket routing. Treat it as unverified future speculation.

### Terminus: The Strand, not Britomart/Waitematā

- AT: *"Te Huia is the regional passenger train service connecting Waikato (Hamilton and Huntly) and Auckland (The Strand). It started operating on 6 April 2021."* — https://at.govt.nz/bus-train-ferry/train-services/te-huia-regional-train-service/
- The two are distinct stations in AT's own data: `The Strand Train Station` (`135-b78afdd1`, −36.84853, 174.77934) vs `Waitemata Train Station` (`133-08da14b5`, −36.84431, 174.76869, formerly Britomart) — about 1.0 km apart. The Te Huia shape ends at The Strand and comes no closer than **1,016 m** to Waitematā.
- WRC's own Strand station page describes it as *"a 20 minute walk from Waitematā station"*.

**Dated history (partly unconfirmed):**

| Date | Event | Source quality |
| --- | --- | --- |
| 6 Apr 2021 | Service starts | Primary (AT page). Terminating at Papakura — **could not confirm from a primary source**. |
| Jul 2021 | Saturday service extended Papakura → The Strand | **Unconfirmed** (secondary only) |
| 24 Jan 2022 | Weekday services extended to The Strand; Puhinui stop added | **Unconfirmed** (secondary only) |
| 11 Jul 2023 | *"From this afternoon, the Hamilton-Auckland train service Te Huia will no longer be travelling to The Strand in Parnell, and will instead be stopping at Papakura"* — cut back after the signal-passed-at-danger incident, with bus replacement Papakura↔Puhinui/Strand | Primary — https://www.kiwirail.co.nz/media/te-huia-to-stop-at-papakura/ . The **date it resumed running to The Strand is unknown.** |
| 10 Feb 2025 | Pukekohe stop added, Papakura stop removed | Primary (WRC release, via Scoop) |
| Today | Terminates at The Strand | Primary (AT page + AT GTFS) |

**I found no evidence that Te Huia has ever terminated at Britomart/Waitematā.** Commentary consistently gives the reason as Britomart's diesel-extraction fans having been removed, but I did not locate a primary AT/KiwiRail statement of that, so treat the *reason* as unverified. What is verified is the *fact*: the current feed and AT's own page both put the terminus at The Strand.

---

## Unknown / could not confirm

1. **Which timetable the train actually runs to** — WRC's published times and AT's GTFS times differ by up to ~15 min on some trips (§1b). Unresolved.
2. **Whether the live tehuiatrain.co.nz timetable has changed since the 7 Aug 2026 snapshot** — the live HTML pages are behind an Imperva bot-check I did not bypass, and the Internet Archive went offline mid-session. The live booklet PDF (fetched today) still says "valid from 14 July 2025" and matches the 7 Aug snapshot.
3. **Intermediate-station dwell** — no published figure exists from any of WRC, AT, KiwiRail or NZTA. GTFS says 0 s. The ~1 min assumption is unsourced.
4. **Terminus dwell as a published operating figure** — none found; the 60–370 min layovers in §4 are derived from the timetables, and the arrival→departure pairing is inferred because `block_id` is empty in the feed.
5. **Public-holiday behaviour.** The booklet says Te Huia does not run on public holidays. The AT feed instead *removes* `Weekday-3` on 26 Oct, 25 Dec and 28 Dec 2026 and *adds* `Sunday-1` on those same dates — i.e. it schedules a Sunday-pattern Te Huia on Christmas Day. These cannot both be right; unresolved.
6. **2021–22 terminus extension dates** and the date Te Huia resumed running to The Strand after 11 July 2023 — secondary sources only, or nothing.
7. **Post-CRL / August-2026 changes** (ETCS locomotives, any Newmarket routing, turnaround changes) — secondary commentary only, no primary source.

## Incidental finding relevant to ticket 01

Te Huia **is** present in AT's **static** GTFS feed as route `HUIA-404` (agency `WRC`), with trips, stop_times and shapes, in the public keyless zip at `https://gtfs.at.govt.nz/gtfs.zip` (35 MB; `stop_times.txt` is 127 MB uncompressed). That zip is the shape `staticGTFS.ts:downloadStaticGTFS()` already expects, and `railNetworks/AKL/config.json` currently has no `GTFSStaticAPI` block at all. Whether the *realtime* feed carries HUIA vehicles is a separate question and still belongs to ticket 01.
