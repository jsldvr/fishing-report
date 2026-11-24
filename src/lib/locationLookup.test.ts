import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  IP_LOCATION_SERVICES,
  LOCATION_PERMISSION_DENIED_MESSAGE,
  describePositionFailure,
  getCoordinateError,
  lookupIpLocation,
} from "./locationLookup";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

function positionError(code: number): GeolocationPositionError {
  return {
    code,
    message: "",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

describe("getCoordinateError", () => {
  it("accepts in-range values", () => {
    expect(getCoordinateError("latitude", "40.7128")).toBe("");
    expect(getCoordinateError("longitude", "-74.006")).toBe("");
    expect(getCoordinateError("latitude", "14")).toBe("");
    expect(getCoordinateError("longitude", "-50")).toBe("");
  });

  it("explains empty, non-numeric, and out-of-range values", () => {
    expect(getCoordinateError("latitude", " ")).toBe("Enter a latitude.");
    expect(getCoordinateError("longitude", "")).toBe("Enter a longitude.");
    expect(getCoordinateError("latitude", "abc")).toBe("Latitude must be a number.");
    expect(getCoordinateError("latitude", "90")).toBe(
      "Latitude must be between 14 and 83 for North America."
    );
    expect(getCoordinateError("longitude", "-10")).toBe(
      "Longitude must be between -180 and -50 for North America."
    );
  });
});

describe("lookupIpLocation", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it("names the disclosed services in order", () => {
    expect(IP_LOCATION_SERVICES.map((service) => service.host)).toEqual([
      "ipapi.co",
      "ip-api.com",
      "ipinfo.io",
    ]);
  });

  it("uses the first service with a North American location", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ latitude: 35.47, longitude: -97.52, city: "Oklahoma City", region: "Oklahoma" })
    );
    await expect(lookupIpLocation()).resolves.toEqual({
      lat: 35.47,
      lon: -97.52,
      name: "Oklahoma City, Oklahoma",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("moves past failures and locations outside North America", async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(jsonResponse({ lat: 51.5, lon: -0.12, city: "London", regionName: "England" }))
      .mockResolvedValueOnce(jsonResponse({ loc: "47.61,-122.33", city: "Seattle" }));

    await expect(lookupIpLocation()).resolves.toEqual({
      lat: 47.61,
      lon: -122.33,
      name: "",
    });
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual(
      IP_LOCATION_SERVICES.map((service) => service.url)
    );
  });

  it("parses ip-api.com responses", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(
        jsonResponse({ lat: 29.76, lon: -95.37, city: "Houston", regionName: "Texas" })
      );
    await expect(lookupIpLocation()).resolves.toEqual({
      lat: 29.76,
      lon: -95.37,
      name: "Houston, Texas",
    });
  });

  it("resolves null when no service returns a usable location", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ loc: "" }));
    await expect(lookupIpLocation()).resolves.toBeNull();
  });
});

describe("describePositionFailure", () => {
  it("maps each geolocation error to user-facing text", () => {
    expect(describePositionFailure(positionError(1))).toBe(
      LOCATION_PERMISSION_DENIED_MESSAGE
    );
    expect(describePositionFailure(positionError(2))).toBe(
      "Unable to get your location. Location services are unavailable. Please enter coordinates manually."
    );
    expect(describePositionFailure(positionError(3))).toBe(
      "Unable to get your location. Location services are too slow. Please enter coordinates manually."
    );
    expect(describePositionFailure(positionError(99))).toBe(
      "Unable to get your location. Please enter coordinates manually."
    );
  });
});
