import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnhancedWeatherData, NWSAlert } from "../src/types/forecast";

vi.mock("../src/lib/nwsWeather", async () => {
  const actual = await vi.importActual<
    typeof import("../src/lib/nwsWeather")
  >("../src/lib/nwsWeather");
  return {
    ...actual,
    nwsWeatherService: {
      fetchEnhancedWeather: vi.fn(),
    },
  };
});

vi.mock("../src/lib/openMeteo", () => ({
  fetchWeather: vi.fn(),
}));

vi.mock("../src/lib/noaaMarine", () => ({
  fetchNoaaMarineConditionsWithMeta: vi.fn().mockResolvedValue({
    marine: null,
    reason: "API_ERROR",
  }),
}));

import {
  adjustSafetyWithMarine,
  fetchEnhancedWeather,
  isUSLocation,
} from "../src/lib/enhancedWeather";
import { nwsWeatherService } from "../src/lib/nwsWeather";
import { fetchWeather as fetchOpenMeteoWeather } from "../src/lib/openMeteo";
import {
  NWSWeatherService,
  clampProbabilityPct,
  convertPressureToHpa,
  convertTemperatureToC,
  convertWindToKph,
} from "../src/lib/nwsWeather";
import {
  buildUnavailableForecast,
  scorePrecipitation,
  scoreWeather,
} from "../src/lib/forecast";
import { buildForecastReliability } from "../src/lib/forecastReliability";

const mockedNwsFetch = vi.mocked(nwsWeatherService.fetchEnhancedWeather);
const mockedOpenMeteoFetch = vi.mocked(fetchOpenMeteoWeather);

const DENVER = { lat: 39.7392, lon: -104.9903 }; // US, not marine eligible
const PARIS = { lat: 48.8566, lon: 2.3522 }; // non-US

function makeNwsWeather(): EnhancedWeatherData {
  return {
    tempC: 18,
    windKph: 12,
    precipMm: undefined,
    precipProbabilityPct: 20,
    cloudPct: 30,
    pressureHpa: 1015,
    safety: {
      rating: "GOOD",
      activeAlerts: [],
      recommendations: [],
      riskFactors: [],
    },
    barometricTrend: "STEADY",
    source: "NWS",
    sourceUpdatedIso: new Date().toISOString(),
  };
}

function makeOpenMeteoWeather() {
  return {
    tempC: 17,
    windKph: 9,
    precipMm: 0.4,
    cloudPct: 45,
    pressureHpa: 1012,
  };
}

function makeBaseSafety() {
  return {
    rating: "GOOD" as const,
    activeAlerts: [],
    recommendations: [],
    riskFactors: [],
  };
}

beforeEach(() => {
  mockedNwsFetch.mockReset();
  mockedOpenMeteoFetch.mockReset();
});

describe("weather validation: source selection", () => {
  it("prefers NWS for US coordinates", async () => {
    mockedNwsFetch.mockResolvedValue(makeNwsWeather());

    const result = await fetchEnhancedWeather({
      date: "2026-07-03",
      ...DENVER,
    });

    expect(result.status).toBe("OK");
    if (result.status === "UNAVAILABLE") throw new Error("unexpected");
    expect(result.weather.source).toBe("NWS");
    expect(mockedNwsFetch).toHaveBeenCalledTimes(1);
    expect(mockedOpenMeteoFetch).not.toHaveBeenCalled();
  });

  it("uses Open-Meteo as primary (not fallback) for non-US coordinates", async () => {
    mockedOpenMeteoFetch.mockResolvedValue(makeOpenMeteoWeather());

    const result = await fetchEnhancedWeather({
      date: "2026-07-03",
      ...PARIS,
    });

    expect(result.status).toBe("OK");
    if (result.status === "UNAVAILABLE") throw new Error("unexpected");
    expect(result.weather.source).toBe("OPEN_METEO");
    expect(mockedNwsFetch).not.toHaveBeenCalled();
    expect(
      result.weather.reliability?.reasons.join(" ")
    ).not.toContain("fallback");
  });

  it("falls back to Open-Meteo when NWS fails and marks the fallback", async () => {
    mockedNwsFetch.mockRejectedValue(new Error("NWS API error: 503"));
    mockedOpenMeteoFetch.mockResolvedValue(makeOpenMeteoWeather());

    const result = await fetchEnhancedWeather({
      date: "2026-07-03",
      ...DENVER,
    });

    expect(result.status).toBe("FALLBACK");
    if (result.status === "UNAVAILABLE") throw new Error("unexpected");
    expect(result.weather.source).toBe("OPEN_METEO");
    expect(result.weather.reliability?.reasons.join(" ")).toContain(
      "fallback"
    );
  });

  it("returns UNAVAILABLE when every weather source fails", async () => {
    mockedNwsFetch.mockRejectedValue(new Error("NWS API error: 503"));
    mockedOpenMeteoFetch.mockRejectedValue(
      new Error("Open-Meteo API error: 500")
    );

    const result = await fetchEnhancedWeather({
      date: "2026-07-03",
      ...DENVER,
    });

    expect(result.status).toBe("UNAVAILABLE");
  });

  it("blocks the bite score when weather is unavailable", () => {
    const forecast = buildUnavailableForecast(
      { date: "2026-07-03", ...DENVER },
      "Current weather could not be verified from any source"
    );

    expect(forecast.forecastStatus).toBe("WEATHER_UNAVAILABLE");
    expect(forecast.biteScore0100).toBe(0);
    expect(forecast.weather.safety.rating).toBe("UNKNOWN");
    expect(forecast.weather.source).toBe("UNAVAILABLE");
    expect(Number.isNaN(forecast.weather.tempC)).toBe(true);
  });

  it("classifies US bounds correctly", () => {
    expect(isUSLocation(DENVER.lat, DENVER.lon)).toBe(true);
    expect(isUSLocation(21.3045, -157.8557)).toBe(true); // Honolulu, HI
    expect(isUSLocation(49.2827, -123.1207)).toBe(false); // Vancouver, BC
    expect(isUSLocation(PARIS.lat, PARIS.lon)).toBe(false);
    expect(isUSLocation(19.4326, -99.1332)).toBe(false); // Mexico City
  });
});

describe("weather validation: unit correctness", () => {
  it("converts wind speeds by unit of measure", () => {
    expect(convertWindToKph(10, "wmoUnit:km_h-1")).toBeCloseTo(10);
    expect(convertWindToKph(10, undefined)).toBeCloseTo(10); // NWS default km/h
    expect(convertWindToKph(10, "wmoUnit:m_s-1")).toBeCloseTo(36);
    expect(convertWindToKph(10, "wmoUnit:kn")).toBeCloseTo(18.52);
    expect(convertWindToKph(10, "wmoUnit:mi_h-1")).toBeCloseTo(16.09344);
  });

  it("converts pressure by unit of measure", () => {
    expect(convertPressureToHpa(101325, "wmoUnit:Pa")).toBeCloseTo(1013.25);
    expect(convertPressureToHpa(101325, undefined)).toBeCloseTo(1013.25);
    expect(convertPressureToHpa(1013.25, "wmoUnit:hPa")).toBeCloseTo(1013.25);
  });

  it("converts temperature by unit of measure", () => {
    expect(convertTemperatureToC(20, "wmoUnit:degC")).toBeCloseTo(20);
    expect(convertTemperatureToC(68, "wmoUnit:degF")).toBeCloseTo(20);
  });

  it("clamps precipitation probability to 0..100", () => {
    expect(clampProbabilityPct(-5)).toBe(0);
    expect(clampProbabilityPct(50)).toBe(50);
    expect(clampProbabilityPct(140)).toBe(100);
  });

  it("scores precipitation probability on its own scale, never as an amount", () => {
    // Amount takes precedence when present
    expect(scorePrecipitation(12, undefined)).toBe(0.1);
    expect(scorePrecipitation(0, undefined)).toBe(0.8);

    // Probability-only scoring
    expect(scorePrecipitation(undefined, 10)).toBe(0.8);
    expect(scorePrecipitation(undefined, 40)).toBe(0.6);
    expect(scorePrecipitation(undefined, 70)).toBe(0.4);
    expect(scorePrecipitation(undefined, 95)).toBe(0.2);

    // A 90% probability must not be scored like 0.9mm of light rain
    expect(scorePrecipitation(undefined, 90)).not.toBe(
      scorePrecipitation(0.9, undefined)
    );

    // Neither available: neutral
    expect(scorePrecipitation(undefined, undefined)).toBe(0.6);
  });

  it("keeps weather score within bounds at cloud cover extremes", () => {
    for (const cloudPct of [0, 50, 100]) {
      const score = scoreWeather({
        tempC: 18,
        windKph: 10,
        precipMm: 0,
        cloudPct,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe("weather validation: safety overrides", () => {
  const service = new NWSWeatherService();
  const baseAlert: NWSAlert = {
    id: "a1",
    headline: "Test",
    severity: "Minor",
    urgency: "Future",
    certainty: "Possible",
    event: "Test Event",
    description: "",
    areas: [],
  };
  const calmWeather = {
    tempC: 20,
    windKph: 10,
    precipMm: 0,
    cloudPct: 50,
  };

  it("forces DANGEROUS for severe and extreme alerts", () => {
    for (const severity of ["Severe", "Extreme"] as const) {
      const result = service.assessSafety(
        [{ ...baseAlert, severity }],
        calmWeather
      );
      expect(result.rating).toBe("DANGEROUS");
    }
  });

  it("degrades safety for moderate alerts", () => {
    const result = service.assessSafety(
      [{ ...baseAlert, severity: "Moderate" }],
      calmWeather
    );
    expect(result.rating).toBe("FAIR");
  });

  it("flags high precipitation probability as a risk factor", () => {
    const result = service.assessSafety([], {
      ...calmWeather,
      precipMm: undefined,
      precipProbabilityPct: 85,
    });
    expect(result.riskFactors.join(" ")).toContain("chance of precipitation");
  });

  it("degrades safety for marine high wind", () => {
    const adjusted = adjustSafetyWithMarine(
      makeBaseSafety(),
      { windSpeedKph: 60 },
      "2026-07-03"
    );
    expect(adjusted.rating).toBe("DANGEROUS");
  });

  it("degrades safety for marine high waves", () => {
    const adjusted = adjustSafetyWithMarine(
      makeBaseSafety(),
      { waveHeight: 3.2 },
      "2026-07-03"
    );
    expect(adjusted.rating).toBe("DANGEROUS");

    const moderate = adjustSafetyWithMarine(
      makeBaseSafety(),
      { waveHeight: 2.6 },
      "2026-07-03"
    );
    expect(moderate.rating).toBe("POOR");
  });

  it("zeroes the bite-relevant weather score under DANGEROUS safety regardless of source", () => {
    const score = scoreWeather({
      tempC: 18,
      windKph: 10,
      precipMm: 0,
      cloudPct: 30,
      safety: {
        rating: "DANGEROUS",
        activeAlerts: [],
        recommendations: [],
        riskFactors: [],
      },
      barometricTrend: "STEADY",
      source: "OPEN_METEO",
    });
    expect(score).toBe(0);
  });
});

describe("weather validation: data quality (reliability)", () => {
  function makeWeather(): EnhancedWeatherData {
    return {
      tempC: 18,
      windKph: 10,
      precipMm: 0,
      cloudPct: 30,
      safety: makeBaseSafety(),
      barometricTrend: "STEADY",
      source: "NWS",
    };
  }

  it("does not mark freshness FRESH when the source provides no timestamp", () => {
    const reliability = buildForecastReliability(makeWeather(), {
      isMarineEligible: false,
      nowIso: "2026-07-03T12:00:00Z",
      forecastGeneratedIso: "2026-07-03T12:00:00Z",
      // no weatherLastUpdatedIso: app fetch time must not count as freshness
    });

    expect(reliability.weatherFreshness).toBe("UNKNOWN");
    expect(reliability.confidenceScore).toBeLessThan(100);
  });

  it("reduces data quality for a fallback source", () => {
    const primary = buildForecastReliability(makeWeather(), {
      isMarineEligible: false,
      isFallbackSource: false,
      nowIso: "2026-07-03T12:00:00Z",
      weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
    });
    const fallback = buildForecastReliability(
      { ...makeWeather(), source: "OPEN_METEO" },
      {
        isMarineEligible: false,
        isFallbackSource: true,
        nowIso: "2026-07-03T12:00:00Z",
        weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
      }
    );

    expect(fallback.confidenceScore).toBeLessThan(primary.confidenceScore);
  });

  it("reduces data quality when a marine-eligible location has no marine observations", () => {
    const withoutMarine = buildForecastReliability(makeWeather(), {
      isMarineEligible: true,
      nowIso: "2026-07-03T12:00:00Z",
      weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
    });
    const notEligible = buildForecastReliability(makeWeather(), {
      isMarineEligible: false,
      nowIso: "2026-07-03T12:00:00Z",
      weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
    });

    expect(withoutMarine.marineStatus).toBe("UNAVAILABLE");
    expect(withoutMarine.confidenceScore).toBeLessThan(
      notEligible.confidenceScore
    );
  });

  it("never yields a normal-looking score for a blocked forecast", () => {
    const forecast = buildUnavailableForecast(
      { date: "2026-07-03", ...DENVER },
      "test"
    );
    expect(forecast.forecastStatus).toBe("WEATHER_UNAVAILABLE");
    expect(forecast.components).toEqual({});
    expect(forecast.biteScore0100).toBe(0);
  });
});
