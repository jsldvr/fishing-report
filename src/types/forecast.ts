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
  weather: WeatherData;
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
