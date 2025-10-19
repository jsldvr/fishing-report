import type { ForecastScore } from "../types/forecast";
import { formatLocalDate, getTimezoneFromCoords } from "../lib/time";

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

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {new Date(forecast.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          <p className="text-sm text-gray-600" title={`UTC: ${dateInfo.utc}`}>
            {dateInfo.local}
          </p>
        </div>
        <div className="text-center">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
              forecast.biteScore0100
            )}`}
          >
            <span className="mr-1">
              {getScoreEmoji(forecast.biteScore0100)}
            </span>
            {forecast.biteScore0100}
          </div>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>🌙 Moon ({forecast.moon.phaseName})</span>
            <span>{forecast.components.moon}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${forecast.components.moon}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>🌤️ Weather</span>
            <span>{forecast.components.weather}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full"
              style={{ width: `${forecast.components.weather}%` }}
            ></div>
          </div>
        </div>

        {forecast.components.almanac !== undefined && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>📖 Almanac</span>
              <span>{forecast.components.almanac}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${forecast.components.almanac}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Moon</h4>
            <p>Phase: {forecast.moon.phaseName}</p>
            <p>Illumination: {Math.round(forecast.moon.illumination * 100)}%</p>
            <p>Angle: {forecast.moon.phaseAngleDeg}°</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Weather</h4>
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

        {forecast.almanac.notes && (
          <div className="mt-3 p-2 bg-gray-50 rounded">
            <p className="text-sm text-gray-700">
              <strong>Almanac:</strong> {forecast.almanac.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
