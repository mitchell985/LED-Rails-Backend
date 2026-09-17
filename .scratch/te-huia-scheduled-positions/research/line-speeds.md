# Line speeds along Te Huia's Auckland chain, and whether a 110 km/h cap is right

Research for ticket [16](../issues/16-line-speed-limits.md). Researched 2026-09-17.
No design decisions are made here, no code touched.

**Headline:** published sectional line speeds *do* exist, they are KiwiRail's own Local Network
Instructions, and for Te Huia every section of the Auckland chain is **100 km/h**, not 110.
**110 km/h is the ETCS-fitted AM-class EMU figure**, and it applies to only one of Te Huia's two
sections. Separately, the cap is close to irrelevant: the fastest timetabled leg averages
**61.4 km/h**, so a cap of any value between about 65 and 110 would never bind unless the
conflict-resolution logic drives the ghost at more than ~1.6x its scheduled pace.

---

## Sources used (and their status)

| Source | URL | Status |
| --- | --- | --- |
| KiwiRail **Local Network Instructions L1.1 Pukekohe – Waitākere**, publication date 16 Sep 2026 | https://shield.kiwirail.co.nz/content/latest/79914-L1_1_Pukekohe_-_Waitakere-pdf-en.pdf | **Primary, and the load-bearing source.** 94 pp. Covers exactly Te Huia's Auckland chain. |
| KiwiRail **LNI L2 Pukekohe – Hamilton and All Lines East of Hamilton** | https://shield.kiwirail.co.nz/content/latest/81067-L2_Pukekohe_-_Hamilton_and_All_Lines_East_of_Hamilton-pdf-en.pdf | Primary. The section south of Pukekohe (off-board, used as corroboration). |
| KiwiRail **LNI L1.2 Waitematā** | https://shield.kiwirail.co.nz/content/latest/80992-L1_2_Waitemata-pdf-en.pdf | Primary. Britomart station limits only — contains no line-speed table; checked and excluded. |
| KiwiRail **Train Running and Timetabling Manual**, 19 Jun 2026 | https://shield.kiwirail.co.nz/content/latest/80914-Train_Running_and_Timetabling-pdf-en.pdf | Primary. Defines the train-class codes used as column headings in the LNI speed tables. |
| KiwiRail **Passenger Vehicle Operations Manual**, 25 May 2026 | https://shield.kiwirail.co.nz/content/latest/80053-Passenger_Vehicle_Operations-pdf-en.pdf | Primary. AM-class 110 km/h limit; Te Huia consist definition. |
| KiwiRail **Rail Operating Code Section 1 – Rolling Stock Restrictions** | https://shield.kiwirail.co.nz/content/latest/80281-ROC_Section_1-pdf-en.pdf | Primary. Confirms speed tables live in the LNIs; DFB "(Te Huia only)" brake-block note. |
| KiwiRail "Rail operating rules" landing page | https://www.kiwirail.co.nz/our-network/rail-operating-rules/ | Primary. Shows the rules library is the "Shield" app. |
| TAIC **RO-2021-103** (Te Huia train parting, Paerata, 19 Jul 2021) | https://taic.org.nz/inquiry/ro-2021-103 — full report https://taic.org.nz/sites/default/files/inquiry/documents/Final%20Report%20RO-2021-103%20-%20published%20copy.pdf | Primary (statutory investigator). Observed running speed on the chain; NIMT metrages. |
| TAIC **RO-2023-104** (Te Huia SPAD, Penrose, 17 Jun 2023) | https://taic.org.nz/inquiry/ro-2023-104 — full report https://taic.org.nz/sites/default/files/inquiry/documents/RO-2023-104%20Final%20Report.pdf | Primary. An 80 km/h line-speed figure, but for the Newmarket route, *not* the current chain. |
| KiwiRail media release, "Trains to be temporarily slowed as KiwiRail accelerates track repair works" | https://www.kiwirail.co.nz/media/trains-to-be-temporarily-slowed-as-kiwirail-accelerates-track-repair-works-new-media-article/ | Primary. "the current 80 to 40 kph across the metro network". |
| KiwiRail **Rail Network Investment Programme 2024–27** | https://www.kiwirail.co.nz/assets/Uploads/Our-network/Funding-Our-Network/RNIP-document_2025_Web.pdf | Primary — checked and **negative**. 80 pp, zero line-speed figures (see §5). |
| KiwiRail Rail Network Rebuild FAQs (Oct 2022) | https://www.kiwirail.co.nz/assets/Uploads/Our-Regions/Auckland-Metro/Rail-Network-Rebuild-FAQs-October-22.pdf | Primary — checked and negative. No km/h figures at all. |
| OIA request 28047 "Speed Restrictions and Network Rebuild" to KiwiRail (response Aug 2024) | https://fyi.org.nz/request/28047-speed-restrictions-and-network-rebuild | Primary (released under OIA) — narrative only, no TSR table. |
| Greater Auckland, "Te Huia — what comes next?" (23 Mar 2026) | https://www.greaterauckland.org.nz/2026/03/23/te-huia-what-comes-next/ | **Secondary** — used only where explicitly flagged as unconfirmed. |

### A note on how the KiwiRail documents were obtained

KiwiRail's operating-rules library is the "Shield" app at `shield.kiwirail.co.nz`. The **document
index is behind Microsoft Entra / MSAL sign-in and I did not attempt to authenticate**. However the
individual PDFs are served unauthenticated from `shield.kiwirail.co.nz/content/latest/<id>-<Name>-pdf-en.pdf`
and are indexed by public search engines; each was fetched by its public URL. Every one carries the
footer "Uncontrolled when printed © KiwiRail" and a publication date, quoted above. Because the
index could not be listed, **I cannot guarantee these are the current revisions** — only that they
are the revisions served at `/latest/` on 2026-09-17.

---

## 1. Published line speeds for Te Huia's sections — yes, they exist

**KiwiRail publishes sectional line speeds in the Local Network Instructions, tabulated by portion
of line and by train class.** For the Auckland chain that document is **L1.1 Pukekohe – Waitākere**,
§1.20 Maximum Speeds.

### 1a. First, a naming correction that matters

The ticket splits the route into "the NIMT between Pukekohe and Westfield" and "the Eastern line
between Westfield and The Strand". In KiwiRail's own scheme **both are the NIMT**: L1.1 §1.20.5
"North Island Main Trunk" has rows for `Auckland – Westfield` *and* `Westfield – Pukekohe`, and the
`Auckland – Westfield` block carries exceptions naming **Tunnel 19** (Purewa, between Meadowbank and
Ōrākei), **"Panmure – Westfield"**, and **"turnout 1589 on Up Main between Westfield Junction and
Sylvia Park"** — i.e. it is the line AT markets as the Eastern Line. AT's "Eastern line" and
KiwiRail's "NIMT Auckland – Westfield" are the same track. Both of Te Huia's Auckland sections are
therefore covered by a single table.

(The separate §1.20.3 "Auckland – Newmarket Line" table is the *other* leg out of Quay Park, via
Parnell — the one ticket 03 established Te Huia does not use.)

### 1b. Direction convention

On the NIMT, metrage increases northward — TAIC RO-2021-103 §2.76: *"The metrage increases in a
northerly direction through to Britomart Transport Centre in Auckland (682 kilometres). The metrages
of Pukekohe and Papakura are 628.86 kilometres and 647.02 kilometres, respectively."* **Down =
southbound** (Auckland → Hamilton): the same report has the southbound Papakura→Hamilton service
parting on *"the NIMT's down main"* (§2.76). **Up = northbound**, toward Auckland. The L1.1 table's
`DOWN TRAINS: Auckland – Westfield … Westfield – Pukekohe` and `UP TRAINS: Pukekohe – Westfield …
Westfield – Auckland` orderings match.

For Te Huia the distinction turns out not to matter: the Exp P figures are identical in both
directions.

### 1c. The figures — L1.1 §1.20.5, North Island Main Trunk

Column headings are `ETCS EMU | EMU | Exp P | Exp F | F`. Te Huia is an **Exp P** train (see §2b).

| Portion of line | ETCS EMU | EMU | **Exp P** | Exp F | F |
| --- | --- | --- | --- | --- | --- |
| **DOWN (southbound)** | | | | | |
| Auckland – Westfield | 100 | 100 | **100** | 80 | 55 |
| Westfield – Pukekohe | 110 | 110 | **100** | 80 | 55 |
| **UP (northbound)** | | | | | |
| Pukekohe – Westfield | 110 | 110 | **100** | 80 | 55 |
| Westfield – Auckland | 100 | 100 | **100** | 80 | 55 |

**So Te Huia's line speed is 100 km/h over the entire Auckland chain, in both directions.**

Exceptions in the same table that fall on or near the chain:

| Exception | ETCS EMU | EMU | Exp P | Applies to Te Huia? |
| --- | --- | --- | --- | --- |
| "Through new turnout 1589 on Up Main between Westfield Junction and Sylvia Park" | 60 | 60 | **60** | **Yes, northbound** — chain blocks 340/341 |
| "Through turnouts at Junction with North Auckland Line at 666.01 km" (Westfield) | 40 | 40 | 40 | **No** — Te Huia stays on the NIMT and does not take the NAL turnout |
| "At Auckland: From The Strand Overbridge to 33 points" (Up) | 40 | 40 | **40** | **Probably yes** at the terminal approach — see §1e |
| "From 33 points to 42 signal Up and Down direction" / "then to Waitematā Platform" | 70/25 | 40/25 | 40/25 | **No** — that is the continuation into Britomart, which Te Huia never makes |
| "CIMW Site between 649.400 km and 649.600 km, Constant Speed required" | .. | .. | .. | **No** — Exp F only (70) |
| "From 2409 signal, through 2456 crossover … to Branch Main" (Westfield – Paerata) | .. | .. | .. | **No** — Exp F / F only (50); this is the Mission Bush branch |
| "Pukekohe – Paerata: From 2402 signal through turnout along Link Road …" (Up) | .. | .. | .. | **No** — Exp F / F only (40) |

Note the **"Rail movements may travel up to 40 km/h along the Pukekohe East loop"** note, which
modifies "TO10 Network Line Speeds, 4.3 Turnouts and 4.4 Lines other than Main and Branch Lines" —
loops and sidings, not the main line.

### 1d. South of Pukekohe (off-board, for completeness)

L2 §1.6.3 gives `Pukekohe – Hamilton` as **Exp P 100 / Exp F 80 / F 55** in both directions,
with a single-line 80 km/h section between 592.60 km and 603.87 km and a set of level-crossing
restrictions explicitly written **"for Te Huia with SRV leading"** (40 km/h at Wallbank Road
561.51 km, 25 km/h at Te Onetea Road 588.30 km, etc.). This is the clearest possible confirmation
that these documents govern Te Huia by name. None of it is on the AKL board.

### 1e. Where the published figures run out — the Strand terminus

L1.1 §1.20.5's Auckland-end exceptions are written around **Waitematā (Britomart)** — signals 33,
42, 50, 51, 54 — because that is where most traffic goes. Te Huia terminates at **The Strand**,
which L1.1 covers operationally in §8.6 (stabling facility, platforms 1 and 2, pedestrian crossing
at the south end of platform 1) but for which I found **no Exp P platform-approach speed** in the
maximum-speeds table. The nearest applicable figure is the Up-direction *"From The Strand Overbridge
to 33 points — 40 km/h"*. Treat the final approach into block 300 as **unknown, bounded above by
40 km/h**.

---

## 2. Is 110 km/h the right flat fallback for Te Huia? **No.**

### 2a. Where 110 actually comes from

Two primary sources agree that 110 is the **electric multiple unit** figure:

- **Passenger Vehicle Operations Manual §4.4.1**: *"AM Class rolling stock may travel at maximum
  posted line speed, up to a maximum of 110 km/h and must obey all permanent speed restrictions as
  listed in the local network instructions"*. AM class = Auckland's electric units.
- **L1.1 §1.20.1** motive-power table: `EMU ETCS 110`.

And in the sectional table itself, 110 appears **only** in the ETCS-EMU and EMU columns, and **only**
on Westfield – Pukekohe. Even for an EMU, Auckland – Westfield (the Eastern line half of the chain)
is 100. So 110 is wrong for Te Huia twice over: wrong traction type, and wrong on half the route
even for the traction type it belongs to.

### 2b. Te Huia's own limit is 100 km/h, from three independent directions

**(i) Line speed, by train class.** The Train Running and Timetabling Manual §3.4 defines the class:
*"**Exp P** — Passenger train with all vehicles authorised to run at 100 km/h and Exp Passenger Route
Speed is provided in maximum speeds of Local Network Instructions."* That Te Huia runs as Exp P is
established by L2 §1.6.3, where the Te Huia-specific level-crossing restrictions are entered in the
**Exp P column** with `..` in the Exp F and F columns. The same manual §3.3 lists Te Huia's train
numbers: *"13xx Hamilton – Strand (Te Huia)"*. Exp P line speed on the chain = **100**.

**(ii) Motive power.** L1.1 §1.20.1: `DC, DFB, DH, DLP, DXB, DXC, DXR and EF — 100`; `DL — 80`.
L2 §1.6.1 gives the same. ROC Section 1 §4.17 confirms the DFB is the Te Huia locomotive by name:
LT-14 brake blocks may be fitted to *"• DFB (Te Huia only)"*. So the current locomotive is a
**100 km/h** machine.

**(iii) Rolling stock.** TAIC RO-2021-103 describes the consist as a *"DFB-type diesel electric
locomotive hauling four carriages"* of *"SR, SRC and SRV class"*. The Passenger Vehicle Operations
Manual §2.9.4 "Te Huia Train Configuration" specifies *"SRV as an end carriage, 2 x SR carriages,
and SRC at the other end"*. Note the ticket's premise of *SA/SD carriages* is out of date — these
were reclassified to the SR family for Te Huia; the operative manual knows them only as SR/SRC/SRV.
No SR-family maximum speed is stated numerically in the manuals I read, but the Exp P definition
("all vehicles authorised to run at 100 km/h") implies 100 by construction.

**Empirical corroboration:** TAIC RO-2021-103 §2.6 records Te Huia southbound between Papakura and
Paerata — squarely on the chain — *"in power notch three of the eight available, and the train was
travelling at 91 kilometres per hour"*. So the train does genuinely run into the 90s on this
alignment, consistent with a 100 km/h line and inconsistent with the metro-wide 80 km/h figure being
a permanent cap here.

### 2c. ETCS does not raise it — it pins it at 100

The ticket asks whether the ETCS fitment changes the number. **L1.1 §1.13** settles it. Locomotive-
hauled services with ETCS must enter a consist maximum speed of:

> *"• 100 km/h for passenger trains, • 80 km/h for freight trains operating on the NIMT, • 70 km/h
> for freight trains operating on the NAL …"*

and, in an IMPORTANT box:

> *"When operating locomotive hauled services with ETCS, the posted speed limits take precedence
> over the maximum allowed speed presented on the DMI."*

ETCS is mandatory for Te Huia in this area — §1.13 also states ETCS Level 0 *"is prohibited for
locomotive hauled services once operating between Pukekohe and Swanson"*. So under ETCS, Te Huia is
a 100 km/h "PASS" consist governed by posted line speeds, which are 100. **The ETCS change confirms
100; it does not introduce 110.**

### 2d. The open risk: the DL locomotive is published at 80 km/h

Secondary commentary (Greater Auckland, 23 Mar 2026, and other blogs) says Te Huia moves to
ETCS-fitted **DL** locomotives, *"modified with increased speed to 100kph"*, because the DFBs are not
being ETCS-converted. I found **no primary source** for that modification. What the primary source
says is that **L1.1 §1.20.1, published 16 September 2026 — one day before this research — still
lists `DL — 80`**, with no Te Huia exception. If Te Huia is now DL-hauled and the modified units are
not separately authorised, its effective cap would be **80 km/h**, not 100 and certainly not 110.
Flagged as unresolved in §6.

### 2e. So what is the right fallback?

Stating only what the sources support: **the published Exp P line speed is 100 km/h across the whole
Auckland chain, and the current locomotive class is separately limited to 100 km/h.** A flat cap of
100 is therefore both the sectional answer and the fallback answer — they coincide. Whether to use
100, or 80 to be conservative about the DL question, is a design call for the spec, not settled here.

---

## 3. Granularity — per portion of line, bounded by named locations and km posts

The LNI tables are published at **"Portion of Line" granularity**, where a portion is delimited
either by station/junction names (`Westfield – Pukekohe`) or by NIMT metrage to two or three decimal
places (`CIMW Site between 649.400 km and 649.600 km`, `turnouts at Junction with North Auckland Line
at 666.01 km`). Metrage is physically marked: TAIC RO-2021-103 footnote 17 — *"Metrage is marked out
by trackside pegs every kilometre and every half kilometre"*. There is **no per-block and no
per-signal-section speed publication**; individual signals carry speed indicators, but those are
dynamic route-setting speeds, not line speeds (TAIC RO-2023-104 §2.35: *"KiwiRail's signalling rules
define not only the authority to occupy sections of track but also the maximum speed at which trains
may travel"*).

**Expressibility against the 62-block chain from ticket 03:** trivially, and that is the useful
finding. Because the Exp P value is **100 km/h for every portion of line the chain touches**, the
whole 62-block chain takes a single value. No km-post-to-block mapping is needed at all. Only three
things would ever need per-block expression:

| Where | Blocks (ticket 03 numbering) | Exp P speed |
| --- | --- | --- |
| Whole chain, default | all 62 | 100 |
| Turnout 1589, Westfield Jn – Sylvia Park, **Up (northbound) only** | ~340 / 341 | 60 |
| The Strand Overbridge → 33 points, terminal approach | ~300 / 322 | 40 (and unconfirmed for the platform itself) |

The board model cannot currently express the second of those anyway: ticket 03 established that AKL
blocks carry no direction, no bearing and no km posts, so a direction-dependent 60 km/h turnout
restriction has nowhere to live without new config.

---

## 4. Cross-check against the timetable — the cap would essentially never bind

Distances are from the **ticket 03 centroid polyline** (62 blocks, 50.827 km total), measured
between the three stop blocks: `300 The Strand`, `170 Puhinui`, `207 Pukekohe`.

- The Strand → Puhinui: **21.172 km**
- Puhinui → Pukekohe: **29.655 km**
- The Strand → Pukekohe: **50.827 km**

Sanity check against KiwiRail metrage: the chain gives Papakura (188) → Pukekohe (207) =
**17.846 km**; KiwiRail's metrages (647.02 − 628.86) give **18.160 km**. The chain is 1.7 % short,
exactly the chord-cutting error ticket 03 §5 predicted. Good enough for speed arithmetic.

### 4a. Implied average speed, every timetabled leg

**WRC published times** (booklet valid 14 Jul 2025):

| Service | Leg | km | min | km/h |
| --- | --- | --- | --- | --- |
| Mon–Wed 1 NB | Pukekohe → Puhinui | 29.65 | 38 | **46.8** |
| Mon–Wed 1 NB | Puhinui → Strand | 21.17 | 27 | **47.0** |
| Mon–Wed 2 NB | Pukekohe → Puhinui | 29.65 | 37 | **48.1** |
| Mon–Wed 2 NB | Puhinui → Strand | 21.17 | 31 | **41.0** |
| Thu–Fri 2 NB | Pukekohe → Puhinui | 29.65 | 36 | **49.4** |
| Thu–Fri 2 NB | Puhinui → Strand | 21.17 | 28 | **45.4** |
| Sat 1 NB | Pukekohe → Puhinui | 29.65 | 35 | **50.8** |
| Sat 1 NB | Puhinui → Strand | 21.17 | 29 | **43.8** |
| Sat 2 NB | Pukekohe → Puhinui | 29.65 | 34 | **52.3** |
| Sat 2 NB | Puhinui → Strand | 21.17 | 28 | **45.4** |
| Sun NB | Pukekohe → Puhinui | 29.65 | 37 | **48.1** |
| Sun NB | Puhinui → Strand | 21.17 | 32 | **39.7** |
| Mon–Wed 1 SB | Strand → Puhinui | 21.17 | 30 | **42.3** |
| Mon–Wed 1 SB | Puhinui → Pukekohe | 29.65 | 32 | **55.6** |
| Mon–Wed 2 SB | Strand → Puhinui | 21.17 | 35 | **36.3** |
| Mon–Wed 2 SB | Puhinui → Pukekohe | 29.65 | 37 | **48.1** |
| Thu–Fri 2 SB | Strand → Puhinui | 21.17 | 34 | **37.4** |
| Thu–Fri 2 SB | Puhinui → Pukekohe | 29.65 | 30 | **59.3** |
| Sat 1 SB | Strand → Puhinui | 21.17 | 33 | **38.5** |
| Sat 1 SB | Puhinui → Pukekohe | 29.65 | 29 | **61.4** |
| Sat 2 SB | Strand → Puhinui | 21.17 | 27 | **47.0** |
| Sat 2 SB | Puhinui → Pukekohe | 29.65 | 30 | **59.3** |
| Sun SB | Strand → Puhinui | 21.17 | 27 | **47.0** |
| Sun SB | Puhinui → Pukekohe | 29.65 | 30 | **59.3** |

**AT GTFS times** (the authoritative source per ticket 14) are tighter-banded, because the feed uses
the same 34 / 29 / 30 / 37-minute values across most trips:

| Leg pattern | km | min | km/h |
| --- | --- | --- | --- |
| NB Pukekohe → Puhinui (all 6 trips) | 29.65 | 34 | **52.3** |
| NB Puhinui → Strand (Thu, Sat ×2) | 21.17 | 29 | **43.8** |
| NB Puhinui → Strand (Wk ×2, Sun) | 21.17 | 34 | **37.4** |
| SB Strand → Puhinui (all 6 trips) | 21.17 | 30 | **42.3** |
| SB Puhinui → Pukekohe (all 6 trips) | 29.65 | 37 | **48.1** |

Across all 48 legs (24 published + 24 GTFS): **min 36.3, mean 46.9, max 61.4 km/h.**

### 4b. Would a 110 km/h cap ever bind? Almost certainly not.

Three ways of putting it:

1. **Under the interpolation the map already chose**, position is distance-proportional along the
   polyline between the two bounding scheduled times (map note 7). That makes the ghost's
   instantaneous speed *equal to the leg average by construction*. The maximum it can ever reach,
   unperturbed, is **61.4 km/h** — the Saturday southbound Puhinui → Pukekohe leg. A 110 cap is
   **79 % above** the fastest speed the model can produce on its own. A 100 cap is 63 % above it.
2. **End to end**, The Strand → Pukekohe is 50.83 km. At 110 km/h that is **27.7 minutes**. The
   fastest this is ever timetabled is **63–64 minutes**. The schedule is running at less than half
   the cap.
3. **The cap can only bind via the conflict rules.** The only thing that can push the ghost above
   its scheduled pace is map note 9's "run Te Huia ahead of schedule to stay a block in front" of a
   closing AT train. For the cap to engage, that logic would have to drive the ghost at:
   - **more than 1.63x** scheduled pace on the fastest leg, to hit 100 km/h;
   - **more than 1.79x** on the fastest leg, to hit 110 km/h;
   - **more than 2.13x** the 46.9 km/h mean leg, to hit 100.

   An AT service that closes on Te Huia fast enough to demand a sustained 1.6–2x speed-up over a
   whole leg is possible in principle (an EMU at 110 on Westfield–Pukekohe genuinely does run ~2x
   Te Huia's timetabled pace), but the run-early rule only needs to keep **one block** of clearance,
   and the blocks on this chain average 833 m — so the required burst is short and local, not a
   sustained leg-length overspeed.

**Plain answer to the ticket's question 4: the cap almost never binds.** It is a safety rail on the
conflict-resolution logic, not part of the movement model. Whether it is 100 or 110 changes nothing
about how the ghost normally moves; it only changes the worst-case behaviour of the run-early clamp.
The repo owner should treat this as a small correctness detail — **the value should be 100 because
that is what the primary source says, but nobody should build machinery for sectional speeds.**
A single constant, sourced and commented, is proportionate.

---

## 5. Sources that were checked and turned out to publish nothing

Recorded so nobody repeats the search:

- **KiwiRail Rail Network Investment Programme 2024–27** (80 pp, the statutory investment programme
  required for NLTF funding). Contains **no line speeds at all** — the word "speed" occurs 6 times,
  none of them a figure; the only one in an infrastructure sense is *"measures, such as reduced speed
  or lower axle load"* as a generic mitigation. It publishes axle-load capability (20 tonne max,
  "on a 50 km section in Auckland carrying steel billet") but not speed.
- **NZTA / Waka Kotahi.** NZTA is the funder and the rail safety regulator; it does not publish line
  speeds. Its rail material (the NZ Rail Plan, the NLTP) is investment-level.
- **Auckland Transport.** AT publishes no line-speed data; the Rail Network Rebuild project pages
  describe speed *restrictions* qualitatively. AT is not the track owner — KiwiRail is.
- **KiwiRail Rail Network Rebuild FAQs (Oct 2022):** no km/h figures.
- **OIA request 28047** (Aug 2024 response) specifically asked KiwiRail for Auckland TSR locations.
  The response gave narrative only — TSRs *"decreased from approximately 8 km in January to 4 km"*,
  a 40 km/h restriction between Greenlane and Remuera from a collapsed stormwater pipe, and delay
  figures for Wiri–Westfield (~58 s) and Newmarket–Britomart (~1 min 26 s). **No table of
  restrictions by location or km post was released.**
- **Published sectional running times:** the Train Running and Timetabling Manual defines "Basic
  Running Time" (§2.2) as a concept and the rules for computing it, but **publishes no BRT values**
  for any section. No sectional running time table for the NIMT was found anywhere public.
- **"TO10 Network Line Speeds"** — the LNIs and the Passenger Vehicle Operations Manual repeatedly
  cite a document by this name as the network-wide default line-speed standard (turnouts §4.3, lines
  other than main and branch §4.4). **I could not locate TO10 itself** at any public URL. The LNI
  tables appear to be the operative per-section overlay on it, so its absence does not change the
  answer for Te Huia's sections, but the network-wide defaults for turnouts and sidings are unread.
- **Temporary speed restrictions** are published by KiwiRail as periodic "Speed Restriction advice"
  and daily "Heat Sheets" (e.g. `Heat L2 ECMT and Branches.pdf`, `Heat L1 Te Rapa - Whangarei - V2.pdf`
  on the Shield content host). These are **transient by nature** and no Auckland-metro heat sheet was
  retrieved. They are not a basis for a static model.

Note the one number that would have misled: KiwiRail's own media release says the Auckland metro
network runs at **80 km/h** (*"the current 80 to 40 kph across the metro network"*). That was a
**2022 statement made during the Rail Network Rebuild**, describing the then-degraded state before a
further blanket reduction to 40. The rebuild completed in January 2026, and the current L1.1 table
(16 Sep 2026) gives 100/110. The 80 figure is historical and should not be used. Likewise TAIC
RO-2023-104 §3.25's *"maximum permitted line speed of 80 kilometres per hour"* is real but is for
**Penrose on the North Auckland Line** — the route Te Huia took in June 2023 (§2.6: it *"left the
NIMT at the Westfield junction … on to the North Auckland line"*), which is **not** the current
Eastern-line chain. L1.1 §1.20.2 gives Westfield – Newmarket as Exp P/"P" 80, corroborating that
figure for that route, and confirming it is a *different, slower* line than the one Te Huia now uses.

---

## Unknown / could not confirm

1. **Whether the retrieved Shield documents are the current revisions.** The document index requires
   Entra sign-in, which I did not attempt. Each PDF's own publication date is quoted in the sources
   table; all are 2025–2026 and L1.1 is dated 16 Sep 2026, but "latest" could not be verified against
   an index.
2. **Te Huia's current locomotive class, and therefore its current motive-power limit.** Primary
   sources establish DFB = 100 km/h and DL = 80 km/h (L1.1 §1.20.1, published 16 Sep 2026, no Te Huia
   exception). Secondary commentary says Te Huia moved to ETCS-fitted DLs "modified with increased
   speed to 100 kph" from around August 2026. **No primary source found** for the modification or for
   a DL authorisation above 80. If the secondary account is right the answer is 100; if the LNI table
   is read literally and Te Huia is DL-hauled, it is 80.
3. **The SR / SRC / SRV carriage maximum speed as an explicit figure.** Inferred as 100 km/h from the
   Exp P class definition ("all vehicles authorised to run at 100 km/h") plus Te Huia's use of the
   Exp P column. Not found stated numerically in the Passenger Vehicle Operations Manual or ROC S1.
4. **The speed limit into The Strand platform itself.** L1.1's Auckland-end exceptions are written
   around Waitematā/Britomart. The nearest applicable figure is 40 km/h from The Strand Overbridge to
   33 points (Up). No Exp P platform-approach figure for The Strand was found. Compounded by ticket
   03 unknown #3 — nothing marks where in the 540 m block 300 the platform is.
5. **"TO10 Network Line Speeds"** could not be located publicly (see §5). Network-wide defaults for
   turnouts and non-main lines are therefore unread.
6. **Which km post each of the 62 blocks corresponds to.** Not derived — and not needed, because the
   Exp P value is uniform at 100 across the chain. If a future ticket wants the 60 km/h turnout-1589
   restriction or the Strand approach modelled per-block, that mapping would have to be built, and
   ticket 03 established the AKL KML carries no km-post or direction data to build it from.
7. **Whether Te Huia is timetabled as Exp P in every case.** Inferred from L2 §1.6.3 placing the
   Te Huia-specific restrictions in the Exp P column, and from the Train Running manual's "13xx
   Hamilton – Strand (Te Huia)" numbering. No document was found that states Te Huia's train class
   in so many words.
8. **Current temporary speed restrictions** on the chain. Transient, not retrieved, and out of scope
   for a static model — but they mean the *actual* permitted speed on any given day may be below the
   published 100.
