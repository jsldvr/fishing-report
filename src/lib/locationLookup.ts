import { validateNorthAmericaCoords } from "./time";

/**
 * Location input rules and lookups shared by the Home location controls.
 * Nothing in this module writes coordinates or third-party responses to the
 * browser console (privacy requirement: no precise location in logs).
 */

export type CoordinateField = "latitude" | "longitude";

interface CoordinateRule {
  label: string;
  min: number;
  max: number;
}

const COORDINATE_RULES: Record<CoordinateField, CoordinateRule> = {
  latitude: { label: "Latitude", min: 14, max: 83 },
  longitude: { label: "Longitude", min: -180, max: -50 },
};

/**
 * Error text for one visible coordinate value, or "" when it is valid. The
 * bounds match validateNorthAmericaCoords.
 */
export function getCoordinateError(field: CoordinateField, raw: string): string {
  const rule = COORDINATE_RULES[field];
  if (raw.trim() === "") {
    return `Enter a ${rule.label.toLowerCase()}.`;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return `${rule.label} must be a number.`;
  }
  if (value < rule.min || value > rule.max) {
    return `${rule.label} must be between ${rule.min} and ${rule.max} for North America.`;
  }
  return "";
}

export interface IpLocation {
  lat: number;
  lon: number;
  /** "City, Region" when the service reports both, otherwise "". */
  name: string;
}

type IpLookupPayload = Record<string, unknown>;

interface IpLocationService {
  host: string;
  url: string;
  parse: (data: IpLookupPayload) => IpLocation;
}

function textField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toIpLocation(
  lat: unknown,
  lon: unknown,
  city: unknown,
  region: unknown
): IpLocation {
  const cityName = textField(city);
  const regionName = textField(region);
  return {
    lat: parseFloat(String(lat)),
    lon: parseFloat(String(lon)),
    name: cityName && regionName ? `${cityName}, ${regionName}` : "",
  };
}

function parseIpapiCo(data: IpLookupPayload): IpLocation {
  return toIpLocation(data.latitude, data.longitude, data.city, data.region);
}

function parseIpApiCom(data: IpLookupPayload): IpLocation {
  return toIpLocation(data.lat, data.lon, data.city, data.regionName);
}

function parseIpinfoIo(data: IpLookupPayload): IpLocation {
  const [lat, lon] = textField(data.loc).split(",");
  return toIpLocation(lat, lon, data.city, data.region);
}

/**
 * Third-party services the IP fallback queries, in order. Each receives the
 * viewer's IP address. The location notice and Privacy Policy name these hosts;
 * keep them in sync.
 */
export const IP_LOCATION_SERVICES: readonly IpLocationService[] = [
  { host: "ipapi.co", url: "https://ipapi.co/json/", parse: parseIpapiCo },
  { host: "ip-api.com", url: "https://ip-api.com/json/", parse: parseIpApiCom },
  { host: "ipinfo.io", url: "https://ipinfo.io/json", parse: parseIpinfoIo },
];

function isUsableLocation(location: IpLocation): boolean {
  return (
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lon) &&
    validateNorthAmericaCoords(location.lat, location.lon)
  );
}

async function queryIpService(
  service: IpLocationService
): Promise<IpLocation | null> {
  try {
    const response = await fetch(service.url);
    if (!response.ok) {
      return null;
    }
    const location = service.parse((await response.json()) as IpLookupPayload);
    return isUsableLocation(location) ? location : null;
  } catch {
    return null;
  }
}

/**
 * Approximate North American location from the viewer's IP address, trying
 * each service in order. Resolves null when none returns a usable location.
 */
export async function lookupIpLocation(): Promise<IpLocation | null> {
  for (const service of IP_LOCATION_SERVICES) {
    const location = await queryIpService(service);
    if (location) {
      return location;
    }
  }
  return null;
}

export const LOCATION_PERMISSION_DENIED_MESSAGE =
  "Location permission denied. We tried to get your approximate location using your IP address, but that also failed. Please enter coordinates manually or allow location access and try again.";

const POSITION_FAILURE_DETAILS: Record<number, string> = {
  2: "Location services are unavailable. ",
  3: "Location services are too slow. ",
};

/** User-facing text shown when device location and the IP fallback both fail. */
export function describePositionFailure(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return LOCATION_PERMISSION_DENIED_MESSAGE;
  }
  const detail = POSITION_FAILURE_DETAILS[error.code] ?? "";
  return `Unable to get your location. ${detail}Please enter coordinates manually.`;
}
