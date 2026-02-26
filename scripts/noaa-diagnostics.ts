import { addDaysToDate, getCurrentDateISO } from "../src/lib/time";

const NOAA_METADATA_ENDPOINT =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json";
const NOAA_STATION_DETAIL_ENDPOINT =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations";
const NOAA_DATAGETTER_ENDPOINT =
  "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

const STATION_TYPES = [
  "waterlevels",
  "meteorology",
  "wind",
  "watertemperature",
  "tidepredictions",
] as const;
const BOUNDING_BOX_DELTAS = [0.3, 0.6, 1.0, 1.5, 2.5];
const MAX_MARINE_STATION_DISTANCE_KM = 50;

type LocationInput = {
  name: string;
  lat: number;
  lon: number;
};

type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state?: string;
};

function parseArgs(argv: string[]): { date: string; locations: LocationInput[] } {
  const defaults: LocationInput[] = [
    { name: "Honolulu, Hawaii", lat: 21.3045, lon: -157.8557 },
    { name: "South Padre Island, Texas", lat: 26.1037, lon: -97.1647 },
    { name: "Milton, Wisconsin", lat: 42.7754, lon: -88.939 },
  ];

  let date = getCurrentDateISO();
  const locations: LocationInput[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--date") {
      date = argv[i + 1] ?? date;
      i += 1;
      continue;
    }

    if (arg === "--location") {
      const value = argv[i + 1];
      i += 1;
      if (!value) {
        continue;
      }

      const parts = value.split(",").map((part) => part.trim());
      if (parts.length < 3) {
        continue;
      }

      const lat = Number.parseFloat(parts[parts.length - 2]);
      const lon = Number.parseFloat(parts[parts.length - 1]);
      const name = parts.slice(0, -2).join(", ");

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        locations.push({
          name: name || `${lat}, ${lon}`,
          lat,
          lon,
        });
      }
    }
  }

  return {
    date,
    locations: locations.length > 0 ? locations : defaults,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildBoundingBox(lat: number, lon: number, delta: number): number[] {
  return [
    clamp(lon - delta, -180, 180),
    clamp(lat - delta, -90, 90),
    clamp(lon + delta, -180, 180),
    clamp(lat + delta, -90, 90),
  ];
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return {
      status: response.status,
      ok: response.ok,
      note: "non-json response",
    };
  }

  const json = await response.json();
  return {
    status: response.status,
    ok: response.ok,
    json,
  };
}

async function findNearestStation(
  lat: number,
  lon: number
): Promise<{ station: Station; stationType: string; delta: number } | null> {
  for (const stationType of STATION_TYPES) {
    for (const delta of BOUNDING_BOX_DELTAS) {
      const bbox = buildBoundingBox(lat, lon, delta);
      const url = new URL(NOAA_METADATA_ENDPOINT);
      url.searchParams.set("type", stationType);
      url.searchParams.set("bbox", bbox.join(","));
      url.searchParams.set("units", "metric");

      const payload = (await fetchJson(url.toString())) as {
        ok: boolean;
        status: number;
        json?: { stations?: Station[] };
      };

      if (!payload.ok || !payload.json?.stations?.length) {
        continue;
      }

      const nearest = payload.json.stations
        .map((station) => ({
          ...station,
          distanceKm: haversineDistanceKm(lat, lon, station.lat, station.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];

      return {
        station: nearest,
        stationType,
        delta,
      };
    }
  }

  return null;
}

function summarizeObjectShape(value: unknown): string {
  if (!value || typeof value !== "object") {
    return String(value);
  }

  const obj = value as Record<string, unknown>;
  return Object.keys(obj)
    .slice(0, 10)
    .join(", ");
}

async function inspectDatagetterProduct(
  stationId: string,
  product: "predictions" | "wind" | "water_temperature",
  date: string
): Promise<void> {
  const url = new URL(NOAA_DATAGETTER_ENDPOINT);
  url.searchParams.set("product", product);
  url.searchParams.set("application", "FishingForecastDiag");
  url.searchParams.set("station", stationId);
  url.searchParams.set("units", "metric");
  url.searchParams.set("time_zone", "gmt");
  url.searchParams.set("format", "json");

  if (product === "predictions") {
    const beginDate = date.replace(/-/g, "");
    const endDate = addDaysToDate(date, 1).replace(/-/g, "");
    url.searchParams.set("begin_date", beginDate);
    url.searchParams.set("end_date", endDate);
    url.searchParams.set("datum", "MLLW");
    url.searchParams.set("interval", "hilo");
  } else {
    url.searchParams.set("date", "latest");
  }

  const payload = (await fetchJson(url.toString())) as {
    ok: boolean;
    status: number;
    json?: Record<string, unknown>;
  };

  console.log(`    Product ${product}: status ${payload.status}`);

  if (!payload.ok || !payload.json) {
    return;
  }

  const keys = Object.keys(payload.json);
  console.log(`      Top-level keys: ${keys.join(", ") || "(none)"}`);

  if (Array.isArray(payload.json.predictions)) {
    const sample = payload.json.predictions[0];
    console.log(
      `      predictions count=${payload.json.predictions.length}; sample keys=${summarizeObjectShape(sample)}`
    );
  }

  if (Array.isArray(payload.json.data)) {
    const sample = payload.json.data[0];
    console.log(
      `      data count=${payload.json.data.length}; sample keys=${summarizeObjectShape(sample)}`
    );
  }

  if (payload.json.error) {
    console.log(
      `      error shape: ${summarizeObjectShape(payload.json.error)}`
    );
  }
}

async function inspectLocation(location: LocationInput, date: string): Promise<void> {
  console.log(`\n=== ${location.name} (${location.lat}, ${location.lon}) ===`);

  const nearest = await findNearestStation(location.lat, location.lon);
  if (!nearest) {
    console.log("  Eligibility reason: NO_STATION_FOUND");
    console.log("  No station found in configured NOAA search envelopes.");
    return;
  }

  const distanceKm = nearest.station.distanceKm.toFixed(1);
  if (nearest.station.distanceKm > MAX_MARINE_STATION_DISTANCE_KM) {
    console.log(
      `  Eligibility reason: STATION_TOO_FAR (> ${MAX_MARINE_STATION_DISTANCE_KM} km)`
    );
  } else {
    console.log("  Eligibility reason: STATION_WITHIN_DISTANCE");
  }
  console.log(
    `  Selected station: ${nearest.station.id} (${nearest.station.name}) [${distanceKm} km] via type=${nearest.stationType} delta=${nearest.delta}`
  );

  const detailUrl = `${NOAA_STATION_DETAIL_ENDPOINT}/${nearest.station.id}.json`;
  const detail = (await fetchJson(detailUrl)) as {
    ok: boolean;
    status: number;
    json?: {
      products?: Array<{ id?: string; name?: string }>;
      station?: {
        products?: Array<{ id?: string; name?: string }>;
      };
    };
  };

  console.log(`  Station detail: status ${detail.status}`);
  const products = detail.json?.station?.products || detail.json?.products || [];
  const normalizedProducts = products
    .map((product) => product.id || product.name || "")
    .map((entry) => entry.toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean)
    .slice(0, 20);

  console.log(
    `  Station product sample (${normalizedProducts.length}): ${
      normalizedProducts.join(", ") || "(none)"
    }`
  );

  await inspectDatagetterProduct(nearest.station.id, "predictions", date);
  await inspectDatagetterProduct(nearest.station.id, "wind", date);
  await inspectDatagetterProduct(nearest.station.id, "water_temperature", date);
}

async function main(): Promise<void> {
  const { date, locations } = parseArgs(process.argv.slice(2));

  console.log(`NOAA diagnostics date window: ${date}`);
  console.log("Usage: npm run diagnose:noaa -- --location \"Name,lat,lon\" [--location ...] [--date YYYY-MM-DD]");

  for (const location of locations) {
    try {
      await inspectLocation(location, date);
    } catch (error) {
      console.error(`  Failed to inspect ${location.name}:`, error);
    }
  }
}

main().catch((error) => {
  console.error("NOAA diagnostics failed:", error);
  process.exitCode = 1;
});
