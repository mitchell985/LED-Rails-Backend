import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import readline from 'readline';

import { log } from './customUtils';
import { calculateDistance } from './trainPairs';
import type { RailNetwork } from './railNetwork';
import { isPointInPolygon } from './trackBlocks';
import type { TrackBlock, TrackBlockMap, TrainInfo } from './trackBlocks';

/**
 * Scheduled trains: services placed on the board from static GTFS timetable data alone,
 * because no realtime feed publishes them. Te Huia (route HUIA-404) is the first.
 *
 * A scheduled train is a *synthetic vehicle*: its position is computed each update tick and
 * injected as a TrainInfo alongside real ones, so block assignment, display thresholds,
 * map.html and generateLedMap() are all reused unchanged.
 *
 * Spec: .scratch/te-huia-scheduled-positions/spec.md
 */

/** Config for one scheduled service, from config.json. */
export interface ScheduledTrainConfig {
    id: string;                     // internal name, e.g. "te-huia"
    routeId: string;                // the FEED's route_id, verbatim, e.g. "HUIA-404"
    source: {
        api: string;                // GTFS v3 base, e.g. "https://api.at.govt.nz/gtfs/v3"
        zip: string;                // flat GTFS zip (calendars + shapes; v3 exposes neither)
        keyHeader?: string;         // header for the v3 key; the key itself comes from .env
        fetchIntervalDays: number;
        expectedTrips: number;      // staleness check: warn when the trip count changes
    };
    timetableFile: string;          // distilled timetable, committed, beside config.json
    noServiceFile: string;          // holidays + planned closures, committed
    blockChain: number[];           // north -> south; reversed for the other direction
    assumedDwellSeconds: number;    // CHOSEN, not sourced: the feed encodes zero dwell
    maxSpeedKmh: number;            // line speed cap; a safety rail, rarely binding
    conflict: { clearBlocks: number };
}

export interface DistilledStopTime {
    stopId: string;
    /** Seconds after midnight of the service day. May exceed 86400 (GTFS allows 24:00:00+). */
    time: number;
}

export interface DistilledTrip {
    tripId: string;
    serviceId: string;
    directionId: number;            // 0 = northbound (to The Strand), 1 = southbound
    shapeId: string;
    stops: DistilledStopTime[];
}

export interface DistilledTimetable {
    feedVersion: string;
    feedEndDate: string;            // YYYYMMDD; the feed's own expiry, watched for staleness
    generatedAt: string;
    routeId: string;
    trips: DistilledTrip[];
    calendar: Record<string, { days: number[]; start: string; end: string }>;
    calendarDates: Array<{ serviceId: string; date: string; exception: number }>;
    /** shapeId -> [lat, lon, metres travelled] */
    shapes: Record<string, Array<[number, number, number]>>;
    /** routeId -> directionId -> 'north' | 'south'; how each AT route's direction_id maps to travel. */
    routeOrientation: Record<string, Record<string, 'north' | 'south'>>;
    /** stopId -> position, so stops can be located along the shape. */
    stops: Record<string, { lat: number; lon: number; name: string }>;
}

export interface NoServiceDates {
    validThrough: string;
    dates: Array<{ date: string; reason: string }>;
}

// ─── shared helpers ────────────────────────────────────────────────────────────

/** "HH:MM:SS" -> seconds after midnight. Values past 24:00:00 are legal and preserved. */
export function gtfsTimeToSeconds(value: string): number {
    const [h, m, s] = value.split(':').map(Number);
    return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local civil date in a named timezone, as {y, m, d, weekday, secondsOfDay}. */
export function civilDate(epochSeconds: number, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-NZ', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, weekday: 'short',
    }).formatToParts(new Date(epochSeconds * 1000));

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const hour = Number(get('hour')) % 24;      // en-NZ can render midnight as 24
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return {
        date: `${get('year')}${get('month')}${get('day')}`,
        weekday: weekdays.indexOf(get('weekday')),
        secondsOfDay: hour * 3600 + Number(get('minute')) * 60 + Number(get('second')),
    };
}

/** The previous calendar date, as YYYYMMDD. */
export function previousDate(yyyymmdd: string): string {
    const y = Number(yyyymmdd.slice(0, 4)), m = Number(yyyymmdd.slice(4, 6)), d = Number(yyyymmdd.slice(6, 8));
    const prev = new Date(Date.UTC(y, m - 1, d - 1));
    return `${prev.getUTCFullYear()}${pad(prev.getUTCMonth() + 1)}${pad(prev.getUTCDate())}`;
}

// ─── distillation ──────────────────────────────────────────────────────────────

interface V3Resource { id: string; attributes: Record<string, string | number> }

async function v3(base: string, route: string, keyHeader?: string, key?: string): Promise<V3Resource[]> {
    const headers = new Headers({ Accept: 'application/vnd.api+json' });
    if (keyHeader && key) headers.append(keyHeader, key);

    const response = await fetch(`${base}${route}`, { headers });
    if (!response.ok) throw new Error(`GTFS v3 ${route} -> ${response.status} ${response.statusText}`);

    const body = await response.json() as { data?: V3Resource[] };
    return body.data ?? [];
}

/** Reads one entry of a GTFS zip line by line, without holding the decompressed file in memory. */
async function readZipEntryLines(unzippedDir: string, name: string, onLine: (cols: string[], header: string[]) => void): Promise<void> {
    const file = path.join(unzippedDir, name);
    if (!fs.existsSync(file)) throw new Error(`GTFS zip is missing ${name}`);

    const stream = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    let header: string[] | undefined;

    for await (const line of stream) {
        if (!line) continue;
        const cols = line.split(',').map(c => c.replace(/^"|"$/g, ''));
        if (!header) { header = cols.map(c => c.replace(/^﻿/, '')); continue; }
        onLine(cols, header);
    }
}

/**
 * Fetches and distils one scheduled service's timetable into a small committed file.
 *
 * The timetable comes from GTFS v3 (~31 KB). Calendars and shapes come from the flat zip,
 * because v3 exposes neither — it has no calendar, calendar_dates, agency or shapes resource,
 * and its filter[service_id] / filter[date] parameters are accepted then silently ignored.
 *
 * stop_times.txt (127 MB) is never read: v3 already gave us the only 72 rows that matter.
 */
export async function distilTimetable(network: RailNetwork, scheduled: ScheduledTrainConfig, key?: string): Promise<DistilledTimetable> {
    const { api, zip, keyHeader, expectedTrips } = scheduled.source;
    log(network.id, `Distilling ${scheduled.id} timetable from ${api}`);

    // 1. Feed version, for staleness checks and to decide whether the zip needs re-reading.
    const versions = await v3(api, '/versions', keyHeader, key);
    const today = civilDate(Date.now() / 1000, AUCKLAND).date;
    const current = versions.find(v => {
        const start = String(v.attributes.feed_start_date ?? '');
        const end = String(v.attributes.feed_end_date ?? '');
        return start <= today && today <= end;
    }) ?? versions[versions.length - 1];
    const feedVersion = String(current?.attributes?.feed_version ?? 'unknown');
    const feedEndDate = String(current?.attributes?.feed_end_date ?? '');

    // 2. Trips and stop times from v3.
    const tripRows = await v3(api, `/routes/${scheduled.routeId}/trips`, keyHeader, key);
    if (tripRows.length !== expectedTrips) {
        log(network.id, `⚠ ${scheduled.id}: feed has ${tripRows.length} trips, expected ${expectedTrips} — timetable may have changed`);
    }

    const trips: DistilledTrip[] = [];
    for (const row of tripRows) {
        const stopRows = await v3(api, `/trips/${row.id}/stoptimes`, keyHeader, key);
        const stops = stopRows
            .map(s => ({
                sequence: Number(s.attributes.stop_sequence),
                stopId: String(s.attributes.stop_id),
                time: gtfsTimeToSeconds(String(s.attributes.departure_time ?? s.attributes.arrival_time)),
            }))
            .sort((a, b) => a.sequence - b.sequence)
            .map(({ stopId, time }) => ({ stopId, time }));

        trips.push({
            tripId: row.id,
            serviceId: String(row.attributes.service_id),
            directionId: Number(row.attributes.direction_id),
            shapeId: String(row.attributes.shape_id),
            stops,
        });
    }

    const serviceIds = new Set(trips.map(t => t.serviceId));
    const shapeIds = new Set(trips.map(t => t.shapeId));

    // 3. Calendars, shapes and route orientation from the flat zip.
    const cacheDir = path.resolve(__dirname, 'cache', network.id, 'gtfsStaticZip');
    fs.mkdirSync(cacheDir, { recursive: true });
    const zipPath = path.join(cacheDir, 'gtfs.zip');

    log(network.id, `Fetching ${zip} for calendars and shapes`);
    const response = await fetch(zip);
    if (!response.ok) throw new Error(`GTFS zip -> ${response.status} ${response.statusText}`);
    fs.writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));

    const unzippedDir = path.join(cacheDir, 'unzipped');
    fs.rmSync(unzippedDir, { recursive: true, force: true });
    const archive = new AdmZip(zipPath);
    for (const entry of ['calendar.txt', 'calendar_dates.txt', 'trips.txt', 'shapes.txt', 'routes.txt', 'stops.txt']) {
        if (archive.getEntry(entry)) archive.extractEntryTo(entry, unzippedDir, false, true);
    }

    const calendar: DistilledTimetable['calendar'] = {};
    await readZipEntryLines(unzippedDir, 'calendar.txt', (cols, header) => {
        const row = Object.fromEntries(header.map((h, i) => [h, cols[i]])) as Record<string, string>;
        if (!serviceIds.has(row.service_id!)) return;
        calendar[row.service_id!] = {
            days: [row.sunday, row.monday, row.tuesday, row.wednesday, row.thursday, row.friday, row.saturday].map(Number),
            start: row.start_date!,
            end: row.end_date!,
        };
    });

    const calendarDates: DistilledTimetable['calendarDates'] = [];
    await readZipEntryLines(unzippedDir, 'calendar_dates.txt', (cols, header) => {
        const row = Object.fromEntries(header.map((h, i) => [h, cols[i]])) as Record<string, string>;
        if (!serviceIds.has(row.service_id!)) return;
        calendarDates.push({ serviceId: row.service_id!, date: row.date!, exception: Number(row.exception_type) });
    });

    // Rail routes, so we can work out which way each direction_id travels.
    const railRoutes = new Map<string, string>();       // routeId -> routeId (route_type 2 only)
    await readZipEntryLines(unzippedDir, 'routes.txt', (cols, header) => {
        const row = Object.fromEntries(header.map((h, i) => [h, cols[i]])) as Record<string, string>;
        if (Number(row.route_type) === 2) railRoutes.set(row.route_id!, row.route_id!);
    });

    // One representative shape per (route, direction) is enough to orient it.
    const orientationShape = new Map<string, { routeId: string; direction: string }>();
    await readZipEntryLines(unzippedDir, 'trips.txt', (cols, header) => {
        const row = Object.fromEntries(header.map((h, i) => [h, cols[i]])) as Record<string, string>;
        if (!railRoutes.has(row.route_id!) || !row.shape_id) return;
        const seen = [...orientationShape.values()].some(v => v.routeId === row.route_id && v.direction === row.direction_id);
        if (!seen) orientationShape.set(row.shape_id, { routeId: row.route_id!, direction: row.direction_id! });
    });

    // Single pass over shapes.txt: keep our own shapes in full, and the endpoints of the rest.
    const shapes: DistilledTimetable['shapes'] = {};
    const endpoints = new Map<string, { firstLat: number; lastLat: number }>();
    await readZipEntryLines(unzippedDir, 'shapes.txt', (cols, header) => {
        const row = Object.fromEntries(header.map((h, i) => [h, cols[i]])) as Record<string, string>;
        const id = row.shape_id!;
        const lat = Number(row.shape_pt_lat), lon = Number(row.shape_pt_lon);

        if (shapeIds.has(id)) {
            (shapes[id] ??= []).push([lat, lon, Number(row.shape_dist_traveled ?? 0)]);
        }
        if (orientationShape.has(id)) {
            const seen = endpoints.get(id);
            if (!seen) endpoints.set(id, { firstLat: lat, lastLat: lat });
            else seen.lastLat = lat;
        }
    });

    const stopIds = new Set(trips.flatMap(t => t.stops.map(s => s.stopId)));
    const stops: DistilledTimetable['stops'] = {};
    await readZipEntryLines(unzippedDir, 'stops.txt', (cols, header) => {
        const row = Object.fromEntries(header.map((h, i) => [h, cols[i]])) as Record<string, string>;
        if (!stopIds.has(row.stop_id!)) return;
        stops[row.stop_id!] = { lat: Number(row.stop_lat), lon: Number(row.stop_lon), name: row.stop_name ?? '' };
    });

    const routeOrientation: DistilledTimetable['routeOrientation'] = {};
    for (const [shapeId, { routeId, direction }] of orientationShape) {
        const ends = endpoints.get(shapeId);
        if (!ends) continue;
        (routeOrientation[routeId] ??= {})[direction] = ends.lastLat > ends.firstLat ? 'north' : 'south';
    }

    // Distances: AT publishes shape_dist_traveled in km; fall back to measuring if it is absent.
    for (const points of Object.values(shapes)) {
        points.sort((a, b) => a[2] - b[2]);
        const hasDistances = points[points.length - 1]![2] > 0;
        let metres = 0;
        for (let i = 0; i < points.length; i++) {
            if (hasDistances) points[i]![2] = points[i]![2] * 1000;
            else {
                if (i > 0) metres += calculateDistance(points[i - 1]![0], points[i - 1]![1], points[i]![0], points[i]![1]);
                points[i]![2] = metres;
            }
        }
    }

    fs.rmSync(cacheDir, { recursive: true, force: true });      // keep the distillate, discard the bulk

    const distilled: DistilledTimetable = {
        feedVersion,
        feedEndDate,
        generatedAt: new Date().toISOString(),
        routeId: scheduled.routeId,
        trips,
        calendar,
        calendarDates,
        shapes,
        routeOrientation,
        stops,
    };

    const outPath = path.resolve(network.configFolderPath, scheduled.timetableFile);
    fs.writeFileSync(outPath, JSON.stringify(distilled));
    log(network.id, `Distilled ${trips.length} trips, ${Object.keys(shapes).length} shapes, ` +
        `${Object.keys(calendar).length} calendars -> ${scheduled.timetableFile} ` +
        `(${(fs.statSync(outPath).size / 1024).toFixed(0)} KiB, feed ${feedVersion})`);

    return distilled;
}

// ─── runtime ───────────────────────────────────────────────────────────────────

const AUCKLAND = 'Pacific/Auckland';

interface ChainNode {
    index: number;
    blockNumber: number;
    block: TrackBlock;
    centroid: [number, number];
    allowed: boolean;                           // the block's route allow-list admits this service
}

interface ShapeGeometry {
    points: Array<[number, number, number]>;    // lat, lon, metres travelled
    sequence: number[];                         // chain indices in travel order, consecutive duplicates removed
    seqPos: Map<number, number>;                // chain index -> position in sequence
    seqMin: number[];                           // metres at which each sequence entry begins
    seqMax: number[];                           // metres at which each sequence entry ends
    chainAt: Array<number | undefined>;         // chain index per shape point
}

interface PlannedStop {
    stopId: string;
    distance: number;                           // metres along the shape
    arrive: number;                             // seconds of service day
    depart: number;
    chainIndex: number | undefined;
}

interface TripPlan {
    trip: DistilledTrip;
    shape: ShapeGeometry;
    stops: PlannedStop[];
    boardStart: number;                         // metres: first stop that is on the board
    boardEnd: number;                           // metres: last stop that is on the board
    orientation: 'north' | 'south';
}

interface LiveState {
    distance: number;
    lastTick: number;
    currentBlock?: number;
    previousBlock?: number;
    blockEnteredAt: number;
}

/**
 * One configured scheduled service, ready to place on the board.
 *
 * Two ways to ask where it is:
 *   - simulate(epoch)          pure, schedule only, no conflicts, no retained state. Reproducible,
 *                              which is what makes it usable for ?time=.
 *   - update(epoch, realTrains) live: applies the conflict rules and keeps position between ticks.
 */
export class ScheduledTrain {
    readonly config: ScheduledTrainConfig;
    readonly timetable: DistilledTimetable;
    private readonly noService: Map<string, string>;
    private readonly noServiceValidThrough: string;
    private readonly chain: ChainNode[];
    private readonly chainByBlock: Map<number, number>;
    private readonly plans: TripPlan[];
    private readonly live = new Map<string, LiveState>();
    private warnedExpiry = false;

    constructor(network: RailNetwork, config: ScheduledTrainConfig) {
        this.config = config;

        const timetablePath = path.resolve(network.configFolderPath, config.timetableFile);
        this.timetable = JSON.parse(fs.readFileSync(timetablePath, 'utf-8')) as DistilledTimetable;

        const noServicePath = path.resolve(network.configFolderPath, config.noServiceFile);
        const noService = JSON.parse(fs.readFileSync(noServicePath, 'utf-8')) as NoServiceDates;
        this.noService = new Map(noService.dates.map(d => [d.date.replace(/-/g, ''), d.reason]));
        this.noServiceValidThrough = noService.validThrough.replace(/-/g, '');

        this.chain = this.buildChain(network.trackBlocks);
        this.chainByBlock = new Map(this.chain.map(node => [node.blockNumber, node.index]));
        this.plans = this.buildPlans();

        const blocked = this.chain.filter(node => !node.allowed).map(node => node.blockNumber);
        if (blocked.length) {
            log(network.id, `⚠ ${config.id}: blocks ${blocked.join(', ')} exclude route ${config.routeId} ` +
                `— add it to the [...] allow-list in the KML or the train cannot be shown there`);
        }
        const today = civilDate(Date.now() / 1000, AUCKLAND).date;
        if (this.timetable.feedEndDate && today > this.timetable.feedEndDate) {
            log(network.id, `⚠ ${config.id}: the distilled feed expired on ${this.timetable.feedEndDate} — ` +
                `timetable may no longer be correct`);
        }
        if (this.plans.length !== config.source.expectedTrips) {
            log(network.id, `⚠ ${config.id}: ${this.plans.length} trips distilled, expected ` +
                `${config.source.expectedTrips} — the timetable has changed`);
        }

        log(network.id, `Loaded ${config.id}: ${this.plans.length} trips, ${this.chain.length} chain blocks, ` +
            `feed ${this.timetable.feedVersion}`);
    }

    /** The configured block chain, resolved against the network's blocks. */
    private buildChain(trackBlocks: TrackBlockMap | undefined): ChainNode[] {
        if (!trackBlocks) throw new Error('scheduled trains need track blocks');

        return this.config.blockChain.map((blockNumber, index) => {
            const block = trackBlocks.get(blockNumber);
            if (!block) throw new Error(`block ${blockNumber} in ${this.config.id}'s chain is not in the KML`);

            let lat = 0, lon = 0;
            for (const [pLat, pLon] of block.polygon) { lat += pLat; lon += pLon; }
            const n = block.polygon.length || 1;

            return {
                index,
                blockNumber,
                block,
                centroid: [lat / n, lon / n] as [number, number],
                allowed: !block.routes || block.routes.includes(this.config.routeId),
            };
        });
    }

    /**
     * The chain block containing a position, or undefined if it is off the board entirely.
     *
     * Searches ONLY this service's chain, never the whole board, so sidings and junction chords
     * cannot light whatever the geometry does. Containment only — a position 80 km away must come
     * back undefined, which is how we tell that a trip has not reached the board yet.
     */
    private chainIndexAt(lat: number, lon: number, near?: number): number | undefined {
        const candidates = this.chain.filter(node => node.allowed);

        const ordered = near === undefined ? candidates
            : [...candidates].sort((a, b) => Math.abs(a.index - near) - Math.abs(b.index - near));

        for (const node of ordered) {
            if (isPointInPolygon(lat, lon, node.block.polygon)) return node.index;
        }
        return undefined;
    }

    /**
     * The closest chain block to a position, whatever the geometry does.
     *
     * Used only once a train is known to be on the board, so that a computed position which falls
     * between two polygons still lights something — a scheduled train's position is derived, not
     * observed, so a dropout would be a bug we chose to display.
     */
    private nearestChainIndex(lat: number, lon: number): number {
        let best = 0, bestDistance = Infinity;
        for (const node of this.chain) {
            if (!node.allowed) continue;
            const d = calculateDistance(lat, lon, node.centroid[0], node.centroid[1]);
            if (d < bestDistance) { bestDistance = d; best = node.index; }
        }
        return best;
    }

    /** Precomputes shape geometry and per-trip stop timings. Done once, at load. */
    private buildPlans(): TripPlan[] {
        const geometries = new Map<string, ShapeGeometry>();

        for (const [shapeId, points] of Object.entries(this.timetable.shapes)) {
            const chainAt: Array<number | undefined> = [];
            const sequence: number[] = [];
            const seqMin: number[] = [];
            const seqMax: number[] = [];
            let previous: number | undefined;

            points.forEach(([lat, lon, metres], i) => {
                const index = this.chainIndexAt(lat, lon, previous);
                chainAt[i] = index;

                if (index !== undefined) {
                    if (index !== previous) { sequence.push(index); seqMin.push(metres); seqMax.push(metres); }
                    else seqMax[seqMax.length - 1] = metres;
                    previous = index;
                }
            });

            const seqPos = new Map<number, number>();
            sequence.forEach((index, position) => { if (!seqPos.has(index)) seqPos.set(index, position); });
            geometries.set(shapeId, { points, sequence, seqPos, seqMin, seqMax, chainAt });
        }

        const dwell = this.config.assumedDwellSeconds;

        return this.timetable.trips.map(trip => {
            const shape = geometries.get(trip.shapeId);
            if (!shape) throw new Error(`trip ${trip.tripId} references missing shape ${trip.shapeId}`);

            const stops: PlannedStop[] = trip.stops.map((stop, i) => {
                const location = this.timetable.stops[stop.stopId];
                const distance = location ? nearestDistance(shape, location.lat, location.lon) : 0;
                const chainIndex = location ? this.onChain(shape, distance) : undefined;

                // The published time is the ARRIVAL and the dwell falls after it. At a trip's own
                // origin nothing precedes departure, so there the dwell comes first instead.
                return i === 0
                    ? { stopId: stop.stopId, distance, chainIndex, arrive: stop.time - dwell, depart: stop.time }
                    : { stopId: stop.stopId, distance, chainIndex, arrive: stop.time, depart: stop.time + dwell };
            });

            const onBoard = stops.filter(stop => stop.chainIndex !== undefined);
            if (!onBoard.length) throw new Error(`trip ${trip.tripId} never reaches the board`);

            return {
                trip,
                shape,
                stops,
                boardStart: onBoard[0]!.distance,
                boardEnd: onBoard[onBoard.length - 1]!.distance,
                orientation: trip.directionId === 0 ? 'north' : 'south',
            };
        });
    }

    /** The chain index at a distance along a shape, if the shape is on the board there. */
    private onChain(shape: ShapeGeometry, metres: number): number | undefined {
        return shape.chainAt[nearestPointIndex(shape, metres)];
    }

    /** Whether this service runs on a given service day, feed calendars then local overrides. */
    private runsOn(serviceId: string, date: string, weekday: number): boolean {
        for (const exception of this.timetable.calendarDates) {
            if (exception.serviceId !== serviceId || exception.date !== date) continue;
            if (exception.exception === 2) return false;           // removed
            if (exception.exception === 1) return true;            // added
        }
        const calendar = this.timetable.calendar[serviceId];
        if (!calendar) return false;
        if (date < calendar.start || date > calendar.end) return false;
        return calendar.days[weekday] === 1;
    }

    /**
     * Trips that could be on the board at this instant, with the seconds-of-day to evaluate them at.
     *
     * Both today and yesterday are considered, because GTFS times may run past 24:00:00 and so
     * belong to the previous service day. Dates in noServiceDates.json are suppressed here — they
     * override the feed's own calendar, which schedules services on days the operator does not run.
     */
    private activeTrips(epochSeconds: number): Array<{ plan: TripPlan; secondsOfDay: number }> {
        const today = civilDate(epochSeconds, AUCKLAND);
        const yesterday = civilDate(epochSeconds - 86400, AUCKLAND);

        if (!this.warnedExpiry && today.date > this.noServiceValidThrough) {
            this.warnedExpiry = true;
            log(this.config.id, `⚠ ${this.config.noServiceFile} expired on ${this.noServiceValidThrough} — ` +
                `public holidays are no longer being suppressed. Extend the list.`);
        }

        const days = [
            { date: today.date, weekday: today.weekday, secondsOfDay: today.secondsOfDay },
            { date: yesterday.date, weekday: yesterday.weekday, secondsOfDay: today.secondsOfDay + 86400 },
        ];

        const active: Array<{ plan: TripPlan; secondsOfDay: number }> = [];
        for (const day of days) {
            if (this.noService.has(day.date)) continue;
            for (const plan of this.plans) {
                if (!this.runsOn(plan.trip.serviceId, day.date, day.weekday)) continue;
                const first = plan.stops[0]!, last = plan.stops[plan.stops.length - 1]!;
                if (day.secondsOfDay < first.arrive || day.secondsOfDay > last.depart) continue;
                active.push({ plan, secondsOfDay: day.secondsOfDay });
            }
        }
        return active;
    }

    /** Where the timetable says this trip is: distance-proportional between bounding scheduled times. */
    private scheduledDistance(plan: TripPlan, secondsOfDay: number): number {
        const stops = plan.stops;
        if (secondsOfDay <= stops[0]!.depart) return stops[0]!.distance;

        const last = stops[stops.length - 1]!;
        if (secondsOfDay >= last.arrive) return last.distance;

        for (let i = 0; i < stops.length - 1; i++) {
            const a = stops[i]!, b = stops[i + 1]!;
            if (secondsOfDay >= a.arrive && secondsOfDay <= a.depart) return a.distance;    // standing
            if (secondsOfDay > a.depart && secondsOfDay < b.arrive) {
                const fraction = (secondsOfDay - a.depart) / (b.arrive - a.depart);
                return a.distance + (b.distance - a.distance) * fraction;
            }
        }
        return last.distance;
    }

    /** The stop this trip is standing at, if the clock says so AND the train is actually there. */
    private dwellingAt(plan: TripPlan, secondsOfDay: number, chainIndex: number | undefined): PlannedStop | undefined {
        return plan.stops.find(stop =>
            secondsOfDay >= stop.arrive && secondsOfDay <= stop.depart &&
            stop.chainIndex !== undefined && stop.chainIndex === chainIndex);
    }

    /**
     * How far this trip may travel, given the real trains around it.
     *
     * Only Te Huia ever yields: real positions are ground truth and are never moved. Out-of-service
     * trains are ignored entirely — otherwise a unit stabled in a depot block that sits on the
     * running line would hold the service back on every run, forever.
     */
    private conflictLimits(plan: TripPlan, distance: number, realTrains: TrainInfo[]): { floor: number; cap: number } {
        const clear = this.config.conflict.clearBlocks + 1;
        const { sequence, seqPos, seqMin, seqMax } = plan.shape;

        const here = this.onChain(plan.shape, distance);
        const herePosition = here === undefined ? undefined : seqPos.get(here);
        if (herePosition === undefined) return { floor: -Infinity, cap: Infinity };

        let floor = -Infinity, cap = Infinity;

        for (const train of realTrains) {
            if (train.scheduled) continue;
            if (train.route === 'OUT-OF-SERVICE' || train.directionId === undefined) continue;

            const orientation = this.timetable.routeOrientation[train.route]?.[String(train.directionId)];
            if (orientation !== plan.orientation) continue;                  // opposite direction shares a block harmlessly

            const block = train.currentParentBlock ?? train.currentBlock;
            if (block === undefined) continue;
            const chainIndex = this.chainByBlock.get(block);
            if (chainIndex === undefined) continue;                          // not on this service's chain

            const position = seqPos.get(chainIndex);
            if (position === undefined) continue;

            if (position > herePosition) {
                const limit = position - clear;
                cap = Math.min(cap, limit >= 0 ? seqMax[limit]! : -Infinity);
            } else if (position < herePosition) {
                const limit = position + clear;
                floor = Math.max(floor, limit < sequence.length ? seqMin[limit]! : Infinity);
            }
        }
        return { floor, cap };
    }

    /** Builds the synthetic vehicle for a trip at a distance along its shape. */
    private toTrainInfo(plan: TripPlan, distance: number, epochSeconds: number, state?: LiveState): TrainInfo | undefined {
        if (distance < plan.boardStart || distance > plan.boardEnd) return undefined;

        const pointIndex = nearestPointIndex(plan.shape, distance);
        const point = plan.shape.points[pointIndex]!;
        // On the board by distance, so it must light something: fall back to the nearest block.
        const chainIndex = plan.shape.chainAt[pointIndex] ?? this.nearestChainIndex(point[0], point[1]);

        const node = this.chain[chainIndex]!;
        const blockNumber = node.blockNumber;

        let previousBlock = blockNumber;
        let enteredAt = epochSeconds - 1;
        if (state) {
            if (state.currentBlock !== blockNumber) {
                previousBlock = state.currentBlock ?? blockNumber;
                state.previousBlock = previousBlock;
                state.currentBlock = blockNumber;
                state.blockEnteredAt = epochSeconds;
            } else {
                previousBlock = state.previousBlock ?? blockNumber;
            }
            enteredAt = state.blockEnteredAt;
        }

        return {
            trainId: `${this.config.id}:${plan.trip.tripId}`,
            position: {
                latitude: point[0],
                longitude: point[1],
                timestamp: enteredAt,
                speed: undefined,
                bearing: undefined,
            },
            currentBlock: blockNumber,
            currentParentBlock: blockNumber,
            previousBlock,
            currentBlockDisplayThreshold: node.block.displayThreshold,
            route: this.config.routeId,
            directionId: plan.trip.directionId,
            scheduled: true,
            tripId: plan.trip.tripId,
            stops: undefined,
        };
    }

    /**
     * Schedule only, no conflicts, no retained state — the same instant always gives the same
     * answer. This is what ?time= serves.
     */
    simulate(epochSeconds: number): TrainInfo[] {
        const trains: TrainInfo[] = [];
        for (const { plan, secondsOfDay } of this.activeTrips(epochSeconds)) {
            const train = this.toTrainInfo(plan, this.scheduledDistance(plan, secondsOfDay), epochSeconds);
            if (train) trains.push(train);
        }
        return trains;
    }

    /** Live: applies the conflict rules and the speed cap, and remembers position between ticks. */
    update(epochSeconds: number, realTrains: TrainInfo[]): TrainInfo[] {
        const trains: TrainInfo[] = [];
        const seen = new Set<string>();

        for (const { plan, secondsOfDay } of this.activeTrips(epochSeconds)) {
            const key = plan.trip.tripId;
            seen.add(key);

            const scheduled = this.scheduledDistance(plan, secondsOfDay);
            let state = this.live.get(key);
            if (!state) {
                state = { distance: scheduled, lastTick: epochSeconds, blockEnteredAt: epochSeconds };
                this.live.set(key, state);
            }

            const elapsed = Math.max(0, Math.min(300, epochSeconds - state.lastTick));
            state.lastTick = epochSeconds;

            const chainIndex = this.onChain(plan.shape, state.distance);
            const dwelling = this.dwellingAt(plan, secondsOfDay, chainIndex);

            if (dwelling) {
                // Standing at a platform: the main is clear, so real trains pass without interference.
                state.distance = dwelling.distance;
            } else {
                const { floor, cap } = this.conflictLimits(plan, state.distance, realTrains);
                const target = Math.max(Math.min(scheduled, cap), floor);

                // Never move faster than the line allows, however far behind schedule it is.
                const maxMetres = (this.config.maxSpeedKmh * 1000 / 3600) * elapsed;
                const delta = target - state.distance;
                state.distance += Math.abs(delta) > maxMetres ? Math.sign(delta) * maxMetres : delta;
            }

            const train = this.toTrainInfo(plan, state.distance, epochSeconds, state);
            if (train) trains.push(train);
        }

        for (const key of [...this.live.keys()]) if (!seen.has(key)) this.live.delete(key);
        return trains;
    }
}

/** Index of the shape point closest to a distance along the shape. */
function nearestPointIndex(shape: ShapeGeometry, metres: number): number {
    const points = shape.points;
    let low = 0, high = points.length - 1;
    while (low < high) {
        const mid = (low + high) >> 1;
        if (points[mid]![2] < metres) low = mid + 1; else high = mid;
    }
    if (low > 0 && Math.abs(points[low - 1]![2] - metres) < Math.abs(points[low]![2] - metres)) return low - 1;
    return low;
}

/** Distance along the shape of the point closest to a location. */
function nearestDistance(shape: ShapeGeometry, lat: number, lon: number): number {
    let best = 0, bestDistance = Infinity;
    for (const [pointLat, pointLon, metres] of shape.points) {
        const d = calculateDistance(lat, lon, pointLat, pointLon);
        if (d < bestDistance) { bestDistance = d; best = metres; }
    }
    return best;
}

/** Loads every scheduled service configured for a network. Missing data is logged, never fatal. */
export function loadScheduledTrains(network: RailNetwork): ScheduledTrain[] {
    const configs = network.config.scheduledTrains ?? [];
    const loaded: ScheduledTrain[] = [];

    for (const config of configs) {
        try {
            loaded.push(new ScheduledTrain(network, config));
        } catch (error) {
            log(network.id, `Could not load scheduled train ${config.id}: ${(error as Error).message}`);
        }
    }
    return loaded;
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

/**
 * Refresh a network's distilled timetables by hand:
 *
 *     bun scheduledTrains.ts AKL
 *
 * The server does this on startup when the committed copy has aged past fetchIntervalDays,
 * so this is only needed to force an early refresh.
 */
if (require.main === module) {
    void (async () => {
        const { config: loadEnv } = await import('dotenv');
        loadEnv({ quiet: true });

        const { RailNetwork } = await import('./railNetwork');
        const id = process.argv[2] ?? 'AKL';
        const network = new RailNetwork(path.resolve(__dirname, 'railNetworks', id));

        for (const scheduled of network.config.scheduledTrains ?? []) {
            await distilTimetable(network, scheduled, process.env[id]);
        }
    })();
}
