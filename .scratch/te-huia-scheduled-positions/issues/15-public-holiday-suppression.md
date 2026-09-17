# 15 — Which public holidays suppress Te Huia, and where do the dates come from?

Type: grilling
Status: resolved
Blocked by: — (graduated from fog by 14)
Map: ../map.md

## Question

Ticket 14 decided the board suppresses Te Huia on public holidays even when AT's feed schedules a service (the feed adds `Sunday-1` on 26 Oct, 25 Dec and 28 Dec 2026). WRC's booklet: *"Te Huia will not run on public holidays (actual or observed) due to track maintenance."* That rule now has to be made precise.

- **Which holidays?** New Zealand national holidays only, or also regional anniversary days — and if so, whose? The train runs through both Waikato and Auckland, which observe different anniversary dates, and the booklet doesn't say which govern.
- **"Actual or observed"** means Mondayisation: Christmas Day falling on a Saturday is observed the following Monday, and the two are different dates. Does suppression apply to both, or only the observed day?
- **Where do the dates come from?** A hardcoded list in config, a date library, a government data source, or derived from the feed itself? A hardcoded list needs maintaining every year — and silently stops working when nobody notices.
- **What happens when the list runs out** (the year rolls over and no dates are configured)? Fail open and show the train, or fail closed and suppress?
- **Planned closures that aren't public holidays**: WRC's timetable lists Fri 10 – Sun 12 July 2026 closed for Matariki-weekend track maintenance. Are ad-hoc closures in scope for the same mechanism, or ignored?
- Does suppression hide only Te Huia, or does the board need to indicate anything at all on a suppressed day?

## Answer

Decided with the repo owner, 2026-09-18.

### One list, not two mechanisms

Holidays and planned track closures are the same thing to the board — a date on which Te Huia does not run — so they share one committed list, each entry carrying its reason:

```json
// railNetworks/AKL/noServiceDates.json
{
  "validThrough": "2027-12-31",
  "dates": [
    { "date": "2026-10-26", "reason": "Labour Day" },
    { "date": "2026-12-25", "reason": "Christmas Day" },
    { "date": "2026-12-26", "reason": "Boxing Day (actual)" },
    { "date": "2026-12-28", "reason": "Boxing Day (observed)" },
    { "date": "2026-07-10", "reason": "Track maintenance — Matariki weekend closure" },
    { "date": "2026-07-11", "reason": "Track maintenance — Matariki weekend closure" },
    { "date": "2026-07-12", "reason": "Track maintenance — Matariki weekend closure" }
  ]
}
```

This replaces `suppressOnPublicHolidays: boolean` in ticket 05's schema with a file reference (`noServiceFile`), and **closes the map's fog item** about ad-hoc suspensions — the 3-day Matariki closure needs no extra concept.

### Scope

- **The eleven national public holidays, plus Auckland Anniversary.** The board depicts Auckland, so the Auckland provincial anniversary is the one governing the track Te Huia is on while it is visible at all. *Assumption to verify when the table is compiled:* whether the Waikato region observes a different anniversary day, and whether the operator suspends for it. If it does and does, that date joins the list — the mechanism already handles it.
- **Both the actual and the observed day** when a holiday is Mondayised, reading WRC's *"public holidays (actual or observed)"* literally. Track maintenance does not care which day is statutory. Worked example: Boxing Day 2026 falls on a Saturday and is observed on Monday 28 December — **both** dates are suppressed.
- **A committed table, not computed rules.** Most NZ holidays are computable, but **Matariki is not** — its dates are legislated as a published table through 2052 — so rule-based computation would still need a hardcoded list, plus the rule code. An npm holiday library was rejected as a new runtime dependency for a dozen dates a year.

### Precedence

This list **overrides the feed's `calendar_dates.txt`**, which is what ticket 14 decided: the feed removes `Weekday-3` and *adds* `Sunday-1` on 26 Oct, 25 Dec and 28 Dec 2026 — scheduling a Te Huia on Christmas Day. Where the list and the feed disagree, the list wins and the board shows nothing.

### When the table runs out

**Fail open** — show the train, and warn loudly once `validThrough` is within 60 days and again on every start past it. Failing closed would suppress Te Huia on every date beyond the table, which is a far worse failure than one phantom on one day. Settled as a routine call, not put to the owner.

### Suppression is silent

A suppressed day shows nothing at all. There is no "no service" indication on the board — this is the same path as a Sunday with no trip in the window, or a `?time=` outside the calendar (ticket 07).
