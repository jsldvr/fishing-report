import type { ForecastScore, SafetyAssessment } from "../types/forecast";
import { formatLocalDate, getTimezoneFromCoords } from "../lib/time";
import WeatherAlerts from "./WeatherAlerts";
import WeatherDebugInfo from "./WeatherDebugInfo";
import MarineConditions, { hasMarineDisplayData } from "./MarineConditions";
import Icon, { type IconName } from "./Icon";

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
  const cardId = `forecast-card-${forecast.date.replace(/[^0-9A-Za-z]/g, "")}`;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getScoreIconName = (score: number): IconName => {
    if (score >= 75) return "fish";
    if (score >= 50) return "fishFins";
    return "sleep";
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

  const getSafetyIconName = (rating: SafetyAssessment["rating"]): IconName => {
    switch (rating) {
      case "EXCELLENT":
        return "fish";
      case "GOOD":
        return "check";
      case "FAIR":
        return "warning";
      case "POOR":
        return "ban";
      case "DANGEROUS":
        return "xmark";
      default:
        return "question";
    }
  };

  return (
    <div className="card forecast-card" id={cardId} data-testid="score-card">
      <div className="forecast-card__header" id={`${cardId}-header`}>
        <div className="forecast-card__title" id={`${cardId}-title`}>
          <h3 className="text-xl font-semibold forecast-card__heading">
            {new Date(forecast.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          <p
            className="text-sm forecast-card__subtext"
            id={`${cardId}-local-time`}
            title={`UTC: ${dateInfo.utc}`}
          >
            {dateInfo.local}
          </p>
          {forecast.weather.source === "NWS" && (
            <div className="forecast-card__badges" id={`${cardId}-badges`}>
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
        <div className="forecast-card__score" id={`${cardId}-score`}>
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getScoreColor(
              forecast.biteScore0100
            )}`}
            id={`${cardId}-score-chip`}
          >
            <Icon
              name={getScoreIconName(forecast.biteScore0100)}
              className="mr-2"
            />
            {forecast.biteScore0100}
          </div>
          <p
            className="text-xs forecast-card__score-label"
            id={`${cardId}-score-label`}
          >
            Bite Score
          </p>
        </div>
      </div>

      <div className="forecast-card__section" id={`${cardId}-score-breakdown`}>
        <div className="forecast-card__metric" id={`${cardId}-metric-moon`}>
          <div
            className="forecast-card__metric-header"
            id={`${cardId}-metric-moon-header`}
          >
            <div
              className="forecast-card__metric-label"
              id={`${cardId}-metric-moon-label`}
            >
              <span
                className="forecast-card__metric-title inline-flex items-center gap-2"
                id={`${cardId}-metric-moon-title`}
              >
                <Icon name="moon" />
                Moon ({forecast.moon.phaseName})
              </span>
              <span
                className="forecast-card__metric-help"
                id={`${cardId}-metric-moon-help`}
              >
                Lunar phase impact on fish activity; higher is better.
              </span>
            </div>
            <span className="forecast-card__metric-value">
              {forecast.components.moon}
            </span>
          </div>
          <div
            className="forecast-card__metric-track"
            id={`${cardId}-metric-moon-track`}
          >
            <div
              className="forecast-card__metric-fill forecast-card__metric-fill--moon"
              id={`${cardId}-metric-moon-fill`}
              style={{ width: `${forecast.components.moon}%` }}
            ></div>
          </div>
        </div>

        <div className="forecast-card__metric" id={`${cardId}-metric-weather`}>
          <div
            className="forecast-card__metric-header"
            id={`${cardId}-metric-weather-header`}
          >
            <div
              className="forecast-card__metric-label"
              id={`${cardId}-metric-weather-label`}
            >
              <span
                className="forecast-card__metric-title"
                id={`${cardId}-metric-weather-title`}
              >
                Weather
              </span>
              <span
                className="forecast-card__metric-help"
                id={`${cardId}-metric-weather-help`}
              >
                Considers temp, wind, precip, and clouds for bite conditions.
              </span>
            </div>
            <span className="forecast-card__metric-value">
              {forecast.components.weather}
            </span>
          </div>
          <div
            className="forecast-card__metric-track"
            id={`${cardId}-metric-weather-track`}
          >
            <div
              className="forecast-card__metric-fill forecast-card__metric-fill--weather"
              id={`${cardId}-metric-weather-fill`}
              style={{ width: `${forecast.components.weather}%` }}
            ></div>
          </div>
        </div>

        {forecast.components.almanac !== undefined && (
          <div
            className="forecast-card__metric"
            id={`${cardId}-metric-almanac`}
          >
            <div
              className="forecast-card__metric-header"
              id={`${cardId}-metric-almanac-header`}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="book" />
                Almanac
              </span>
              <span className="forecast-card__metric-value">
                {forecast.components.almanac}
              </span>
            </div>
            <div
              className="forecast-card__metric-track"
              id={`${cardId}-metric-almanac-track`}
            >
              <div
                className="forecast-card__metric-fill forecast-card__metric-fill--almanac"
                id={`${cardId}-metric-almanac-fill`}
                style={{ width: `${forecast.components.almanac}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div
        className="forecast-card__section forecast-card__section--divider"
        id={`${cardId}-details`}
      >
        <div className="forecast-card__info-grid" id={`${cardId}-overview`}>
          <div
            className="forecast-card__info-block"
            id={`${cardId}-moon-overview`}
          >
            <h4
              className="forecast-card__section-title inline-flex items-center gap-2"
              id={`${cardId}-moon-heading`}
            >
              <Icon name="moon" />
              Moon
            </h4>
            <div
              className="forecast-card__info-list"
              id={`${cardId}-moon-list`}
            >
              <p>Phase: {forecast.moon.phaseName}</p>
              <p>
                Illumination: {Math.round(forecast.moon.illumination * 100)}%
              </p>
              <p>Angle: {forecast.moon.phaseAngleDeg}°</p>
              {forecast.astronomical && (
                <>
                  <p>Rise: {forecast.astronomical.moonrise}</p>
                  <p>Set: {forecast.astronomical.moonset}</p>
                </>
              )}
            </div>
          </div>

          <div
            className="forecast-card__info-block"
            id={`${cardId}-weather-overview`}
          >
            <h4
              className="forecast-card__section-title"
              id={`${cardId}-weather-heading`}
            >
              Weather
            </h4>
            <div
              className="forecast-card__info-list"
              id={`${cardId}-weather-list`}
            >
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

        {forecast.astronomical && forecast.solunar && (
          <div
            className="forecast-card__section forecast-card__section--divider"
            id={`${cardId}-sun-solunar`}
          >
            <div
              className="forecast-card__info-grid"
              id={`${cardId}-astro-grid`}
            >
              <div
                className="forecast-card__info-block"
                id={`${cardId}-sun-times`}
              >
                <h4
                  className="forecast-card__section-title inline-flex items-center gap-2"
                  id={`${cardId}-sun-heading`}
                >
                  <Icon name="sun" />
                  Sun Times
                </h4>
                <div
                  className="forecast-card__info-list"
                  id={`${cardId}-sun-list`}
                >
                  <p>Sunrise: {forecast.astronomical.sunrise}</p>
                  <p>Sunset: {forecast.astronomical.sunset}</p>
                  <p>Solar Noon: {forecast.astronomical.solarNoon}</p>
                </div>
              </div>
              <div
                className="forecast-card__info-block"
                id={`${cardId}-solunar`}
              >
                <h4
                  className="forecast-card__section-title inline-flex items-center gap-2"
                  id={`${cardId}-solunar-heading`}
                >
                  <Icon name="fish" />
                  Solunar Rating
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {forecast.solunar.dayRating}/4
                  </span>
                </h4>
                <div
                  className="forecast-card__info-list"
                  id={`${cardId}-solunar-list`}
                >
                  <div
                    className="flex justify-between"
                    id={`${cardId}-solunar-major-heading`}
                  >
                    <span className="font-medium inline-flex items-center gap-2">
                      <Icon name="star" />
                      Major Periods
                    </span>
                    <span className="text-xs forecast-card__metric-hint">
                      2h each
                    </span>
                  </div>
                  {forecast.solunar.majorPeriods.map((period, idx) => (
                    <p
                      className="text-xs bg-green-50 px-2 py-1 rounded"
                      id={`${cardId}-solunar-major-${idx}`}
                      key={`major-${idx}`}
                    >
                      {period.start} - {period.end}
                    </p>
                  ))}
                  <div
                    className="flex justify-between mt-2"
                    id={`${cardId}-solunar-minor-heading`}
                  >
                    <span className="font-medium inline-flex items-center gap-2">
                      <Icon name="bullet" />
                      Minor Periods
                    </span>
                    <span className="text-xs forecast-card__metric-hint">
                      1h each
                    </span>
                  </div>
                  {forecast.solunar.minorPeriods.map((period, idx) => (
                    <p
                      className="text-xs bg-yellow-50 px-2 py-1 rounded"
                      id={`${cardId}-solunar-minor-${idx}`}
                      key={`minor-${idx}`}
                    >
                      {period.start} - {period.end}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {forecast.almanac.notes && (
          <div
            className="forecast-card__callout bg-amber-50 border border-amber-200"
            id={`${cardId}-almanac`}
          >
            <p className="text-sm text-amber-800">
              <strong>Almanac:</strong> {forecast.almanac.notes}
            </p>
          </div>
        )}

        {safety && (
          <div
            className="forecast-card__section forecast-card__section--divider"
            id={`${cardId}-safety`}
          >
            <div
              className={`rounded-lg border-2 ${getSafetyStyles(
                safety.rating
              )}`}
              id={`${cardId}-safety-panel`}
            >
              <div
                className="flex items-center gap-2 mb-2"
                id={`${cardId}-safety-header`}
              >
                <Icon
                  name={getSafetyIconName(safety.rating)}
                  className="text-xl"
                />
                <h3 className="font-semibold text-lg">
                  Fishing Safety: {safety.rating}
                </h3>
              </div>
              <div
                className="text-sm opacity-75 mb-2"
                id={`${cardId}-safety-source`}
              >
                Data source:{" "}
                {forecast.weather.source === "NWS"
                  ? "National Weather Service"
                  : "Open-Meteo"}
                {forecast.weather.barometricTrend !== "STEADY" && (
                  <span className="ml-2">
                    | Pressure: {forecast.weather.barometricTrend.toLowerCase()}
                  </span>
                )}
              </div>
              {safety.riskFactors.length > 0 && (
                <div className="mb-3" id={`${cardId}-safety-risks`}>
                  <h4 className="font-medium mb-1">Risk Factors:</h4>
                  <ul className="text-sm space-y-1">
                    {safety.riskFactors.map((factor, index) => (
                      <li
                        className="flex items-center gap-2"
                        id={`${cardId}-safety-risk-${index}`}
                        key={index}
                      >
                        <Icon name="bullet" className="text-red-500" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {safety.recommendations.length > 0 && (
                <div id={`${cardId}-safety-recs`}>
                  <h4 className="font-medium mb-1">Recommendations:</h4>
                  <ul className="text-sm space-y-1">
                    {safety.recommendations.map((rec, index) => (
                      <li
                        className="flex items-center gap-2"
                        id={`${cardId}-safety-rec-${index}`}
                        key={index}
                      >
                        <Icon name="bullet" className="text-blue-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {hasMarineDisplayData(forecast.weather.marine) && (
          <div
            className="forecast-card__section forecast-card__section--divider"
            id={`${cardId}-marine`}
          >
            <MarineConditions
              marine={forecast.weather.marine!}
              dateIso={forecast.date}
              useMph={useMph}
            />
          </div>
        )}

        {forecast.weather.source === "NWS" && (
          <div
            className="forecast-card__section forecast-card__section--divider"
            id={`${cardId}-nws`}
          >
            <WeatherDebugInfo weather={forecast.weather} className="mb-4" />
            <WeatherAlerts weather={forecast.weather} className="mb-4" />
          </div>
        )}
      </div>
    </div>
  );
}
