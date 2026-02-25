import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
