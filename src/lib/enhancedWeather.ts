import type { DayInputs, EnhancedWeatherData } from "../types/forecast.js";
import { fetchWeather as fetchOpenMeteoWeather } from "./openMeteo.js";
import { nwsWeatherService } from "./nwsWeather.js";

/**
 * Enhanced weather fetcher that prioritizes NWS for US locations
 * and falls back to Open-Meteo for international or on failure
 */
export async function fetchEnhancedWeather(
  day: DayInputs
): Promise<EnhancedWeatherData> {
  // Check if location is in the US (rough bounds)
  const isUSLocation =
    day.lat >= 24.0 &&
    day.lat <= 71.0 && // Alaska to Florida
    day.lon >= -179.0 &&
    day.lon <= -66.0; // Hawaii to Maine

  if (isUSLocation) {
    try {
      // Try NWS first for US locations
      console.log(`Fetching NWS weather data for ${day.lat}, ${day.lon}`);
      return await nwsWeatherService.fetchEnhancedWeather(day);
    } catch (error) {
      console.warn("NWS failed, falling back to Open-Meteo:", error);
    }
  }

  // Fall back to Open-Meteo (international or NWS failure)
  try {
    console.log(`Fetching Open-Meteo weather data for ${day.lat}, ${day.lon}`);
    const openMeteoData = await fetchOpenMeteoWeather(day);

    // Convert to EnhancedWeatherData
    return {
      ...openMeteoData,
      safety: {
        rating: "GOOD",
        activeAlerts: [],
        recommendations: [],
        riskFactors: [],
      },
      barometricTrend: "STEADY",
      source: "OPEN_METEO",
    };
  } catch (error) {
    console.error("Both NWS and Open-Meteo failed:", error);

    // Return safe defaults
    return {
      tempC: 20.0,
      windKph: 10.0,
      precipMm: 0.0,
      cloudPct: 50,
      pressureHpa: 1013.25,
      safety: {
        rating: "FAIR",
        activeAlerts: [],
        recommendations: ["Weather data unavailable - use caution"],
        riskFactors: ["Unable to fetch current weather conditions"],
      },
      barometricTrend: "STEADY",
      source: "OPEN_METEO",
    };
  }
}

/**
 * Determine if location has marine weather data available
 */
export function isMarineLocation(lat: number, lon: number): boolean {
  // Simple heuristic - coastal areas within 50km of major water bodies
  // This could be enhanced with a proper coastline database

  // US coastal regions
  const isEastCoast = lon > -85 && lat > 24 && lat < 45;
  const isWestCoast = lon < -115 && lat > 32 && lat < 49;
  const isGulfCoast = lat > 25 && lat < 31 && lon > -98 && lon < -80;
  const isGreatLakes = lat > 40 && lat < 49 && lon > -93 && lon < -76;

  return isEastCoast || isWestCoast || isGulfCoast || isGreatLakes;
}

/**
 * Get recommended fishing times based on enhanced weather data
 */
export function getOptimalFishingTimes(weather: EnhancedWeatherData): string[] {
  const recommendations: string[] = [];

  // Safety first
  if (weather.safety.rating === "DANGEROUS") {
    return ["DO NOT FISH - Dangerous weather conditions"];
  }

  // Barometric pressure recommendations
  if (weather.barometricTrend === "FALLING") {
    recommendations.push("🎣 Excellent - Fish often bite before storms");
  } else if (weather.barometricTrend === "RISING") {
    recommendations.push("⬆️ Good - Stable conditions after weather systems");
  }

  // Marine conditions
  if (weather.marine?.waveHeight !== undefined) {
    const waves = weather.marine.waveHeight;
    if (waves <= 0.5) {
      recommendations.push("🌊 Calm seas - Perfect for small boats");
    } else if (waves <= 1.5) {
      recommendations.push("🌊 Light chop - Good for experienced anglers");
    } else if (waves <= 2.5) {
      recommendations.push("⚠️ Moderate seas - Use caution");
    } else {
      recommendations.push("🚫 Rough seas - Consider shore fishing");
    }
  }

  // Wind recommendations
  if (weather.windKph <= 15) {
    recommendations.push("💨 Light winds - Ideal conditions");
  } else if (weather.windKph <= 25) {
    recommendations.push("💨 Moderate winds - Use heavier tackle");
  } else {
    recommendations.push("💨 Strong winds - Seek sheltered areas");
  }

  // Temperature recommendations
  if (weather.tempC >= 15 && weather.tempC <= 22) {
    recommendations.push("🌡️ Perfect temperature for active fish");
  }

  return recommendations.length > 0
    ? recommendations
    : ["Standard fishing conditions"];
}
