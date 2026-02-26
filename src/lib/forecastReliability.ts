import type {
  EnhancedWeatherData,
  ForecastConfidenceLevel,
  ForecastReliability,
  FreshnessLevel,
  MarineDataStatus,
} from "../types/forecast.js";

interface ReliabilityContext {
  isMarineEligible: boolean;
  nowIso?: string;
}

export function buildForecastReliability(
  weather: EnhancedWeatherData,
  context: ReliabilityContext
): ForecastReliability {
  const now = parseIso(context.nowIso) ?? new Date();
  const reasons: string[] = [];
  let score = 100;

  const weatherLastUpdatedIso = context.nowIso ?? now.toISOString();
  const weatherFreshness = freshnessFromIso(weatherLastUpdatedIso, now);
  score = applyFreshnessPenalty(score, weatherFreshness, "weather", reasons);

  if (weather.source === "OPEN_METEO") {
    score -= 30;
    reasons.push("Using Open-Meteo fallback instead of NWS primary feed");
  }

  let marineStatus: MarineDataStatus = "NOT_APPLICABLE";
  let marineFreshness: FreshnessLevel = "UNKNOWN";
  let marineLastUpdatedIso: string | undefined;

  if (context.isMarineEligible) {
    const marine = weather.marine;
    if (marine) {
      const hasMarineData =
        marine.waterTemperature !== undefined ||
        marine.windSpeedKph !== undefined ||
        (marine.tideEvents?.length ?? 0) > 0;

      if (hasMarineData) {
        marineStatus = "AVAILABLE";
        marineLastUpdatedIso = selectMarineTimestamp(marine);
        marineFreshness = freshnessFromIso(marineLastUpdatedIso, now);
        score = applyFreshnessPenalty(score, marineFreshness, "marine", reasons);
      } else {
        marineStatus = "UNAVAILABLE";
        marineFreshness = "UNKNOWN";
        score -= 30;
        reasons.push("Marine-eligible location has no usable marine observations");
      }
    } else {
      marineStatus = "UNAVAILABLE";
      marineFreshness = "UNKNOWN";
      score -= 30;
      reasons.push("Marine-eligible location missing marine observations");
    }
  }

  score = clamp(score, 0, 100);
  const confidenceLevel: ForecastConfidenceLevel =
    score >= 80 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW";

  if (reasons.length === 0) {
    reasons.push("Primary data sources are fresh and complete");
  }

  return {
    confidenceLevel,
    confidenceScore: score,
    reasons,
    weatherFreshness,
    marineFreshness,
    marineStatus,
    weatherLastUpdatedIso,
    marineLastUpdatedIso,
  };
}

function selectMarineTimestamp(
  marine: NonNullable<EnhancedWeatherData["marine"]>
): string | undefined {
  return (
    marine.observationTimeIso ??
    marine.waveObservationTimeIso ??
    marine.tideEvents?.[0]?.timeIso
  );
}

function applyFreshnessPenalty(
  score: number,
  freshness: FreshnessLevel,
  scope: "weather" | "marine",
  reasons: string[]
): number {
  if (freshness === "FRESH") {
    return score;
  }

  if (freshness === "AGING") {
    reasons.push(`${scope} observations are aging`);
    return score - 15;
  }

  if (freshness === "STALE") {
    reasons.push(`${scope} observations are stale`);
    return score - 30;
  }

  reasons.push(`${scope} freshness is unknown`);
  return score - 20;
}

function freshnessFromIso(
  iso: string | undefined,
  now: Date
): FreshnessLevel {
  const timestamp = parseIso(iso);
  if (!timestamp) {
    return "UNKNOWN";
  }

  const ageHours = Math.max(0, (now.getTime() - timestamp.getTime()) / 3600000);
  if (ageHours <= 6) {
    return "FRESH";
  }
  if (ageHours <= 24) {
    return "AGING";
  }
  return "STALE";
}

function parseIso(iso: string | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
