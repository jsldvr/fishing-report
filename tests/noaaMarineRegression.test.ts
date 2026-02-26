import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DayInputs } from "../src/types/forecast";

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("NOAA marine regression", () => {
  const milton: DayInputs = {
    date: "2026-02-25",
    lat: 42.7754,
    lon: -88.939,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips marine data for inland locations when nearest station is too far", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "9087057",
              name: "Calumet Harbor",
              lat: 41.728,
              lng: -87.538,
              state: "IL",
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditions } = await import("../src/lib/noaaMarine");
    const marine = await fetchNoaaMarineConditions(milton);

    expect(marine).toBeNull();

    const datagetterCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("/api/prod/datagetter"));

    expect(datagetterCalls).toHaveLength(0);
  });

  it("marks predictions unsupported after 400 and avoids repeat calls", async () => {
    const nearCoast: DayInputs = {
      date: "2026-02-25",
      lat: 43.02,
      lon: -87.89,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "9087057",
              name: "Milwaukee Harbor",
              lat: 43.0186,
              lng: -87.8877,
              state: "WI",
            },
          ],
        });
      }

      if (url.includes("/mdapi/prod/webapi/stations/9087057.json")) {
        return makeJsonResponse({
          station: {
            products: [{ id: "predictions", name: "predictions" }],
          },
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=predictions")
      ) {
        return makeJsonResponse({ error: { message: "bad request" } }, 400);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditions } = await import("../src/lib/noaaMarine");

    await fetchNoaaMarineConditions(nearCoast);
    await fetchNoaaMarineConditions({ ...nearCoast, date: "2026-02-26" });

    const predictionCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter(
        (url) =>
          url.includes("/api/prod/datagetter") &&
          url.includes("product=predictions")
      );

    expect(predictionCalls).toHaveLength(1);
  });

  it("still returns tide events for eligible locations with valid predictions", async () => {
    const nearCoast: DayInputs = {
      date: "2026-02-25",
      lat: 43.02,
      lon: -87.89,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "9087057",
              name: "Milwaukee Harbor",
              lat: 43.0186,
              lng: -87.8877,
              state: "WI",
            },
          ],
        });
      }

      if (url.includes("/mdapi/prod/webapi/stations/9087057.json")) {
        return makeJsonResponse({
          station: {
            products: [{ id: "predictions", name: "predictions" }],
          },
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=predictions")
      ) {
        return makeJsonResponse({
          predictions: [
            { t: "2026-02-25 06:15", v: "0.84", type: "H" },
            { t: "2026-02-25 12:40", v: "0.25", type: "L" },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditions } = await import("../src/lib/noaaMarine");
    const marine = await fetchNoaaMarineConditions(nearCoast);

    expect(marine?.stationId).toBe("9087057");
    expect(marine?.tideEvents).toBeDefined();
    expect(marine?.tideEvents?.length).toBe(2);
    expect(marine?.tideEvents?.[0].type).toBe("HIGH");
  });

  it("does not call unsupported NOAA waveheight product for South Padre station", async () => {
    const southPadre: DayInputs = {
      date: "2026-02-25",
      lat: 26.1037,
      lon: -97.1647,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "8779748",
              name: "South Padre Island CG Station",
              lat: 26.0731,
              lng: -97.1675,
              state: "TX",
            },
          ],
        });
      }

      if (url.includes("/mdapi/prod/webapi/stations/8779748.json")) {
        return makeJsonResponse({
          station: {
            products: [{ id: "predictions", name: "predictions" }],
          },
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=predictions")
      ) {
        return makeJsonResponse({
          predictions: [{ t: "2026-02-25 08:10", v: "0.72", type: "H" }],
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=wind")
      ) {
        return makeJsonResponse({
          data: [{ t: "2026-02-25 08:00", s: "5.2", d: "130", dr: "SE" }],
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=water_temperature")
      ) {
        return makeJsonResponse({
          data: [{ t: "2026-02-25 08:00", v: "21.4" }],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditions } = await import("../src/lib/noaaMarine");
    const marine = await fetchNoaaMarineConditions(southPadre);

    expect(marine?.stationId).toBe("8779748");
    expect(marine?.tideEvents?.length).toBe(1);

    const waveheightCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter(
        (url) =>
          url.includes("/api/prod/datagetter") &&
          url.includes("product=waveheight")
      );

    expect(waveheightCalls).toHaveLength(0);
  });

  it("treats NOAA catalog-style product names as predictions support", async () => {
    const southPadre: DayInputs = {
      date: "2026-02-25",
      lat: 26.1037,
      lon: -97.1647,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "8779748",
              name: "South Padre Island CG Station",
              lat: 26.0731,
              lng: -97.1675,
              state: "TX",
            },
          ],
        });
      }

      if (url.includes("/mdapi/prod/webapi/stations/8779748.json")) {
        return makeJsonResponse({
          station: {
            products: [{ name: "Tide Predictions" }, { name: "Meteorological" }],
          },
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=predictions")
      ) {
        return makeJsonResponse({
          predictions: [{ t: "2026-02-25 08:10", v: "0.72", type: "H" }],
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=wind")
      ) {
        return makeJsonResponse({ error: { message: "not supported" } }, 400);
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=water_temperature")
      ) {
        return makeJsonResponse({ error: { message: "not supported" } }, 400);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditions } = await import("../src/lib/noaaMarine");
    const marine = await fetchNoaaMarineConditions(southPadre);

    expect(marine?.tideEvents?.length).toBe(1);
  });

  it("returns STATION_TOO_FAR metadata for inland location", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "9087057",
              name: "Milwaukee",
              lat: 43.0186,
              lng: -87.8877,
              state: "WI",
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditionsWithMeta } = await import(
      "../src/lib/noaaMarine"
    );
    const result = await fetchNoaaMarineConditionsWithMeta(milton);

    expect(result.marine).toBeNull();
    expect(result.reason).toBe("STATION_TOO_FAR");
    expect(result.stationDistanceKm).toBeGreaterThan(50);
  });

  it("returns STATION_METADATA_ONLY when station catalog is inconclusive and no observations are returned", async () => {
    const southPadre: DayInputs = {
      date: "2026-02-25",
      lat: 26.1037,
      lon: -97.1647,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/mdapi/prod/webapi/stations.json")) {
        return makeJsonResponse({
          stations: [
            {
              id: "8779748",
              name: "South Padre Island CG Station",
              lat: 26.0731,
              lng: -97.1675,
              state: "TX",
            },
          ],
        });
      }

      if (url.includes("/mdapi/prod/webapi/stations/8779748.json")) {
        return makeJsonResponse({
          station: {
            products: [{ id: "air_gap", name: "Air Gap" }],
          },
        });
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=predictions")
      ) {
        return makeJsonResponse({ error: { message: "not supported" } }, 400);
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=wind")
      ) {
        return makeJsonResponse({ error: { message: "not supported" } }, 400);
      }

      if (
        url.includes("/api/prod/datagetter") &&
        url.includes("product=water_temperature")
      ) {
        return makeJsonResponse({ error: { message: "not supported" } }, 400);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { fetchNoaaMarineConditionsWithMeta } = await import(
      "../src/lib/noaaMarine"
    );
    const result = await fetchNoaaMarineConditionsWithMeta(southPadre);

    expect(result.marine).not.toBeNull();
    expect(result.reason).toBe("STATION_METADATA_ONLY");
  });
});
