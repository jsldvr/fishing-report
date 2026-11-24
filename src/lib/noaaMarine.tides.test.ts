import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DayInputs } from "../types/forecast";

const ORIGINAL_TZ = process.env.TZ;

// tests/setup.ts maps tz-lookup to America/New_York (EST, UTC-5 in November).
// The local day Nov 21 is 05:00Z Nov 21 through 05:00Z Nov 22.
const battery: DayInputs = { date: "2026-11-21", lat: 40.7006, lon: -74.0142 };

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function stationFetch(products: string[], overrides: Record<string, Response> = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const override = Object.keys(overrides).find((key) => url.includes(key));
    if (override) return overrides[override];
    if (url.includes("/stations.json")) {
      return jsonResponse({
        stations: [
          { id: "8518750", name: "The Battery", lat: 40.7006, lng: -74.0142, state: "NY" },
        ],
      });
    }
    if (url.includes("/stations/8518750.json")) {
      return jsonResponse({
        station: { products: products.map((id) => ({ id, name: id })) },
      });
    }
    if (url.includes("product=predictions")) {
      return jsonResponse({
        predictions: [
          { t: "2026-11-21 03:10", v: "1.40", type: "H" }, // 22:10 Nov 20 local
          { t: "2026-11-21 09:40", v: "0.10", type: "L" }, // 04:40 local
          { t: "2026-11-21 15:55", v: "1.35", type: "H" }, // 10:55 local
          { t: "2026-11-22 04:30", v: "0.20", type: "L" }, // 23:30 local
          { t: "2026-11-22 06:00", v: "1.30", type: "H" }, // 01:00 Nov 22 local
        ],
      });
    }
    if (url.includes("product=wind")) {
      return jsonResponse({
        data: [{ t: "2026-11-21 14:00", s: "5.0", d: "200", dr: "SSW" }],
      });
    }
    if (url.includes("product=water_temperature")) {
      return jsonResponse({ data: [{ t: "2026-11-21 14:00", v: "11.2" }] });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("NOAA tide predictions for the location's calendar day", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(["America/Los_Angeles", "UTC", "Asia/Tokyo"])(
    "keeps the local day's tides for a viewer in %s",
    async (viewerZone) => {
      process.env.TZ = viewerZone;
      const fetchMock = stationFetch(["predictions", "wind", "water_temperature"]);
      vi.stubGlobal("fetch", fetchMock);
      const { fetchNoaaMarineConditionsWithMeta } = await import("./noaaMarine");

      const result = await fetchNoaaMarineConditionsWithMeta(battery);

      expect(result.reason).toBe("DATA_AVAILABLE");
      expect(result.marine?.tideEvents?.map((event) => event.timeIso)).toEqual([
        "2026-11-21T09:40:00.000Z",
        "2026-11-21T15:55:00.000Z",
        "2026-11-22T04:30:00.000Z",
      ]);
      expect(result.marine?.windSpeedKph).toBeCloseTo(18);
      expect(result.marine?.windDirectionText).toBe("SSW");
      expect(result.marine?.waterTemperature).toBe(11.2);

      const predictionUrl = new URL(
        String(
          fetchMock.mock.calls
            .map(([url]) => String(url))
            .find((url) => url.includes("product=predictions"))
        )
      );
      expect(predictionUrl.searchParams.get("begin_date")).toBe("20261121");
      expect(predictionUrl.searchParams.get("end_date")).toBe("20261122");
      expect(predictionUrl.searchParams.get("time_zone")).toBe("gmt");
    }
  );

  it("reports station metadata only when every product is empty", async () => {
    vi.stubGlobal(
      "fetch",
      stationFetch(["predictions", "wind", "water_temperature"], {
        "product=predictions": jsonResponse({ predictions: [] }),
        "product=wind": jsonResponse({ data: [] }),
        "product=water_temperature": jsonResponse({ data: [{ t: "", v: "" }] }),
      })
    );
    const { fetchNoaaMarineConditionsWithMeta } = await import("./noaaMarine");

    const result = await fetchNoaaMarineConditionsWithMeta(battery);
    expect(result.reason).toBe("STATION_METADATA_ONLY");
    expect(result.marine?.tideEvents).toBeUndefined();
  });

  it("marks products unsupported after a 400 and stops requesting them", async () => {
    const fetchMock = stationFetch(["predictions", "wind", "water_temperature"], {
      "product=predictions": jsonResponse({}, 400),
      "product=wind": jsonResponse({}, 404),
      "product=water_temperature": jsonResponse({}, 400),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { fetchNoaaMarineConditionsWithMeta } = await import("./noaaMarine");

    await fetchNoaaMarineConditionsWithMeta(battery);
    const second = await fetchNoaaMarineConditionsWithMeta({
      ...battery,
      date: "2026-11-22",
    });

    const productCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("/api/prod/datagetter"));
    expect(productCalls).toHaveLength(3);
    expect(second.reason).toBe("NO_SUPPORTED_PRODUCTS");
  });

  it("returns NO_STATION_FOUND when no station is nearby", async () => {
    vi.stubGlobal(
      "fetch",
      stationFetch([], { "/stations.json": jsonResponse({ stations: [] }) })
    );
    const { fetchNoaaMarineConditionsWithMeta } = await import("./noaaMarine");

    const result = await fetchNoaaMarineConditionsWithMeta(battery);
    expect(result.reason).toBe("NO_STATION_FOUND");
  });
});
