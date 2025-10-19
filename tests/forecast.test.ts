import { describe, it, expect } from "vitest";
import {
  phaseNameFromAngle,
  getMoonData,
  scoreMoon,
  scoreWeather,
  combineScores,
  forecastForDay,
} from "../src/lib/forecast";
import type { WeatherData, DayInputs } from "../src/types/forecast";

describe("Forecast Algorithm", () => {
  describe("phaseNameFromAngle", () => {
    it("should return correct phase names for various angles", () => {
      expect(phaseNameFromAngle(0)).toBe("New Moon");
      expect(phaseNameFromAngle(30)).toBe("Waxing Crescent");
      expect(phaseNameFromAngle(90)).toBe("First Quarter");
      expect(phaseNameFromAngle(135)).toBe("Waxing Gibbous");
      expect(phaseNameFromAngle(180)).toBe("Full Moon");
      expect(phaseNameFromAngle(225)).toBe("Waning Gibbous");
      expect(phaseNameFromAngle(270)).toBe("Last Quarter");
      expect(phaseNameFromAngle(315)).toBe("Waning Crescent");
      expect(phaseNameFromAngle(360)).toBe("New Moon");
    });
  });

  describe("getMoonData", () => {
    it("should calculate consistent moon data for known dates", () => {
      const moon1 = getMoonData("2025-01-29"); // Near new moon
      const moon2 = getMoonData("2025-02-12"); // Near full moon

      // Test that we get reasonable values within expected ranges
      expect(moon1.phaseAngleDeg).toBeGreaterThanOrEqual(0);
      expect(moon1.phaseAngleDeg).toBeLessThan(360);
      expect(moon1.illumination).toBeGreaterThanOrEqual(0);
      expect(moon1.illumination).toBeLessThanOrEqual(1);
      expect(moon1.phaseName).toBeDefined();

      expect(moon2.phaseAngleDeg).toBeGreaterThanOrEqual(0);
      expect(moon2.phaseAngleDeg).toBeLessThan(360);
      expect(moon2.illumination).toBeGreaterThanOrEqual(0);
      expect(moon2.illumination).toBeLessThanOrEqual(1);
      expect(moon2.phaseName).toBeDefined();

      // Verify the fix: moon phase should progress correctly
      const moon3 = getMoonData("2025-01-30"); // Day after new moon
      expect(moon3.phaseName).toBe("Waxing Crescent");

      // Test a sequence to ensure smooth progression
      const moon4 = getMoonData("2025-01-31");
      expect(moon4.phaseAngleDeg).toBeGreaterThan(moon3.phaseAngleDeg);
      expect(moon4.phaseName).toBe("Waxing Crescent");
    });
  });

  describe("scoreMoon", () => {
    it("should score new and full moons highly", () => {
      const newMoon = {
        phaseAngleDeg: 0,
        illumination: 0,
        phaseName: "New Moon",
      };
      const fullMoon = {
        phaseAngleDeg: 180,
        illumination: 1,
        phaseName: "Full Moon",
      };
      const quarterMoon = {
        phaseAngleDeg: 90,
        illumination: 0.5,
        phaseName: "First Quarter",
      };

      const newScore = scoreMoon(newMoon);
      const fullScore = scoreMoon(fullMoon);
      const quarterScore = scoreMoon(quarterMoon);

      // New moon: 0.6 * |cos(0)| + 0.4 * 0 = 0.6 * 1 + 0 = 0.6
      expect(newScore).toBeCloseTo(0.6, 1);

      // Full moon: 0.6 * |cos(360°)| + 0.4 * 1 = 0.6 * 1 + 0.4 = 1.0
      expect(fullScore).toBeCloseTo(1.0, 1);

      // Quarter moon: 0.6 * |cos(180°)| + 0.4 * 0.5 = 0.6 * 1 + 0.2 = 0.8
      expect(quarterScore).toBeCloseTo(0.8, 1);

      // Full moon should be highest
      expect(fullScore).toBeGreaterThan(newScore);
      expect(fullScore).toBeGreaterThan(quarterScore);
    });
  });

  describe("scoreWeather", () => {
    it("should score optimal weather conditions highly", () => {
      const optimalWeather: WeatherData = {
        tempC: 18, // Optimal range
        windKph: 10, // Light-moderate
        precipMm: 0, // No rain
        cloudPct: 30, // Partly cloudy
      };

      const poorWeather: WeatherData = {
        tempC: -5, // Too cold
        windKph: 35, // Too windy
        precipMm: 10, // Heavy rain
        cloudPct: 95, // Overcast
      };

      const optimalScore = scoreWeather(optimalWeather);
      const poorScore = scoreWeather(poorWeather);

      expect(optimalScore).toBeGreaterThan(0.8);
      expect(poorScore).toBeLessThan(0.4);
      expect(optimalScore).toBeGreaterThan(poorScore);
    });
  });

  describe("combineScores", () => {
    it("should combine scores with correct weights (no almanac)", () => {
      const moonScore = 0.8;
      const weatherScore = 0.6;

      const { total, components } = combineScores(moonScore, weatherScore);

      // Expected: 0.44 * 0.8 + 0.56 * 0.6 = 0.352 + 0.336 = 0.688
      expect(total).toBeCloseTo(68.8, 1);
      expect(components.moon).toBeCloseTo(35.2, 1);
      expect(components.weather).toBeCloseTo(33.6, 1);
      expect(components.almanac).toBeUndefined();
    });

    it("should combine scores with correct weights (with almanac)", () => {
      const moonScore = 0.8;
      const weatherScore = 0.6;
      const almanacScore = 0.9;

      const { total, components } = combineScores(
        moonScore,
        weatherScore,
        almanacScore
      );

      // Expected: 0.35 * 0.8 + 0.45 * 0.6 + 0.20 * 0.9 = 0.28 + 0.27 + 0.18 = 0.73
      expect(total).toBeCloseTo(73.0, 1);
      expect(components.moon).toBeCloseTo(28.0, 1);
      expect(components.weather).toBeCloseTo(27.0, 1);
      expect(components.almanac).toBeCloseTo(18.0, 1);
    });
  });

  describe("forecastForDay", () => {
    it("should generate complete forecast", () => {
      const dayInputs: DayInputs = {
        date: "2025-10-18",
        lat: 40.7128,
        lon: -74.006,
      };

      const weatherData: WeatherData = {
        tempC: 18,
        windKph: 12,
        precipMm: 0,
        cloudPct: 25,
      };

      const forecast = forecastForDay(dayInputs, weatherData);

      expect(forecast.date).toBe("2025-10-18");
      expect(forecast.biteScore0100).toBeGreaterThan(0);
      expect(forecast.biteScore0100).toBeLessThanOrEqual(100);
      expect(forecast.moon.phaseAngleDeg).toBeGreaterThanOrEqual(0);
      expect(forecast.moon.phaseAngleDeg).toBeLessThan(360);
      expect(forecast.weather).toEqual(weatherData);
      expect(forecast.components.moon).toBeDefined();
      expect(forecast.components.weather).toBeDefined();
    });
  });
});
