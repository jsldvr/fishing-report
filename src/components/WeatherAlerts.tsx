import type {
  SafetyAssessment,
  EnhancedWeatherData,
} from "../types/forecast.js";
import NWSOfficeInfo from "./NWSOfficeInfo";

interface WeatherAlertsProps {
  weather: EnhancedWeatherData;
  className?: string;
}

export default function WeatherAlerts({
  weather,
  className = "",
}: WeatherAlertsProps) {
  const { safety } = weather;
  const marine = weather.marine;
  const marineHasStation = Boolean(marine?.stationId || marine?.stationName);
  const marineHasMetrics =
    marine !== undefined &&
    [
      marine.waveHeight,
      marine.waterTemperature,
      marine.visibility,
      marine.swellDirection,
      marine.windWaveHeight,
      marine.windSpeedKph,
    ].some((value) => value !== undefined);
  const marineHasTides = Boolean(
    marine?.tideEvents && marine.tideEvents.length > 0
  );
  const marineTideEvents = marineHasTides
    ? [...(marine?.tideEvents || [])].sort(
        (a, b) =>
          new Date(a.timeIso).getTime() - new Date(b.timeIso).getTime()
      )
    : [];
  const marineHasContent =
    marineHasStation || marineHasMetrics || marineHasTides;
  const formatTideTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const getSafetyColor = (rating: SafetyAssessment["rating"]): string => {
    switch (rating) {
      case "EXCELLENT":
        return "bg-green-100 text-green-800 border-green-200";
      case "GOOD":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "FAIR":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "POOR":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "DANGEROUS":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSafetyIcon = (rating: SafetyAssessment["rating"]): string => {
    switch (rating) {
      case "EXCELLENT":
        return "🎣";
      case "GOOD":
        return "✅";
      case "FAIR":
        return "⚠️";
      case "POOR":
        return "🚫";
      case "DANGEROUS":
        return "⛔";
      default:
        return "❓";
    }
  };

  const getAlertIcon = (severity: string): string => {
    switch (severity) {
      case "Extreme":
        return "🚨";
      case "Severe":
        return "⚡";
      case "Moderate":
        return "⚠️";
      case "Minor":
        return "ℹ️";
      default:
        return "📢";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Safety Rating */}
      <div
        className={`p-4 rounded-lg border-2 ${getSafetyColor(safety.rating)}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{getSafetyIcon(safety.rating)}</span>
          <h3 className="font-semibold text-lg">
            Fishing Safety: {safety.rating}
          </h3>
        </div>

        {/* Weather Source */}
        <div className="text-sm opacity-75 mb-2">
          Data source:{" "}
          {weather.source === "NWS" ? "National Weather Service" : "Open-Meteo"}
          {weather.barometricTrend !== "STEADY" && (
            <span className="ml-2">
              | Pressure: {weather.barometricTrend.toLowerCase()}
            </span>
          )}
        </div>

        {/* Risk Factors */}
        {safety.riskFactors.length > 0 && (
          <div className="mb-3">
            <h4 className="font-medium mb-1">Risk Factors:</h4>
            <ul className="text-sm space-y-1">
              {safety.riskFactors.map((factor, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-red-500">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {safety.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium mb-1">Recommendations:</h4>
            <ul className="text-sm space-y-1">
              {safety.recommendations.map((rec, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-blue-500">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Active Weather Alerts */}
      {safety.activeAlerts.length > 0 ? (
        <div className="space-y-2" id="weather-alerts-list">
          <h3 className="font-semibold text-lg flex items-center gap-2" id="weather-alerts-title">
            <span>📢</span>
            Active Weather Alerts
          </h3>
          {safety.activeAlerts.map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border-l-4 ${
                alert.severity === "Extreme" || alert.severity === "Severe"
                  ? "bg-red-50 border-red-400 text-red-800"
                  : "bg-yellow-50 border-yellow-400 text-yellow-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getAlertIcon(alert.severity)}</span>
                <h4 className="font-medium">{alert.headline}</h4>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <strong>Event:</strong> {alert.event}
                </p>
                <p>
                  <strong>Urgency:</strong> {alert.urgency}
                </p>
                <p>
                  <strong>Certainty:</strong> {alert.certainty}
                </p>

                {alert.description && (
                  <div className="mt-2">
                    <p className="font-medium">Description:</p>
                    <p className="text-xs leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                )}

                {alert.instruction && (
                  <div className="mt-2">
                    <p className="font-medium">Instructions:</p>
                    <p className="text-xs leading-relaxed">
                      {alert.instruction}
                    </p>
                  </div>
                )}

                {alert.areas.length > 0 && (
                  <p className="text-xs mt-1">
                    <strong>Areas:</strong> {alert.areas.join(", ")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50"
          id="weather-alerts-empty"
        >
          <p className="text-sm text-gray-600" id="weather-alerts-empty-text">
            Alerts will appear here if any are issued for this location.
          </p>
        </div>
      )}

      {/* Marine Conditions (if available) */}
      <div
        className="p-4 bg-blue-50 rounded-lg border border-blue-200"
        id="weather-marine-conditions"
      >
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <span>🌊</span>
          Marine Conditions
        </h3>
        {marineHasContent && marine ? (
          <>
            {marineHasStation && (
              <p className="text-sm text-blue-900 mb-3">
                Nearest NOAA station: {marine.stationName || marine.stationId}
                {marine.stationDistanceKm !== undefined
                  ? ` (${marine.stationDistanceKm} km away)`
                  : ""}
              </p>
            )}
            {marineHasMetrics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {marine.waveHeight !== undefined && (
                  <div>
                    <span className="font-medium">Wave Height:</span>
                    <span className="ml-2">{marine.waveHeight.toFixed(1)}m</span>
                  </div>
                )}
                {marine.waterTemperature !== undefined && (
                  <div>
                    <span className="font-medium">Water Temp:</span>
                    <span className="ml-2">
                      {marine.waterTemperature.toFixed(1)}°C
                    </span>
                  </div>
                )}
                {marine.visibility !== undefined && (
                  <div>
                    <span className="font-medium">Visibility:</span>
                    <span className="ml-2">
                      {marine.visibility.toFixed(1)}km
                    </span>
                  </div>
                )}
                {marine.swellDirection !== undefined && (
                  <div>
                    <span className="font-medium">Swell Direction:</span>
                    <span className="ml-2">
                      {marine.swellDirection.toFixed(0)}°
                    </span>
                  </div>
                )}
                {marine.windSpeedKph !== undefined && (
                  <div>
                    <span className="font-medium">Station Wind:</span>
                    <span className="ml-2">
                      {(marine.windSpeedKph / 1.609).toFixed(1)} mph
                    </span>
                  </div>
                )}
              </div>
            )}
            {marineHasTides && (
              <div className="mt-4 text-sm">
                <h4 className="font-medium mb-2">Tide Timeline</h4>
                <ul className="space-y-2">
                  {marineTideEvents.slice(0, 4).map((event, index) => (
                    <li
                      key={`${event.timeIso}-${event.type}-${index}`}
                      className="flex justify-between rounded border border-blue-200 bg-blue-100 px-3 py-2"
                    >
                      <span className="font-medium text-blue-900">
                        {event.type === "HIGH" ? "High Tide" : "Low Tide"}
                      </span>
                      <span className="text-blue-800">
                        {formatTideTime(event.timeIso)} ·{" "}
                        {event.heightMeters.toFixed(2)} m
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-blue-800">
            Marine observations from the nearest NOAA station will appear here
            when available.
          </p>
        )}
      </div>

      {/* Local NWS Office Information */}
      {weather.localOffice && (
        <NWSOfficeInfo localOffice={weather.localOffice} />
      )}
    </div>
  );
}
