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
