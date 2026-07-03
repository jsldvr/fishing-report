import type {
  ForecastReliability,
  ForecastScore,
  SafetyAssessment,
} from "../types/forecast";
import { formatLocalDate, getTimezoneFromCoords } from "../lib/time";
import WeatherAlerts from "./WeatherAlerts";
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
  const precipMm = forecast.weather.precipMm;
  const precipIn =
    precipMm !== undefined
      ? Math.round((precipMm / 25.4) * 100) / 100
      : undefined;
  const precipProbabilityPct = forecast.weather.precipProbabilityPct;
  const pressureInHg = forecast.weather.pressureHpa
    ? Math.round((forecast.weather.pressureHpa * 0.02953) * 100) / 100
    : undefined;
  const safety = forecast.weather.safety;
  const cardId = `forecast-card-${forecast.date.replace(/[^0-9A-Za-z]/g, "")}`;
  const hasWeatherAlerts = forecast.weather.safety.activeAlerts.length > 0;
  const reliability = forecast.weather.reliability;

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

  const getConfidenceStyles = (
    level: ForecastReliability["confidenceLevel"] | undefined
  ) => {
    switch (level) {
      case "HIGH":
        return "bg-green-100 text-green-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatIsoForDisplay = (iso: string | undefined) => {
    if (!iso) {
      return "Unknown";
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }
    return parsed.toLocaleString();
  };

  const formatRelativeAge = (iso: string | undefined) => {
    if (!iso) {
      return "Unknown";
    }

    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    const diffMs = Date.now() - parsed.getTime();
    const isFuture = diffMs < 0;
    const absMs = Math.abs(diffMs);
    const minutes = Math.floor(absMs / 60000);
    const hours = Math.floor(absMs / 3600000);
    const days = Math.floor(absMs / 86400000);

    if (minutes < 1) {
      return isFuture ? "in less than a minute" : "just now";
    }

    if (minutes < 60) {
      return isFuture
        ? `in ${minutes} min`
        : `${minutes} min ago`;
    }

    if (hours < 24) {
      return isFuture ? `in ${hours} hr` : `${hours} hr ago`;
    }

    return isFuture ? `in ${days} day${days === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const formatLastUpdated = (iso: string | undefined) => {
    if (!iso) {
      return "Unknown";
    }
    return `${formatRelativeAge(iso)} @ ${formatIsoForDisplay(iso)}`;
  };

  const getOutlookLabel = (score: number) => {
    if (score >= 75) return "Good";
    if (score >= 50) return "Fair";
    return "Slow";
  };

  const getSafetyLabel = (rating: SafetyAssessment["rating"]) => {
    switch (rating) {
      case "EXCELLENT":
      case "GOOD":
        return "Good";
      case "FAIR":
        return "Fair";
      case "POOR":
        return "Poor";
      case "DANGEROUS":
        return "Dangerous";
      default:
        return "Unknown";
    }
  };

  const buildWhySummary = () => {
    const parts: string[] = [];
    const wind = forecast.weather.windKph;
    if (Number.isFinite(wind)) {
      if (wind <= 18) parts.push("light wind");
      else if (wind <= 30) parts.push("moderate wind");
      else parts.push("strong wind");
    }
    if (forecast.weather.barometricTrend === "STEADY") {
      parts.push("stable pressure");
    } else {
      parts.push(`${forecast.weather.barometricTrend.toLowerCase()} pressure`);
    }
    if (forecast.solunar && forecast.solunar.dayRating >= 2) {
      parts.push("solunar window");
    } else {
      parts.push(`${forecast.moon.phaseName.toLowerCase()}`);
    }
    return parts.join(", ");
  };

  const buildDataQualitySummary = () => {
    if (!reliability) {
      return "Unknown";
    }
    const sources: string[] = [];
    if (forecast.weather.source === "NWS") sources.push("NWS");
    if (forecast.weather.source === "OPEN_METEO") sources.push("Open-Meteo");
    if (reliability.marineStatus === "AVAILABLE") sources.push("NOAA marine");
    const sourceText = sources.length > 0 ? ` — ${sources.join(" + ")} checked` : "";
    return `${reliability.confidenceLevel}${sourceText}`;
  };

  const bestWindow =
    forecast.solunar && forecast.solunar.majorPeriods.length > 0
      ? `${forecast.solunar.majorPeriods[0].start} - ${forecast.solunar.majorPeriods[0].end}`
      : undefined;

  if (forecast.forecastStatus === "WEATHER_UNAVAILABLE") {
    return (
      <div
        className="card forecast-card"
        id={cardId}
        data-testid="score-card-unavailable"
      >
        <div className="forecast-card__header" id={`${cardId}-header`}>
          <div className="forecast-card__title" id={`${cardId}-title`}>
            <h3 className="text-xl font-semibold forecast-card__heading">
              {new Date(forecast.date + "T12:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                }
              )}
            </h3>
            <p
              className="text-sm forecast-card__subtext"
              id={`${cardId}-local-time`}
              title={`UTC: ${dateInfo.utc}`}
            >
              {dateInfo.local}
            </p>
          </div>
        </div>
        <div
          className="forecast-card__section rounded-lg border-2 bg-red-50 border-red-200 p-4"
          id={`${cardId}-unavailable`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="warning" className="text-xl" />
            <h3 className="font-semibold text-lg">Forecast unavailable</h3>
          </div>
          <div className="text-sm space-y-1">
            <p>Safety: Unknown</p>
            <p>
              Reason:{" "}
              {forecast.unavailableReason ||
                "Current weather could not be verified"}
            </p>
            <p className="font-medium">
              Action: Check official weather before fishing.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          {reliability && (
            <div
              className="forecast-card__badges mt-2"
              id={`${cardId}-reliability-badges`}
            >
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${getConfidenceStyles(
                  reliability.confidenceLevel
                )}`}
                id={`${cardId}-confidence-level`}
              >
                Data quality: {reliability.confidenceLevel}
              </span>
              <span
                className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                id={`${cardId}-confidence-score`}
              >
                Data quality score {reliability.confidenceScore}/100
              </span>
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
            <span className="forecast-card__score-value">
              {forecast.biteScore0100}
            </span>
          </div>
          <p
            className="text-xs forecast-card__score-label"
            id={`${cardId}-score-label`}
          >
            Bite Score
          </p>
        </div>
      </div>

      <div
        className="forecast-card__section forecast-card__summary"
        id={`${cardId}-summary`}
        data-testid="score-card-summary"
      >
        <p className="forecast-card__summary-heading">Today's outlook</p>
        <div className="forecast-card__summary-row">
          <span className="forecast-card__summary-label">Fishing</span>
          <span className="forecast-card__summary-value">
            {getOutlookLabel(forecast.biteScore0100)}
          </span>
        </div>
        <div className="forecast-card__summary-row">
          <span className="forecast-card__summary-label">Safety</span>
          <span className="forecast-card__summary-value">
            {getSafetyLabel(safety.rating)}
          </span>
        </div>
        {bestWindow && (
          <div className="forecast-card__summary-row">
            <span className="forecast-card__summary-label">Best window</span>
            <span className="forecast-card__summary-value">{bestWindow}</span>
          </div>
        )}
        <div className="forecast-card__summary-row">
          <span className="forecast-card__summary-label">Data quality</span>
          <span className="forecast-card__summary-value">
            {buildDataQualitySummary()}
          </span>
        </div>
        <p className="forecast-card__summary-why">Why: {buildWhySummary()}</p>
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
            {precipProbabilityPct !== undefined && (
              <p>Chance of rain: {Math.round(precipProbabilityPct)}%</p>
            )}
            {precipMm !== undefined ? (
              <p>
                Rain amount: {useFahrenheit ? `${precipIn} in` : `${precipMm} mm`}
              </p>
            ) : (
              <p>Rain amount unavailable</p>
            )}
            <p>Clouds: {forecast.weather.cloudPct}%</p>
            {forecast.weather.pressureHpa &&
              (useFahrenheit ? (
                <p>Pressure: {pressureInHg} inHg</p>
              ) : (
                <p>Pressure: {forecast.weather.pressureHpa} hPa</p>
              ))}
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
              className={`forecast-card__safety-panel rounded-lg border-2 ${getSafetyStyles(
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
              {reliability && (
                <div
                  className="forecast-card__reliability"
                  id={`${cardId}-reliability`}
                >
                  <p
                    className="forecast-card__reliability-item"
                    id={`${cardId}-reliability-generated`}
                  >
                    Forecast generated:{" "}
                    {formatLastUpdated(reliability.forecastGeneratedIso)}
                  </p>
                  <p
                    className="forecast-card__reliability-item"
                    id={`${cardId}-reliability-weather`}
                  >
                    Weather source updated:{" "}
                    {formatLastUpdated(reliability.weatherLastUpdatedIso)}
                  </p>
                  {reliability.marineStatus !== "NOT_APPLICABLE" && (
                    <p
                      className="forecast-card__reliability-item"
                      id={`${cardId}-reliability-marine`}
                    >
                      {reliability.marineStatus === "AVAILABLE"
                        ? `Marine observation updated: ${formatLastUpdated(
                            reliability.marineLastUpdatedIso
                          )}`
                        : `Marine status: ${reliability.marineStatus} | Observation updated: ${formatLastUpdated(
                            reliability.marineLastUpdatedIso
                          )}`}
                    </p>
                  )}
                </div>
              )}
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

        {forecast.weather.source === "NWS" && hasWeatherAlerts && (
          <div
            className="forecast-card__section forecast-card__section--divider"
            id={`${cardId}-nws`}
          >
            <WeatherAlerts weather={forecast.weather} className="mb-4" />
          </div>
        )}
      </div>
    </div>
  );
}
