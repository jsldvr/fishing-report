import type { WeatherData, DayInputs } from "../types/forecast.js";
import { isHourInDaylightWindow } from "./time.js";

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    cloud_cover: number[];
    pressure_msl?: number[];
    windspeed_10m: number[];
  };
}

/**
 * Fetch weather data from Open-Meteo for a specific day and location
 */
export async function fetchWeather(day: DayInputs): Promise<WeatherData> {
  const baseUrl = "https://api.open-meteo.com/v1/forecast";
  const today = new Date().toISOString().split("T")[0];
  const targetDate = new Date(day.date);
  const todayDate = new Date(today);
  const daysFromToday = Math.ceil(
    (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const params = new URLSearchParams({
    latitude: day.lat.toString(),
    longitude: day.lon.toString(),
    hourly:
      "temperature_2m,precipitation,cloud_cover,pressure_msl,windspeed_10m",
    timezone: "auto",
    forecast_days: Math.max(1, daysFromToday + 1).toString(),
  });

  try {
    const response = await fetch(`${baseUrl}?${params}`, {
      signal: AbortSignal.timeout(20000), // 20s timeout
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();
    return processWeatherData(data, day.date);
  } catch (error) {
    console.warn("Weather fetch failed, using defaults:", error);
    return getDefaultWeatherData();
  }
}

/**
 * Process Open-Meteo hourly data into averaged daylight-window metrics
 */
function processWeatherData(
  data: OpenMeteoResponse,
  targetDate: string
): WeatherData {
  const { hourly } = data;
  const times = hourly.time || [];

  // Filter for target date and daylight hours (6-18 local)
  const validIndices = times
    .map((time, index) => ({ time, index }))
    .filter(
      ({ time }) =>
        time.startsWith(targetDate) && isHourInDaylightWindow(time, 6, 18)
    )
    .map(({ index }) => index);

  if (validIndices.length === 0) {
    console.warn(`No daylight hours found for ${targetDate}, using defaults`);
    return getDefaultWeatherData();
  }

  const avg = (
    field: keyof OpenMeteoResponse["hourly"],
    defaultValue: number,
    scale = 1.0
  ): number => {
    const arr = hourly[field] as number[] | undefined;
    if (!arr) return defaultValue;

    const values = validIndices
      .map((i) => arr[i])
      .filter((val) => val != null && !isNaN(val));

    if (values.length === 0) return defaultValue;

    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length) * scale;
  };

  return {
    tempC: Math.round(avg("temperature_2m", 20.0) * 10) / 10,
    windKph: Math.round(avg("windspeed_10m", 10.0, 3.6) * 10) / 10, // m/s -> km/h
    precipMm: Math.round(avg("precipitation", 0.0) * 100) / 100,
    cloudPct: Math.round(avg("cloud_cover", 50.0)),
    pressureHpa: hourly.pressure_msl
      ? Math.round(avg("pressure_msl", 1013.25) * 10) / 10
      : undefined,
  };
}

/**
 * Fallback weather data for errors
 */
function getDefaultWeatherData(): WeatherData {
  return {
    tempC: 20.0,
    windKph: 10.0,
    precipMm: 0.0,
    cloudPct: 50,
    pressureHpa: undefined,
  };
}
