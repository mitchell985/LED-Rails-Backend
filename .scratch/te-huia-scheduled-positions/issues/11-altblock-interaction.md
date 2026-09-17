# 11 — Does Te Huia participate in the altBlock mechanism?

Type: grilling
Status: resolved
Blocked by: — (04 resolved)
Map: ../map.md

## Question

Ticket 03 found that `(+N)` is an **altBlock**: when two trains occupy one block, `updateAltBlocks()` (`trackBlocks.ts:852-882`) moves the second onto a spare LED, tie-broken by **route name, alphabetically**. That mechanism now collides with the conflict rules (map note 9), which were designed without knowing it existed.

Narrowed by ticket 04: only **in-service** AT trains can ever conflict with Te Huia, since out-of-service ones are ignored. Out-of-service trains can still be *assigned* to the same block, though, which is exactly when altBlock fires.

- Should a scheduled train take an altBlock LED when it shares a block with a realtime train, or should the yield rules guarantee that never happens?
- The rules are suspended while Te Huia dwells at The Strand, Puhinui and Pukekohe — precisely where sharing is expected. Puhinui (`+169`) and Pukekohe (`+206`) have alt LEDs; does a dwelling Te Huia belong on the alt LED or the main one?
- Alphabetical route tie-breaking means the chosen Te Huia route key silently decides which train gets bumped. Is that acceptable, or does a scheduled train need explicit lowest priority?
- `300 - The Strand` has no alt LED. What happens if a realtime train is ever assigned there?

## Answer

Decided with the repo owner, 2026-09-18.

### The priority rule

`updateAltBlocks` currently sorts trains sharing a block with `a.route.localeCompare(b.route)`, forcing `OUT-OF-SERVICE` last. That means **the route key silently decides who disappears** — `E-W-201` < `HUIA-404` < `O-W-201` < `S-C-201` < `TE-HUIA`. Replace that accident with an explicit three-tier order:

| tier | who | |
| --- | --- | --- |
| 1 | real, in service | keeps the block — sorted among themselves by `localeCompare`, exactly as today |
| 2 | **scheduled (Te Huia)** | yields to any real in-service train |
| 3 | out of service | yields to everything, as today |

Te Huia therefore **loses to every real in-service train** — consistent with ticket 04's principle that AT positions are ground truth and only the ghost ever yields — and **outranks a stabled unit**. That second half matters concretely: `172 Wiri Depot Platform` sits on the chain and has no alt LED, so without it a permanently stabled unit would blank Te Huia at the same spot on every single run. Instead the depot train's magenta LED drops for the tick or two Te Huia takes to pass.

Renaming the route can no longer flip any of this.

**This does not change behaviour for any existing network.** Tier 1 and tier 3 reproduce today's sort exactly; tier 2 is only reachable when a scheduled train exists, and AKL is the only network that will have one.

### Alt LEDs

Te Huia **takes the alt LED where one exists**, and is hidden only where one doesn't. Just 4 of its 62 chain blocks have one — `162(+161)`, `170(+169)`, `188(+189)`, `207(+206)` — but two of those are **Puhinui and Pukekohe**, exactly where Te Huia dwells with conflict rules suspended (ticket 06) and an AT train may legitimately pull alongside. Both trains stay visible wherever the hardware allows it.

### Why collisions are routine, not exceptional

Ticket 04 keeps same-direction in-service trains at least one clear block apart, so those shouldn't collide. Three cases still will, and they are common:

1. **Opposite-direction trains** — one polygon spans both tracks, so every AT train passing the other way shares Te Huia's block for a tick or two. In 58 of 62 blocks that means one of them is hidden; under this rule it is always Te Huia.
2. **Out-of-service units** — ignored by the conflict rules entirely (ticket 04), so they collide freely. Te Huia now wins these.
3. **During dwell** — conflict rules are suspended at the three stops; two of the three have alt LEDs, and the third resolves below.

**The Strand resolves for free.** Block 300 has no alt LED, but its allow-list admits only `OUT-OF-SERVICE` (plus Te Huia, per map note 10), so the only train that can ever contend there is an out-of-service one — which Te Huia now outranks. Te Huia keeps its terminus LED.

### Observed while resolving, not decided

`updateAltBlocks` assigns **both** the second and third train to the same `altBlock` (`i === 1 || i === 2`, `trackBlocks.ts:871`). Whether that is deliberate (better than hiding a third train) or an off-by-one is unclear from the code. It is reachable here — two real in-service trains plus Te Huia in one block would put Te Huia on the alt LED alongside the second train. Recorded in the map's fog rather than treated as this ticket's business.
