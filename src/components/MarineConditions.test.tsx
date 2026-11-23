import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MarineConditions from "./MarineConditions";
import type { MarineWeatherData } from "../types/forecast";

const ORIGINAL_TZ = process.env.TZ;

const marine: MarineWeatherData = {
  stationId: "9410840",
  stationName: "Santa Monica",
  stationDistanceKm: 4,
  waveHeight: 1.2,
  windSpeedKph: 16.09344,
  windDirectionText: "WNW",
  waterTemperature: 15.5,
  tideEvents: [
    { timeIso: "2026-11-22T00:30:00.000Z", heightMeters: 1.4, type: "HIGH" },
    { timeIso: "2026-11-21T15:05:00.000Z", heightMeters: 0.2, type: "LOW" },
  ],
};

function text(testId: string): string {
  return (document.getElementById(testId)?.textContent ?? "").replace(/\s/g, " ");
}

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("MarineConditions", () => {
  it.each(["America/New_York", "Asia/Tokyo"])(
    "shows tide times in the fishing location's zone for a viewer in %s",
    (viewerZone) => {
      process.env.TZ = viewerZone;
      render(
        <MarineConditions
          marine={marine}
          dateIso="2026-11-21"
          timeZone="America/Los_Angeles"
          useMph
        />
      );

      // Sorted chronologically; 15:05Z is 7:05 AM PST, 00:30Z is 4:30 PM PST.
      expect(text("marine-20261121-tide-0-label")).toBe("Low tide");
      expect(text("marine-20261121-tide-0-time")).toBe("7:05 AM | 0.20 m");
      expect(text("marine-20261121-tide-1-time")).toBe("4:30 PM | 1.40 m");
    }
  );

  it("renders station and metric values in the chosen units", () => {
    const { rerender } = render(
      <MarineConditions marine={marine} dateIso="2026-11-21" timeZone="UTC" useMph />
    );
    expect(text("marine-20261121-station")).toBe(
      "Nearest NOAA station: Santa Monica (2.5 mi away)"
    );
    expect(text("marine-20261121-wind-value")).toBe("10.0 mph WNW");
    expect(text("marine-20261121-wave-value")).toBe("1.20 m (3.9 ft)");
    expect(text("marine-20261121-water-temp-value")).toBe("15.5 °C");

    rerender(
      <MarineConditions
        marine={{ ...marine, windDirectionText: undefined, windDirectionDeg: 270 }}
        dateIso="2026-11-21"
        timeZone="UTC"
        useMph={false}
      />
    );
    expect(text("marine-20261121-station")).toBe(
      "Nearest NOAA station: Santa Monica (4 km away)"
    );
    expect(text("marine-20261121-wind-value")).toBe("16.1 km/h 270°");
  });

  it("renders nothing without displayable data", () => {
    const { container } = render(
      <MarineConditions marine={{}} dateIso="2026-11-21" timeZone="UTC" useMph />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("marine-conditions")).toBeNull();
  });
});
