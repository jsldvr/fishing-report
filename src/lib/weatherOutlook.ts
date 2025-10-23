import type { WeatherOutlookResult } from "./weatherOutlookTypes";
import {
  WeatherOutlookMutableBase,
  createEmptyDaySummary,
  getCompassDirection,
  isUsLatitudeLongitude,
  toFixedNumber,
} from "./weatherOutlookUtils";

/**
 * Fetch a localized five-day weather outlook using NWS (US) or OpenWeatherMap (global fallback).
 * The caller must provide a valid API key for OpenWeatherMap via Vite env (`VITE_OPENWEATHER_API_KEY`)
 * if requesting locations outside the supported NWS domain.
 */
export async function fetchWeatherOutlook(
  lat: number,
  lon: number,
  options?: { signal?: AbortSignal }
): Promise<WeatherOutlookResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Invalid coordinates for weather outlook");
  }

  if (isUsLatitudeLongitude(lat, lon)) {
    try {
      return await fetchNwsOutlook(lat, lon, options?.signal);
    } catch (error) {
      console.warn("NWS outlook failed, attempting OpenWeather fallback", error);
      // Fall through to OpenWeather if available
    }
  }

  return await fetchOpenWeatherOutlook(lat, lon, options?.signal);
}

async function fetchNwsOutlook(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherOutlookResult> {
  const pointUrl = `https://api.weather.gov/points/${lat.toFixed(
    4
  )},${lon.toFixed(4)}`;
  const headers = {
    "User-Agent": "(fishing-report-app, jsldvr@example.com)",
    Accept: "application/geo+json",
  };

  const pointResponse = await fetch(pointUrl, { headers, signal });
  if (!pointResponse.ok) {
    throw new Error(
      `NWS point metadata failed: ${pointResponse.status} ${pointResponse.statusText}`
    );
  }

  const pointData = (await pointResponse.json()) as NWSPointResponse;
  const forecastUrl = pointData.properties?.forecast;
  if (!forecastUrl) {
    throw new Error("NWS forecast URL unavailable for these coordinates");
  }

  const officeUrl = pointData.properties?.forecastOffice;
  const officeMatch = officeUrl?.match(/\/offices\/([A-Z0-9]+)/i);
  const officeId = officeMatch?.[1];
  let officeName: string | undefined;
  let officeCity: string | undefined;
  let officeState: string | undefined;

  if (officeUrl) {
    try {
      const officeResponse = await fetch(officeUrl, { headers, signal });
      if (officeResponse.ok) {
        const officeData = (await officeResponse.json()) as NWSOfficeResponse;
        officeName = officeData.name?.trim() || undefined;
        officeCity =
          officeData.address?.addressLocality?.trim() || undefined;
        officeState =
          officeData.address?.addressRegion?.trim() || undefined;
      }
    } catch (officeError) {
      console.warn("Unable to load NWS office metadata:", officeError);
    }
  }

  const relativeCity =
    pointData.properties?.relativeLocation?.properties?.city?.trim() ||
    undefined;
  const relativeState =
    pointData.properties?.relativeLocation?.properties?.state?.trim() ||
    undefined;

  if (!officeCity && relativeCity) {
    officeCity = relativeCity;
  }
  if (!officeState && relativeState) {
    officeState = relativeState;
  }

  const forecastResponse = await fetch(forecastUrl, { headers, signal });
  if (!forecastResponse.ok) {
    throw new Error(
      `NWS forecast failed: ${forecastResponse.status} ${forecastResponse.statusText}`
    );
  }

  const forecastData = (await forecastResponse.json()) as NWSForecastResponse;
  const issuedAt = forecastData.properties?.updated ?? new Date().toISOString();
  const periods = forecastData.properties?.periods ?? [];

  if (periods.length === 0) {
    throw new Error("NWS forecast periods not available");
  }

  const summaries = new Map<string, WeatherOutlookMutableBase>();

  for (const period of periods) {
    const dateKey = period.startTime.slice(0, 10);
    const summary =
      summaries.get(dateKey) ??
      (() => {
        const fresh = createEmptyDaySummary(dateKey, period.startTime);
        summaries.set(dateKey, fresh);
        return fresh;
      })();

    const tempC =
      period.temperatureUnit === "F"
        ? ((period.temperature - 32) * 5) / 9
        : period.temperature;

    if (period.isDaytime) {
      summary.tempMaxC =
        summary.tempMaxC !== null
          ? Math.max(summary.tempMaxC, tempC)
          : tempC;
      summary.primarySummary = summary.primarySummary || period.shortForecast;
    } else {
      summary.tempMinC =
        summary.tempMinC !== null
          ? Math.min(summary.tempMinC, tempC)
          : tempC;
      summary.secondarySummary =
        summary.secondarySummary || period.shortForecast;
    }

    const precipPct = period.probabilityOfPrecipitation?.value;
    if (typeof precipPct === "number") {
      summary.precipProbabilityPct = Math.max(
        summary.precipProbabilityPct ?? 0,
        precipPct
      );
    }

    const windData = parseWindSpeed(period.windSpeed);
    if (windData.maxKph !== null) {
      summary.windSpeedKph = Math.max(
        summary.windSpeedKph ?? 0,
        windData.maxKph
      );
    }
    if (windData.maxGustKph !== null) {
      summary.windGustKph = Math.max(
        summary.windGustKph ?? 0,
        windData.maxGustKph
      );
    }

    if (period.windDirection) {
      summary.windDirection = period.windDirection;
    }
  }

  const days = Array.from(summaries.values())
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 5)
    .map((summary) => ({
      date: summary.date,
      label: summary.label,
      narrative:
        summary.primarySummary ||
        summary.secondarySummary ||
        "Forecast details unavailable",
      tempMaxC: summary.tempMaxC,
      tempMinC: summary.tempMinC,
      precipProbabilityPct:
        summary.precipProbabilityPct !== null
          ? toFixedNumber(summary.precipProbabilityPct, 0)
          : null,
      precipMm: null,
      windSpeedKph:
        summary.windSpeedKph !== null
          ? toFixedNumber(summary.windSpeedKph, 1)
          : null,
      windGustKph:
        summary.windGustKph !== null
          ? toFixedNumber(summary.windGustKph, 1)
          : null,
      windDirection: summary.windDirection,
      source: "NWS" as const,
    }));

  return {
    source: "NWS",
    issuedAt,
    attribution: "Data: National Weather Service",
    office:
      officeId || officeName || officeCity || officeState
        ? {
            id: officeId,
            name: officeName,
            city: officeCity,
            state: officeState,
          }
        : undefined,
    days,
  };
}

async function fetchOpenWeatherOutlook(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<WeatherOutlookResult> {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OpenWeatherMap API key missing. Set VITE_OPENWEATHER_API_KEY in your environment."
    );
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", apiKey);

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error(
      `OpenWeatherMap forecast failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as OpenWeatherForecastResponse;
  const timezoneOffset = data.city?.timezone ?? 0;
  const issuedAt =
    data.list?.[0]?.dt_txt ??
    new Date(Date.now() + timezoneOffset * 1000).toISOString();

  const summaries = new Map<string, OpenWeatherDayMutable>();

  for (const entry of data.list ?? []) {
    const localTimestamp = entry.dt + timezoneOffset;
    const dateKey = new Date(localTimestamp * 1000)
      .toISOString()
      .slice(0, 10);

    const summary =
      summaries.get(dateKey) ??
      (() => {
        const fresh = createEmptyDaySummary(
          dateKey,
          new Date(localTimestamp * 1000).toISOString()
        );
        summaries.set(dateKey, {
          ...fresh,
          tempMinC: Number.POSITIVE_INFINITY,
          tempMaxC: Number.NEGATIVE_INFINITY,
          precipMm: 0,
          popValues: [],
          windSpeedSamples: [],
          windGustSamples: [],
          windDirectionSamples: [],
          conditionCounts: new Map<string, number>(),
        });
        return summaries.get(dateKey)!;
      })() as OpenWeatherDayMutable;

    summary.tempMaxC = Math.max(
      summary.tempMaxC ?? Number.NEGATIVE_INFINITY,
      entry.main.temp_max
    );
    summary.tempMinC = Math.min(
      summary.tempMinC ?? Number.POSITIVE_INFINITY,
      entry.main.temp_min
    );

    const precipMm =
      (entry.rain?.["3h"] ?? 0) + (entry.snow?.["3h"] ?? 0) || 0;
    summary.precipMm = (summary.precipMm ?? 0) + precipMm;

    if (typeof entry.pop === "number") {
      summary.popValues.push(entry.pop);
    }

    summary.windSpeedSamples.push(entry.wind.speed);
    if (typeof entry.wind.gust === "number") {
      summary.windGustSamples.push(entry.wind.gust);
    }
    if (typeof entry.wind.deg === "number") {
      summary.windDirectionSamples.push(entry.wind.deg);
    }

    const condition = entry.weather?.[0]?.description;
    if (condition) {
      const current = summary.conditionCounts.get(condition.toLowerCase()) ?? 0;
      summary.conditionCounts.set(condition.toLowerCase(), current + 1);
    }
  }

  const days = Array.from(summaries.values())
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 5)
    .map((summary) => {
      const averagePop =
        summary.popValues.length > 0
          ? (summary.popValues.reduce((acc, v) => acc + v, 0) /
              summary.popValues.length) *
            100
          : null;

      const maxWindMps =
        summary.windSpeedSamples.length > 0
          ? Math.max(...summary.windSpeedSamples)
          : null;

      const maxGustMps =
        summary.windGustSamples.length > 0
          ? Math.max(...summary.windGustSamples)
          : null;

      const dominantCondition =
        Array.from(summary.conditionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([label]) => label)[0] ?? "Conditions unavailable";

      const avgWindDirDeg =
        summary.windDirectionSamples.length > 0
          ? toFixedNumber(
              summary.windDirectionSamples.reduce((acc, deg) => acc + deg, 0) /
                summary.windDirectionSamples.length,
              0
            )
          : null;

      return {
        date: summary.date,
        label: summary.label,
        narrative: capitalizeSentence(dominantCondition),
        tempMaxC:
          summary.tempMaxC !== null &&
          summary.tempMaxC !== Number.NEGATIVE_INFINITY
            ? toFixedNumber(summary.tempMaxC, 1)
            : null,
        tempMinC:
          summary.tempMinC !== null &&
          summary.tempMinC !== Number.POSITIVE_INFINITY
            ? toFixedNumber(summary.tempMinC, 1)
            : null,
        precipProbabilityPct:
          averagePop !== null ? toFixedNumber(averagePop, 0) : null,
        precipMm:
          summary.precipMm !== null
            ? toFixedNumber(summary.precipMm, 1)
            : null,
        windSpeedKph:
          maxWindMps !== null
            ? toFixedNumber(maxWindMps * 3.6, 1)
            : null,
        windGustKph:
          maxGustMps !== null
            ? toFixedNumber(maxGustMps * 3.6, 1)
            : null,
        windDirection:
          avgWindDirDeg !== null
            ? getCompassDirection(avgWindDirDeg)
            : undefined,
        source: "OPEN_WEATHER" as const,
      };
    });

  if (days.length === 0) {
    throw new Error("OpenWeatherMap forecast data unavailable");
  }

  return {
    source: "OPEN_WEATHER",
    issuedAt,
    attribution: "Data: OpenWeatherMap",
    days,
  };
}

function parseWindSpeed(
  windSpeed: string
): { maxKph: number | null; maxGustKph: number | null } {
  if (!windSpeed) {
    return { maxKph: null, maxGustKph: null };
  }

  const matches = windSpeed.match(/(\d+(\.\d+)?)/g);
  if (!matches) {
    return { maxKph: null, maxGustKph: null };
  }

  const values = matches.map((value) => parseFloat(value));
  if (values.length === 0) {
    return { maxKph: null, maxGustKph: null };
  }

  const unit = windSpeed.toLowerCase().includes("kt") ? "kt" : "mph";
  const factor = unit === "kt" ? 1.852 : 1.60934;

  const max = Math.max(...values) * factor;
  return { maxKph: max, maxGustKph: null };
}

function capitalizeSentence(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface NWSPointResponse {
  properties: {
    forecast?: string;
    forecastOffice?: string;
    relativeLocation?: {
      properties?: {
        city?: string;
        state?: string;
      };
    };
  };
}

interface NWSForecastResponse {
  properties?: {
    updated?: string;
    periods?: Array<{
      startTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: "F" | "C";
      probabilityOfPrecipitation?: { value: number | null };
      windSpeed: string;
    windDirection: string;
    shortForecast: string;
  }>;
  };
}

interface NWSOfficeResponse {
  name?: string;
  address?: {
    addressLocality?: string;
    addressRegion?: string;
  };
}

interface OpenWeatherDayMutable extends WeatherOutlookMutableBase {
  popValues: number[];
  windSpeedSamples: number[];
  windGustSamples: number[];
  windDirectionSamples: number[];
  conditionCounts: Map<string, number>;
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    dt_txt: string;
    main: {
      temp_min: number;
      temp_max: number;
    };
    weather: Array<{
      description: string;
    }>;
    wind: {
      speed: number;
      gust?: number;
      deg?: number;
    };
    pop?: number;
    rain?: { "3h"?: number };
    snow?: { "3h"?: number };
  }>;
  city?: {
    timezone?: number;
  };
}
