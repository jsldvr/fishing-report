export interface WeatherOutlookMutableBase {
  date: string;
  label: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipProbabilityPct: number | null;
  precipMm: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  windDirection?: string;
  primarySummary?: string;
  secondarySummary?: string;
}

export function createEmptyDaySummary(
  date: string,
  referenceIso: string
): WeatherOutlookMutableBase {
  return {
    date,
    label: formatDateLabel(date, referenceIso),
    tempMaxC: null,
    tempMinC: null,
    precipProbabilityPct: null,
    precipMm: null,
    windSpeedKph: null,
    windGustKph: null,
    windDirection: undefined,
    primarySummary: undefined,
    secondarySummary: undefined,
  };
}

export function formatDateLabel(date: string, referenceIso?: string): string {
  const reference =
    referenceIso !== undefined ? new Date(referenceIso) : new Date(`${date}T00:00:00Z`);

  const weekday = reference.toLocaleDateString("en-US", {
    weekday: "short",
  });
  const monthDay = reference.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${weekday} | ${monthDay}`;
}

export function toFixedNumber(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

export function isUsLatitudeLongitude(lat: number, lon: number): boolean {
  return lat >= 24.0 && lat <= 71.0 && lon >= -179.0 && lon <= -66.0;
}

export function getCompassDirection(degrees: number): string {
  if (!Number.isFinite(degrees)) {
    return "";
  }

  const sectors = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % sectors.length;
  return sectors[index];
}
