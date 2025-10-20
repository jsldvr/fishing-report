import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { ForecastScore, DayInputs } from "../types/forecast";
import { fetchEnhancedWeather } from "../lib/enhancedWeather";
import { forecastForDay } from "../lib/forecast";
import {
  addDaysToDate,
  validateNorthAmericaCoords,
  getAstronomicalTimes,
  getSolunarTimes,
  getTimezoneFromCoords,
} from "../lib/time";
import ScoreCard from "../components/ScoreCard";

export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [forecasts, setForecasts] = useState<ForecastScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFahrenheit, setUseFahrenheit] = useState(true);
  const [useMph, setUseMph] = useState(true);

  // Parse URL parameters
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lon = parseFloat(searchParams.get("lon") || "0");
  const startDate = searchParams.get("startDate") || "";
  const days = parseInt(searchParams.get("days") || "0", 10);
  const locationName = searchParams.get("name") || "";

  useEffect(() => {
    // Validate parameters
    if (!lat || !lon || !startDate || !days) {
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
  }, [lat, lon, startDate, days]);

  const generateForecasts = async () => {
    setIsLoading(true);
    setError(null);

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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate forecast"
      );
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div
            className="spinner mx-auto mb-4"
            style={{ width: "40px", height: "40px" }}
          ></div>
          <h2 className="text-xl font-semibold mb-2">Generating Forecast...</h2>
          <p className="text-gray-600">
            Fetching weather data and calculating bite scores
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button className="btn btn-primary" onClick={handleBackToHome}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex mb-6 results-header" id="results-header">
        <div className="results-header-title" id="results-header-title">
          <h1 className="text-2xl font-bold text-gray-900">Fishing Forecast</h1>
          <p className="text-gray-600">
            {locationName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
          </p>
        </div>

        <div
          className="flex gap-4 results-header-controls"
          id="results-header-controls"
        >
          {/* Unit toggles */}
          <div
            className="flex items-center gap-2 results-unit-group"
            id="temperature-unit-group"
          >
            <button
              className={`btn ${
                !useFahrenheit ? "btn-primary" : "btn-secondary"
              }`}
              id="unit-toggle-celsius"
              onClick={() => setUseFahrenheit(false)}
            >
              °C
            </button>
            <button
              className={`btn ${
                useFahrenheit ? "btn-primary" : "btn-secondary"
              }`}
              id="unit-toggle-fahrenheit"
              onClick={() => setUseFahrenheit(true)}
            >
              °F
            </button>
          </div>

          <div
            className="flex items-center gap-2 results-unit-group"
            id="wind-unit-group"
          >
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

          <button
            className="btn btn-primary"
            id="action-new-forecast"
            onClick={handleBackToHome}
          >
            New Forecast
          </button>
        </div>
      </div>

      {/* Summary */}
      {forecasts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Overall Outlook</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {averageScore}
            </div>
            <p className="text-sm text-gray-600">Average bite score</p>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-2">Best Day</h3>
            <div className="text-lg font-medium mb-1">
              {new Date(bestDay.date + "T12:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                }
              )}
            </div>
            <div className="text-2xl font-bold text-green-600">
              {bestDay.biteScore0100}
            </div>
          </div>
        </div>
      )}

      {/* Daily Forecasts */}
      <div className="grid gap-6 lg:grid-cols-2">
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

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Data sources: Open-Meteo weather API, astronomical calculations for
          lunar phase
        </p>
        <p className="mt-1">
          Forecasts are for entertainment purposes and should not be the sole
          factor in fishing decisions
        </p>
      </div>
    </div>
  );
}
