import 'bun';
import { config as loadEnv } from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

import { LOG_LABELS, log } from './customUtils';
import { RailNetwork } from './railNetwork';
import { LEDRailsAPI, applyAltBlocks, generateLedMap } from './trackBlocks';

const PORT = 3000;
const NETWORK_UPDATE_STAGGER_MS = 1500;

// --- Configuration Loading ---
loadEnv({ quiet: true }); // Load environment variables from .env file

// --- Type Definitions ---
type RouteHandler = (req: Request) => Response | Promise<Response>;

/**
 * Reads ?time=<epoch seconds> from a request.
 *
 * Returns undefined for a live request, 'invalid' for a value we cannot use, or the instant.
 * Failing loudly matters: silently falling back to live would make a broken test look like a
 * working one.
 */
function simulatedTime(req: Request): number | undefined | 'invalid' {
    let raw: string | null = null;
    try {
        raw = new URL(req.url, 'http://localhost').searchParams.get('time');
    } catch { return 'invalid'; }

    if (raw === null) return undefined;

    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds <= 0) return 'invalid';
    return seconds;
}

const badTime = () => Response.json(
    { error: 'invalid ?time=', detail: 'expected whole epoch seconds, e.g. ?time=1789700000' },
    { status: 400, headers: { 'Cache-Control': 'no-store' } });

/**
 * The board as it would be at an arbitrary instant, containing SCHEDULE-DERIVED TRAINS ONLY —
 * realtime vehicles cannot be rewound, and leaving them out is what makes a given instant
 * reproducible.
 *
 * Builds its own copy of the API output: generateLedMap() mutates what it is given, and the live
 * object is the one served to every real board on every poll.
 */
function simulatedBoard(network: RailNetwork, api: LEDRailsAPI, epochSeconds: number): Response {
    const trains = network.simulateScheduledTrains(epochSeconds);
    const invisible: string[] = [];
    applyAltBlocks(network, trains, invisible);

    const copy: LEDRailsAPI = { ...api, output: { ...api.output, updates: [] } };
    generateLedMap(copy, trains, invisible, network.trackBlocks, 0, epochSeconds);
    copy.output.simulated = true;

    return Response.json(copy.output, { headers: { 'Cache-Control': 'no-store' } });
}

async function initializeServer() {
    const routes = new Map<string, RouteHandler>();
    let configuredNetworkCount = 0;

    const addRoute = (method: string, url: string, handler: RouteHandler) => {
        if (method === 'GET') routes.set(url, handler);
    };

    log(LOG_LABELS.SERVER, 'Starting', {
        env: process.env.NODE_ENV || 'development',
        bunVersion: Bun.version,
        platform: `${process.platform}/${process.arch}`
    });

    // Dynamically load all rail networks from the railNetworks directory
    const railNetworksDir = path.resolve(__dirname, 'railNetworks');
    const railNetworks: RailNetwork[] = [];

    for (const entry of await fs.readdir(railNetworksDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            railNetworks.push(await new RailNetwork(path.join(railNetworksDir, entry.name)));
        }
    }

    for (const network of railNetworks) {
        // Set the API key from .env file (AKL=xxxx, WLG=yyyy, etc)
        network.config.GTFSRealtimeAPI.key = process.env[network.id];

        if (!network.config.GTFSRealtimeAPI.key) {
            log(network.id, 'API Key Missing from .env file, skipping setup.');
            // throw new Error(`${network.id} API key not found in .env file`);
        } else {

            try {
                network.update();

                // Setup server endpoints for each board revision api
                network.ledRailsAPIs.forEach(api => {
                    addRoute('GET', api.url, (req) => {
                        const time = simulatedTime(req);
                        if (time === 'invalid') return badTime();
                        if (time === undefined) return Response.json(api.output);
                        return simulatedBoard(network, api, time);
                    });
                });

                const prefix = `/${network.id.toLowerCase()}-ltm`;

                // Status endpoint for monitoring
                addRoute('GET', `${prefix}/status`, () => {
                    const now = Date.now();
                    return Response.json({
                        status: network.trackedTrains.length ? 'OK' : 'ERROR',
                        epoch: Math.floor(now / 1000),
                        uptime: Number(process.uptime().toFixed(0)),
                        refreshInterval: network.config.GTFSRealtimeAPI.fetchIntervalSeconds,
                        trackBlocks: network.trackBlocks?.size ?? 0,
                        entities: network.entities.length,
                        trackedTrains: network.trackedTrains.length,
                        scheduledTrains: network.scheduledTrainInfos.length,
                        scheduledServices: network.scheduledTrains.length,
                    });
                });

                // Raw data endpoint for all vehicles
                addRoute('GET', `${prefix}/api/vehicles`, () => Response.json(network.entities));

                // Raw data endpoint for trains only
                addRoute('GET', `${prefix}/api/vehicles/trains`, () => Response.json(network.trainEntities));

                addRoute('GET', `${prefix}/api/trackedtrains`, (req) => {
                    const time = simulatedTime(req);
                    if (time === 'invalid') return badTime();
                    if (time === undefined) return Response.json(network.displayedTrains);
                    return Response.json(network.simulateScheduledTrains(time), { headers: { 'Cache-Control': 'no-store' } });
                });

                // stopsMap (To make it easier to map stop IDs to names/platforms)
                if (network.stopsMap) {
                    addRoute('GET', `${prefix}/api/stops`, () => Response.json(network.stopsMap));
                }

                // Simple HTML map view for debugging (serves map.html, currently http only)
                const mapPath = path.resolve(__dirname, 'map.html');
                addRoute('GET', `${prefix}/api/map`, () => new Response(Bun.file(mapPath), {
                    headers: { "Content-Type": "text/html" }
                }));

                // Simple HTML viewer for the PCB
                const viewerPath = path.resolve(__dirname, 'viewer.html');
                addRoute('GET', `${prefix}/api/viewer`, () => new Response(Bun.file(viewerPath), {
                    headers: { "Content-Type": "text/html" }
                }));

                // Position csv File for LEDs 
                const posPath = path.resolve(__dirname, 'railNetworks', network.id, 'positions.csv');
                addRoute('GET', `${prefix}/api/positions.csv`, () => new Response(Bun.file(posPath), {
                    headers: { "Content-Type": "text/csv" }
                }));

                // PCB silkscreen svg File
                const svgPath = path.resolve(__dirname, 'railNetworks', network.id, 'pcb.svg');
                addRoute('GET', `${prefix}/api/pcb.svg`, () => new Response(Bun.file(svgPath), {
                    headers: { "Content-Type": "image/svg+xml" }
                }));

                // Periodic update loop (stagger network start times by at least 1.5s)
                const intervalMs = network.config.GTFSRealtimeAPI.fetchIntervalSeconds * 1000;
                const initialDelayMs = configuredNetworkCount * NETWORK_UPDATE_STAGGER_MS;
                configuredNetworkCount += 1;

                setTimeout(() => {
                    setInterval(async () => {
                        try {
                            await network.update();
                        } catch (error) {
                            log(network.id, 'Error Updating', {
                                errorMessage: error instanceof Error ? error.message : String(error),
                                stack: error instanceof Error ? error.stack : undefined
                            });
                        }
                    }, intervalMs);
                }, initialDelayMs);

                // Log some info about the rail network after setup
                log(network.id, 'Setup', {
                    trains: network.trackedTrains.length,
                    blocks: network.trackBlocks?.size ?? 0,
                    APIs: network.ledRailsAPIs.length,
                });

            } catch (error) {
                log(network.id, 'Error During Setup', {
                    errorMessage: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
            }
        }
    }

    // Basic root endpoint
    addRoute('GET', '/', () => new Response('LED-Rails Backend Server is operational.', {
        headers: { 'Content-Type': 'text/plain' }
    }));

    const faviconPath = path.resolve(__dirname, 'favicon.png');
    addRoute('GET', '/favicon.ico', () => new Response(Bun.file(faviconPath)));

    Bun.serve({
        port: PORT,
        development: process.env.NODE_ENV !== "production",
        async fetch(req) {
            let pathname = '/';
            try {
                const url = req.url.startsWith('/')
                    ? new URL(req.url, 'http://localhost')
                    : new URL(req.url);
                pathname = url.pathname;
            } catch (error) {
                log(LOG_LABELS.SERVER, 'Invalid request URL', {
                    reqUrl: req.url,
                    errorMessage: error instanceof Error ? error.message : String(error),
                });
                return new Response('Bad Request', { status: 400 });
            }

            const handler = routes.get(pathname);

            let response: Response;
            if (handler && req.method === 'GET') {
                try {
                    response = await handler(req);
                } catch (error) {
                    log(LOG_LABELS.SERVER, 'Route handler error', {
                        path: pathname,
                        errorMessage: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                    response = new Response('Internal Server Error', { status: 500 });
                }
            } else {
                response = new Response("Not Found", { status: 404 });
            }

            // Simple Compression Middleware
            // Order of preference: zstd > brotli > gzip > deflate
            const acceptEncoding = req.headers.get("Accept-Encoding") ?? "";

            // Note: TypeScript might complain about "zstd" or "brotli" if using standard DOM types, but Bun supports them at runtime.
            let compressionFormat: CompressionFormat | "zstd" | "brotli" | null = null;
            if (acceptEncoding.includes("zstd")) {
                compressionFormat = "zstd";
            } else if (acceptEncoding.includes("br")) {
                compressionFormat = "brotli";
            } else if (acceptEncoding.includes("gzip")) {
                compressionFormat = "gzip";
            } else if (acceptEncoding.includes("deflate")) {
                compressionFormat = "deflate";
            }

            if (compressionFormat && response.body && !response.headers.has('Content-Encoding')) {
                const headers = new Headers(response.headers);
                headers.set("Content-Encoding", compressionFormat === "brotli" ? "br" : compressionFormat);
                headers.set("Vary", "Accept-Encoding");
                headers.delete("Content-Length");

                return new Response(response.body.pipeThrough(new CompressionStream(compressionFormat as CompressionFormat)), {
                    status: response.status,
                    statusText: response.statusText,
                    headers,
                });
            }

            return response;
        },
    });

    log(LOG_LABELS.SERVER, 'Started', {
        port: PORT,
        startup: (process.uptime() * 1000).toFixed(0) + 'ms',
        mem: (process.memoryUsage().rss / (1024 ** 2)).toFixed(0) + "MiB",
    });
}

initializeServer().catch(error => {
    log(LOG_LABELS.ERROR, 'Server failed catastrophically.', {
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
});