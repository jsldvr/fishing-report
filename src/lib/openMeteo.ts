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
 * Fetch weather data from Open-Meteo for a specific day and location.
 * Throws when the API fails or returns no usable data for the target day.
 * Never returns synthetic/default weather.
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
    windspeed_unit: "kmh",
    timezone: "auto",
    forecast_days: Math.max(1, daysFromToday + 1).toString(),
  });

  const response = await fetch(`${baseUrl}?${params}`, {
    signal: AbortSignal.timeout(20000), // 20s timeout
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();
  return processWeatherData(data, day.date);
}

/**
 * Process Open-Meteo hourly data into averaged daylight-window metrics.
 * Throws when a required field has no usable values for the target day.
 */
function processWeatherData(
  data: OpenMeteoResponse,
  targetDate: string
): WeatherData {
  const { hourly } = data;
  const times = hourly?.time || [];

  // Filter for target date and daylight hours (6-18 local)
  const validIndices = times
    .map((time, index) => ({ time, index }))
    .filter(
      ({ time }) =>
        time.startsWith(targetDate) && isHourInDaylightWindow(time, 6, 18)
    )
    .map(({ index }) => index);

  if (validIndices.length === 0) {
    throw new Error(
      `Open-Meteo returned no daylight-window data for ${targetDate}`
    );
  }

  const avg = (
    field: keyof OpenMeteoResponse["hourly"],
    scale = 1.0
  ): number | undefined => {
    const arr = hourly[field] as number[] | undefined;
    if (!arr) return undefined;

    const values = validIndices
      .map((i) => arr[i])
      .filter((val) => val != null && !isNaN(val));

    if (values.length === 0) return undefined;

    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length) * scale;
  };

  const requireField = (
    field: keyof OpenMeteoResponse["hourly"],
    scale = 1.0
  ): number => {
    const value = avg(field, scale);
    if (value === undefined) {
      throw new Error(
        `Open-Meteo response missing required field "${field}" for ${targetDate}`
      );
    }
    return value;
  };

  const precipAvg = avg("precipitation");
  const pressureAvg = avg("pressure_msl");

  return {
    tempC: Math.round(requireField("temperature_2m") * 10) / 10,
    windKph: Math.round(requireField("windspeed_10m") * 10) / 10, // requested in km/h
    precipMm:
      precipAvg !== undefined ? Math.round(precipAvg * 100) / 100 : undefined,
    cloudPct: Math.round(requireField("cloud_cover")),
    pressureHpa:
      pressureAvg !== undefined
        ? Math.round(pressureAvg * 10) / 10
        : undefined,
  };
}
