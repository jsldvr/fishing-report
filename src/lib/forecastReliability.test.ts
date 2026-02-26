import { describe, expect, it } from "vitest";
import { buildForecastReliability } from "./forecastReliability";
import type { EnhancedWeatherData } from "../types/forecast";

function makeBaseWeather(): EnhancedWeatherData {
  return {
    tempC: 20,
    windKph: 10,
    precipMm: 0,
    cloudPct: 30,
    safety: {
      rating: "GOOD",
      activeAlerts: [],
      recommendations: [],
      riskFactors: [],
    },
    barometricTrend: "STEADY",
    source: "NWS",
  };
}

describe("buildForecastReliability", () => {
  it("returns HIGH confidence for fresh NWS data when marine is not applicable", () => {
    const weather = makeBaseWeather();
    const reliability = buildForecastReliability(weather, {
      isMarineEligible: false,
      nowIso: "2026-02-25T12:00:00Z",
      weatherLastUpdatedIso: "2026-02-25T10:00:00Z",
    });

    expect(reliability.confidenceLevel).toBe("HIGH");
    expect(reliability.marineStatus).toBe("NOT_APPLICABLE");
    expect(reliability.weatherFreshness).toBe("FRESH");
  });

  it("degrades confidence for Open-Meteo fallback and missing marine on eligible location", () => {
    const weather = {
      ...makeBaseWeather(),
      source: "OPEN_METEO" as const,
    };

    const reliability = buildForecastReliability(weather, {
      isMarineEligible: true,
      nowIso: "2026-02-25T12:00:00Z",
      weatherLastUpdatedIso: "2026-02-25T10:00:00Z",
    });

    expect(reliability.confidenceLevel).toBe("LOW");
    expect(reliability.marineStatus).toBe("UNAVAILABLE");
    expect(reliability.reasons.join(" ")).toContain("fallback");
  });

  it("marks stale marine observations and downgrades confidence", () => {
    const weather = {
      ...makeBaseWeather(),
      marine: {
        waterTemperature: 12.5,
        observationTimeIso: "2026-02-23T06:00:00Z",
      },
    };

    const reliability = buildForecastReliability(weather, {
      isMarineEligible: true,
      nowIso: "2026-02-25T12:00:00Z",
      weatherLastUpdatedIso: "2026-02-25T10:00:00Z",
    });

    expect(reliability.marineStatus).toBe("AVAILABLE");
    expect(reliability.marineFreshness).toBe("STALE");
    expect(reliability.confidenceLevel).toBe("MEDIUM");
  });

  it("leaves weather last updated undefined when source timestamp is unavailable", () => {
    const weather = makeBaseWeather();
    const reliability = buildForecastReliability(weather, {
      isMarineEligible: false,
      nowIso: "2026-02-25T12:00:00Z",
    });

    expect(reliability.weatherLastUpdatedIso).toBeUndefined();
    expect(reliability.weatherFreshness).toBe("UNKNOWN");
  });

  it("treats waveHeight-only marine data as available", () => {
    const weather = {
      ...makeBaseWeather(),
      marine: {
        waveHeight: 1.2,
        waveObservationTimeIso: "2026-02-25T11:00:00Z",
      },
    };

    const reliability = buildForecastReliability(weather, {
      isMarineEligible: true,
      nowIso: "2026-02-25T12:00:00Z",
      weatherLastUpdatedIso: "2026-02-25T10:00:00Z",
    });

    expect(reliability.marineStatus).toBe("AVAILABLE");
    expect(reliability.marineFreshness).toBe("FRESH");
  });
});
