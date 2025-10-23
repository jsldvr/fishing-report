export type WeatherOutlookSource = "NWS" | "OPEN_WEATHER";

export interface WeatherOutlookDay {
  date: string;
  label: string;
  narrative: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipProbabilityPct: number | null;
  precipMm: number | null;
  windSpeedKph: number | null;
  windGustKph: number | null;
  windDirection?: string;
  source: WeatherOutlookSource;
}

export interface WeatherOutlookResult {
  source: WeatherOutlookSource;
  issuedAt: string;
  attribution: string;
  office?: {
    id?: string;
    name?: string;
    city?: string;
    state?: string;
  };
  days: WeatherOutlookDay[];
}
