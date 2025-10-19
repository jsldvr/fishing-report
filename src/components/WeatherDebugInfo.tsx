import type { EnhancedWeatherData } from "../types/forecast.js";

interface WeatherDebugInfoProps {
  weather: EnhancedWeatherData;
  className?: string;
}

export default function WeatherDebugInfo({
  weather,
  className = "",
}: WeatherDebugInfoProps) {
  // Always show in development for now
  const isDevelopment = true;

  if (!isDevelopment) return null;

  return (
    <div
      className={`p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-xs ${className}`}
    >
      <h4 className="font-bold text-gray-700 mb-2">🔧 Debug Info (Dev Only)</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p>
            <strong>Data Source:</strong> {weather.source}
          </p>
          <p>
            <strong>Pressure Trend:</strong> {weather.barometricTrend}
          </p>
          <p>
            <strong>Safety Rating:</strong> {weather.safety.rating}
          </p>
          <p>
            <strong>Active Alerts:</strong> {weather.safety.activeAlerts.length}
          </p>
        </div>

        <div>
          <p>
            <strong>Risk Factors:</strong> {weather.safety.riskFactors.length}
          </p>
          <p>
            <strong>Recommendations:</strong>{" "}
            {weather.safety.recommendations.length}
          </p>
          {weather.marine && (
            <p>
              <strong>Marine Data:</strong>{" "}
              {
                Object.values(weather.marine).filter((v) => v !== undefined)
                  .length
              }{" "}
              fields
            </p>
          )}
        </div>
      </div>

      {weather.source === "NWS" && (
        <div className="mt-2 p-2 bg-blue-50 rounded">
          <p className="text-blue-700">
            <strong>🎯 NWS Integration Active</strong>
          </p>
          <p className="text-blue-600">
            Enhanced weather scoring and safety features enabled
          </p>
        </div>
      )}

      {weather.safety.activeAlerts.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-50 rounded">
          <p className="text-yellow-700">
            <strong>⚠️ Weather Alerts:</strong>
          </p>
          {weather.safety.activeAlerts.slice(0, 2).map((alert, i) => (
            <p key={i} className="text-yellow-600 truncate">
              • {alert.event}
            </p>
          ))}
        </div>
      )}

      {weather.marine &&
        Object.values(weather.marine).some((v) => v !== undefined) && (
          <div className="mt-2 p-2 bg-cyan-50 rounded">
            <p className="text-cyan-700">
              <strong>🌊 Marine Data Available</strong>
            </p>
            <div className="text-cyan-600 grid grid-cols-2 gap-1">
              {weather.marine.waveHeight !== undefined && (
                <span>Waves: {weather.marine.waveHeight.toFixed(1)}m</span>
              )}
              {weather.marine.waterTemperature !== undefined && (
                <span>
                  Water: {weather.marine.waterTemperature.toFixed(1)}°C
                </span>
              )}
              {weather.marine.visibility !== undefined && (
                <span>
                  Visibility: {weather.marine.visibility.toFixed(1)}km
                </span>
              )}
              {weather.marine.swellDirection !== undefined && (
                <span>Swell: {weather.marine.swellDirection.toFixed(0)}°</span>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
