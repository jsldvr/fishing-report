import { describe, expect, it, vi } from "vitest";
import {
  addDaysToDate,
  formatLocalDate,
  getTimezoneFromCoords,
  isHourInDaylightWindow,
  validateNorthAmericaCoords,
} from "./time";

// tz-lookup depends on a binary timezone database that may not be available
// in the test environment. Mock it so we can unit-test the wrapper contract.
vi.mock("tz-lookup", () => ({
  default: (lat: number, lon: number): string | null => {
    // Minimal deterministic implementation for test coverage
    if (lat >= 24 && lat <= 50 && lon >= -125 && lon <= -65) {
      if (lon >= -90) return "America/New_York";
      if (lon >= -105) return "America/Chicago";
      if (lon >= -115) return "America/Denver";
      return "America/Los_Angeles";
    }
    if (lat > 50 && lon < -140) return "America/Anchorage";
    if (lat > 18 && lat < 23) return "Pacific/Honolulu";
    return null; // unknown / outside range → exercises fallback
  },
}));

describe("validateNorthAmericaCoords", () => {
  it("accepts a central US coordinate", () => {
    expect(validateNorthAmericaCoords(35.3383, -97.4867)).toBe(true);
  });

  it("accepts an Alaska coordinate", () => {
    expect(validateNorthAmericaCoords(64.2008, -153.4937)).toBe(true);
  });

  it("accepts a Hawaiian coordinate", () => {
    expect(validateNorthAmericaCoords(21.3069, -157.8583)).toBe(true);
  });

  it("accepts a southern Mexico/Caribbean boundary coordinate (lat=14)", () => {
    expect(validateNorthAmericaCoords(14, -90)).toBe(true);
  });

  it("rejects coordinates south of North America (lat < 14)", () => {
    expect(validateNorthAmericaCoords(13.9, -90)).toBe(false);
  });

  it("rejects coordinates north of North America (lat > 83)", () => {
    expect(validateNorthAmericaCoords(84, -100)).toBe(false);
  });

  it("rejects eastern Atlantic (lon > -50)", () => {
    expect(validateNorthAmericaCoords(40, -49)).toBe(false);
  });

  it("rejects coordinates past western Pacific (lon < -180)", () => {
    // lon=-180 is the western edge of Alaska — valid boundary
    expect(validateNorthAmericaCoords(60, -180)).toBe(true);
    // lon=10 is Europe — invalid
    expect(validateNorthAmericaCoords(50, 10)).toBe(false);
  });

  it("rejects (0, 0) Null Island", () => {
    expect(validateNorthAmericaCoords(0, 0)).toBe(false);
  });
});

describe("addDaysToDate", () => {
  it("adds a positive number of days", () => {
    expect(addDaysToDate("2026-02-25", 3)).toBe("2026-02-28");
  });

  it("rolls over month boundary", () => {
    expect(addDaysToDate("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("rolls over year boundary", () => {
    expect(addDaysToDate("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("adds zero days returns the same date", () => {
    expect(addDaysToDate("2026-02-25", 0)).toBe("2026-02-25");
  });

  it("subtracts days with negative input", () => {
    expect(addDaysToDate("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isHourInDaylightWindow", () => {
  it("includes hours within the default window (6-18)", () => {
    expect(isHourInDaylightWindow("2026-02-26T06:00:00")).toBe(true);
    expect(isHourInDaylightWindow("2026-02-26T12:00:00")).toBe(true);
    expect(isHourInDaylightWindow("2026-02-26T18:00:00")).toBe(true);
  });

  it("excludes hours outside the default window", () => {
    expect(isHourInDaylightWindow("2026-02-26T05:59:00")).toBe(false);
    expect(isHourInDaylightWindow("2026-02-26T19:00:00")).toBe(false);
    expect(isHourInDaylightWindow("2026-02-26T00:00:00")).toBe(false);
    expect(isHourInDaylightWindow("2026-02-26T23:59:00")).toBe(false);
  });

  it("respects custom start and end hours", () => {
    expect(isHourInDaylightWindow("2026-02-26T04:00:00", 4, 20)).toBe(true);
    expect(isHourInDaylightWindow("2026-02-26T03:00:00", 4, 20)).toBe(false);
    expect(isHourInDaylightWindow("2026-02-26T21:00:00", 4, 20)).toBe(false);
  });

  it("returns true for a malformed input (safe default)", () => {
    expect(isHourInDaylightWindow("not-a-date")).toBe(true);
    expect(isHourInDaylightWindow("")).toBe(true);
  });
});

describe("formatLocalDate", () => {
  it("returns local, utc, and timezone fields", () => {
    const result = formatLocalDate("2026-02-26T12:00:00Z", "America/New_York");
    expect(result.utc).toBe("2026-02-26T12:00:00.000Z");
    expect(result.timezone).toBe("America/New_York");
    expect(typeof result.local).toBe("string");
    expect(result.local.length).toBeGreaterThan(0);
  });

  it("falls back to system timezone when none is provided", () => {
    const result = formatLocalDate("2026-02-26T12:00:00Z");
    expect(result.timezone).toBeTruthy();
    expect(result.utc).toBe("2026-02-26T12:00:00.000Z");
  });

  it("accepts a Date object", () => {
    const d = new Date("2026-02-26T12:00:00Z");
    const result = formatLocalDate(d, "UTC");
    expect(result.utc).toBe("2026-02-26T12:00:00.000Z");
  });
});

describe("getTimezoneFromCoords", () => {
  it("returns America/Chicago for a central US coordinate (west of -90°)", () => {
    const tz = getTimezoneFromCoords(35.3383, -97.4867);
    expect(tz).toBe("America/Chicago");
  });

  it("returns America/New_York for eastern US (east of -90°)", () => {
    const tz = getTimezoneFromCoords(40.7128, -74.006);
    expect(tz).toBe("America/New_York");
  });

  it("returns America/Los_Angeles for western US (west of -115°)", () => {
    const tz = getTimezoneFromCoords(34.0522, -118.2437);
    expect(tz).toBe("America/Los_Angeles");
  });

  it("returns a non-empty string fallback for coords outside tz-lookup range", () => {
    // tz-lookup mock returns null for out-of-range coords; fallback is system TZ
    const tz = getTimezoneFromCoords(0, 0);
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
  });
});
