# 03 — Trace Te Huia's ordered block chain and the board's track/direction model

Type: research
Status: resolved
Blocked by: —
Map: ../map.md

## Question

Codebase/data investigation against `railNetworks/AKL/trackBlocks.kml` and `trackBlocks.ts`:

1. Produce the **ordered block chain** from `300 - The Strand` through Quay Park, the Eastern line, the Westfield junction, and the Southern line to `207 - Pukekohe`, covering every intervening block. Known anchors: `339 Sylvia Park → 340 → 341 → 159/160 → 162 Ōtāhuhu`; the Quay Park end (`318/319/320/321/322`) is untraced.
2. What do the **paired block numbers** mean — `162 - Otahuhu (+161)`, `170 - Puhinui (+169)`, `188 - Papakura (+189)`, `207 - Pukekohe (+206)`? Read the parser in `trackBlocks.ts` and state whether the pair encodes two tracks/platforms, two LEDs, or something else, and whether direction is derivable from it.
3. Is there **any direction or track information** in the block model at all (the `bearing` field parsed from platform descriptions, block adjacency, `TrainInfo.position.bearing`)? This is the prerequisite for "same-direction train" in the conflict rules.
4. Which blocks on the chain carry a **`routes` allow-list** (bracketed `[...]` in the placemark name) and would therefore exclude Te Huia. `300 - The Strand [OUT-OF-SERVICE]` is known; check the rest.
5. Sanity-check the **centroid-polyline** approach: do the centroids of consecutive blocks in the chain, joined as a polyline, stay inside the intended block polygons well enough for `assignBlocksToTrains()` to land on the right block?

## Findings

Write to `../research/board-topology.md` and link it here.

## Answer

Findings: [../research/board-topology.md](../research/board-topology.md)

- **Chain:** 62 blocks, `300 → 322 → 324 … 341 → 159 → 160 → 162 … 205 → 207`, ~50.9 km, all 19 stations in order, with centroids. Config-ready list is in the research file.
- **Quay Park:** the route uses **only 322**. 320 (`South:West`) and 321 (`East:West`) are the Britomart triangle chords and must never light; 318/319 are the Britomart throat. `300 - The Strand` overlaps 322, 323, 321 and 320.
- **`(+N)` pairs:** a spare LED for a *second train in the same block* (`updateAltBlocks`), tie-broken by route name. The alt numbers have no polygon. **Not** tracks, platforms or direction.
- **Direction:** none in the AKL block model. `trackBlocks.kml` has **zero `<description>` elements**, so AKL has no platforms and no bearings at all — that whole path is MEL-only. The only direction signal anywhere is feed-supplied `TrainInfo.position.bearing`, frozen below 2 m/s and often undefined. Prerequisite for "same-direction train" is **not met** as things stand — see ticket 04.
- **Allow-lists:** `300 - The Strand [OUT-OF-SERVICE]` is the **only** one on the chain; the other 61 blocks are unrestricted. (`323 - West Car Exchange` overlaps the chain but is excluded by its own list — leave it that way.)
- **Centroid polyline:** 52 of 61 segments clean; **9 break**. Chord-cutting leaves every polygon on 205→207 (59.5 m, ~430 m dark), 322→324, 341→159, 172→174, 334→335, 203→204, 199→200 — the LED goes out. 188→190 lights `187 Papakura Sidings`; 171→172 clips `173`. And northbound the `ref ± 10` scan makes 322→300 terminate in **321, never reaching The Strand**.
