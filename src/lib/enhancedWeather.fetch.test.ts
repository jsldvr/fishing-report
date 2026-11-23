import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EnhancedWeatherData,
  MarineWeatherData,
  SafetyAssessment,
} from "../types/forecast";
import { nwsWeatherService } from "./nwsWeather.js";
import { fetchWeather } from "./openMeteo.js";
import { fetchNoaaMarineConditionsWithMeta } from "./noaaMarine.js";
import {
  adjustSafetyWithMarine,
  fetchEnhancedWeather,
  getOptimalFishingTimes,
} from "./enhancedWeather";

vi.mock("./nwsWeather.js", () => ({
  nwsWeatherService: { fetchEnhancedWeather: vi.fn() },
}));
vi.mock("./openMeteo.js", () => ({ fetchWeather: vi.fn() }));
vi.mock("./noaaMarine.js", () => ({
  fetchNoaaMarineConditionsWithMeta: vi.fn(),
}));

const ORIGINAL_TZ = process.env.TZ;
const LAT = 40.7006;
const LON = -74.0142;
// New York harbor: inside the East coast marine region; tz-lookup -> New York.
const harbor = { date: "2026-11-21", lat: LAT, lon: LON };
const inland = { date: "2026-11-21", lat: 39.7392, lon: -104.9903 };

const goodSafety: SafetyAssessment = {
  rating: "GOOD",
  activeAlerts: [],
  recommendations: [],
  riskFactors: [],
};

function nwsWeather(overrides: Partial<EnhancedWeatherData> = {}): EnhancedWeatherData {
  return {
    tempC: 18,
    windKph: 10,
    cloudPct: 30,
    safety: goodSafety,
    barometricTrend: "STEADY",
    source: "NWS",
    sourceUpdatedIso: "2026-11-21T10:00:00Z",
    ...overrides,
  };
}

/** Every argument passed to any console method, flattened to text. */
function loggedText(spies: Array<ReturnType<typeof vi.spyOn>>): string {
  return spies
    .flatMap((spy) => spy.mock.calls.flat())
    .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
    .join("\n");
}

describe("fetchEnhancedWeather", () => {
  let consoleSpies: Array<ReturnType<typeof vi.spyOn>>;

  beforeEach(() => {
    vi.mocked(nwsWeatherService.fetchEnhancedWeather).mockReset();
    vi.mocked(fetchWeather).mockReset();
    vi.mocked(fetchNoaaMarineConditionsWithMeta).mockReset();
    consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => undefined)
    );
  });

  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
    vi.restoreAllMocks();
  });

  it("uses NWS for US locations and merges marine data without logging coordinates", async () => {
    vi.mocked(nwsWeatherService.fetchEnhancedWeather).mockResolvedValue(nwsWeather());
    vi.mocked(fetchNoaaMarineConditionsWithMeta).mockResolvedValue({
      marine: { stationId: "8518750", waveHeight: 0.4 },
      reason: "DATA_AVAILABLE",
      stationId: "8518750",
      stationDistanceKm: 0.2,
    });

    const result = await fetchEnhancedWeather(harbor);

    expect(result.status).toBe("OK");
    if (result.status === "UNAVAILABLE") throw new Error("unexpected");
    expect(result.weather.source).toBe("NWS");
    expect(result.weather.marine?.stationId).toBe("8518750");
    expect(result.weather.reliability).toBeDefined();
    const logs = loggedText(consoleSpies);
    expect(logs).not.toContain(String(LAT));
    expect(logs).not.toContain(String(LON));
  });

  it("falls back to Open-Meteo when NWS fails, still without coordinates in logs", async () => {
    vi.mocked(nwsWeatherService.fetchEnhancedWeather).mockRejectedValue(
      new Error("NWS down")
    );
    vi.mocked(fetchWeather).mockResolvedValue({
      tempC: 12,
      windKph: 8,
      cloudPct: 20,
    });
    vi.mocked(fetchNoaaMarineConditionsWithMeta).mockRejectedValue(new Error("NOAA down"));

    const result = await fetchEnhancedWeather(harbor);

    expect(result.status).toBe("FALLBACK");
    if (result.status === "UNAVAILABLE") throw new Error("unexpected");
    expect(result.weather.source).toBe("OPEN_METEO");
    const logs = loggedText(consoleSpies);
    expect(logs).not.toContain(String(LAT));
    expect(logs).not.toContain(String(LON));
  });

  it("is UNAVAILABLE when every weather source fails", async () => {
    vi.mocked(nwsWeatherService.fetchEnhancedWeather).mockRejectedValue(new Error("x"));
    vi.mocked(fetchWeather).mockRejectedValue(new Error("y"));

    const result = await fetchEnhancedWeather(inland);

    expect(result).toEqual({
      status: "UNAVAILABLE",
      reason: "Current weather could not be verified from any source",
    });
  });

  it("skips marine lookups for inland locations", async () => {
    vi.mocked(nwsWeatherService.fetchEnhancedWeather).mockResolvedValue(nwsWeather());

    const result = await fetchEnhancedWeather(inland);

    expect(result.status).toBe("OK");
    expect(fetchNoaaMarineConditionsWithMeta).not.toHaveBeenCalled();
    expect(loggedText(consoleSpies)).not.toContain("39.7392");
  });
});

describe("adjustSafetyWithMarine tide window", () => {
  // Nov 21 in New York (EST) runs 05:00Z Nov 21 to 05:00Z Nov 22.
  const marine: MarineWeatherData = {
    tideEvents: [
      { timeIso: "2026-11-21T03:00:00.000Z", heightMeters: 1.5, type: "HIGH" },
      { timeIso: "2026-11-21T09:40:00.000Z", heightMeters: 0.1, type: "LOW" },
      { timeIso: "2026-11-22T04:30:00.000Z", heightMeters: 1.2, type: "HIGH" },
    ],
  };

  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  it.each(["America/Los_Angeles", "Europe/Berlin"])(
    "lists the location day's tides in the location zone (viewer in %s)",
    (viewerZone) => {
      process.env.TZ = viewerZone;
      const adjusted = adjustSafetyWithMarine(
        goodSafety,
        marine,
        "2026-11-21",
        "America/New_York"
      );
      const text = adjusted.recommendations.join("\n").replace(/\s/g, " ");
      expect(text).toContain("Next high tide: 11:30 PM (1.20m)");
      expect(text).toContain("Next low tide: 4:40 AM (0.10m)");
      expect(text).not.toContain("10:00 PM");
    }
  );

  it("downgrades for marine wind and waves", () => {
    expect(
      adjustSafetyWithMarine(goodSafety, { windSpeedKph: 45 }, "2026-11-21").rating
    ).toBe("POOR");
    expect(
      adjustSafetyWithMarine(goodSafety, { windSpeedKph: 30 }, "2026-11-21").rating
    ).toBe("FAIR");
    expect(
      adjustSafetyWithMarine(goodSafety, { windSpeedKph: 10 }, "2026-11-21")
        .recommendations
    ).toContain("Marine wind speeds are manageable for most vessels");
    expect(
      adjustSafetyWithMarine(goodSafety, { waveHeight: 2.6 }, "2026-11-21").rating
    ).toBe("POOR");
    expect(
      adjustSafetyWithMarine(goodSafety, { waveHeight: 1.6 }, "2026-11-21").rating
    ).toBe("FAIR");
    expect(
      adjustSafetyWithMarine(goodSafety, { waveHeight: 0.3 }, "2026-11-21")
        .recommendations
    ).toContain("Calm seas reported near the nearest NOAA station");
  });
});

describe("getOptimalFishingTimes", () => {
  it("warns off dangerous conditions", () => {
    expect(
      getOptimalFishingTimes(nwsWeather({ safety: { ...goodSafety, rating: "DANGEROUS" } }))
    ).toEqual(["DO NOT FISH - Dangerous weather conditions"]);
  });

  it("combines pressure, sea, wind, and temperature advice", () => {
    const falling = getOptimalFishingTimes(
      nwsWeather({ barometricTrend: "FALLING", marine: { waveHeight: 0.3 } })
    );
    expect(falling).toEqual([
      "Excellent - Fish often bite before storms",
      "Calm seas - Perfect for small boats",
      "Light winds - Ideal conditions",
      "Perfect temperature for active fish",
    ]);
    const rising = getOptimalFishingTimes(
      nwsWeather({
        barometricTrend: "RISING",
        windKph: 20,
        tempC: 5,
        marine: { waveHeight: 1 },
      })
    );
    expect(rising).toContain("Good - Stable conditions after weather systems");
    expect(rising).toContain("Light chop - Good for experienced anglers");
    expect(rising).toContain("Moderate winds - Use heavier tackle");
    expect(
      getOptimalFishingTimes(nwsWeather({ windKph: 40, marine: { waveHeight: 2 } }))
    ).toContain("Moderate seas - Use caution");
    expect(
      getOptimalFishingTimes(
        nwsWeather({ windKph: 40, tempC: 5, marine: { waveHeight: 3 } })
      )
    ).toEqual(["Rough seas - Consider shore fishing", "Strong winds - Seek sheltered areas"]);
  });
});
