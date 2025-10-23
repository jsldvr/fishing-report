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

/**
 * Astronomical calculations for sunrise, sunset, moonrise, moonset
 */
export interface AstronomicalTimes {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  solarNoon: string;
}

/**
 * Solunar feeding periods
 */
export interface SolunarTimes {
  majorPeriods: Array<{ start: string; end: string; type: "major" }>;
  minorPeriods: Array<{ start: string; end: string; type: "minor" }>;
  dayRating: number; // 0-4 scale
}

function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const tzName =
    formatter.formatToParts(date).find((part) => part.type === "timeZoneName")
      ?.value || "UTC";

  const match = tzName.match(/([+-])(\d{2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10) || 0;
  const minutes = match[3] ? parseInt(match[3], 10) : 0;

  return sign * (hours * 60 + minutes);
}

/**
 * Calculate sunrise and sunset times using simplified algorithm
 */
function calculateSunTimes(
  date: Date,
  lat: number,
  lon: number,
  timezone: string
): { sunrise: Date; sunset: Date; solarNoon: Date } {
  const julianDay = date.getTime() / 86400000 + 2440587.5;
  const n = julianDay - 2451545.0;

  // Solar declination
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360) * Math.PI) / 180;
  const lambda =
    ((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;
  const delta = Math.asin(0.39782 * Math.sin(lambda));

  // Hour angle for sunrise/sunset (-0.833 degrees for civil sunrise/sunset)
  const latRad = (lat * Math.PI) / 180;
  const cosH =
    (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latRad) * Math.sin(delta)) /
    (Math.cos(latRad) * Math.cos(delta));

  const timezoneOffsetMinutes = getTimezoneOffsetMinutes(date, timezone);
  const baseUtcMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const toUtcDate = (minutesFromMidnight: number) => {
    const zoned = new Date(baseUtcMs);
    zoned.setUTCMinutes(minutesFromMidnight - timezoneOffsetMinutes);
    return zoned;
  };

  // Handle polar day/night
  if (cosH > 1) {
    // No sunrise (polar night)
    return {
      sunrise: toUtcDate(0),
      sunset: toUtcDate(0),
      solarNoon: toUtcDate(720),
    };
  }
  if (cosH < -1) {
    // No sunset (polar day)
    return {
      sunrise: toUtcDate(0),
      sunset: toUtcDate(23 * 60 + 59),
      solarNoon: toUtcDate(720),
    };
  }

  const H = (Math.acos(cosH) * 180) / Math.PI;

  // Time correction for longitude
  const timezoneHours = timezoneOffsetMinutes / 60;
  const standardMeridian = timezoneHours * 15;
  const timeCorrection = (lon - standardMeridian) * 4; // minutes

  // Solar noon
  const solarNoonMinutes = 720 - timeCorrection;
  const solarNoon = toUtcDate(solarNoonMinutes);

  // Sunrise and sunset
  const sunriseMinutes = solarNoonMinutes - H * 4;
  const sunsetMinutes = solarNoonMinutes + H * 4;

  const sunrise = toUtcDate(sunriseMinutes);
  const sunset = toUtcDate(sunsetMinutes);

  return { sunrise, sunset, solarNoon };
}

/**
 * Calculate moon rise and set times (simplified)
 */
function calculateMoonTimes(
  date: Date,
  lat: number,
  lon: number,
  timezone: string
): { moonrise: Date; moonset: Date } {
  // Simplified moon position calculation
  const julianDay = date.getTime() / 86400000 + 2440587.5;
  const n = julianDay - 2451545.0;

  // Moon's mean longitude
  const L = (218.316 + 13.176396 * n) % 360;
  const M = (((134.963 + 13.064993 * n) % 360) * Math.PI) / 180;
  const F = (((93.272 + 13.22935 * n) % 360) * Math.PI) / 180;

  // Moon's longitude
  const lambda = ((L + 6.289 * Math.sin(M)) * Math.PI) / 180;

  // Moon's latitude
  const beta = (5.128 * Math.sin(F) * Math.PI) / 180;

  // Moon's declination (simplified)
  const delta = Math.asin(
    Math.sin(beta) * Math.cos((23.44 * Math.PI) / 180) +
      Math.cos(beta) * Math.sin((23.44 * Math.PI) / 180) * Math.sin(lambda)
  );

  // Hour angle calculation for moon
  const latRad = (lat * Math.PI) / 180;
  const cosH = -Math.tan(latRad) * Math.tan(delta);

  // Default times if moon doesn't rise/set
  const timezoneOffsetMinutes = getTimezoneOffsetMinutes(date, timezone);
  const baseUtcMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  let moonrise = new Date(baseUtcMs);
  moonrise.setUTCMinutes(360 - timezoneOffsetMinutes);
  let moonset = new Date(baseUtcMs);
  moonset.setUTCMinutes(1080 - timezoneOffsetMinutes);

  if (cosH >= -1 && cosH <= 1) {
    const H = (Math.acos(cosH) * 180) / Math.PI;
    const timezoneHours = timezoneOffsetMinutes / 60;
    const standardMeridian = timezoneHours * 15;
    const timeCorrection = (lon - standardMeridian) * 4;

    // Rough moon transit time (varies by ~50 minutes per day)
    const moonTransit = 12 + ((n * 0.82) % 24); // Approximate

    const moonriseMinutes = (moonTransit - H / 15) * 60 - timeCorrection;
    const moonsetMinutes = (moonTransit + H / 15) * 60 - timeCorrection;

    moonrise = new Date(baseUtcMs);
    moonrise.setUTCMinutes(moonriseMinutes - timezoneOffsetMinutes);

    moonset = new Date(baseUtcMs);
    moonset.setUTCMinutes(moonsetMinutes - timezoneOffsetMinutes);
  }

  return { moonrise, moonset };
}

/**
 * Calculate solunar feeding periods based on moon and sun positions
 */
function calculateSolunarTimes(
  date: Date,
  lat: number,
  lon: number,
  moonPhase: number,
  timezone: string
): SolunarTimes {
  const { solarNoon } = calculateSunTimes(date, lat, lon, timezone);
  const { moonrise, moonset } = calculateMoonTimes(date, lat, lon, timezone);

  // Calculate moon overhead and underfoot times
  const moonOverhead = new Date(
    moonrise.getTime() + (moonset.getTime() - moonrise.getTime()) / 2
  );
  const moonUnderfoot = new Date(moonOverhead.getTime() + 12 * 60 * 60 * 1000); // 12 hours later

  // Major periods: moon overhead/underfoot (2 hours each)
  const majorPeriods = [
    {
      start: new Date(moonOverhead.getTime() - 60 * 60 * 1000).toISOString(),
      end: new Date(moonOverhead.getTime() + 60 * 60 * 1000).toISOString(),
      type: "major" as const,
    },
    {
      start: new Date(moonUnderfoot.getTime() - 60 * 60 * 1000).toISOString(),
      end: new Date(moonUnderfoot.getTime() + 60 * 60 * 1000).toISOString(),
      type: "major" as const,
    },
  ];

  // Minor periods: moonrise/moonset (1 hour each)
  const minorPeriods = [
    {
      start: new Date(moonrise.getTime() - 30 * 60 * 1000).toISOString(),
      end: new Date(moonrise.getTime() + 30 * 60 * 1000).toISOString(),
      type: "minor" as const,
    },
    {
      start: new Date(moonset.getTime() - 30 * 60 * 1000).toISOString(),
      end: new Date(moonset.getTime() + 30 * 60 * 1000).toISOString(),
      type: "minor" as const,
    },
  ];

  // Day rating based on moon phase and sun/moon alignment
  let dayRating = 0;

  // New and full moon get higher ratings
  if (moonPhase < 0.1 || moonPhase > 0.9) dayRating += 2;
  else if (moonPhase > 0.4 && moonPhase < 0.6) dayRating += 1;

  // Additional points for moon transit during daylight
  const isDaylightTransit =
    moonOverhead.getHours() >= 6 && moonOverhead.getHours() <= 18;
  if (isDaylightTransit) dayRating += 1;

  // Additional points for close sun/moon alignment
  const sunMoonAlignment = Math.abs(
    solarNoon.getHours() - moonOverhead.getHours()
  );
  if (sunMoonAlignment < 2) dayRating += 1;

  return {
    majorPeriods,
    minorPeriods,
    dayRating: Math.min(dayRating, 4),
  };
}

/**
 * Get astronomical times for a given date and location
 */
export function getAstronomicalTimes(
  dateISO: string,
  lat: number,
  lon: number,
  timezone?: string
): AstronomicalTimes {
  const date = new Date(dateISO + "T12:00:00Z");
  const tz = timezone || getTimezoneFromCoords(lat, lon);

  const { sunrise, sunset, solarNoon } = calculateSunTimes(date, lat, lon, tz);
  const { moonrise, moonset } = calculateMoonTimes(date, lat, lon, tz);

  // Format times in local timezone
  const formatTime = (d: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  };

  return {
    sunrise: formatTime(sunrise),
    sunset: formatTime(sunset),
    moonrise: formatTime(moonrise),
    moonset: formatTime(moonset),
    solarNoon: formatTime(solarNoon),
  };
}

/**
 * Get solunar feeding times for a given date and location
 */
export function getSolunarTimes(
  dateISO: string,
  lat: number,
  lon: number,
  moonPhase: number,
  timezone?: string
): SolunarTimes {
  const date = new Date(dateISO + "T12:00:00Z");
  const tz = timezone || getTimezoneFromCoords(lat, lon);

  const solunar = calculateSolunarTimes(date, lat, lon, moonPhase, tz);

  // Convert times to local timezone
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  };

  return {
    majorPeriods: solunar.majorPeriods.map((period) => ({
      ...period,
      start: formatTime(period.start),
      end: formatTime(period.end),
    })),
    minorPeriods: solunar.minorPeriods.map((period) => ({
      ...period,
      start: formatTime(period.start),
      end: formatTime(period.end),
    })),
    dayRating: solunar.dayRating,
  };
}
