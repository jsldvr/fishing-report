/**
 * Weather data validation harness.
 *
 * Deterministic contract checks over the weather pipeline: source selection,
 * unit conversion, precipitation semantics, safety overrides, and data
 * quality (reliability) rules. No network calls; safe for CI.
 *
 * Run: npm run validate:weather
 */
import {
  adjustSafetyWithMarine,
  evaluateMarinePrefilter,
  isUSLocation,
} from "../src/lib/enhancedWeather";
import {
  NWSWeatherService,
  clampProbabilityPct,
  convertPressureToHpa,
  convertTemperatureToC,
  convertWindToKph,
} from "../src/lib/nwsWeather";
import {
  buildUnavailableForecast,
  scorePrecipitation,
  scoreWeather,
} from "../src/lib/forecast";
import { buildForecastReliability } from "../src/lib/forecastReliability";
import type {
  EnhancedWeatherData,
  SafetyAssessment,
} from "../src/types/forecast";

interface LocationCase {
  name: string;
  lat: number;
  lon: number;
  expectUS: boolean;
  expectMarineEligible: boolean;
}

// 25 locations spanning US inland, US coastal, Great Lakes, and international.
const LOCATIONS: LocationCase[] = [
  { name: "Denver, CO", lat: 39.7392, lon: -104.9903, expectUS: true, expectMarineEligible: false },
  { name: "Milton, WI", lat: 42.7756, lon: -88.9443, expectUS: true, expectMarineEligible: true },
  { name: "Chicago, IL", lat: 41.8781, lon: -87.6298, expectUS: true, expectMarineEligible: true },
  { name: "Duluth, MN", lat: 46.7867, lon: -92.1005, expectUS: true, expectMarineEligible: true },
  { name: "New York, NY", lat: 40.7128, lon: -74.006, expectUS: true, expectMarineEligible: true },
  { name: "Boston, MA", lat: 42.3601, lon: -71.0589, expectUS: true, expectMarineEligible: true },
  { name: "Miami, FL", lat: 25.7617, lon: -80.1918, expectUS: true, expectMarineEligible: true },
  { name: "Corpus Christi, TX", lat: 27.7793, lon: -97.5114, expectUS: true, expectMarineEligible: true },
  { name: "Seattle, WA", lat: 47.6062, lon: -122.3321, expectUS: true, expectMarineEligible: true },
  { name: "San Diego, CA", lat: 32.7157, lon: -117.1611, expectUS: true, expectMarineEligible: true },
  { name: "Honolulu, HI", lat: 21.3045, lon: -157.8557, expectUS: true, expectMarineEligible: true },
  { name: "Anchorage, AK", lat: 61.2181, lon: -149.9003, expectUS: true, expectMarineEligible: false },
  { name: "Oklahoma City, OK", lat: 35.4676, lon: -97.5164, expectUS: true, expectMarineEligible: false },
  { name: "Salt Lake City, UT", lat: 40.7608, lon: -111.891, expectUS: true, expectMarineEligible: false },
  { name: "Nashville, TN", lat: 36.1627, lon: -86.7816, expectUS: true, expectMarineEligible: false },
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.074, expectUS: true, expectMarineEligible: false },
  // Boise and Atlanta sit inside the coarse coastal rectangles used by the
  // marine prefilter; eligibility here documents current behavior.
  { name: "Boise, ID", lat: 43.615, lon: -116.2023, expectUS: true, expectMarineEligible: true },
  { name: "Kansas City, MO", lat: 39.0997, lon: -94.5786, expectUS: true, expectMarineEligible: false },
  { name: "Atlanta, GA", lat: 33.749, lon: -84.388, expectUS: true, expectMarineEligible: true },
  // Toronto sits south of Detroit's latitude, inside the Great Lakes
  // peninsula a bounding box can't carve out; documents the known limitation.
  { name: "Toronto, ON", lat: 43.6532, lon: -79.3832, expectUS: true, expectMarineEligible: true },
  { name: "Vancouver, BC", lat: 49.2827, lon: -123.1207, expectUS: false, expectMarineEligible: false },
  { name: "Mexico City, MX", lat: 19.4326, lon: -99.1332, expectUS: false, expectMarineEligible: false },
  { name: "Cancun, MX", lat: 21.1619, lon: -86.8515, expectUS: false, expectMarineEligible: false },
  { name: "Paris, FR", lat: 48.8566, lon: 2.3522, expectUS: false, expectMarineEligible: false },
  { name: "Tokyo, JP", lat: 35.6762, lon: 139.6503, expectUS: false, expectMarineEligible: false },
];

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(label);
  }
}

function closeTo(actual: number, expected: number, tolerance = 0.01): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function makeSafety(): SafetyAssessment {
  return { rating: "GOOD", activeAlerts: [], recommendations: [], riskFactors: [] };
}

function makeWeather(): EnhancedWeatherData {
  return {
    tempC: 18,
    windKph: 10,
    precipMm: 0,
    cloudPct: 30,
    safety: makeSafety(),
    barometricTrend: "STEADY",
    source: "NWS",
  };
}

// --- Source selection (US bounds + marine prefilter) ---
for (const loc of LOCATIONS) {
  check(
    `${loc.name}: US-bounds classification (expected ${loc.expectUS ? "NWS-primary" : "Open-Meteo-primary"})`,
    isUSLocation(loc.lat, loc.lon) === loc.expectUS
  );
  check(
    `${loc.name}: marine prefilter (expected ${loc.expectMarineEligible ? "eligible" : "not eligible"})`,
    evaluateMarinePrefilter(loc.lat, loc.lon).eligible === loc.expectMarineEligible
  );
}

// --- Unit correctness ---
check("wind: km/h uom passes through", closeTo(convertWindToKph(10, "wmoUnit:km_h-1"), 10));
check("wind: m/s converts to km/h", closeTo(convertWindToKph(10, "wmoUnit:m_s-1"), 36));
check("wind: knots convert to km/h", closeTo(convertWindToKph(10, "wmoUnit:kn"), 18.52));
check("pressure: Pa converts to hPa", closeTo(convertPressureToHpa(101325, "wmoUnit:Pa"), 1013.25));
check("pressure: hPa passes through", closeTo(convertPressureToHpa(1013.25, "wmoUnit:hPa"), 1013.25));
check("temperature: degC passes through", closeTo(convertTemperatureToC(20, "wmoUnit:degC"), 20));
check("temperature: degF converts to C", closeTo(convertTemperatureToC(68, "wmoUnit:degF"), 20));
check("PoP clamps below 0", clampProbabilityPct(-5) === 0);
check("PoP clamps above 100", clampProbabilityPct(140) === 100);

// --- Precipitation semantics ---
check("precip: amount scoring takes precedence", scorePrecipitation(12, 90) === 0.1);
check(
  "precip: 90% probability is not scored as 0.9mm light rain",
  scorePrecipitation(undefined, 90) !== scorePrecipitation(0.9, undefined)
);
check("precip: high probability scores poorly", scorePrecipitation(undefined, 95) === 0.2);
check("precip: neither available scores neutral", scorePrecipitation(undefined, undefined) === 0.6);

// --- Cloud cover bounds ---
for (const cloudPct of [0, 100]) {
  const score = scoreWeather({ tempC: 18, windKph: 10, precipMm: 0, cloudPct });
  check(`cloud cover ${cloudPct}%: weather score stays in 0..1`, score >= 0 && score <= 1);
}

// --- Safety overrides ---
const service = new NWSWeatherService();
const calm = { tempC: 20, windKph: 10, precipMm: 0, cloudPct: 50 };
const alertBase = {
  id: "v1",
  headline: "Validation",
  urgency: "Future" as const,
  certainty: "Possible" as const,
  event: "Validation Event",
  description: "",
  areas: [],
};

check(
  "safety: Severe alert forces DANGEROUS",
  service.assessSafety([{ ...alertBase, severity: "Severe" }], calm).rating === "DANGEROUS"
);
check(
  "safety: Extreme alert forces DANGEROUS",
  service.assessSafety([{ ...alertBase, severity: "Extreme" }], calm).rating === "DANGEROUS"
);
check(
  "safety: Moderate alert degrades to FAIR",
  service.assessSafety([{ ...alertBase, severity: "Moderate" }], calm).rating === "FAIR"
);
check(
  "safety: marine wind >= 55 km/h forces DANGEROUS",
  adjustSafetyWithMarine(makeSafety(), { windSpeedKph: 60 }, "2026-07-03").rating === "DANGEROUS"
);
check(
  "safety: marine waves >= 3m force DANGEROUS",
  adjustSafetyWithMarine(makeSafety(), { waveHeight: 3.5 }, "2026-07-03").rating === "DANGEROUS"
);
check(
  "safety: DANGEROUS zeroes the weather score regardless of source",
  scoreWeather({
    ...calm,
    safety: { ...makeSafety(), rating: "DANGEROUS" },
    barometricTrend: "STEADY",
    source: "OPEN_METEO",
  }) === 0
);

// --- Data quality (reliability) ---
const unknownFreshness = buildForecastReliability(makeWeather(), {
  isMarineEligible: false,
  nowIso: "2026-07-03T12:00:00Z",
  forecastGeneratedIso: "2026-07-03T12:00:00Z",
});
check("quality: missing source timestamp yields UNKNOWN freshness", unknownFreshness.weatherFreshness === "UNKNOWN");
check("quality: UNKNOWN freshness is penalized", unknownFreshness.confidenceScore < 100);

const primaryQuality = buildForecastReliability(makeWeather(), {
  isMarineEligible: false,
  isFallbackSource: false,
  nowIso: "2026-07-03T12:00:00Z",
  weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
});
const fallbackQuality = buildForecastReliability(
  { ...makeWeather(), source: "OPEN_METEO" },
  {
    isMarineEligible: false,
    isFallbackSource: true,
    nowIso: "2026-07-03T12:00:00Z",
    weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
  }
);
check("quality: fallback source reduces data quality", fallbackQuality.confidenceScore < primaryQuality.confidenceScore);

const missingMarineQuality = buildForecastReliability(makeWeather(), {
  isMarineEligible: true,
  nowIso: "2026-07-03T12:00:00Z",
  weatherLastUpdatedIso: "2026-07-03T11:00:00Z",
});
check(
  "quality: marine-eligible location missing marine data reduces quality",
  missingMarineQuality.marineStatus === "UNAVAILABLE" &&
    missingMarineQuality.confidenceScore < primaryQuality.confidenceScore
);

// --- Blocked forecasts ---
const blocked = buildUnavailableForecast({ date: "2026-07-03", lat: 39.7, lon: -104.9 }, "validation");
const blockedChecks =
  blocked.forecastStatus === "WEATHER_UNAVAILABLE" &&
  blocked.biteScore0100 === 0 &&
  blocked.weather.safety.rating === "UNKNOWN" &&
  Number.isNaN(blocked.weather.tempC);
check("blocking: total weather failure never yields a normal score", blockedChecks);

// --- Report ---
const total = passed + failed;
const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
const blockedStatus = blockedChecks ? "PASS" : "FAIL";

console.log("Weather data validation");
console.log(`Locations tested: ${LOCATIONS.length}`);
console.log(
  "Fields tested: temp, wind, precipitation (probability vs amount), cloud cover, pressure, alerts"
);
console.log(`Checks: ${passed}/${total} passed`);
console.log(`Pass rate: ${passRate}%`);
console.log(`Blocked unsafe/missing forecasts: ${blockedStatus}`);
console.log(
  "Known limitations: precipitation amount unavailable from NWS grid PoP; Open-Meteo provides no source update timestamp (freshness UNKNOWN); US bounds are rough rectangles (southern Ontario/Quebec near the Great Lakes still routes to NWS)"
);

if (failed > 0) {
  console.error("\nFailed checks:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}
