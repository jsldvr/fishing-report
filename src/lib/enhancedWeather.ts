import type {
  DayInputs,
  EnhancedWeatherData,
  MarineWeatherData,
  SafetyAssessment,
} from "../types/forecast.js";
import { fetchWeather as fetchOpenMeteoWeather } from "./openMeteo.js";
import { nwsWeatherService } from "./nwsWeather.js";
import { fetchNoaaMarineConditions } from "./noaaMarine.js";
import { addDaysToDate } from "./time.js";

/**
 * Enhanced weather fetcher that prioritizes NWS for US locations
 * and falls back to Open-Meteo for international or on failure
 */
export async function fetchEnhancedWeather(
  day: DayInputs
): Promise<EnhancedWeatherData> {
  let weather: EnhancedWeatherData | null = null;

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
      weather = await nwsWeatherService.fetchEnhancedWeather(day);
    } catch (error) {
      console.warn("NWS failed, falling back to Open-Meteo:", error);
    }
  }

  // Fall back to Open-Meteo (international or NWS failure)
  if (!weather) {
    try {
      console.log(`Fetching Open-Meteo weather data for ${day.lat}, ${day.lon}`);
      const openMeteoData = await fetchOpenMeteoWeather(day);

      weather = {
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

      weather = {
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

  if (weather && isMarineLocation(day.lat, day.lon)) {
    try {
      const marineConditions = await fetchNoaaMarineConditions(day);
      if (marineConditions) {
        const mergedMarine = {
          ...weather.marine,
          ...marineConditions,
        };

        const updatedSafety = adjustSafetyWithMarine(
          weather.safety,
          mergedMarine,
          day.date
        );

        weather = {
          ...weather,
          marine: mergedMarine,
          safety: updatedSafety,
        };
      }
    } catch (error) {
      console.warn("Marine conditions integration failed:", error);
    }
  }

  if (!weather) {
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

  return weather;
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

function adjustSafetyWithMarine(
  existingSafety: SafetyAssessment,
  marine: MarineWeatherData,
  isoDate: string
): SafetyAssessment {
  const ratingHierarchy: SafetyAssessment["rating"][] = [
    "EXCELLENT",
    "GOOD",
    "FAIR",
    "POOR",
    "DANGEROUS",
  ];

  const downgrade = (
    current: SafetyAssessment["rating"],
    target: SafetyAssessment["rating"]
  ) => {
    const currentIdx = ratingHierarchy.indexOf(current);
    const targetIdx = ratingHierarchy.indexOf(target);
    if (currentIdx === -1) {
      return target;
    }
    if (targetIdx === -1) {
      return current;
    }
    return ratingHierarchy[Math.max(currentIdx, targetIdx)];
  };

  const pushUnique = (list: string[], value: string) => {
    if (!list.includes(value)) {
      list.push(value);
    }
  };

  let rating = existingSafety.rating;
  const riskFactors = [...existingSafety.riskFactors];
  const recommendations = [...existingSafety.recommendations];

  if (marine.waveHeight !== undefined) {
    if (marine.waveHeight >= 3) {
      rating = downgrade(rating, "DANGEROUS");
      pushUnique(riskFactors, "Wave height exceeds 3m near the nearest NOAA station");
      pushUnique(
        recommendations,
        "Conditions unsafe for small craft due to high waves"
      );
    } else if (marine.waveHeight >= 2.5) {
      rating = downgrade(rating, "POOR");
      pushUnique(riskFactors, "Wave height exceeds 2.5m near the nearest NOAA station");
      pushUnique(recommendations, "Use caution offshore – elevated seas");
    } else if (marine.waveHeight >= 1.5) {
      rating = downgrade(rating, "FAIR");
      pushUnique(riskFactors, "Moderate chop reported at the nearest NOAA station");
      pushUnique(recommendations, "Plan for choppy water and secure loose gear");
    } else if (marine.waveHeight <= 0.5) {
      pushUnique(recommendations, "Calm seas reported near the nearest NOAA station");
    }
  }

  if (marine.windSpeedKph !== undefined) {
    if (marine.windSpeedKph >= 55) {
      rating = downgrade(rating, "DANGEROUS");
      pushUnique(riskFactors, "Sustained marine wind exceeding 55 km/h");
      pushUnique(recommendations, "High marine winds – postpone offshore trips");
    } else if (marine.windSpeedKph >= 40) {
      rating = downgrade(rating, "POOR");
      pushUnique(riskFactors, "Strong marine wind exceeding 40 km/h");
      pushUnique(
        recommendations,
        "Expect rougher seas – consider sheltered waters"
      );
    } else if (marine.windSpeedKph >= 28) {
      rating = downgrade(rating, "FAIR");
      pushUnique(riskFactors, "Moderate marine breeze exceeding 28 km/h");
    } else {
      pushUnique(recommendations, "Marine wind speeds are manageable for most vessels");
    }
  }

  if (marine.tideEvents && marine.tideEvents.length > 0) {
    const tideEventsSorted = [...marine.tideEvents].sort(
      (a, b) =>
        new Date(a.timeIso).getTime() - new Date(b.timeIso).getTime()
    );
    const dayStart = new Date(isoDate + "T00:00:00Z").getTime();
    const dayEnd = new Date(addDaysToDate(isoDate, 1) + "T00:00:00Z").getTime();

    const nextHigh = tideEventsSorted.find(
      (event) =>
        event.type === "HIGH" &&
        new Date(event.timeIso).getTime() >= dayStart &&
        new Date(event.timeIso).getTime() < dayEnd
    );
    const nextLow = tideEventsSorted.find(
      (event) =>
        event.type === "LOW" &&
        new Date(event.timeIso).getTime() >= dayStart &&
        new Date(event.timeIso).getTime() < dayEnd
    );

    if (nextHigh) {
      pushUnique(
        recommendations,
        `Next high tide: ${formatLocalTime(nextHigh.timeIso)} (${nextHigh.heightMeters.toFixed(
          2
        )}m)`
      );
    }
    if (nextLow) {
      pushUnique(
        recommendations,
        `Next low tide: ${formatLocalTime(nextLow.timeIso)} (${nextLow.heightMeters.toFixed(
          2
        )}m)`
      );
    }
  }

  return {
    ...existingSafety,
    rating,
    riskFactors,
    recommendations,
  };
}

function formatLocalTime(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
}
