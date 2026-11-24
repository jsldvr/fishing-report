import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWeather } from "./openMeteo";

// tests/setup.ts maps every coordinate to America/New_York.
const day = { date: "2026-11-23", lat: 40.7128, lon: -74.006 };

function hourlyFor(date: string) {
  const hours = Array.from({ length: 24 }, (_, hour) =>
    `${date}T${String(hour).padStart(2, "0")}:00`
  );
  return {
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, hour): number => (hour >= 6 && hour <= 18 ? 10 : -50)),
      precipitation: hours.map(() => 0.2),
      cloud_cover: hours.map(() => 40),
      pressure_msl: hours.map(() => 1012),
      windspeed_10m: hours.map(() => 12),
    },
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

function requestedParams(): URLSearchParams {
  const url = String(vi.mocked(fetch).mock.calls[0][0]);
  return new URL(url).searchParams;
}

describe("fetchWeather (Open-Meteo)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.mocked(fetch).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts forecast days from the location's today, not the UTC date", async () => {
    // 23:30 Nov 21 in New York; already Nov 22 in UTC.
    vi.setSystemTime(new Date("2026-11-22T04:30:00Z"));
    vi.mocked(fetch).mockResolvedValue(jsonResponse(hourlyFor(day.date)));

    await fetchWeather(day);

    // Nov 21 -> Nov 23 is two days ahead, so three forecast days are needed.
    expect(requestedParams().get("forecast_days")).toBe("3");
    expect(requestedParams().get("timezone")).toBe("auto");
  });

  it("averages only the target day's local daylight hours", async () => {
    vi.setSystemTime(new Date("2026-11-21T15:00:00Z"));
    const body = hourlyFor(day.date);
    // A neighbouring day's values must be ignored.
    body.hourly.time.push("2026-11-24T12:00");
    body.hourly.temperature_2m.push(99);
    body.hourly.precipitation.push(9);
    body.hourly.cloud_cover.push(100);
    body.hourly.pressure_msl.push(900);
    body.hourly.windspeed_10m.push(99);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(body));

    await expect(fetchWeather(day)).resolves.toEqual({
      tempC: 10,
      windKph: 12,
      precipMm: 0.2,
      cloudPct: 40,
      pressureHpa: 1012,
    });
  });

  it("requests at least one day for past dates", async () => {
    vi.setSystemTime(new Date("2026-11-30T15:00:00Z"));
    vi.mocked(fetch).mockResolvedValue(jsonResponse(hourlyFor(day.date)));

    await fetchWeather(day);

    expect(requestedParams().get("forecast_days")).toBe("1");
  });

  it("throws on an API error", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false, 503));
    await expect(fetchWeather(day)).rejects.toThrow("Open-Meteo API error: 503");
  });

  it("throws when the target day has no daylight data", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(hourlyFor("2026-11-24")));
    await expect(fetchWeather(day)).rejects.toThrow(/no daylight-window data/);
  });

  it("throws when a required field is missing", async () => {
    const body = hourlyFor(day.date);
    body.hourly.temperature_2m = body.hourly.temperature_2m.map(() => Number.NaN);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(body));
    await expect(fetchWeather(day)).rejects.toThrow(/temperature_2m/);
  });

  it("leaves optional fields undefined when absent", async () => {
    const body = hourlyFor(day.date) as {
      hourly: Record<string, unknown>;
    };
    delete body.hourly.pressure_msl;
    body.hourly.precipitation = [];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(body));
    const weather = await fetchWeather(day);
    expect(weather.pressureHpa).toBeUndefined();
    expect(weather.precipMm).toBeUndefined();
  });
});
