import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NWSWeatherService, parseValidTimeStartMs } from "./nwsWeather";

vi.mock("./spcOutlook.js", () => ({
  fetchSpcOutlook: vi.fn(async () => null),
}));

const ORIGINAL_TZ = process.env.TZ;

// Los Angeles location. tests/setup.ts maps tz-lookup to New York, so a correct
// result proves the NWS point's own timeZone is what selects the local day.
const day = { date: "2026-11-21", lat: 34.0522, lon: -118.2437 };

/**
 * Grid values around Saturday Nov 21 in Los Angeles (PST, UTC-8):
 * - 02:00Z Nov 21 is 18:00 Friday local, the previous day (excluded)
 * - 16:00Z Nov 21 is 08:00 local (daylight)
 * - 00:00Z Nov 22 is 16:00 local (daylight)
 * - 05:00Z Nov 22 is 21:00 local (same day, outside daylight)
 */
function quantity(values: [number, number, number, number], uom?: string) {
  const times = [
    "2026-11-21T02:00:00+00:00/PT6H",
    "2026-11-21T16:00:00+00:00/PT1H",
    "2026-11-22T00:00:00+00:00/PT1H",
    "2026-11-22T05:00:00+00:00/PT1H",
  ];
  return {
    uom,
    values: times.map((validTime, index) => ({ validTime, value: values[index] })),
  };
}

function gridpointBody() {
  return {
    properties: {
      updateTime: "2026-11-21T10:00:00+00:00",
      temperature: quantity([30, 10, 20, -5], "wmoUnit:degC"),
      windSpeed: quantity([90, 8, 12, 50], "wmoUnit:km_h-1"),
      skyCover: quantity([100, 20, 40, 100]),
      probabilityOfPrecipitation: quantity([90, 10, 30, 80]),
      waveHeight: quantity([4, 1, 2, 4]),
      waterTemperature: quantity([1, 15, 17, 1]),
    },
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Server Error",
    json: async () => body,
  } as Response;
}

function routeFetch(overrides: Record<string, () => Response> = {}) {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    const override = Object.keys(overrides).find((key) => url.includes(key));
    if (override) return overrides[override]();
    if (url.includes("/points/")) {
      return jsonResponse({
        properties: {
          gridId: "LOX",
          gridX: 154,
          gridY: 44,
          forecastOffice: "https://api.weather.gov/offices/LOX",
          forecastZone: "https://api.weather.gov/zones/forecast/CAZ041",
          county: "https://api.weather.gov/zones/county/CAC037",
          fireWeatherZone: "https://api.weather.gov/zones/fire/CAZ241",
          timeZone: "America/Los_Angeles",
        },
      });
    }
    if (url.includes("/gridpoints/")) return jsonResponse(gridpointBody());
    if (url.includes("/alerts/active/zone/")) return jsonResponse({ features: [] });
    if (url.includes("/offices/")) {
      return jsonResponse({
        name: "Los Angeles/Oxnard",
        address: { addressLocality: "Oxnard", addressRegion: "CA" },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("parseValidTimeStartMs", () => {
  it("parses the start of an ISO 8601 interval", () => {
    expect(parseValidTimeStartMs("2026-11-21T16:00:00+00:00/PT1H")).toBe(
      Date.parse("2026-11-21T16:00:00Z")
    );
    expect(parseValidTimeStartMs("2026-11-21T16:00:00Z")).toBe(
      Date.parse("2026-11-21T16:00:00Z")
    );
    expect(parseValidTimeStartMs("garbage/PT1H")).toBeNaN();
  });
});

describe("NWSWeatherService.fetchEnhancedWeather", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
    vi.restoreAllMocks();
  });

  it.each(["America/New_York", "Europe/Berlin", "Asia/Tokyo"])(
    "averages the location's daylight values for the calendar day (viewer in %s)",
    async (viewerZone) => {
      process.env.TZ = viewerZone;
      routeFetch();

      const weather = await new NWSWeatherService().fetchEnhancedWeather(day);

      expect(weather.tempC).toBe(15);
      expect(weather.windKph).toBe(10);
      expect(weather.cloudPct).toBe(30);
      expect(weather.precipProbabilityPct).toBe(20);
      expect(weather.precipMm).toBeUndefined();
      expect(weather.marine).toEqual(
        expect.objectContaining({ waveHeight: 1.5, waterTemperature: 16 })
      );
      expect(weather.source).toBe("NWS");
      expect(weather.sourceUpdatedIso).toBe("2026-11-21T10:00:00+00:00");
      expect(weather.localOffice?.servingArea).toBe("Oxnard, CA");
    }
  );

  it("falls back to the first value of the day when none is in daylight", async () => {
    routeFetch({
      "/gridpoints/": () => {
        const body = gridpointBody();
        body.properties.temperature = {
          uom: "wmoUnit:degC",
          values: [{ validTime: "2026-11-22T05:00:00+00:00/PT1H", value: -5 }],
        };
        return jsonResponse(body);
      },
    });

    const weather = await new NWSWeatherService().fetchEnhancedWeather(day);
    expect(weather.tempC).toBe(-5);
  });

  it("throws when core fields have no values on the location's day", async () => {
    routeFetch({
      "/gridpoints/": () => {
        const body = gridpointBody();
        body.properties.temperature = {
          uom: "wmoUnit:degC",
          values: [{ validTime: "2026-11-21T02:00:00+00:00/PT6H", value: 30 }],
        };
        return jsonResponse(body);
      },
    });

    await expect(new NWSWeatherService().fetchEnhancedWeather(day)).rejects.toThrow(
      /incomplete for 2026-11-21/
    );
  });

  it("degrades alerts and office lookups to empty results on failure", async () => {
    routeFetch({
      "/alerts/active/zone/": () => jsonResponse({}, false),
      "/offices/": () => jsonResponse({}, false),
    });

    const weather = await new NWSWeatherService().fetchEnhancedWeather(day);
    expect(weather.safety.activeAlerts).toEqual([]);
    expect(weather.localOffice).toBeUndefined();
  });

  it("maps active alerts into the safety assessment", async () => {
    routeFetch({
      "/alerts/active/zone/": () =>
        jsonResponse({
          features: [
            {
              id: "alert-1",
              properties: {
                headline: "Small Craft Advisory",
                severity: "Moderate",
                urgency: "Expected",
                certainty: "Likely",
                event: "Small Craft Advisory",
                description: "Winds 25 kt",
                instruction: "Stay in port",
                areaDesc: "Coastal waters",
              },
            },
          ],
        }),
    });

    const weather = await new NWSWeatherService().fetchEnhancedWeather(day);
    expect(weather.safety.activeAlerts).toHaveLength(1);
    expect(weather.safety.activeAlerts[0].areas).toEqual(["Coastal waters"]);
  });

  it("propagates point metadata failures", async () => {
    routeFetch({ "/points/": () => jsonResponse({}, false) });
    await expect(new NWSWeatherService().fetchEnhancedWeather(day)).rejects.toThrow(
      /NWS API error: 500/
    );
  });
});
