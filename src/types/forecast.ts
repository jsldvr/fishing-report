export interface MoonData {
  phaseAngleDeg: number;
  illumination: number; // 0..1
  phaseName: string;
}

export interface WeatherData {
  tempC: number;
  windKph: number;
  precipMm: number;
  cloudPct: number;
  pressureHpa?: number;
}

export interface AlmanacData {
  rating01?: number; // 0..1, undefined if unavailable
  notes?: string;
}

export interface ForecastScore {
  date: string; // ISO date
  moon: MoonData;
  weather: EnhancedWeatherData;
  almanac: AlmanacData;
  biteScore0100: number;
  components: Record<string, number>;
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

export interface MarineWeatherData {
  waveHeight?: number; // meters
  swellDirection?: number; // degrees
  waterTemperature?: number; // celsius
  visibility?: number; // km
  windWaveHeight?: number; // meters
}

export interface SafetyAssessment {
  rating: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DANGEROUS";
  activeAlerts: NWSAlert[];
  recommendations: string[];
  riskFactors: string[];
}

export interface EnhancedWeatherData extends WeatherData {
  marine?: MarineWeatherData;
  safety: SafetyAssessment;
  barometricTrend: "RISING" | "FALLING" | "STEADY";
  source: "NWS" | "OPEN_METEO" | "FUSED";
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
