# 16 — Track speed limits along Te Huia's chain

Type: research
Status: resolved
Blocked by: — (graduated from fog by 04)
Map: ../map.md

## Question

Ticket 04 capped Te Huia's movement at **track speed limits where they can be found, otherwise a flat 110 km/h**. Find the limits.

1. Are published line speed limits available for the sections Te Huia traverses — the NIMT between Pukekohe and Westfield, and the Eastern line between Westfield and The Strand? Try KiwiRail network statements, NZTA / Waka Kotahi, AT network documents, and any published sectional running times or permanent speed restriction tables.
2. Is 110 km/h the right flat fallback for Te Huia specifically (line class, rolling stock, and whether the ETCS fitment mentioned in [research/te-huia-timetable.md](../research/te-huia-timetable.md) §4 changes it)?
3. If sectional limits exist, at what granularity — per line section, per block, per km post? They have to be expressible against the 62-block chain from ticket 03.
4. Cross-check against the timetable: ticket 02 found Pukekohe→Puhinui is 38 min published / 34 min GTFS over ~30 km, i.e. an average around 50 km/h. If the average is that far below any plausible line speed, the cap may almost never bind — say so plainly, because that would make this a small correctness detail rather than a core part of the movement model.

If no published limits exist, say so and the flat 110 km/h fallback stands as decided.

## Findings

Write to `../research/line-speeds.md` and link it here.


## Answer

**Published sectional line speeds exist, and 110 km/h is the wrong number.** KiwiRail's Local
Network Instructions **L1.1 Pukekohe – Waitākere** §1.20.5 tabulate line speed by portion of line and
train class. Te Huia runs as **Exp P**, and the Exp P value is **100 km/h** for `Auckland – Westfield`
*and* `Westfield – Pukekohe`, in both directions. (AT's "Eastern line" is KiwiRail's NIMT
`Auckland – Westfield`, so both of Te Huia's Auckland sections sit in one table.) **110 km/h is the
ETCS-fitted AM-class EMU figure**, and even for an EMU it applies only to Westfield – Pukekohe.
Te Huia's DFB locomotive is separately limited to 100 km/h, and ETCS pins it there rather than
raising it: L1.1 §1.13 requires locomotive-hauled passenger consists to be entered at *"100 km/h for
passenger trains"*, with posted line speeds taking precedence over the DMI. Caveat: L1.1 lists
`DL — 80`, and Te Huia may now be DL-hauled — unresolved.

**Granularity:** per "portion of line", delimited by station/junction names or NIMT metrage to 2–3
decimals. But this is moot — the Exp P value is a uniform **100 across all 62 blocks**, so no
km-post-to-block mapping is needed. Only two on-chain exceptions exist: 60 km/h through turnout 1589
(Westfield Jn – Sylvia Park, northbound only) and 40 km/h on the Strand terminal approach.

**The cap would essentially never bind.** Using the ticket-03 chain distances (Strand→Puhinui
21.17 km, Puhinui→Pukekohe 29.66 km), all 48 timetabled legs average **36.3–61.4 km/h, mean 46.9**.
Because interpolation is distance-proportional between bounding scheduled times, the ghost's
instantaneous speed *equals the leg average by construction* — unperturbed it can never exceed
**61.4 km/h**. End to end, 50.83 km at 110 km/h is 27.7 min against a timetabled 63–64 min. The cap
can only engage if the conflict rules' run-early clamp drives the ghost at **>1.63x** scheduled pace
(to hit 100) or **>1.79x** (to hit 110). So this is a safety rail on the conflict logic, **not part of
the movement model** — a small correctness detail. Use 100 because that is what the source says, but
build no sectional-speed machinery.

Detail, with every source URL and an explicit unknowns list: [../research/line-speeds.md](../research/line-speeds.md).

## Amendment (repo owner, 2026-09-18)

The `DL — 80 km/h` caveat is closed. Te Huia is hauled by the **DLP**, the passenger variant, which runs at **100 km/h** — consistent with the Exp P class figure of 100 rather than in conflict with it. The cap stands at **100 km/h across all 62 blocks**.

Owner-supplied domain knowledge, not from a primary document: L1.1's table lists `DL` at 80 and does not, on the reading in [research/line-speeds.md](../research/line-speeds.md), distinguish the DLP variant. The class-based figure (Exp P = 100) governs regardless, so the two routes to the answer agree.
