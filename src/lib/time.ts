// @ts-ignore: No types available for tz-lookup
import tzlookup from "tz-lookup";

/**
 * Get timezone from lat/lon coordinates with fallback
 */
export function getTimezoneFromCoords(lat: number, lon: number): string {
  try {
    return (
      tzlookup(lat, lon) || Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/**
 * Format date in local timezone with UTC fallback info
 */
export function formatLocalDate(
  date: string | Date,
  timezone?: string
): {
  local: string;
  utc: string;
  timezone: string;
} {
  const d = typeof date === "string" ? new Date(date) : date;
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const local = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(d);

  const utc = d.toISOString();

  return { local, utc, timezone: tz };
}

/**
 * Check if hour is within daylight window (6-18 local time)
 */
export function isHourInDaylightWindow(
  isoDateTime: string,
  startHour = 6,
  endHour = 18
): boolean {
  try {
    const hour = parseInt(isoDateTime.split("T")[1].split(":")[0], 10);
    return hour >= startHour && hour <= endHour;
  } catch {
    return true; // Default to including if parsing fails
  }
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDateISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Add days to ISO date string
 */
export function addDaysToDate(isoDate: string, days: number): string {
  const date = new Date(isoDate + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Validate North American coordinates
 */
export function validateNorthAmericaCoords(lat: number, lon: number): boolean {
  // Rough bounds for North America including territories
  // Lat: ~14°N (southern Mexico/Caribbean) to ~83°N (northern Canada)
  // Lon: ~-180°W (western Alaska) to ~-50°W (eastern Canada/Greenland)
  return lat >= 14 && lat <= 83 && lon >= -180 && lon <= -50;
}
