import type { ForecastScore } from "../types/forecast";

export interface ForecastCachePayload {
  cacheKey: string;
  lat: number;
  lon: number;
  startDate: string;
  days: number;
  locationName?: string;
  forecasts: ForecastScore[];
  lastUpdatedIso: string;
}

interface ForecastCacheStore {
  schemaVersion: 1;
  entries: ForecastCachePayload[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = "fishing-report.offline-forecast-cache.v1";
const CACHE_LIMIT = 10;
const STALE_THRESHOLD_HOURS = 24;

function getStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function createDefaultStore(): ForecastCacheStore {
  return {
    schemaVersion: 1,
    entries: [],
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidForecastCacheEntry(value: unknown): value is ForecastCachePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.cacheKey === "string" &&
    isFiniteNumber(entry.lat) &&
    isFiniteNumber(entry.lon) &&
    typeof entry.startDate === "string" &&
    isFiniteNumber(entry.days) &&
    Array.isArray(entry.forecasts) &&
    typeof entry.lastUpdatedIso === "string"
  );
}

function loadStore(storage: StorageLike | null = getStorage()): ForecastCacheStore {
  if (!storage) {
    return createDefaultStore();
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultStore();
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.schemaVersion !== 1) {
      storage.removeItem(STORAGE_KEY);
      return createDefaultStore();
    }

    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.filter((item) => isValidForecastCacheEntry(item))
      : [];

    return {
      schemaVersion: 1,
      entries,
    };
  } catch {
    storage.removeItem(STORAGE_KEY);
    return createDefaultStore();
  }
}

function saveStore(
  store: ForecastCacheStore,
  storage: StorageLike | null = getStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("Failed to persist offline forecast cache:", error);
  }
}

export function buildForecastCacheKey(params: {
  lat: number;
  lon: number;
  startDate: string;
  days: number;
}): string {
  return [
    params.lat.toFixed(4),
    params.lon.toFixed(4),
    params.startDate,
    params.days,
  ].join("|");
}

export function saveOfflineForecastCache(
  payload: Omit<ForecastCachePayload, "lastUpdatedIso">,
  storage: StorageLike | null = getStorage()
): ForecastCachePayload {
  const entry: ForecastCachePayload = {
    ...payload,
    lastUpdatedIso: new Date().toISOString(),
  };

  const store = loadStore(storage);
  const withoutExisting = store.entries.filter(
    (existing) => existing.cacheKey !== entry.cacheKey
  );

  const next: ForecastCacheStore = {
    schemaVersion: 1,
    entries: [entry, ...withoutExisting].slice(0, CACHE_LIMIT),
  };

  saveStore(next, storage);
  return entry;
}

export function getOfflineForecastCache(
  cacheKey: string,
  storage: StorageLike | null = getStorage()
): ForecastCachePayload | null {
  const store = loadStore(storage);
  return store.entries.find((entry) => entry.cacheKey === cacheKey) ?? null;
}

export function isCacheStale(lastUpdatedIso: string, now = new Date()): boolean {
  const timestamp = new Date(lastUpdatedIso);
  if (Number.isNaN(timestamp.getTime())) {
    return true;
  }

  const ageHours = (now.getTime() - timestamp.getTime()) / 3600000;
  return ageHours > STALE_THRESHOLD_HOURS;
}

export const offlineForecastCache = {
  storageKey: STORAGE_KEY,
  cacheLimit: CACHE_LIMIT,
  staleThresholdHours: STALE_THRESHOLD_HOURS,
  buildForecastCacheKey,
  saveOfflineForecastCache,
  getOfflineForecastCache,
  isCacheStale,
};
