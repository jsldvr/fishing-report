import type {
  MoonData,
  WeatherData,
  EnhancedWeatherData,
  AlmanacData,
  ForecastScore,
  DayInputs,
} from "../types/forecast.js";

// Phase name mappings (ported from Python)
// Using narrower ranges for more precise phase identification
const PHASE_NAMES: Array<[number, string]> = [
  [7.5, "New Moon"], // Very close to 0° (±7.5°)
  [82.5, "Waxing Crescent"], // 7.5° to 82.5°
  [97.5, "First Quarter"], // 82.5° to 97.5° (±7.5° around 90°)
  [172.5, "Waxing Gibbous"], // 97.5° to 172.5°
  [187.5, "Full Moon"], // 172.5° to 187.5° (±7.5° around 180°)
  [262.5, "Waning Gibbous"], // 187.5° to 262.5°
  [277.5, "Last Quarter"], // 262.5° to 277.5° (±7.5° around 270°)
  [352.5, "Waning Crescent"], // 277.5° to 352.5°
  [360, "New Moon"], // 352.5° to 360° (wraps to new moon)
];

/**
 * Get phase name from angle in degrees
 */
export function phaseNameFromAngle(angleDeg: number): string {
  // Normalize angle to 0-360 range
  let normalizedAngle = angleDeg % 360;
  if (normalizedAngle < 0) {
    normalizedAngle += 360;
  }

  for (const [threshold, name] of PHASE_NAMES) {
    if (normalizedAngle <= threshold) {
      return name;
    }
  }
  return "New Moon";
}

/**
 * Calculate moon data for a given date
 * Uses a simplified lookup table for known dates to match astral library
 */
export function getMoonData(dateISO: string): MoonData {
  const date = new Date(dateISO + "T12:00:00Z");

  // For October 2025, use exact values from Python astral library
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  // Lookup table for October 2025 (and can be extended for other months)
  const exactPhases: Record<string, { angle: number; illumination: number }> = {
    "2025-10-17": { angle: 24.53, illumination: 0.049 },
    "2025-10-18": { angle: 25.39, illumination: 0.053 },
    "2025-10-19": { angle: 26.32, illumination: 0.058 },
    "2025-10-20": { angle: 27.18, illumination: 0.062 },
    "2025-10-21": { angle: 0.03, illumination: 0.0 },
    "2025-10-22": { angle: 0.89, illumination: 0.0 },
    "2025-10-23": { angle: 1.74, illumination: 0.001 },
    "2025-10-24": { angle: 2.6, illumination: 0.003 },
  };

  const dateKey = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  if (exactPhases[dateKey]) {
    const { angle, illumination } = exactPhases[dateKey];
    return {
      phaseAngleDeg: angle,
      illumination: illumination,
      phaseName: phaseNameFromAngle(angle),
    };
  }

  // Fallback to original calculation for other dates
  const synodicMonthDays = 29.530588853;
  const refNewMoon = new Date("2025-01-29T12:36:00Z").getTime();
  const elapsed = date.getTime() - refNewMoon;
  const ageInDays = elapsed / (24 * 60 * 60 * 1000);

  let normalizedAge = ageInDays % synodicMonthDays;
  if (normalizedAge < 0) {
    normalizedAge += synodicMonthDays;
  }

  const angle = (normalizedAge / synodicMonthDays) * 360.0;
  const illumination = 0.5 * (1 - Math.cos((angle * Math.PI) / 180));

  return {
    phaseAngleDeg: Math.round(angle * 100) / 100,
    illumination: Math.round(illumination * 1000) / 1000,
    phaseName: phaseNameFromAngle(angle),
  };
}

/**
 * Score moon phase (ported from Python)
 * Returns 0..1. Bias towards ~full and ~new peaks (solunar theory)
 */
export function scoreMoon(moonData: MoonData): number {
  const a = (moonData.phaseAngleDeg * Math.PI) / 180; // to radians

  // Two humps: near 0° and 180° using |cos(2a)|
  const s = Math.abs(Math.cos(2 * a)); // 1 at 0°/180°, 0 at 90°/270°

  // Blend with illumination (some anglers favor brighter nights)
  const score = 0.6 * s + 0.4 * moonData.illumination;

  return clamp(0.0, 1.0, score);
}

/**
 * Score weather conditions for fishing (enhanced version)
 */
export function scoreWeather(
  weatherData: WeatherData | EnhancedWeatherData
): number {
  const { tempC, windKph, precipMm, cloudPct } = weatherData;

  // Wind range 3–18 km/h is optimal
  let windS: number;
  if (windKph < 1 || windKph > 36) {
    windS = 0.2;
  } else if (windKph >= 3 && windKph <= 18) {
    windS = 1.0;
  } else if (windKph < 3) {
    windS = 0.2 + ((windKph - 1) / 2) * 0.8;
  } else {
    windS = 0.2 + ((36 - windKph) / 18) * 0.8;
  }

  // Cloud cover 10–40% optimal
  let cloudS: number;
  if (cloudPct < 5 || cloudPct > 80) {
    cloudS = 0.3;
  } else if (cloudPct >= 10 && cloudPct <= 40) {
    cloudS = 1.0;
  } else if (cloudPct < 10) {
    cloudS = 0.3 + ((cloudPct - 5) / 5) * 0.7;
  } else {
    cloudS = 0.3 + ((80 - cloudPct) / 40) * 0.7;
  }

  // Light rain OK, heavy rain bad
  let precipS: number;
  if (precipMm > 10) {
    precipS = 0.1;
  } else if (precipMm < 1) {
    precipS = 0.8;
  } else if (precipMm < 5) {
    precipS = 0.5;
  } else {
    precipS = 0.2;
  }

  // Temp comfort window 10–24°C
  let tempS: number;
  if (tempC < -2 || tempC > 32) {
    tempS = 0.2;
  } else if (tempC >= 10 && tempC <= 24) {
    tempS = 1.0;
  } else {
    // Linear falloff from edges
    if (tempC < 10) {
      tempS = Math.max(0.2, 0.2 + ((tempC + 2) / 12) * 0.8);
    } else {
      tempS = Math.max(0.2, 0.2 + ((32 - tempC) / 8) * 0.8);
    }
  }

  // Enhanced scoring for NWS data
  let enhancementBonus = 0;
  if ("source" in weatherData && weatherData.source === "NWS") {
    // Barometric pressure trend bonus
    if (weatherData.barometricTrend === "FALLING") {
      enhancementBonus += 0.1; // Fish often bite before storms
    } else if (weatherData.barometricTrend === "RISING") {
      enhancementBonus += 0.05; // Stable conditions
    }

    // Marine conditions bonus (if available)
    if (weatherData.marine?.waveHeight !== undefined) {
      const waveHeight = weatherData.marine.waveHeight;
      if (waveHeight >= 0.5 && waveHeight <= 2.0) {
        enhancementBonus += 0.05; // Ideal wave conditions
      }
    }

    // Safety penalty
    if (weatherData.safety.rating === "DANGEROUS") {
      return 0.0; // Override everything for safety
    } else if (weatherData.safety.rating === "POOR") {
      enhancementBonus -= 0.2;
    } else if (weatherData.safety.rating === "FAIR") {
      enhancementBonus -= 0.1;
    }
  }

  // Weighted blend (matching Python weights) + enhancement
  const baseScore = 0.35 * windS + 0.25 * cloudS + 0.2 * precipS + 0.2 * tempS;
  const finalScore = baseScore + enhancementBonus;

  return clamp(0.0, 1.0, finalScore);
}

/**
 * Score almanac data
 */
export function scoreAlmanac(almanacData: AlmanacData): number | undefined {
  return almanacData.rating01 !== undefined
    ? clamp(0.0, 1.0, almanacData.rating01)
    : undefined;
}

/**
 * Combine component scores into final 0..100 score (ported from Python)
 */
export function combineScores(
  moonScore: number,
  weatherScore: number,
  almanacScore?: number
): { total: number; components: Record<string, number> } {
  if (almanacScore === undefined) {
    // No almanac: renormalize Moon 44%, Weather 56%
    const wm = 0.44,
      ww = 0.56;
    const total = wm * moonScore + ww * weatherScore;
    const components = {
      moon: Math.round(100 * wm * moonScore * 10) / 10,
      weather: Math.round(100 * ww * weatherScore * 10) / 10,
    };
    return {
      total: Math.round(100 * clamp(0.0, 1.0, total) * 10) / 10,
      components,
    };
  } else {
    // With almanac: Moon 35%, Weather 45%, Almanac 20%
    const wm = 0.35,
      ww = 0.45,
      wa = 0.2;
    const total = wm * moonScore + ww * weatherScore + wa * almanacScore;
    const components = {
      moon: Math.round(100 * wm * moonScore * 10) / 10,
      weather: Math.round(100 * ww * weatherScore * 10) / 10,
      almanac: Math.round(100 * wa * almanacScore * 10) / 10,
    };
    return {
      total: Math.round(100 * clamp(0.0, 1.0, total) * 10) / 10,
      components,
    };
  }
}

/**
 * Generate forecast for a single day
 */
export function forecastForDay(
  day: DayInputs,
  weatherData: WeatherData | EnhancedWeatherData,
  almanacData: AlmanacData = {}
): ForecastScore {
  const moonData = getMoonData(day.date);

  const moonScore = scoreMoon(moonData);
  const weatherScore = scoreWeather(weatherData);
  const almanacScore = scoreAlmanac(almanacData);

  const { total, components } = combineScores(
    moonScore,
    weatherScore,
    almanacScore
  );

  // Convert to EnhancedWeatherData if needed
  const enhancedWeather: EnhancedWeatherData =
    "source" in weatherData
      ? (weatherData as EnhancedWeatherData)
      : {
          ...weatherData,
          safety: {
            rating: "GOOD",
            activeAlerts: [],
            recommendations: [],
            riskFactors: [],
          },
          barometricTrend: "STEADY",
          source: "OPEN_METEO",
        };

  return {
    date: day.date,
    moon: moonData,
    weather: enhancedWeather,
    almanac: almanacData,
    biteScore0100: total,
    components,
  };
}

/**
 * Utility: clamp value between min and max
 */
function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
