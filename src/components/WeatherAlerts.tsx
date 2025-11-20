import type { EnhancedWeatherData } from "../types/forecast.js";
import Icon, { type IconName } from "./Icon";

interface WeatherAlertsProps {
  weather: EnhancedWeatherData;
  className?: string;
}

export default function WeatherAlerts({
  weather,
  className = "",
}: WeatherAlertsProps) {
  const alerts = weather.safety.activeAlerts || [];

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (severity: string): IconName => {
    switch (severity) {
      case "Extreme":
        return "warning";
      case "Severe":
        return "bolt";
      case "Moderate":
        return "alert";
      case "Minor":
        return "info";
      default:
        return "alert";
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="weather-alerts">
      <div className="space-y-2" id="weather-alerts-list">
        <h3
          className="font-semibold text-lg flex items-center gap-2"
          id="weather-alerts-title"
        >
          <Icon name="alert" />
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
              <Icon name={getAlertIcon(alert.severity)} className="text-lg" />
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
                  <p className="text-xs leading-relaxed">{alert.description}</p>
                </div>
              )}
              {alert.instruction && (
                <div className="mt-2">
                  <p className="font-medium">Instructions:</p>
                  <p className="text-xs leading-relaxed">{alert.instruction}</p>
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
    </div>
  );
}
