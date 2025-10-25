import type {
  DayInputs,
  MarineWeatherData,
  TideEvent,
} from "../types/forecast.js";
import { addDaysToDate } from "./time.js";

const NOAA_METADATA_ENDPOINT =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json";
const NOAA_DATAGETTER_ENDPOINT =
  "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const NOAA_STATION_DETAIL_ENDPOINT =
  "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations";
const NOAA_APPLICATION_NAME = "FishingForecast";

interface NoaaStationMetadata {
  id: string;
  name: string;
  lat: number;
  lon: number;
  state?: string;
  distanceKm: number;
}

interface NoaaNumericSample {
  value: number;
  timeIso: string;
}

const BOUNDING_BOX_DELTAS = [0.3, 0.6, 1.0, 1.5, 2.5];

const stationProductsCache = new Map<string, Set<string>>();

/**
 * Fetch marine conditions from NOAA Tides and Currents (CO-OPS).
 * Returns null when no nearby station is available or if the API fails.
 */
export async function fetchNoaaMarineConditions(
  day: DayInputs
): Promise<MarineWeatherData | null> {
  try {
    const station = await findNearestStation(day.lat, day.lon);
    if (!station) {
      return null;
    }

    const productInfo = await getStationProducts(station.id);
    const supports = (productId: string) =>
      shouldAttemptProduct(station.id, productId, productInfo);

    const [tideEvents, waveSample, windSample, waterTempSample] =
      await Promise.all([
        supports("predictions")
          ? fetchTidePredictions(station.id, day.date)
          : Promise.resolve<TideEvent[]>([]),
        supports("waveheight")
          ? fetchLatestNumericSample(station.id, "waveheight", "wh")
          : Promise.resolve<NoaaNumericSample | null>(null),
        supports("wind")
          ? fetchLatestWindSample(station.id)
          : Promise.resolve<
              | (NoaaNumericSample & {
                  directionDeg?: number;
                  directionText?: string;
                })
              | null
            >(null),
        supports("water_temperature")
          ? fetchLatestNumericSample(station.id, "water_temperature", "v")
          : Promise.resolve<NoaaNumericSample | null>(null),
      ]);

    const marine: MarineWeatherData = {
      stationId: station.id,
      stationName: station.name,
      stationDistanceKm: Number.isFinite(station.distanceKm)
        ? Math.round(station.distanceKm * 10) / 10
        : undefined,
    };

    if (tideEvents.length > 0) {
      marine.tideEvents = tideEvents;
    }
    if (waveSample) {
      marine.waveHeight = waveSample.value;
      marine.waveObservationTimeIso = waveSample.timeIso;
    }
    if (waterTempSample) {
      marine.waterTemperature = waterTempSample.value;
      marine.observationTimeIso = waterTempSample.timeIso;
    }
    if (windSample) {
      marine.windSpeedKph = windSample.value;
      marine.windDirectionDeg = windSample.directionDeg;
      marine.windDirectionText = windSample.directionText;
    }

    return marine;
  } catch (error) {
    console.warn("NOAA marine conditions unavailable:", error);
    return null;
  }
}

async function findNearestStation(
  lat: number,
  lon: number
): Promise<NoaaStationMetadata | null> {
  // Station types to search for, in order of preference
  // Great Lakes/inland stations typically have waterlevels, meteorology, wind, temp
  // Coastal stations have tidepredictions
  const stationTypes = [
    "waterlevels",
    "meteorology",
    "wind",
    "watertemperature",
    "tidepredictions",
  ];

  for (const stationType of stationTypes) {
    for (const delta of BOUNDING_BOX_DELTAS) {
      const bbox = buildBoundingBox(lat, lon, delta);
      const url = new URL(NOAA_METADATA_ENDPOINT);
      url.searchParams.set("type", stationType);
      url.searchParams.set("bbox", bbox.join(","));
      url.searchParams.set("units", "metric");

      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          continue;
        }

        const data = (await response.json()) as {
          stations?: Array<{
            id: string;
            name: string;
            lat: number;
            lng: number;
            state?: string;
          }>;
        };

        const stations = data.stations || [];
        if (stations.length === 0) {
          continue;
        }

        const enriched = stations
          .map((station) => {
            const distanceKm = haversineDistanceKm(
              lat,
              lon,
              station.lat,
              station.lng
            );

            return {
              id: station.id,
              name: station.name,
              lat: station.lat,
              lon: station.lng,
              state: station.state,
              distanceKm,
            };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm);

        if (enriched.length > 0) {
          // Return the nearest station found for this station type
          return enriched[0];
        }
      } catch (error) {
        console.warn("NOAA station metadata lookup failed:", error);
      }
    }
  }

  return null;
}

async function fetchTidePredictions(
  stationId: string,
  isoDate: string
): Promise<TideEvent[]> {
  try {
    const beginDate = isoDate.replace(/-/g, "");
    const endDate = addDaysToDate(isoDate, 1).replace(/-/g, "");

    const url = new URL(NOAA_DATAGETTER_ENDPOINT);
    url.searchParams.set("product", "predictions");
    url.searchParams.set("application", NOAA_APPLICATION_NAME);
    url.searchParams.set("station", stationId);
    url.searchParams.set("begin_date", beginDate);
    url.searchParams.set("end_date", endDate);
    url.searchParams.set("datum", "MLLW");
    url.searchParams.set("units", "metric");
    url.searchParams.set("time_zone", "gmt");
    url.searchParams.set("interval", "hilo");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      predictions?: Array<{ t: string; v: string; type: "H" | "L" }>;
      error?: unknown;
    };

    if (!data.predictions || !Array.isArray(data.predictions)) {
      return [];
    }

    const start = new Date(isoDate + "T00:00:00Z").getTime();
    const end = new Date(addDaysToDate(isoDate, 1) + "T00:00:00Z").getTime();

    return data.predictions
      .map((prediction) => {
        const iso = toIsoDate(prediction.t);
        const timestamp = iso ? new Date(iso).getTime() : Number.NaN;
        return {
          timeIso: iso,
          heightMeters: parseFloat(prediction.v),
          type: prediction.type === "H" ? "HIGH" : "LOW",
          timestamp,
        };
      })
      .filter(
        (event): event is TideEvent & { timestamp: number } =>
          Number.isFinite(event.timestamp) &&
          event.timestamp >= start &&
          event.timestamp < end &&
          Number.isFinite(event.heightMeters)
      )
      .map(({ timeIso, heightMeters, type }) => ({
        timeIso,
        heightMeters,
        type,
      }));
  } catch (error) {
    console.warn("NOAA tide prediction fetch failed:", error);
    return [];
  }
}

async function fetchLatestNumericSample(
  stationId: string,
  product: string,
  valueKey: string
): Promise<NoaaNumericSample | null> {
  if (!isProductSupported(stationId, product)) {
    return null;
  }

  try {
    const url = new URL(NOAA_DATAGETTER_ENDPOINT);
    url.searchParams.set("product", product);
    url.searchParams.set("application", NOAA_APPLICATION_NAME);
    url.searchParams.set("station", stationId);
    url.searchParams.set("date", "latest");
    url.searchParams.set("units", "metric");
    url.searchParams.set("time_zone", "gmt");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        markProductUnsupported(stationId, product);
      }
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<Record<string, string>>;
      error?: unknown;
    };

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const sample = data.data[0];
    const rawValue = sample[valueKey];
    const rawTime = sample.t;

    if (!rawValue || !rawTime) {
      return null;
    }

    const value = parseFloat(rawValue);
    const timeIso = toIsoDate(rawTime);

    if (!Number.isFinite(value) || !timeIso) {
      return null;
    }

    return { value, timeIso };
  } catch (error) {
    console.warn(`NOAA product ${product} fetch failed:`, error);
    return null;
  }
}

async function fetchLatestWindSample(
  stationId: string
): Promise<
  (NoaaNumericSample & { directionDeg?: number; directionText?: string }) | null
> {
  if (!isProductSupported(stationId, "wind")) {
    return null;
  }

  try {
    const url = new URL(NOAA_DATAGETTER_ENDPOINT);
    url.searchParams.set("product", "wind");
    url.searchParams.set("application", NOAA_APPLICATION_NAME);
    url.searchParams.set("station", stationId);
    url.searchParams.set("date", "latest");
    url.searchParams.set("units", "metric");
    url.searchParams.set("time_zone", "gmt");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        markProductUnsupported(stationId, "wind");
      }
      return null;
    }

    const data = (await response.json()) as {
      data?: Array<Record<string, string>>;
      error?: unknown;
    };

    if (!data.data || data.data.length === 0) {
      return null;
    }

    const sample = data.data[0];
    const speedRaw = sample.s;
    const timeRaw = sample.t;
    if (!speedRaw || !timeRaw) {
      return null;
    }

    const value = parseFloat(speedRaw);
    const timeIso = toIsoDate(timeRaw);

    if (!Number.isFinite(value) || !timeIso) {
      return null;
    }

    const directionDeg = sample.d ? parseFloat(sample.d) : undefined;
    const directionText = sample.dr;

    return {
      value: value * 3.6, // m/s to km/h
      timeIso,
      directionDeg: Number.isFinite(directionDeg) ? directionDeg : undefined,
      directionText,
    };
  } catch (error) {
    console.warn("NOAA wind fetch failed:", error);
    return null;
  }
}

function buildBoundingBox(
  lat: number,
  lon: number,
  delta: number
): [number, number, number, number] {
  const minLon = clamp(lon - delta, -180, 180);
  const minLat = clamp(lat - delta, -90, 90);
  const maxLon = clamp(lon + delta, -180, 180);
  const maxLat = clamp(lat + delta, -90, 90);
  return [minLon, minLat, maxLon, maxLat];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toIsoDate(dateString: string | undefined): string | null {
  if (!dateString) {
    return null;
  }

  const normalized = dateString.replace(" ", "T");
  const isoCandidate = normalized.endsWith("Z") ? normalized : `${normalized}Z`;

  const date = new Date(isoCandidate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

async function getStationProducts(stationId: string): Promise<Set<string>> {
  if (stationProductsCache.has(stationId)) {
    return stationProductsCache.get(stationId)!;
  }

  try {
    const url = new URL(`${NOAA_STATION_DETAIL_ENDPOINT}/${stationId}.json`);
    url.searchParams.set("expand", "products");

    const response = await fetch(url.toString());
    if (!response.ok) {
      const fallback = new Set<string>([normalizeProductId("predictions")]);
      stationProductsCache.set(stationId, fallback);
      return fallback;
    }

    const data = (await response.json()) as {
      station?: {
        products?: Array<{
          id?: string;
          name?: string;
        }>;
      };
    };

    const products = new Set<string>();
    products.add(normalizeProductId("predictions"));

    const productList = data.station?.products;
    if (Array.isArray(productList)) {
      for (const product of productList) {
        const id = normalizeProductId(product.id || product.name || "");
        if (id) {
          products.add(id);
        }
      }
    }

    stationProductsCache.set(stationId, products);
    return products;
  } catch (error) {
    console.warn("NOAA station product lookup failed:", error);
    const fallback = new Set<string>([normalizeProductId("predictions")]);
    stationProductsCache.set(stationId, fallback);
    return fallback;
  }
}

const unsupportedProductCache = new Map<string, Set<string>>();

function markProductUnsupported(stationId: string, product: string) {
  const normalizedProduct = normalizeProductId(product);
  const products = unsupportedProductCache.get(stationId) ?? new Set<string>();
  products.add(normalizedProduct);
  unsupportedProductCache.set(stationId, products);
}

function isProductSupported(stationId: string, product: string): boolean {
  const normalizedProduct = normalizeProductId(product);
  const unsupported = unsupportedProductCache.get(stationId);
  if (unsupported?.has(normalizedProduct)) {
    return false;
  }

  const supportedProducts = stationProductsCache.get(stationId);
  if (
    supportedProducts &&
    supportedProducts.size > 0 &&
    !supportedProducts.has(normalizedProduct)
  ) {
    return false;
  }

  return true;
}

function shouldAttemptProduct(
  stationId: string,
  product: string,
  knownProducts: Set<string>
): boolean {
  const normalized = normalizeProductId(product);

  if (unsupportedProductCache.get(stationId)?.has(normalized)) {
    return false;
  }

  if (knownProducts.has(normalized)) {
    return true;
  }

  // If metadata is inconclusive, attempt once and rely on runtime errors
  // to mark the product unsupported.
  return knownProducts.size === 0;
}

function normalizeProductId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
