# LED-Rails-Backend

A backend service for real-time rail vehicle tracking for Live LED maps. Built with TypeScript for Bun.

This project is built for the Live Train Maps that I sell through my store: [keastudios.co.nz](https://keastudios.co.nz)

## Features

* **Multi-city Support:** Currently I have Auckland, Wellington and Melbourne rail networks but it should be easy to add more cities, with separate config folders containing `trackBlocks.kml` and `config.json` files.
* **Real-time GTFS Data Fetching:** Periodically fetches and caches GTFS-realtime vehicle data for supported cities.
* **LED Map Generation:** Computes and serves LED board updates based on train positions and track block occupancy.
* **Train Pair Detection:** Identifies and pairs trains running in close proximity (Used for AKL 6-car trains).
* **Train Blocks:** The `trackBlocks.kml` file can be edited with Google Earth for custom block layouts.
* **Scheduled Trains:** Services with no realtime feed can be placed from static GTFS timetable data alone, interpolated between their scheduled station times (used for Te Huia on the Auckland board).
* **Simulated Time:** Any board endpoint accepts `?time=<epoch seconds>` to render scheduled services at an arbitrary instant, and `/api/viewer` gains a transport bar to scrub through a service day.
* **API Endpoints:** RESTful endpoints for vehicle, train, and LED map data.
* **Compression:** Built-in zstd / brotli / gzip / deflate compression.
* **Docker Support:** Ready-to-run with Docker Compose for easy deployment.

## Code Structure

* `server.ts` - Main Bun webserver, API endpoints, and periodic data refresh logic.
* `railNetwork.ts` - City-specific configuration loader and documentation for `config.json` structure.
* `trackBlocks.ts` - KML parsing, block occupancy, and LED map update logic.
* `trainPairs.ts` - Train pair detection and caching.
* `scheduledTrains.ts` - Timetable distillation and position modelling for services with no realtime feed.
* `cache.ts` - Caching to and from gzipped JSON files.
* `customUtils.ts` - Utility functions, including timestamped & colorized logging.
* `map.html` - Leaflet-based web map for visualizing live train positions and track blocks.
* `viewer.html` - Preview of the circuit board

### Currently Supported Networks

* `railNetworks/AKL/` - Auckland
* `railNetworks/WLG/` - Wellington
* `railNetworks/MEL/` - Melbourne

## API Endpoints

Replace `<city>` with a lowercase city code (e.g. `akl`, `wlg`, `mel`) and `<version>` with the version number (e.g. `100` for V1.0.0).

**Local Example:** If running locally on port 3000 (default), you can view the Melbourne map at `http://localhost:3000/mel-ltm/api/map`

| Endpoint                          | Description                       |
| --------------------------------- | --------------------------------- |
| `/`                               | Basic server status               |
| `/<city>-ltm/status`              | City-specific server metrics      |
| `/<city>-ltm/api/vehicles`        | All active vehicle entities       |
| `/<city>-ltm/api/vehicles/trains` | Filtered list of active trains    |
| `/<city>-ltm/<version>.json`      | LED map update for the city board |
| `/<city>-ltm/api/viewer`          | Preview for the PCB               |
| `/<city>-ltm/api/map`             | Map of the raw GTFS positions     |

### Simulated time

`/<city>-ltm/<version>.json` and `/<city>-ltm/api/trackedtrains` accept `?time=<epoch seconds>`, returning the board as it would be at that instant. Only **scheduled** trains appear — realtime vehicles cannot be rewound, and leaving them out is what makes a given instant reproducible. Such a response carries `"simulated": true` and is served `Cache-Control: no-store`.

```
curl "http://localhost:3000/akl-ltm/110.json?time=1789682400"
```

### Scheduled trains

A network may declare services that have no realtime feed under `scheduledTrains` in `config.json`. Their timetable is distilled from GTFS into a small committed file beside `config.json`, refreshed automatically every `fetchIntervalDays`, or on demand:

```
bun scheduledTrains.ts AKL
```

Dates on which a service does not run — public holidays and planned closures — live in the network's `noServiceFile`, and override the feed's own calendar.

## Configuration

The `.env` file should be placed in the root of the repo and needs to contain one API key per line like this:

```
AKL=__Your__API__Key__Here__
WLG=__Your__API__Key__Here__ 
MEL=__Your__API__Key__Here__ 
```

You can also set the server port using `PORT=` (default: 3000).

City-specific configurations are in `railNetworks/` and the documentation for the structure of `config.json` is at the top of `railNetwork.ts`.

### Editing Track Blocks

* Edit `trackBlocks.kml` in Google Earth to customize block layouts for each city.
* Update `config.json` for each city to change API settings, colors, and thresholds.

## License

MIT License. See [LICENSE](LICENSE).