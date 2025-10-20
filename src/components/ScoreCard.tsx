import type { ForecastScore, SafetyAssessment } from "../types/forecast";
import { formatLocalDate, getTimezoneFromCoords } from "../lib/time";
import WeatherAlerts from "./WeatherAlerts";
import WeatherDebugInfo from "./WeatherDebugInfo";
import MarineConditions from "./MarineConditions";
import NWSOfficeInfo from "./NWSOfficeInfo";

interface ScoreCardProps {
  forecast: ForecastScore;
  lat: number;
  lon: number;
  useFahrenheit?: boolean;
  useMph?: boolean;
}

export default function ScoreCard({
  forecast,
  lat,
  lon,
  useFahrenheit = true,
  useMph = true,
}: ScoreCardProps) {
  const tz = getTimezoneFromCoords(lat, lon);
  const dateInfo = formatLocalDate(forecast.date, tz);

  const tempF = Math.round((forecast.weather.tempC * 9) / 5 + 32);
  const windMph = Math.round((forecast.weather.windKph / 1.609) * 10) / 10;
  const safety = forecast.weather.safety;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 75) return "🎣";
    if (score >= 50) return "🐟";
    return "💤";
  };

  const getSafetyStyles = (rating: SafetyAssessment["rating"]) => {
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

  const getSafetyIcon = (rating: SafetyAssessment["rating"]) => {
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

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {new Date(forecast.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          <p
            className="text-sm text-gray-600 mt-1"
            title={`UTC: ${dateInfo.utc}`}
          >
            {dateInfo.local}
          </p>
          {forecast.weather.source === "NWS" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                NWS Data
              </span>
              {forecast.weather.barometricTrend !== "STEADY" && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                  {forecast.weather.barometricTrend.toLowerCase()} pressure
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-center">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getScoreColor(
              forecast.biteScore0100
            )}`}
          >
            <span className="mr-2">
              {getScoreEmoji(forecast.biteScore0100)}
            </span>
            {forecast.biteScore0100}
          </div>
          <p className="text-xs text-gray-500 mt-1">Bite Score</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">
              🌙 Moon ({forecast.moon.phaseName})
            </span>
            <span className="font-semibold">{forecast.components.moon}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${forecast.components.moon}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Weather</span>
            <span className="font-semibold">{forecast.components.weather}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${forecast.components.weather}%` }}
            ></div>
          </div>
        </div>

        {forecast.components.almanac !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">📖 Almanac</span>
              <span className="font-semibold">
                {forecast.components.almanac}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${forecast.components.almanac}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">🌙 Moon</h4>
            <div className="space-y-1">
              <p>Phase: {forecast.moon.phaseName}</p>
              <p>
                Illumination: {Math.round(forecast.moon.illumination * 100)}%
              </p>
              <p>Angle: {forecast.moon.phaseAngleDeg}°</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Weather</h4>
            <div className="space-y-1">
              <p>
                Temp:{" "}
                {useFahrenheit ? `${tempF}°F` : `${forecast.weather.tempC}°C`}
              </p>
              <p>
                Wind:{" "}
                {useMph ? `${windMph} mph` : `${forecast.weather.windKph} km/h`}
              </p>
              <p>Rain: {forecast.weather.precipMm}mm</p>
              <p>Clouds: {forecast.weather.cloudPct}%</p>
              {forecast.weather.pressureHpa && (
                <p>Pressure: {forecast.weather.pressureHpa} hPa</p>
              )}
            </div>
          </div>
        </div>

        {forecast.almanac.notes && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              <strong>Almanac:</strong> {forecast.almanac.notes}
            </p>
          </div>
        )}

        {safety && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div
              className={`p-4 rounded-lg border-2 ${getSafetyStyles(
                safety.rating
              )}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{getSafetyIcon(safety.rating)}</span>
                <h3 className="font-semibold text-lg">
                  Fishing Safety: {safety.rating}
                </h3>
              </div>
              <div className="text-sm opacity-75 mb-2">
                Data source:{" "}
                {forecast.weather.source === "NWS"
                  ? "National Weather Service"
                  : "Open-Meteo"}
                {forecast.weather.barometricTrend !== "STEADY" && (
                  <span className="ml-2">
                    | Pressure:{" "}
                    {forecast.weather.barometricTrend.toLowerCase()}
                  </span>
                )}
              </div>
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
          </div>
        )}

        {forecast.weather.marine && (
          <MarineConditions
            marine={forecast.weather.marine}
            dateIso={forecast.date}
            useMph={useMph}
          />
        )}

        {/* NWS Information */}
        {forecast.weather.source === "NWS" && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <WeatherDebugInfo weather={forecast.weather} className="mb-4" />
            <WeatherAlerts weather={forecast.weather} className="mb-4" />
            {forecast.weather.localOffice && (
              <NWSOfficeInfo localOffice={forecast.weather.localOffice} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
