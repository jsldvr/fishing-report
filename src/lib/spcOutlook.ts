import type { SpcOutlookRisk } from "../types/forecast.js";

interface SpcFeature {
  attributes?: {
    OTLK_TYPE?: string;
    DN?: number;
  };
}

interface SpcOutlookResponse {
  features?: SpcFeature[];
}

const SPC_OUTLOOK_ENDPOINT =
  "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer/2/query";

/**
 * Fetch the SPC day 1 outlook risk for a given point.
 * Returns null when no outlook covers the point.
 */
export async function fetchSpcOutlook(
  lat: number,
  lon: number
): Promise<{ risk: SpcOutlookRisk; day: number } | null> {
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OTLK_TYPE,DN",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SPC_OUTLOOK_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SpcOutlookResponse;
    const features = data.features ?? [];
    if (features.length === 0) return null;

    // Prefer day 1 outlooks
    const dayOne = features.find((f) => f.attributes?.DN === 1);
    const chosen = dayOne ?? features[0];
    const riskRaw = chosen.attributes?.OTLK_TYPE?.toUpperCase?.().trim();
    const day = chosen.attributes?.DN ?? 1;

    if (!riskRaw) return null;

    const validRisk: SpcOutlookRisk | undefined = isSpcRisk(riskRaw)
      ? (riskRaw as SpcOutlookRisk)
      : normalizeRisk(riskRaw);

    if (!validRisk) {
      return null;
    }

    return { risk: validRisk, day };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isSpcRisk(value: string): value is SpcOutlookRisk {
  return ["HIGH", "MDT", "ENH", "SLGT", "MRGL", "TSTM"].includes(value);
}

function normalizeRisk(value: string): SpcOutlookRisk | undefined {
  const trimmed = value.toUpperCase();
  if (trimmed.includes("SLIGHT")) return "SLGT";
  if (trimmed.includes("ENHANCED")) return "ENH";
  if (trimmed.includes("MODERATE")) return "MDT";
  if (trimmed.includes("MARGINAL")) return "MRGL";
  if (trimmed.includes("THUNDER")) return "TSTM";
  return undefined;
}
