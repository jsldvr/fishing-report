import type { MarineWeatherData } from "../types/forecast.js";

interface MarineConditionsProps {
  marine: MarineWeatherData;
  dateIso: string;
  useMph: boolean;
}

export default function MarineConditions({
  marine,
  dateIso,
  useMph,
}: MarineConditionsProps) {
  const hasStation = Boolean(marine.stationId) || Boolean(marine.stationName);
  const hasTides =
    Array.isArray(marine.tideEvents) && marine.tideEvents.length > 0;
  const hasMetrics =
    marine.waveHeight !== undefined ||
    marine.waterTemperature !== undefined ||
    marine.windSpeedKph !== undefined;

  if (!hasStation && !hasTides && !hasMetrics) {
    return null;
  }

  const idBase = `marine-${dateIso.replace(/[^0-9A-Za-z]/g, "")}`;

  const formatWaveHeight = (height: number): string => {
    const feet = height * 3.28084;
    return `${height.toFixed(2)} m (${feet.toFixed(1)} ft)`;
  };

  const formatWindSpeed = (speedKph: number): string => {
    if (useMph) {
      const mph = speedKph / 1.609344;
      return `${mph.toFixed(1)} mph`;
    }
    return `${speedKph.toFixed(1)} km/h`;
  };

  const formatTime = (iso: string): string => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const upcomingTides = hasTides
    ? marine
        .tideEvents!.slice()
        .sort(
          (a, b) =>
            new Date(a.timeIso).getTime() - new Date(b.timeIso).getTime()
        )
        .slice(0, 4)
    : [];

  return (
    <div
      className="mt-6 border-t border-gray-200 pt-4 marine-conditions"
      id={`${idBase}-container`}
      data-testid="marine-conditions"
    >
      <h4 className="font-semibold text-gray-700 mb-3" id={`${idBase}-title`}>
        🌊 Coastal Conditions
      </h4>

      {hasStation && (
        <p className="text-sm text-gray-600 mb-3" id={`${idBase}-station`}>
          Nearest NOAA station: {marine.stationName || marine.stationId}
          {marine.stationDistanceKm !== undefined
            ? ` (${marine.stationDistanceKm} km away)`
            : ""}
        </p>
      )}

      {(marine.waveHeight !== undefined ||
        marine.windSpeedKph !== undefined ||
        marine.waterTemperature !== undefined) && (
        <div
          className="grid gap-3 sm:grid-cols-3 text-sm"
          id={`${idBase}-metrics`}
        >
          {marine.waveHeight !== undefined && (
            <div className="rounded bg-blue-50 p-3" id={`${idBase}-wave`}>
              <p
                className="font-medium text-blue-900 mb-1"
                id={`${idBase}-wave-label`}
              >
                Wave Height
              </p>
              <p className="text-blue-800" id={`${idBase}-wave-value`}>
                {formatWaveHeight(marine.waveHeight)}
              </p>
            </div>
          )}

          {marine.windSpeedKph !== undefined && (
            <div className="rounded bg-sky-50 p-3" id={`${idBase}-wind`}>
              <p
                className="font-medium text-sky-900 mb-1"
                id={`${idBase}-wind-label`}
              >
                Wind at Station
              </p>
              <p className="text-sky-800" id={`${idBase}-wind-value`}>
                {formatWindSpeed(marine.windSpeedKph)}
                {marine.windDirectionText
                  ? ` ${marine.windDirectionText}`
                  : marine.windDirectionDeg !== undefined
                  ? ` ${marine.windDirectionDeg.toFixed(0)}°`
                  : ""}
              </p>
            </div>
          )}

          {marine.waterTemperature !== undefined && (
            <div className="rounded bg-cyan-50 p-3" id={`${idBase}-water-temp`}>
              <p
                className="font-medium text-cyan-900 mb-1"
                id={`${idBase}-water-temp-label`}
              >
                Water Temperature
              </p>
              <p className="text-cyan-800" id={`${idBase}-water-temp-value`}>
                {marine.waterTemperature.toFixed(1)} °C
              </p>
            </div>
          )}
        </div>
      )}

      {upcomingTides.length > 0 && (
        <div className="mt-4" id={`${idBase}-tides`}>
          <h5
            className="font-semibold text-gray-700 mb-2"
            id={`${idBase}-tides-title`}
          >
            Tide Timeline
          </h5>
          <ul className="space-y-2" id={`${idBase}-tides-list`}>
            {upcomingTides.map((event, index) => (
              <li
                className="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-sm"
                id={`${idBase}-tide-${index}`}
                key={`${event.timeIso}-${event.type}`}
              >
                <span
                  className="font-medium text-gray-800"
                  id={`${idBase}-tide-${index}-label`}
                >
                  {event.type === "HIGH" ? "High tide" : "Low tide"}
                </span>
                <span
                  className="text-gray-600"
                  id={`${idBase}-tide-${index}-time`}
                >
                  {formatTime(event.timeIso)} · {event.heightMeters.toFixed(2)}{" "}
                  m
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
