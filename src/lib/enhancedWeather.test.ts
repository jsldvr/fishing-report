import { describe, expect, it } from "vitest";
import { evaluateMarinePrefilter, isMarineLocation } from "./enhancedWeather";

describe("isMarineLocation", () => {
  it("returns true for Honolulu, Hawaii", () => {
    expect(isMarineLocation(21.3045, -157.8557)).toBe(true);
  });

  it("returns true for South Padre Island, Texas", () => {
    expect(isMarineLocation(26.1037, -97.1647)).toBe(true);
  });

  it("returns false for inland Denver, Colorado", () => {
    expect(isMarineLocation(39.7392, -104.9903)).toBe(false);
  });
});

describe("evaluateMarinePrefilter", () => {
  it("returns REGION_MATCH for Honolulu", () => {
    expect(evaluateMarinePrefilter(21.3045, -157.8557)).toEqual({
      eligible: true,
      reason: "REGION_MATCH",
    });
  });

  it("returns NO_REGION_MATCH for inland Denver", () => {
    expect(evaluateMarinePrefilter(39.7392, -104.9903)).toEqual({
      eligible: false,
      reason: "NO_REGION_MATCH",
    });
  });

  it("returns OUTSIDE_OPERATIONAL_BOUNDS for out-of-scope coordinates", () => {
    expect(evaluateMarinePrefilter(0, 0)).toEqual({
      eligible: false,
      reason: "OUTSIDE_OPERATIONAL_BOUNDS",
    });
  });
});
