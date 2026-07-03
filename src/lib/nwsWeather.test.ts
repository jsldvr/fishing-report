import { describe, it, expect } from "vitest";
import { NWSWeatherService } from "./nwsWeather";
import type { NWSAlert, WeatherData, SpcOutlookRisk } from "../types/forecast";

const service = new NWSWeatherService();

const baseWeather: WeatherData = {
  tempC: 20,
  windKph: 10,
  precipMm: 0,
  cloudPct: 50,
  pressureHpa: 1013,
};

const baseAlert: NWSAlert = {
  id: "test-alert",
  headline: "Test Alert",
  event: "Test Event",
  severity: "Moderate",
  urgency: "Future",
  certainty: "Possible",
  description: "Test description",
  instruction: "Test instruction",
  areas: ["Test Area"],
};

describe("NWSWeatherService - assessSafety", () => {
  it("returns EXCELLENT with no alerts and safe weather", () => {
    const result = service.assessSafety([], baseWeather);
    expect(result.rating).toBe("EXCELLENT");
    expect(result.activeAlerts).toEqual([]);
  });

  it("downgrades to FAIR for Moderate severity alert", () => {
    const alerts = [{ ...baseAlert, severity: "Moderate" as const }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
    expect(result.activeAlerts).toEqual(alerts);
    expect(result.riskFactors).toContain("Moderate Test Event: Test Alert");
  });

  it("downgrades to GOOD for Minor severity alert", () => {
    const alerts = [{ ...baseAlert, severity: "Minor" as const }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("GOOD");
  });

  it("returns DANGEROUS for Severe alert", () => {
    const alerts = [{ ...baseAlert, severity: "Severe" as const }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("DANGEROUS");
  });

  it("downgrades for Special Weather Statement", () => {
    const alerts = [{ ...baseAlert, event: "Special Weather Statement" }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("downgrades for winter/snow alerts", () => {
    const alerts = [{ ...baseAlert, event: "Winter Storm Warning" }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("downgrades for fog alerts", () => {
    const alerts = [{ ...baseAlert, event: "Dense Fog Advisory" }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("downgrades for flood alerts", () => {
    const alerts = [{ ...baseAlert, event: "Flash Flood Warning" }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("nudges down for high urgency", () => {
    const alerts = [{ ...baseAlert, urgency: "Immediate" as const }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("nudges down for high certainty", () => {
    const alerts = [{ ...baseAlert, certainty: "Observed" as const }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("includes alert instructions in recommendations", () => {
    const alerts = [baseAlert];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.recommendations).toContain("Test instruction");
  });

  it("downgrades Minor alert with severe convective hazard to FAIR", () => {
    const alerts = [
      {
        ...baseAlert,
        severity: "Minor" as const,
        event: "Severe Thunderstorm Watch",
      },
    ];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("downgrades Moderate alert with tornado watch to FAIR", () => {
    const alerts = [{ ...baseAlert, event: "Tornado Watch" }];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("POOR");
  });

  it("downgrades Minor alert with hazardous weather outlook to FAIR", () => {
    const alerts = [
      {
        ...baseAlert,
        severity: "Minor" as const,
        event: "Hazardous Weather Outlook",
      },
    ];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("FAIR");
  });

  it("downgrades to POOR for severe convective with high urgency", () => {
    const alerts = [
      {
        ...baseAlert,
        severity: "Minor" as const,
        event: "Severe Thunderstorm Watch",
        urgency: "Immediate" as const,
      },
    ];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("POOR");
  });

  it("keeps GOOD for non-severe Minor alert", () => {
    const alerts = [
      { ...baseAlert, severity: "Minor" as const, event: "Test Event" },
    ];
    const result = service.assessSafety(alerts, baseWeather);
    expect(result.rating).toBe("GOOD");
  });

  it("downgrades based on SPC outlook risk", () => {
    const outlooks: Array<{ risk: SpcOutlookRisk; expected: string }> = [
      { risk: "MRGL", expected: "FAIR" },
      { risk: "SLGT", expected: "FAIR" },
      { risk: "ENH", expected: "POOR" },
      { risk: "MDT", expected: "DANGEROUS" },
    ];

    outlooks.forEach(({ risk, expected }) => {
      const result = service.assessSafety([], baseWeather, {
        spcOutlook: { risk, day: 1 },
      });
      expect(result.rating).toBe(expected);
      expect(result.riskFactors).toContain(
        `SPC Day 1 outlook: ${risk}`
      );
    });
  });
});

describe("NWSWeatherService - calculateBarometricTrend", () => {
  // Private method; accessed via bracket notation to unit-test the
  // uom-aware conversion directly rather than through the full fetch path.
  type BarometricTrendFn = (
    pressureValues: Array<{ validTime: string; value: number | null }> | undefined,
    targetDateTime: string,
    uom?: string
  ) => "RISING" | "FALLING" | "STEADY";
  const calculateBarometricTrend = (
    service as unknown as { calculateBarometricTrend: BarometricTrendFn }
  ).calculateBarometricTrend.bind(service);

  const targetDateTime = "2026-07-03T12:00:00Z";

  it("classifies RISING from a Pa-scale change (NWS default uom)", () => {
    const values = [
      { validTime: "2026-07-03T09:00:00Z", value: 101300 },
      { validTime: "2026-07-03T15:00:00Z", value: 101500 }, // +200 Pa = +2 hPa
    ];
    expect(
      calculateBarometricTrend(values, targetDateTime, "wmoUnit:Pa")
    ).toBe("RISING");
  });

  it("classifies FALLING from an hPa-scale change (previously misread as STEADY)", () => {
    // A 2 hPa drop reported directly in hPa. Before the uom-aware fix, this
    // was compared against a >100 threshold meant for Pa and never fired.
    const values = [
      { validTime: "2026-07-03T09:00:00Z", value: 1015 },
      { validTime: "2026-07-03T15:00:00Z", value: 1013 },
    ];
    expect(
      calculateBarometricTrend(values, targetDateTime, "wmoUnit:hPa")
    ).toBe("FALLING");
  });

  it("stays STEADY for a sub-threshold hPa-scale change", () => {
    const values = [
      { validTime: "2026-07-03T09:00:00Z", value: 1013.2 },
      { validTime: "2026-07-03T15:00:00Z", value: 1013.6 },
    ];
    expect(
      calculateBarometricTrend(values, targetDateTime, "wmoUnit:hPa")
    ).toBe("STEADY");
  });
});
