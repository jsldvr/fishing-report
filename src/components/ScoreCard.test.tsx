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

const mockForecastFullDetails: ForecastScore = {
  ...mockForecastWithMarine,
  almanac: { notes: "Cool front approaching; fish the morning bite." },
  components: { moon: 60, weather: 55, almanac: 70 },
  astronomical: {
    sunrise: "06:30",
    sunset: "19:45",
    solarNoon: "13:07",
    moonrise: "20:15",
    moonset: "07:05",
  },
  solunar: {
    dayRating: 3,
    majorPeriods: [
      { start: "06:00", end: "08:00", type: "major" },
      { start: "18:30", end: "20:30", type: "major" },
    ],
    minorPeriods: [{ start: "12:00", end: "13:00", type: "minor" }],
  },
  weather: {
    ...mockForecastWithMarine.weather,
    source: "OPEN_METEO",
    barometricTrend: "FALLING",
    precipMm: 2,
    safety: {
      rating: "FAIR",
      activeAlerts: [],
      riskFactors: ["Building afternoon wind", "Falling barometric pressure"],
      recommendations: [
        "Fish the morning solunar window",
        "Monitor wind before heading out",
      ],
    },
    reliability: {
      confidenceLevel: "MEDIUM",
      confidenceScore: 70,
      reasons: ["Marine data available; weather source fresh"],
      weatherFreshness: "FRESH",
      marineFreshness: "FRESH",
      marineStatus: "AVAILABLE",
      forecastGeneratedIso: "2026-02-25T12:05:00Z",
      weatherLastUpdatedIso: "2026-02-25T12:00:00Z",
      marineLastUpdatedIso: "2026-02-25T11:30:00Z",
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

  it("renders data quality and recency metadata", () => {
    render(<ScoreCard forecast={mockForecastWithMarine} lat={40} lon={-74} />);

    expect(screen.getByText("Data quality: HIGH")).toBeInTheDocument();
    expect(screen.getByText("Data quality score 92/100")).toBeInTheDocument();
    expect(screen.queryByText(/Confidence/)).not.toBeInTheDocument();
    expect(screen.getByText(/Forecast generated:/)).toBeInTheDocument();
    expect(screen.getByText(/Weather source updated:/)).toBeInTheDocument();
    expect(screen.getByText(/Marine observation updated:/)).toBeInTheDocument();
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
    expect(screen.getByText("Data quality: MEDIUM")).toBeInTheDocument();
    expect(screen.getByText(/Marine status: UNAVAILABLE/)).toBeInTheDocument();
    expect(screen.queryByText(/freshness/i)).not.toBeInTheDocument();
  });

  it("shows unknown source freshness instead of claiming fresh data", () => {
    const forecast = {
      ...mockForecastWithoutMarine,
      weather: {
        ...mockForecastWithoutMarine.weather,
        reliability: {
          ...mockForecastWithoutMarine.weather.reliability!,
          weatherFreshness: "UNKNOWN" as const,
          weatherLastUpdatedIso: undefined,
          marineStatus: "NOT_APPLICABLE" as const,
        },
      },
    };

    render(<ScoreCard forecast={forecast} lat={40} lon={-74} />);
    expect(
      screen.getByText(/Weather source updated:\s*Unknown/)
    ).toBeInTheDocument();
  });

  it("renders a blocked card without a bite score when weather is unavailable", () => {
    const forecast: ForecastScore = {
      ...mockForecastWithoutMarine,
      weather: {
        ...mockForecastWithoutMarine.weather,
        tempC: NaN,
        windKph: NaN,
        precipMm: undefined,
        cloudPct: NaN,
        source: "UNAVAILABLE",
        safety: {
          rating: "UNKNOWN",
          activeAlerts: [],
          recommendations: [],
          riskFactors: [],
        },
      },
      biteScore0100: 0,
      components: {},
      forecastStatus: "WEATHER_UNAVAILABLE",
      unavailableReason: "Current weather could not be verified from any source",
    };

    render(<ScoreCard forecast={forecast} lat={40} lon={-74} />);

    expect(screen.getByTestId("score-card-unavailable")).toBeInTheDocument();
    expect(screen.getByText("Forecast unavailable")).toBeInTheDocument();
    expect(screen.getByText("Safety: Unknown")).toBeInTheDocument();
    expect(
      screen.getByText(/Check official weather before fishing/)
    ).toBeInTheDocument();
    expect(screen.queryByText("Bite Score")).not.toBeInTheDocument();
    expect(screen.queryByTestId("score-card")).not.toBeInTheDocument();
  });

  it("displays precipitation probability separately from amount", () => {
    const forecast: ForecastScore = {
      ...mockForecastWithoutMarine,
      weather: {
        ...mockForecastWithoutMarine.weather,
        precipMm: undefined,
        precipProbabilityPct: 40,
      },
    };

    render(<ScoreCard forecast={forecast} lat={40} lon={-74} />);

    expect(screen.getByText("Chance of rain: 40%")).toBeInTheDocument();
    expect(screen.getByText("Rain amount unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Rain amount: /)).not.toBeInTheDocument();
  });

  it("renders the score breakdown immediately before Today's outlook", () => {
    render(<ScoreCard forecast={mockForecastWithMarine} lat={40} lon={-74} />);

    const breakdown = screen.getByTestId("score-card-breakdown");
    const summary = screen.getByTestId("score-card-summary");

    expect(breakdown).toBeInTheDocument();
    expect(summary).toBeInTheDocument();
    expect(breakdown.nextElementSibling).toBe(summary);
  });

  it("keeps the breakdown section classes and id unchanged after the reorder", () => {
    render(<ScoreCard forecast={mockForecastWithMarine} lat={40} lon={-74} />);

    const breakdown = screen.getByTestId("score-card-breakdown");

    expect(breakdown).toHaveClass("forecast-card__section");
    expect(breakdown.id).toMatch(/-score-breakdown$/);
  });

  it("renders astronomical, solunar, almanac, and safety detail sections", () => {
    render(
      <ScoreCard
        forecast={mockForecastFullDetails}
        lat={40}
        lon={-74}
        useFahrenheit={false}
        useMph={false}
      />
    );

    // Almanac component metric and callout
    expect(screen.getByText("Almanac")).toBeInTheDocument();
    expect(
      screen.getByText(/Cool front approaching; fish the morning bite\./)
    ).toBeInTheDocument();

    // Astronomical + solunar section
    expect(screen.getByText("Sunrise: 06:30")).toBeInTheDocument();
    expect(screen.getByText("Sunset: 19:45")).toBeInTheDocument();
    expect(screen.getByText("Solar Noon: 13:07")).toBeInTheDocument();
    expect(screen.getByText("Rise: 20:15")).toBeInTheDocument();
    expect(screen.getByText("Set: 07:05")).toBeInTheDocument();
    expect(screen.getByText("Solunar Rating")).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument();
    // First major period appears in both the breakdown list and the best-window row
    expect(screen.getAllByText("06:00 - 08:00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("18:30 - 20:30")).toBeInTheDocument();
    expect(screen.getByText("12:00 - 13:00")).toBeInTheDocument();

    // Best window row derives from the first major solunar period
    expect(screen.getByText("Best window")).toBeInTheDocument();

    // Metric-only (non-Fahrenheit / non-mph) rendering paths
    expect(screen.getByText("Temp: 20°C")).toBeInTheDocument();
    expect(screen.getByText("Wind: 10 km/h")).toBeInTheDocument();
    expect(screen.getByText("Pressure: 1013 hPa")).toBeInTheDocument();

    // Open-Meteo safety source plus risk factors and recommendations
    expect(screen.getByText("Fishing Safety: FAIR")).toBeInTheDocument();
    expect(screen.getAllByText(/Open-Meteo/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Building afternoon wind")).toBeInTheDocument();
    expect(
      screen.getByText("Fish the morning solunar window")
    ).toBeInTheDocument();
  });

  it("renders low data-quality styling and recent relative timestamps", () => {
    const now = Date.now();
    const forecast: ForecastScore = {
      ...mockForecastWithoutMarine,
      weather: {
        ...mockForecastWithoutMarine.weather,
        reliability: {
          confidenceLevel: "LOW" as const,
          confidenceScore: 30,
          reasons: ["Weather source stale"],
          weatherFreshness: "STALE" as const,
          marineFreshness: "UNKNOWN" as const,
          marineStatus: "NOT_APPLICABLE" as const,
          forecastGeneratedIso: new Date(now - 5 * 60_000).toISOString(),
          weatherLastUpdatedIso: new Date(now - 3 * 3_600_000).toISOString(),
        },
      },
    };

    render(<ScoreCard forecast={forecast} lat={40} lon={-74} />);

    expect(screen.getByText("Data quality: LOW")).toBeInTheDocument();
    expect(screen.getByText(/Forecast generated:\s*5 min ago/)).toBeInTheDocument();
    expect(
      screen.getByText(/Weather source updated:\s*3 hr ago/)
    ).toBeInTheDocument();
  });

  it("renders an NWS pressure-trend badge when the trend is not steady", () => {
    const forecast: ForecastScore = {
      ...mockForecastWithoutMarine,
      weather: {
        ...mockForecastWithoutMarine.weather,
        source: "NWS",
        barometricTrend: "RISING",
      },
    };

    render(<ScoreCard forecast={forecast} lat={40} lon={-74} />);

    expect(screen.getAllByText(/rising pressure/).length).toBeGreaterThan(0);
  });

  it("renders each safety rating label and heading", () => {
    const ratings: Array<{ rating: NonNullable<ForecastScore["weather"]["safety"]["rating"]>; label: string }> = [
      { rating: "POOR", label: "Poor" },
      { rating: "DANGEROUS", label: "Dangerous" },
      { rating: "UNKNOWN", label: "Unknown" },
    ];

    for (const { rating, label } of ratings) {
      const { unmount } = render(
        <ScoreCard
          forecast={{
            ...mockForecastWithoutMarine,
            weather: {
              ...mockForecastWithoutMarine.weather,
              safety: {
                ...mockForecastWithoutMarine.weather.safety,
                rating,
              },
            },
          }}
          lat={40}
          lon={-74}
        />
      );

      expect(screen.getByText(`Fishing Safety: ${rating}`)).toBeInTheDocument();
      expect(
        screen.getByText("Safety", { selector: ".forecast-card__summary-label" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(label, {
          selector: ".forecast-card__summary-value",
        })
      ).toBeInTheDocument();

      unmount();
    }
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
