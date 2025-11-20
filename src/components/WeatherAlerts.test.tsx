import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WeatherAlerts from "./WeatherAlerts";
import type { EnhancedWeatherData } from "../types/forecast";

const mockWeatherWithAlerts: EnhancedWeatherData = {
  tempC: 20,
  windKph: 10,
  precipMm: 0,
  cloudPct: 50,
  pressureHpa: 1013,
  safety: {
    rating: "GOOD",
    activeAlerts: [
      {
        id: "test-alert-1",
        headline: "Test Alert",
        event: "Test Event",
        severity: "Moderate",
        urgency: "Expected",
        certainty: "Likely",
        description: "Test description",
        instruction: "Test instruction",
        areas: ["Test Area"],
      },
    ],
    recommendations: [],
    riskFactors: [],
  },
  barometricTrend: "STEADY",
  source: "NWS",
};

const mockWeatherWithoutAlerts: EnhancedWeatherData = {
  ...mockWeatherWithAlerts,
  safety: {
    ...mockWeatherWithAlerts.safety,
    activeAlerts: [],
  },
};

describe("WeatherAlerts", () => {
  it("renders alerts when activeAlerts has items", () => {
    render(<WeatherAlerts weather={mockWeatherWithAlerts} />);

    expect(screen.getByTestId("weather-alerts")).toBeInTheDocument();
    expect(screen.getByText("Test Alert")).toBeInTheDocument();
  });

  it("does not render when activeAlerts is empty", () => {
    const { container } = render(
      <WeatherAlerts weather={mockWeatherWithoutAlerts} />
    );

    expect(screen.queryByTestId("weather-alerts")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});
