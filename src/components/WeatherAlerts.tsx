import type { EnhancedWeatherData } from "../types/forecast.js";

interface WeatherAlertsProps {
  weather: EnhancedWeatherData;
  className?: string;
}

export default function WeatherAlerts({
  weather,
  className = "",
}: WeatherAlertsProps) {
  const alerts = weather.safety.activeAlerts || [];

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
    <div className={`space-y-4 ${className}`} data-testid="weather-alerts">
      {/* Active Weather Alerts */}
      {alerts.length > 0 ? (
        <div className="space-y-2" id="weather-alerts-list">
          <h3
            className="font-semibold text-lg flex items-center gap-2"
            id="weather-alerts-title"
          >
            <span>📢</span>
            Active Weather Alerts
          </h3>
          {alerts.map((alert, index) => (
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
    </div>
  );
}
