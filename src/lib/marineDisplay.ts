import type { MarineWeatherData } from "../types/forecast.js";

/**
 * True when marine data has anything the Coastal Conditions panel can show: a
 * station, tide events, or at least one metric.
 */
export function hasMarineDisplayData(
  marine: MarineWeatherData | undefined
): boolean {
  if (!marine) return false;
  const hasStation = Boolean(marine.stationId) || Boolean(marine.stationName);
  const hasTides =
    Array.isArray(marine.tideEvents) && marine.tideEvents.length > 0;
  return hasStation || hasTides || hasMarineMetrics(marine);
}

/** True when any wave, water-temperature, or station-wind value is present. */
export function hasMarineMetrics(marine: MarineWeatherData): boolean {
  return (
    marine.waveHeight !== undefined ||
    marine.waterTemperature !== undefined ||
    marine.windSpeedKph !== undefined
  );
}
