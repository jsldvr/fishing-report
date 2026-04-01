import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchNoaaMarineConditionsWithMeta,
  _resetCachesForTesting,
} from "../src/lib/noaaMarine";
import type { DayInputs } from "../src/types/forecast";

// Milwaukee, WI — coordinates match NEARBY_STATION exactly so distanceKm ≈ 0
const DAY: DayInputs = { date: "2026-02-26", lat: 43.0186, lon: -87.8877 };

function makeStationsResponse(
  stations: Array<{ id: string; name: string; lat: number; lng: number; state?: string }>
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ stations }),
  } as unknown as Response;
}

function makePredictionsResponse(
  predictions: Array<{ t: string; v: string; type: "H" | "L" }>
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ predictions }),
  } as unknown as Response;
}

function makeErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    statusText: "Internal Server Error",
    json: async () => ({}),
  } as unknown as Response;
}

const NEARBY_STATION = {
  id: "9087031",
  name: "Milwaukee, WI",
  lat: 43.0186,
  lng: -87.8877,
  state: "WI",
};

const DISTANT_STATION = {
  id: "8510560",
  name: "Montauk, NY",
  lat: 41.0718,
  lng: -71.9603,
  state: "NY",
};

describe("NOAA Marine Station Selection", () => {
  beforeEach(() => {
    // Reset module-level product caches so tests don't poison each other.
    _resetCachesForTesting();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns STATION_TOO_FAR when nearest station exceeds 50 km limit", async () => {
    // Inland location (Milton, WI) — only returns a distant coastal station
    const miltonWI: DayInputs = { date: "2026-02-26", lat: 42.7711, lon: -88.9423 };

    const fetchMock = vi.fn().mockResolvedValue(makeStationsResponse([DISTANT_STATION]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(miltonWI);

    expect(result.reason).toBe("STATION_TOO_FAR");
    expect(result.marine).toBeNull();
    expect(result.stationDistanceKm).toBeDefined();
    expect(result.stationDistanceKm!).toBeGreaterThan(50);
  });

  it("returns NO_STATION_FOUND when all bounding box queries return empty lists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeStationsResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(DAY);

    expect(result.reason).toBe("NO_STATION_FOUND");
    expect(result.marine).toBeNull();
  });

  it("returns DATA_AVAILABLE with tide events when a nearby station returns predictions", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("stations.json")) {
        return Promise.resolve(makeStationsResponse([NEARBY_STATION]));
      }
      if (url.includes("datagetter") && url.includes("predictions")) {
        return Promise.resolve(
          makePredictionsResponse([
            { t: "2026-02-26 01:00", v: "0.5", type: "L" },
            { t: "2026-02-26 07:00", v: "1.8", type: "H" },
          ])
        );
      }
      // Station detail and other endpoints — return empty OK response
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as unknown as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(DAY);

    expect(result.reason).toBe("DATA_AVAILABLE");
    expect(result.marine).not.toBeNull();
    expect(result.marine?.stationId).toBe("9087031");
    expect(result.marine?.tideEvents).toBeDefined();
    expect(result.marine?.tideEvents!.length).toBeGreaterThan(0);
  });

  it("returns STATION_METADATA_ONLY when station is found but all data product fetches return 400", async () => {
    // Code path: station found → getStationProducts gets 400 → empty product Set →
    // shouldAttemptProduct returns true (size === 0) → each data fetch gets 400 →
    // tideEvents=[], wind=null, waterTemp=null → hasUsableObservations=false → STATION_METADATA_ONLY
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("stations.json")) {
        return Promise.resolve(makeStationsResponse([NEARBY_STATION]));
      }
      return Promise.resolve(makeErrorResponse(400));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(DAY);

    expect(result.reason).toBe("STATION_METADATA_ONLY");
    expect(result.stationId).toBe(NEARBY_STATION.id);
    expect(result.marine).not.toBeNull();
  });

  it("returns NO_STATION_FOUND when metadata endpoint returns non-OK status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeErrorResponse(503));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(DAY);

    expect(result.reason).toBe("NO_STATION_FOUND");
    expect(result.marine).toBeNull();
  });
});


