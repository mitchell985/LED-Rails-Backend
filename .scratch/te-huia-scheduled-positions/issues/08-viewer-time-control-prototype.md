# 08 — Prototype: the viewer's time control

Type: prototype
Status: resolved
Blocked by: — (07 resolved)
Map: ../map.md

## Question

`viewer.html` today just polls `DATA_ENDPOINT` on a timer with no concept of time. Prototype the control — date picker, service-day slider, play/pause, speed multiplier, and a live-mode fallback — against a stubbed `?time=` endpoint.

Ticket 07 fixed the contract it builds against: one request per simulated instant, `timestamp` = the simulated moment, `simulated: true` on the payload, `update` ignored in simulated mode.

What it must answer: what the polling model becomes in simulated mode (does playback drive one request per simulated tick, or fetch a range once?), how scrubbing feels at 60×, and how the control makes it obvious the board is not live.

Link the prototype from this ticket; do not merge it.

## Answer

**Prototype:** [`../prototypes/viewer-time-PROTOTYPE.html`](../prototypes/viewer-time-PROTOTYPE.html) — one self-contained file (691 KB; the board SVG and LED positions are inlined so it opens by double-click, with no server and no network). Sub-shape A: the host page is the **real** `viewer.html`, unchanged except for its asset endpoints; the `?time=` endpoint is stubbed in-page against ticket 07's contract. Three variants on `?variant=A|B|C`, cycled with the floating bar or the arrow keys. **Throwaway — not merged.**

### Winner: variant A, the transport bar

Bottom bar, full width: date picker, a slider spanning the service day, play/pause, 1×/10×/60× speed chips, and a LIVE↔SIMULATED pill. Scrubbing is the primary affordance, and the whole bar turns amber while simulated, so the board's state is unmistakable without putting chrome over the board itself.

Rejected: **B (corner inspector)** — smallest footprint and best for "show me 08:35", but gives no sense of position within the day; **C (service timeline)** — picking a run rather than a time suits a six-service timetable, but costs a 272 px rail and doesn't help with arbitrary moments.

### The clock

The viewer reads wall clock in **three places**, all of which misrender a payload whose `timestamp` is a simulated instant:

| line | what it does |
| --- | --- |
| `viewer.html:442` | `nowEpochSeconds` — decides whether an update's transition has happened yet, i.e. which of `b[0]`/`b[1]` lights |
| `viewer.html:503` | schedules the next fetch from `timestamp + update` |
| `viewer.html:517` | the fetch-delay debug log |

**Decided:** replace all three with a single `nowSeconds()` helper that returns the simulated instant when the payload carries `simulated: true`, and wall clock otherwise. This is precisely what ticket 07's marker is for.

The prototype instead **overrides `Date.now()` globally** while simulating — one line, no changes to the viewer's internals, and everything downstream believes the simulated time. It works, it is why the prototype renders correctly, and it must not ship: it also captures timers and anything else in the page that asks the time.

### Polling in simulated mode

Confirmed: playback drives requests from a `requestAnimationFrame` loop, not from the payload's `update` field. At 60× the server's 20 s cadence is meaningless, so ticket 07's decision that the viewer ignores `update` in simulated mode is not merely allowed, it is required.

### Trap for the implementer

`updateLEDsFromAPI` destructures `const [postBlock, preBlock] = update.b` (`viewer.html:414`), but the payload is `b: [pre, post]` — the local names are inverted relative to the server. **The behaviour is correct**; only the naming misleads. Do not "fix" it without tracing both sides.

### Still open, for ticket 09

The Te Huia yellow (`[255, 199, 0]` / `#ffc700`) can now be judged on the real board in this prototype, next to the AT route colours — but it has not been confirmed. It remains a to-do on the spec.
