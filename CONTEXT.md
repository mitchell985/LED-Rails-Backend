# Context

Glossary for LED-Rails-Backend. Terms only — no implementation detail, no decisions.

## Rail network

A city whose trains are tracked and rendered onto one LED board. Auckland (AKL), Wellington (WLG) and Melbourne (MEL) today. Each has its own config, track blocks and board revisions.

## Track block

A section of track represented by exactly one LED on the board. Defined as a polygon in the network's KML. A block may restrict which **routes** may occupy it, and may carry **platforms**.

## Tracked train

A train the backend believes is on the network right now, with a position, a current and previous block, and a route. Tracked trains are what the LED board renders.

## Realtime vehicle

A vehicle position published by the transport agency's GTFS-realtime feed. The source of truth for a tracked train's position; never adjusted by this backend.

## Scheduled train

A train placed on the network from **static** timetable data alone, because no realtime position exists for it. Its position is derived from where it *should* be between two scheduled station times. Te Huia is the first. A scheduled train is still a tracked train — the board cannot tell the difference — but it yields to realtime vehicles, never the other way round.

Distinct from the **timetable header**, which is static GTFS compiled to a firmware fallback for when the board has no network at all. Both derive from timetables; only a scheduled train is live.

## Route

The service a train is running, identified by the agency's route id and mapped to a colour on the board. Also the unit of permission on a track block's allow-list.

## Display threshold

How long a train keeps being displayed after its last position update, before it is treated as gone.

## Block chain

The ordered sequence of track blocks a service traverses across the board, in one direction of travel. Used for scheduled trains, where "ahead" and "behind" mean position along the chain rather than geography.

## Simulated time

An instant other than now, at which the board's state is computed. Only scheduled trains can be placed at a simulated instant; realtime vehicles cannot be rewound.
