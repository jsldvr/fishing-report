import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchNoaaMarineConditionsWithMeta,
  _resetCachesForTesting,
} from "../src/lib/noaaMarine";
import type { DayInputs } from "../src/types/forecast";

const COASTAL_DAY: DayInputs = { date: "2026-02-26", lat: 40.7588, lon: -74.0448 }; // NYC area

function makeStationsResponse(
  stations: Array<{ id: string; name: string; lat: number; lng: number; state?: string }>
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ stations }),
  } as unknown as Response;
}

// Battery Park station ~5 km from COASTAL_DAY — within the 50 km limit
const NEARBY_STATION = {
  id: "8518750",
  name: "Battery, NY",
  lat: 40.6983,
  lng: -74.0169,
  state: "NY",
};

describe("NOAA Marine Station Selection - regression", () => {
  beforeEach(() => {
    // Reset module-level product caches so tests don't poison each other.
    _resetCachesForTesting();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns STATION_TOO_FAR for inland coords where nearest station is >50 km away", async () => {
    // Quantico, VA is ~880 km from Milton, WI — well above the 50 km limit
    const miltonWI: DayInputs = { date: "2026-02-26", lat: 42.7711, lon: -88.9423 };
    const distantStation = {
      id: "8637611",
      name: "Quantico, VA",
      lat: 38.5617,
      lng: -77.2961,
      state: "VA",
    };

    const fetchMock = vi.fn().mockResolvedValue(makeStationsResponse([distantStation]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(miltonWI);

    expect(result.reason).toBe("STATION_TOO_FAR");
    expect(result.marine).toBeNull();
    expect(result.stationDistanceKm).toBeGreaterThan(50);
  });

  it("returns STATION_METADATA_ONLY when station is within range but all data fetches return 400", async () => {
    // Code path: station found, within range → getStationProducts gets 400 → empty product Set
    // → shouldAttemptProduct returns true (size === 0) → all data endpoints get 400
    // → tideEvents=[], wind=null, waterTemp=null → hasUsableObservations=false → STATION_METADATA_ONLY
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("stations.json")) {
        return Promise.resolve(makeStationsResponse([NEARBY_STATION]));
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({}),
      } as unknown as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(COASTAL_DAY);

    expect(result.reason).toBe("STATION_METADATA_ONLY");
    expect(result.stationId).toBe(NEARBY_STATION.id);
    // marine object is still populated with station identity even without observation data
    expect(result.marine).not.toBeNull();
    expect(result.marine?.stationId).toBe(NEARBY_STATION.id);
  });

  it("returns DATA_AVAILABLE and populates stationId/stationDistanceKm when tide predictions succeed", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("stations.json")) {
        return Promise.resolve(makeStationsResponse([NEARBY_STATION]));
      }
      if (url.includes("datagetter")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            predictions: [
              { t: "2026-02-26 06:00", v: "1.5", type: "H" },
              { t: "2026-02-26 12:00", v: "0.2", type: "L" },
            ],
          }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as unknown as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(COASTAL_DAY);

    expect(result.reason).toBe("DATA_AVAILABLE");
    expect(result.stationId).toBe("8518750");
    expect(result.stationDistanceKm).toBeDefined();
    expect(result.stationDistanceKm!).toBeLessThanOrEqual(50);
    expect(result.marine?.tideEvents?.length).toBeGreaterThan(0);
  });

  it("returns NO_STATION_FOUND when no station is found across all box expansions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeStationsResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoaaMarineConditionsWithMeta(COASTAL_DAY);

    expect(result.reason).toBe("NO_STATION_FOUND");
    expect(result.marine).toBeNull();
    expect(result.stationId).toBeUndefined();
  });
});


