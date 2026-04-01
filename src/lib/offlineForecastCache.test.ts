import { beforeEach, describe, expect, it } from "vitest";
import {
  buildForecastCacheKey,
  getOfflineForecastCache,
  isCacheStale,
  offlineForecastCache,
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

  it("marks cache stale when lastUpdatedIso is not a valid date", () => {
    expect(isCacheStale("not-a-date")).toBe(true);
    expect(isCacheStale("")).toBe(true);
  });

  it("enforces CACHE_LIMIT by evicting the oldest entries", () => {
    const LIMIT = offlineForecastCache.cacheLimit;

    // Insert LIMIT + 2 entries
    for (let i = 0; i < LIMIT + 2; i++) {
      const key = buildForecastCacheKey({
        lat: 40 + i * 0.1,
        lon: -74,
        startDate: "2026-02-26",
        days: 3,
      });
      saveOfflineForecastCache(
        {
          cacheKey: key,
          lat: 40 + i * 0.1,
          lon: -74,
          startDate: "2026-02-26",
          days: 3,
          forecasts: [makeForecast("2026-02-26")],
        },
        storage
      );
    }

    // Only LIMIT entries should remain
    const lastKey = buildForecastCacheKey({
      lat: (40 + (LIMIT + 1) * 0.1),
      lon: -74,
      startDate: "2026-02-26",
      days: 3,
    });
    const lastEntry = getOfflineForecastCache(lastKey, storage);
    expect(lastEntry).not.toBeNull();

    const firstKey = buildForecastCacheKey({
      lat: 40,
      lon: -74,
      startDate: "2026-02-26",
      days: 3,
    });
    // First entry should have been evicted
    expect(getOfflineForecastCache(firstKey, storage)).toBeNull();
  });

  it("overwrites an existing cache entry with the same key", () => {
    const key = buildForecastCacheKey({
      lat: 21.3045,
      lon: -157.8557,
      startDate: "2026-02-26",
      days: 3,
    });

    saveOfflineForecastCache(
      {
        cacheKey: key,
        lat: 21.3045,
        lon: -157.8557,
        startDate: "2026-02-26",
        days: 3,
        forecasts: [makeForecast("2026-02-26")],
      },
      storage
    );

    const updated = saveOfflineForecastCache(
      {
        cacheKey: key,
        lat: 21.3045,
        lon: -157.8557,
        startDate: "2026-02-26",
        days: 3,
        forecasts: [makeForecast("2026-02-26"), makeForecast("2026-02-27")],
      },
      storage
    );

    const cached = getOfflineForecastCache(key, storage);
    expect(cached?.forecasts).toHaveLength(2);
    expect(cached?.lastUpdatedIso).toBe(updated.lastUpdatedIso);
  });

  it("returns null when storage is null", () => {
    const key = buildForecastCacheKey({ lat: 21, lon: -157, startDate: "2026-02-26", days: 3 });
    expect(getOfflineForecastCache(key, null)).toBeNull();
  });

  it("resets store when schema version does not match", () => {
    storage.setItem(
      offlineForecastCache.storageKey,
      JSON.stringify({ schemaVersion: 99, entries: [] })
    );

    const key = buildForecastCacheKey({ lat: 21, lon: -157, startDate: "2026-02-26", days: 3 });
    const result = getOfflineForecastCache(key, storage);

    expect(result).toBeNull();
    expect(storage.getItem(offlineForecastCache.storageKey)).toBeNull();
  });

  it("filters out invalid entries when loading from storage", () => {
    const validKey = buildForecastCacheKey({ lat: 21, lon: -157, startDate: "2026-02-26", days: 3 });
    const invalidEntry = { lat: "bad", lon: null, startDate: 42, days: "x", forecasts: "not-array" };

    storage.setItem(
      offlineForecastCache.storageKey,
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          invalidEntry,
          {
            cacheKey: validKey,
            lat: 21,
            lon: -157,
            startDate: "2026-02-26",
            days: 3,
            forecasts: [],
            lastUpdatedIso: new Date().toISOString(),
          },
        ],
      })
    );

    const result = getOfflineForecastCache(validKey, storage);
    expect(result).not.toBeNull();
    expect(result?.lat).toBe(21);
  });

  it("handles corrupted JSON in storage gracefully", () => {
    storage.setItem(offlineForecastCache.storageKey, "{not valid json}}");

    const key = buildForecastCacheKey({ lat: 21, lon: -157, startDate: "2026-02-26", days: 3 });
    const result = getOfflineForecastCache(key, storage);

    expect(result).toBeNull();
    expect(storage.getItem(offlineForecastCache.storageKey)).toBeNull();
  });
});
