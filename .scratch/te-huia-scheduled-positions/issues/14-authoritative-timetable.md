# 14 — Which timetable is authoritative: WRC's published times or AT's GTFS?

Type: grilling
Status: resolved
Blocked by: — (graduated from fog by 02)
Map: ../map.md

## Question

Ticket 02 found the two primary sources **disagree, non-uniformly, by up to ~15 minutes**. Both are current: WRC's own timetable (web page and booklet, "valid from 14 July 2025") and AT's GTFS `HUIA-404` (feed valid 9 Sep – 31 Dec 2026, dated 16 Sep). The service *pattern* matches — Mon–Wed 2 return, Thu–Fri 3, Sat 2, Sun 1 — but individual times do not. Example: Thu–Fri southbound departs The Strand at **3.25pm** published vs **15:40** in GTFS. Both tables are in [research/te-huia-timetable.md](../research/te-huia-timetable.md).

This is not academic: a 15-minute error puts the LED roughly 20 km from the real train, which is most of the board.

- Which source does the board follow? GTFS is what the pipeline can ingest automatically; WRC's is what a passenger sees.
- Is there a way to tell which one the train actually runs to? (Ticket 02 could not read the live WRC page — it sits behind an Imperva CAPTCHA, not attempted — and the Internet Archive was down mid-session.)
- If GTFS is chosen and is wrong, the board is confidently wrong with no signal. Is any divergence check worth building, or is it accepted?
- Does the answer change the fallback in map note 4 (hand-encoded timetable)? A hand-encoded table would follow WRC's published times by construction.

## Answer

**AT's GTFS is authoritative for times.** Decided by the repo owner, 2026-09-17.

Supporting evidence from [research/te-huia-timetable.md](../research/te-huia-timetable.md): the WRC booklet is marked *"valid from 14 July 2025"*, while the GTFS feed is dated 16 Sep 2026 and valid 9 Sep – 31 Dec 2026 — **14 months fresher**. The per-trip offsets are non-uniform (on one trip: Pukekohe +2 min, Puhinui −2 min, Strand +5 min), so the two artefacts are different schedules rather than the same schedule rounded differently, and the stale one is almost certainly WRC's booklet. AT's feed is also what drives AT's own journey planner and station displays.

Three consequences, all decided with the owner in the same exchange:

1. **Times and calendars follow the feed; public holidays follow the operator.** The feed removes `Weekday-3` on 26 Oct, 25 Dec and 28 Dec 2026 and *adds* `Sunday-1` on those dates — scheduling a Te Huia on Christmas Day — while WRC's booklet states Te Huia does not run on public holidays (actual or observed) due to track maintenance. The board suppresses Te Huia on public holidays regardless of what the feed's `calendar_dates.txt` says. A phantom Christmas Day train is a dated, visible wrong; the cost is one suppression rule. Which holidays, and where the dates come from, is **ticket 15**.
2. **No cross-check against WRC will be built.** Their timetable page sits behind an Imperva bot-check; circumventing it is off the table, so an automated divergence check is not available at any price. Instead the feed is checked **against itself**: warn when `feed_end_date` has passed (currently 20261231), when the Te Huia trip count changes from 12, or when `feed_version` changes. This catches the failure that actually bites — a feed quietly going stale — without pretending to validate times against an unreachable source.
3. **The hand-encoded timetable fallback (map note 4) is dropped.** It existed for the case where the feed didn't carry Te Huia; ticket 01 proved it does (12 trips, both shapes, full `stop_times`). Removing it eliminates a second timetable source that could silently drift. Now recorded under **Out of scope** on the map.

Not resolved here, and deliberately: whether the train physically runs to the feed's times or the booklet's. That remains unknown (research §"Unknown" item 1). The decision is which source the board follows, not which one reality follows.
