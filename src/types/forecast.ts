export interface MoonData {
  phaseAngleDeg: number;
  illumination: number; // 0..1
  phaseName: string;
}

export interface AstronomicalTimes {
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  solarNoon: string;
}

export interface SolunarTimes {
  majorPeriods: Array<{ start: string; end: string; type: "major" }>;
  minorPeriods: Array<{ start: string; end: string; type: "minor" }>;
  dayRating: number; // 0-4 scale
}

export interface WeatherData {
  tempC: number;
  windKph: number;
  /**
   * Measured/forecast precipitation amount in millimeters.
   * Undefined when the source only provides a probability (e.g., NWS grid PoP).
   * Never substitute probability values here.
   */
  precipMm?: number;
  /** Probability of precipitation 0..100. Undefined when the source has no PoP. */
  precipProbabilityPct?: number;
  cloudPct: number;
  pressureHpa?: number;
}

export interface AlmanacData {
  rating01?: number; // 0..1, undefined if unavailable
  notes?: string;
}

export type ForecastAvailability = "OK" | "WEATHER_UNAVAILABLE";

export interface ForecastScore {
  date: string; // ISO date
  moon: MoonData;
  weather: EnhancedWeatherData;
  almanac: AlmanacData;
  biteScore0100: number;
  components: Record<string, number>;
  astronomical?: AstronomicalTimes;
  solunar?: SolunarTimes;
  /**
   * "WEATHER_UNAVAILABLE" means no verified weather could be fetched; the bite
   * score is not valid and must not be rendered as a normal forecast.
   */
  forecastStatus?: ForecastAvailability;
  /** Human-readable reason when forecastStatus is not OK. */
  unavailableReason?: string;
}

export interface DayInputs {
  date: string; // ISO date
  lat: number;
  lon: number;
}

export interface LocationBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

// NWS API Types
export interface NWSAlert {
  id: string;
  headline: string;
  severity: "Minor" | "Moderate" | "Severe" | "Extreme";
  urgency: "Past" | "Future" | "Expected" | "Immediate";
  certainty: "Possible" | "Likely" | "Observed" | "Unknown";
  event: string;
  description: string;
  instruction?: string;
  areas: string[];
}

export type SpcOutlookRisk =
  | "HIGH"
  | "MDT"
  | "ENH"
  | "SLGT"
  | "MRGL"
  | "TSTM";

export interface TideEvent {
  timeIso: string;
  heightMeters: number;
  type: "HIGH" | "LOW";
}

export interface MarineWeatherData {
  waveHeight?: number; // meters
  swellDirection?: number; // degrees
  waterTemperature?: number; // celsius
  visibility?: number; // km
  windWaveHeight?: number; // meters
  tideEvents?: TideEvent[];
  stationId?: string;
  stationName?: string;
  stationDistanceKm?: number;
  observationTimeIso?: string;
  waveObservationTimeIso?: string;
  windSpeedKph?: number;
  windDirectionDeg?: number;
  windDirectionText?: string;
}

// Internal field names retain "confidence" for compatibility; all user-facing
// copy must present these as "Data Quality" (source/freshness/completeness),
// never as proven prediction accuracy.
export type ForecastConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
export type FreshnessLevel = "FRESH" | "AGING" | "STALE" | "UNKNOWN";
export type MarineDataStatus = "AVAILABLE" | "UNAVAILABLE" | "NOT_APPLICABLE";

export interface ForecastReliability {
  confidenceLevel: ForecastConfidenceLevel;
  confidenceScore: number; // 0..100
  reasons: string[];
  weatherFreshness: FreshnessLevel;
  marineFreshness: FreshnessLevel;
  marineStatus: MarineDataStatus;
  /** When the app generated this forecast (fetch/build time). */
  forecastGeneratedIso?: string;
  /** When the weather SOURCE last updated its data. Unset when the source provides no timestamp. */
  weatherLastUpdatedIso?: string;
  marineLastUpdatedIso?: string;
}

export interface SafetyAssessment {
  rating: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DANGEROUS" | "UNKNOWN";
  activeAlerts: NWSAlert[];
  recommendations: string[];
  riskFactors: string[];
  spcOutlook?: { risk: SpcOutlookRisk; day: number };
}

export interface EnhancedWeatherData extends WeatherData {
  marine?: MarineWeatherData;
  safety: SafetyAssessment;
  barometricTrend: "RISING" | "FALLING" | "STEADY";
  source: "NWS" | "OPEN_METEO" | "FUSED" | "UNAVAILABLE";
  /** Timestamp the SOURCE reports for its own data (e.g., NWS grid updateTime). */
  sourceUpdatedIso?: string;
  reliability?: ForecastReliability;
  localOffice?: LocalWeatherOfficeInfo;
}

export interface NWSPointMetadata {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastOffice: string;
  forecastZone: string;
  county: string;
  fireWeatherZone: string;
  marineZone?: string;
  timeZone: string;
}

export interface NWSOfficeInfo {
  id: string;
  name: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
  };
  telephone: string;
  faxNumber: string;
  email: string;
  nwsRegion: string;
  parentOrganization: string;
  responsibleCounties: string[];
  responsibleForecastZones: string[];
  responsibleFireZones: string[];
  approvedObservationStations: string[];
}

export interface LocalWeatherOfficeInfo {
  office: NWSOfficeInfo;
  distance: number; // km from user location
  servingArea: string; // description of coverage area
}
