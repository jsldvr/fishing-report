import { beforeEach, describe, expect, it } from "vitest";
import {
  buildForecastCacheKey,
  getOfflineForecastCache,
  isCacheStale,
  saveOfflineForecastCache,
} from "./offlineForecastCache";
import type { ForecastScore } from "../types/forecast";

function makeForecast(date: string): ForecastScore {
  return {
    date,
    moon: {
      phaseAngleDeg: 180,
      illumination: 0.5,
      phaseName: "Full Moon",
    },
    weather: {
      tempC: 20,
      windKph: 10,
      precipMm: 0,
      cloudPct: 30,
      barometricTrend: "STEADY",
      source: "NWS",
      safety: {
        rating: "GOOD",
        activeAlerts: [],
        recommendations: [],
        riskFactors: [],
      },
    },
    almanac: {},
    biteScore0100: 75,
    components: {
      moon: 70,
      weather: 80,
    },
  };
}

function createMemoryStorage() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("offlineForecastCache", () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("builds stable cache keys", () => {
    expect(
      buildForecastCacheKey({
        lat: 21.3045,
        lon: -157.8557,
        startDate: "2026-02-26",
        days: 3,
      })
    ).toBe("21.3045|-157.8557|2026-02-26|3");
  });

  it("saves and loads cached forecast payload", () => {
    const key = buildForecastCacheKey({
      lat: 21.3045,
      lon: -157.8557,
      startDate: "2026-02-26",
      days: 3,
    });

    saveOfflineForecastCache({
      cacheKey: key,
      lat: 21.3045,
      lon: -157.8557,
      startDate: "2026-02-26",
      days: 3,
      locationName: "Honolulu, Hawaii",
      forecasts: [makeForecast("2026-02-26")],
    }, storage);

    const cached = getOfflineForecastCache(key, storage);
    expect(cached).not.toBeNull();
    expect(cached?.locationName).toBe("Honolulu, Hawaii");
    expect(cached?.forecasts).toHaveLength(1);
  });

  it("marks cache stale past threshold", () => {
    expect(isCacheStale("2026-02-24T00:00:00Z", new Date("2026-02-26T12:00:00Z"))).toBe(true);
    expect(isCacheStale("2026-02-26T06:00:00Z", new Date("2026-02-26T12:00:00Z"))).toBe(false);
  });
});
