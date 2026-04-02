import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { ForecastScore, DayInputs } from "../types/forecast";
import { fetchEnhancedWeather } from "../lib/enhancedWeather";
import { forecastForDay } from "../lib/forecast";
import {
  buildForecastCacheKey,
  getOfflineForecastCache,
  isCacheStale,
  saveOfflineForecastCache,
} from "../lib/offlineForecastCache";
import {
  addDaysToDate,
  validateNorthAmericaCoords,
  getAstronomicalTimes,
  getSolunarTimes,
  getTimezoneFromCoords,
} from "../lib/time";
import ScoreCard from "../components/ScoreCard";
import NWSOfficeInfo from "../components/NWSOfficeInfo";
import Icon from "../components/Icon";

export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [forecasts, setForecasts] = useState<ForecastScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFahrenheit, setUseFahrenheit] = useState(true);
  const [useMph, setUseMph] = useState(true);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [usedCachedData, setUsedCachedData] = useState(false);
  const [cachedLastUpdatedIso, setCachedLastUpdatedIso] = useState<
    string | null
  >(null);
  const [isCachedDataStale, setIsCachedDataStale] = useState(false);

  // Parse URL parameters
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");
  const lat = parseFloat(latParam ?? "NaN");
  const lon = parseFloat(lonParam ?? "NaN");
  const startDate = searchParams.get("startDate") || "";
  const daysParam = searchParams.get("days");
  const days = parseInt(daysParam || "0", 10);
  const locationName = searchParams.get("name") || "";
  const cacheKey = buildForecastCacheKey({
    lat,
    lon,
    startDate,
    days,
  });

  const formatCacheTimestamp = (iso: string | null) => {
    if (!iso) {
      return "Unknown";
    }

    const timestamp = new Date(iso);
    if (Number.isNaN(timestamp.getTime())) {
      return "Unknown";
    }

    const diffMs = Date.now() - timestamp.getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    const relative =
      minutes < 1
        ? "just now"
        : minutes < 60
        ? `${minutes} min ago`
        : `${Math.floor(minutes / 60)} hr ago`;

    return `${relative} @ ${timestamp.toLocaleString()}`;
  };

  const generateForecasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setUsedCachedData(false);
    setCachedLastUpdatedIso(null);
    setIsCachedDataStale(false);

    try {
      const results: ForecastScore[] = [];

      // Generate forecasts for each day
      for (let i = 0; i < days; i++) {
        const currentDate = addDaysToDate(startDate, i);
        const dayInputs: DayInputs = {
          date: currentDate,
          lat,
          lon,
        };

        // Fetch enhanced weather data
        const weatherData = await fetchEnhancedWeather(dayInputs);

        // Generate forecast (no almanac data for now)
        const forecast = forecastForDay(dayInputs, weatherData);

        // Add astronomical and solunar data
        const timezone = getTimezoneFromCoords(lat, lon);
        const astronomical = getAstronomicalTimes(
          currentDate,
          lat,
          lon,
          timezone
        );
        const solunar = getSolunarTimes(
          currentDate,
          lat,
          lon,
          forecast.moon.illumination,
          timezone
        );

        forecast.astronomical = astronomical;
        forecast.solunar = solunar;

        results.push(forecast);
      }

      setForecasts(results);
      saveOfflineForecastCache({
        cacheKey,
        lat,
        lon,
        startDate,
        days,
        locationName: locationName || undefined,
        forecasts: results,
      });
    } catch (err) {
      const cached = getOfflineForecastCache(cacheKey);
      if (cached && cached.forecasts.length > 0) {
        setForecasts(cached.forecasts);
        setUsedCachedData(true);
        setCachedLastUpdatedIso(cached.lastUpdatedIso);
        setIsCachedDataStale(isCacheStale(cached.lastUpdatedIso));
        setError(null);
      } else {
        const baseMessage =
          err instanceof Error ? err.message : "Failed to generate forecast";
        const offlineMessage = !navigator.onLine
          ? `${baseMessage}. You are offline and no cached forecast is available yet.`
          : baseMessage;
        setError(offlineMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, days, lat, locationName, lon, startDate]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Validate parameters
    if (!latParam || !lonParam || !startDate || !daysParam) {
      setError("Missing required parameters");
      setIsLoading(false);
      return;
    }

    if (!validateNorthAmericaCoords(lat, lon)) {
      setError("Location is outside North America");
      setIsLoading(false);
      return;
    }

    if (days < 1 || days > 7) {
      setError("Days must be between 1 and 7");
      setIsLoading(false);
      return;
    }

    generateForecasts();
  }, [lat, lon, latParam, lonParam, startDate, days, daysParam, generateForecasts]);

  const handleBackToHome = () => {
    navigate("/");
  };

  const averageScore =
    forecasts.length > 0
      ? Math.round(
          (forecasts.reduce((sum, f) => sum + f.biteScore0100, 0) /
            forecasts.length) *
            10
        ) / 10
      : 0;

  const bestDay = forecasts.reduce(
    (best, current) =>
      current.biteScore0100 > best.biteScore0100 ? current : best,
    forecasts[0]
  );

  const endDate = startDate && days > 0 ? addDaysToDate(startDate, days - 1) : "";

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div
            className="spinner mx-auto mb-4"
            style={{ width: "40px", height: "40px" }}
          ></div>
          <h2 className="text-xl font-semibold mb-2">Generating forecast...</h2>
          <p className="text-gray-600">
            Fetching weather and marine data, then calculating daily scores.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-4">
            <Icon name="warning" className="text-4xl" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">Unable to load forecast</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button className="btn btn-primary" id="action-back-home-error" onClick={handleBackToHome}>
            Back to Forecast
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page max-w-7xl mx-auto px-4 py-8" id="results-page">
      <section className="results-summary-band" id="results-summary-band">
        <div className="results-summary-band__identity" id="results-summary-identity">
          <h1 className="text-2xl font-bold text-gray-900" id="results-summary-title">
            Forecast Report
          </h1>
          <p className="text-gray-600" id="results-summary-location">
            {locationName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
          </p>
          <p className="text-sm text-secondary" id="results-summary-dates">
            {startDate} to {endDate}
          </p>
        </div>

        <div className="results-summary-band__metrics" id="results-summary-metrics">
          <div className="results-summary-band__metric" id="overall-outlook-card">
            <p className="text-sm text-secondary" id="overall-outlook-title">Average score</p>
            <p className="text-3xl font-bold text-primary" id="overall-outlook-score">{averageScore}</p>
          </div>
          <div className="results-summary-band__metric" id="best-day-card">
            <p className="text-sm text-secondary" id="best-day-title">Best day</p>
            <p className="text-base font-semibold" id="best-day-date">
              {new Date(bestDay.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xl font-bold text-primary" id="best-day-score">
              {bestDay.biteScore0100}
            </p>
          </div>
        </div>

        <div className="results-summary-band__status" id="results-summary-status">
          <p className="text-sm text-secondary" id="results-summary-online-state">
            {isOffline ? "Offline" : "Online"}
          </p>
          <p className="text-sm text-secondary" id="results-summary-cache-state">
            {usedCachedData ? "Using cached report data" : "Using latest available data"}
          </p>
          {usedCachedData && (
            <p className="text-xs text-secondary" id="results-summary-cache-updated">
              Last updated: {formatCacheTimestamp(cachedLastUpdatedIso)}
              {isCachedDataStale ? " (stale)" : ""}
            </p>
          )}
        </div>
      </section>

      <section className="results-workspace" id="results-workspace">
        <aside className="results-rail" id="results-controls-rail">
          <div className="results-rail__section" id="results-units-section">
            <h2 className="text-base font-semibold" id="results-units-title">Units</h2>
            <div className="results-rail__toggle-group" id="temperature-unit-group">
              <span className="text-xs text-secondary">Temperature</span>
              <div className="results-rail__toggle-row" id="temperature-unit-row">
                <button
                  className={`btn ${!useFahrenheit ? "btn-primary" : "btn-secondary"}`}
                  id="unit-toggle-celsius"
                  onClick={() => setUseFahrenheit(false)}
                >
                  deg C
                </button>
                <button
                  className={`btn ${useFahrenheit ? "btn-primary" : "btn-secondary"}`}
                  id="unit-toggle-fahrenheit"
                  onClick={() => setUseFahrenheit(true)}
                >
                  deg F
                </button>
              </div>
            </div>

            <div className="results-rail__toggle-group" id="wind-unit-group">
              <span className="text-xs text-secondary">Wind speed</span>
              <div className="results-rail__toggle-row" id="wind-unit-row">
                <button
                  className={`btn ${!useMph ? "btn-primary" : "btn-secondary"}`}
                  id="unit-toggle-kmh"
                  onClick={() => setUseMph(false)}
                >
                  km/h
                </button>
                <button
                  className={`btn ${useMph ? "btn-primary" : "btn-secondary"}`}
                  id="unit-toggle-mph"
                  onClick={() => setUseMph(true)}
                >
                  mph
                </button>
              </div>
            </div>
          </div>

          <div className="results-rail__section" id="results-actions-section">
            <button
              className="btn btn-primary results-rail__new-forecast-button"
              id="action-new-forecast"
              onClick={handleBackToHome}
            >
              New Forecast
            </button>
          </div>

          {forecasts.length > 0 &&
            forecasts[0]?.weather?.source === "NWS" &&
            forecasts[0]?.weather?.localOffice && (
              <div className="results-rail__section" id="nws-office-section">
                <NWSOfficeInfo
                  localOffice={forecasts[0].weather.localOffice}
                  className="results-rail__office"
                  id="nws-office-card"
                />
              </div>
            )}
        </aside>

        <div className="results-main" id="results-main-panel">
          <div className="results-main__explanation" id="results-score-explanation">
            <h2 className="text-lg font-semibold text-primary">Score interpretation</h2>
            <p className="text-sm text-secondary">
              Scores combine lunar, weather, and available marine indicators.
              Reliability notes describe confidence and data freshness.
            </p>
          </div>

          <div className="results-main__cards" id="results-forecast-cards">
            {forecasts.map((forecast) => (
              <ScoreCard
                key={forecast.date}
                forecast={forecast}
                lat={lat}
                lon={lon}
                useFahrenheit={useFahrenheit}
                useMph={useMph}
              />
            ))}
          </div>

          <div className="results-main__footer text-sm text-gray-500" id="results-data-sources">
            <p>
              Data sources: NWS grids and alerts, SPC outlooks, NOAA marine and tides,
              Open-Meteo fallback, and astronomical calculations.
            </p>
            <p className="mt-1">
              Use this report with official advisories when planning on-water activity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
