import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreCard from "./ScoreCard";
import { hasMarineDisplayData } from "./MarineConditions";
import type { ForecastScore } from "../types/forecast";

const mockForecastWithMarine: ForecastScore = {
  date: "2025-11-19",
  moon: {
    phaseAngleDeg: 180,
    illumination: 1,
    phaseName: "Full Moon",
  },
  weather: {
    tempC: 20,
    windKph: 10,
    precipMm: 0,
    cloudPct: 50,
    pressureHpa: 1013,
    marine: {
      waveHeight: 1.5,
      waterTemperature: 18,
    },
    safety: {
      rating: "GOOD",
      activeAlerts: [],
      recommendations: [],
      riskFactors: [],
    },
    barometricTrend: "STEADY",
    source: "NWS",
    reliability: {
      confidenceLevel: "HIGH",
      confidenceScore: 92,
      reasons: ["Primary data sources are fresh and complete"],
      weatherFreshness: "FRESH",
      marineFreshness: "FRESH",
      marineStatus: "AVAILABLE",
      weatherLastUpdatedIso: "2026-02-25T12:00:00Z",
      marineLastUpdatedIso: "2026-02-25T11:30:00Z",
    },
  },
  almanac: {},
  biteScore0100: 0.8,
  components: { moon: 0.8, weather: 0.8 },
};

const mockForecastWithoutMarine: ForecastScore = {
  ...mockForecastWithMarine,
  weather: {
    ...mockForecastWithMarine.weather,
    marine: undefined,
  },
};

const mockForecastWithEmptyMarine: ForecastScore = {
  ...mockForecastWithMarine,
  weather: {
    ...mockForecastWithMarine.weather,
    marine: {},
  },
};

const mockForecastWithAlerts: ForecastScore = {
  ...mockForecastWithMarine,
  weather: {
    ...mockForecastWithMarine.weather,
    source: "NWS",
    safety: {
      ...mockForecastWithMarine.weather.safety,
      activeAlerts: [
        {
          id: "test-alert",
          headline: "Test Alert",
          event: "Severe Thunderstorm Watch",
          severity: "Moderate",
          urgency: "Expected",
          certainty: "Likely",
          description: "Test description",
          instruction: "Take shelter",
          areas: ["Test Area"],
        },
      ],
    },
  },
};

const mockForecastWithoutAlerts: ForecastScore = {
  ...mockForecastWithMarine,
  weather: {
    ...mockForecastWithMarine.weather,
    source: "NWS",
    safety: {
      ...mockForecastWithMarine.weather.safety,
      activeAlerts: [],
    },
  },
};

describe("ScoreCard", () => {
  it("renders marine section when marine data is present", () => {
    render(<ScoreCard forecast={mockForecastWithMarine} lat={40} lon={-74} />);

    expect(screen.getByTestId("marine-conditions")).toBeInTheDocument();
  });

  it("does not render marine section when marine data is absent", () => {
    render(
      <ScoreCard forecast={mockForecastWithoutMarine} lat={40} lon={-74} />
    );

    expect(screen.queryByTestId("marine-conditions")).not.toBeInTheDocument();
  });

  it("does not render marine section when marine data is empty", () => {
    render(
      <ScoreCard forecast={mockForecastWithEmptyMarine} lat={40} lon={-74} />
    );

    expect(screen.queryByTestId("marine-conditions")).not.toBeInTheDocument();
  });

  it("renders alerts section when NWS alerts exist", () => {
    render(<ScoreCard forecast={mockForecastWithAlerts} lat={40} lon={-74} />);

    expect(screen.getByTestId("weather-alerts")).toBeInTheDocument();
  });

  it("does not render alerts section when NWS has no alerts", () => {
    render(
      <ScoreCard forecast={mockForecastWithoutAlerts} lat={40} lon={-74} />
    );

    expect(screen.queryByTestId("weather-alerts")).not.toBeInTheDocument();
  });

  it("renders confidence and recency metadata", () => {
    render(<ScoreCard forecast={mockForecastWithMarine} lat={40} lon={-74} />);

    expect(screen.getByText("Confidence: HIGH")).toBeInTheDocument();
    expect(screen.getByText("Score 92/100")).toBeInTheDocument();
    expect(screen.getByText(/Weather last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/Marine last updated:/)).toBeInTheDocument();
    expect(screen.queryByText(/Marine status: AVAILABLE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/freshness/i)).not.toBeInTheDocument();
  });

  it("renders reliability safely when marine data is absent", () => {
    const forecast = {
      ...mockForecastWithoutMarine,
      weather: {
        ...mockForecastWithoutMarine.weather,
        reliability: {
          confidenceLevel: "MEDIUM" as const,
          confidenceScore: 65,
          reasons: ["Marine-eligible location missing marine observations"],
          weatherFreshness: "FRESH" as const,
          marineFreshness: "UNKNOWN" as const,
          marineStatus: "UNAVAILABLE" as const,
          weatherLastUpdatedIso: "2026-02-25T12:00:00Z",
        },
      },
    };

    render(<ScoreCard forecast={forecast} lat={40} lon={-74} />);
    expect(screen.getByText("Confidence: MEDIUM")).toBeInTheDocument();
    expect(screen.getByText(/Marine status: UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.queryByText(/freshness/i)).not.toBeInTheDocument();
  });
});

describe("hasMarineDisplayData", () => {
  it("returns true when marine has waveHeight", () => {
    expect(hasMarineDisplayData({ waveHeight: 1.5 })).toBe(true);
  });

  it("returns true when marine has waterTemperature", () => {
    expect(hasMarineDisplayData({ waterTemperature: 18 })).toBe(true);
  });

  it("returns true when marine has station", () => {
    expect(hasMarineDisplayData({ stationId: "123" })).toBe(true);
  });

  it("returns true when marine has tides", () => {
    expect(
      hasMarineDisplayData({
        tideEvents: [
          { type: "HIGH", timeIso: "2025-11-19T12:00:00Z", heightMeters: 1 },
        ],
      })
    ).toBe(true);
  });

  it("returns false when marine is undefined", () => {
    expect(hasMarineDisplayData(undefined)).toBe(false);
  });

  it("returns false when marine has no displayable data", () => {
    expect(hasMarineDisplayData({})).toBe(false);
  });
});
