# 02 — Te Huia's published timetable and a reference for station dwell

Type: research
Status: resolved
Blocked by: —
Map: ../map.md

## Question

Independent of the feed, establish the ground truth we validate against:

1. The current published Te Huia timetable (Waikato Regional Council / Te Huia): services per day, days of operation, and the scheduled times at the three Auckland stops — **The Strand, Puhinui, Pukekohe** — in both directions.
2. Does Te Huia call at Pukekohe on every service, or only some? The user's block chain treats it as a stop.
3. **Dwell time**: find a reference for how long Te Huia stands at an intermediate station (the working assumption is ~1 minute). Prefer a primary source — the operator's timetable showing separate arrival/departure times, or a published turnaround/dwell figure. If no source exists, say so and record the best available evidence rather than inventing one.
4. Terminus dwell at The Strand — relevant because visibility is defined as 1 min before departure / 1 min after arrival.
5. Confirm the Auckland routing: Te Huia runs via the Eastern line (Westfield → Panmure → Ōrākei → Quay Park) rather than via Newmarket.

## Findings

Write to `../research/te-huia-timetable.md` and link it here.

## Answer

Findings: [`../research/te-huia-timetable.md`](../research/te-huia-timetable.md)

- **Timetable.** Mon–Wed 2 return, Thu–Fri 3, Sat 2, Sun 1; Frankton ↔ The Strand via Pukekohe and Puhinui. Two primary sources exist and **they disagree by up to ~15 min on some trips**: WRC's published timetable (web page + booklet, "valid from 14 July 2025") and AT's static GTFS route `HUIA-404` (feed valid 9 Sep – 31 Dec 2026, 12 trips). Both sets of Auckland times are tabulated in the research file. Which one the train runs to is unresolved.
- **Pukekohe:** every service, both directions, no exceptions (added 10 Feb 2025 when Papakura was dropped). NB platform 2, SB platform 4.
- **Dwell: no source exists.** The published timetable shows one time per station, and AT's GTFS has `arrival_time == departure_time` on all 72 Te Huia rows (zero dwell) even though ~1.4% of rows elsewhere in the same feed do carry dwell. The ~1 min assumption is **unsourced** — it is a parameter we choose, not a fact.
- **Terminus dwell at The Strand:** not published, but derivable — the shortest arrival→departure layover is ~60–65 min and most are 3–6 hours, so the 1-min visibility windows can never collide. (`block_id` is empty in the feed, so the trip pairing is inferred.)
- **Routing: Eastern line confirmed from primary data.** The GTFS shape passes within ~100 m of Papakura → Takaanini → Te Mahia → Manurewa → Homai → Puhinui → Papatoetoe → Middlemore → Ōtāhuhu → Sylvia Park → Panmure → Glen Innes → Meadowbank → Ōrākei → The Strand, and stays **2.4 km from Newmarket**. Terminus is The Strand, never Britomart/Waitematā (1.0 km away, a separate station in AT's data). Map decision 5 holds unchanged.
- **Incidental (ticket 01):** Te Huia *is* in AT's public keyless static GTFS zip (`https://gtfs.at.govt.nz/gtfs.zip`) as route `HUIA-404`, agency `WRC`.
