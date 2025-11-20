import { useEffect, useMemo, useState } from "react";
import type {
  WeatherOutlookDay,
  WeatherOutlookResult,
} from "../lib/weatherOutlookTypes";
import { fetchWeatherOutlook } from "../lib/weatherOutlook";

interface WeatherOutlookPanelProps {
  lat: number;
  lon: number;
  locationLabel?: string;
}

type FetchStatus = "idle" | "loading" | "ready" | "error";

export default function WeatherOutlookPanel({
  lat,
  lon,
  locationLabel,
}: WeatherOutlookPanelProps) {
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [outlook, setOutlook] = useState<WeatherOutlookResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [useFahrenheit, setUseFahrenheit] = useState(true);
  const [useMph, setUseMph] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setErrorMessage(null);

    fetchWeatherOutlook(lat, lon, { signal: controller.signal })
      .then((result) => {
        setOutlook(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load outlook"
        );
        setOutlook(null);
        setStatus("error");
      });

    return () => controller.abort();
  }, [lat, lon, refreshCounter]);

  const issuedDisplay = useMemo(() => {
    if (!outlook?.issuedAt) {
      return "Pending issuance";
    }
    const issuedDate = new Date(outlook.issuedAt);
    if (Number.isNaN(issuedDate.getTime())) {
      return outlook.issuedAt;
    }
    return issuedDate.toLocaleString();
  }, [outlook]);

  const coordinateLabel = useMemo(() => {
    const coordText = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    return locationLabel
      ? `${locationLabel} | ${coordText}`
      : `Lat/Lon | ${coordText}`;
  }, [lat, lon, locationLabel]);

  const attributionDetails = useMemo(() => {
    if (!outlook) {
      return {
        sourceLine: "Awaiting data source",
        officeLine: null as string | null,
      };
    }

    let officeLine: string | null = null;

    if (outlook.source === "NWS" && outlook.office) {
      const officeName = outlook.office.name?.trim();
      const officeLocation = [outlook.office.city, outlook.office.state]
        .filter(Boolean)
        .join(", ");
      const officeId = outlook.office.id?.toUpperCase();

      const detailSegments = Array.from(
        new Set(
          [officeName, officeLocation].filter((segment): segment is string =>
            Boolean(segment)
          )
        )
      );

      if (officeId) {
        detailSegments.push(`Office ${officeId}`);
      }

      if (detailSegments.length > 0) {
        officeLine = `Forecast Office: ${detailSegments.join(" | ")}`;
      }
    }

    return {
      sourceLine: outlook.attribution,
      officeLine,
    };
  }, [outlook]);

  const handleRetry = () => {
    setRefreshCounter((value) => value + 1);
  };

  const convertTemperature = (celsius: number | null): number | null => {
    if (celsius === null) {
      return null;
    }

    return useFahrenheit ? (celsius * 9) / 5 + 32 : celsius;
  };

  const convertSpeed = (kph: number | null): number | null => {
    if (kph === null) {
      return null;
    }
    return useMph ? kph / 1.60934 : kph;
  };

  const renderTemperature = (value: number | null): string => {
    if (value === null) {
      return "—";
    }
    const converted = convertTemperature(value);
    if (converted === null) {
      return "—";
    }
    return `${Math.round(converted)}°${useFahrenheit ? "F" : "C"}`;
  };

  const renderSpeed = (value: number | null): string => {
    if (value === null) {
      return "—";
    }
    const converted = convertSpeed(value);
    if (converted === null) {
      return "—";
    }
    return `${Math.round(converted)} ${useMph ? "mph" : "kph"}`;
  };

  const renderPrecipProbability = (value: number | null): string => {
    if (value === null) {
      return "—";
    }
    return `${Math.round(value)}%`;
  };

  const renderPrecipAmount = (value: number | null): string => {
    if (value === null) {
      return "—";
    }
    if (value === 0) {
      return "0 mm";
    }
    return `${value.toFixed(1)} mm`;
  };

  const renderWindSummary = (day: WeatherOutlookDay) => {
    const speedText = renderSpeed(day.windSpeedKph);
    const gustText =
      day.windGustKph !== null ? renderSpeed(day.windGustKph) : null;
    const directionText = day.windDirection ? ` ${day.windDirection}` : "";

    if (gustText) {
      return `${directionText.trim()} ${speedText} (gusts ${gustText})`.trim();
    }

    return `${directionText.trim()} ${speedText}`.trim();
  };

  const renderOutlookBody = () => {
    if (status === "loading") {
      return (
        <div
          className="flex flex-col items-center gap-3 py-8"
          id="wx-outlook-loading"
        >
          <div className="spinner" id="wx-outlook-spinner"></div>
          <p className="text-sm text-muted" id="wx-outlook-loading-copy">
            Ingesting forecast guidance…
          </p>
        </div>
      );
    }

    if (status === "error" && errorMessage) {
      return (
        <div
          className="flex flex-col items-center gap-4 py-6"
          id="wx-outlook-error"
        >
          <p
            className="text-sm text-error text-center"
            id="wx-outlook-error-message"
          >
            {errorMessage}
          </p>
          <button
            className="btn btn-primary"
            id="wx-outlook-retry"
            onClick={handleRetry}
          >
            Retry Fetch
          </button>
        </div>
      );
    }

    if (!outlook || outlook.days.length === 0) {
      return (
        <div
          className="flex flex-col items-center gap-2 py-6"
          id="wx-outlook-empty"
        >
          <p
            className="text-sm text-muted text-center"
            id="wx-outlook-empty-copy"
          >
            Outlook data not available for these coordinates.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-5" id="wx-outlook-grid">
        {outlook.days.map((day) => (
          <div
            key={day.date}
            className="wx-outlook-day-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            id={`wx-outlook-day-${day.date}`}
          >
            <div
              className="flex flex-col gap-1"
              id={`wx-outlook-day-info-${day.date}`}
            >
              <div
                className="text-sm font-semibold text-primary"
                id={`wx-outlook-day-label-${day.date}`}
              >
                {day.label}
              </div>
              <p
                className="text-xs text-gray-500 leading-snug"
                id={`wx-outlook-day-narrative-${day.date}`}
              >
                {day.narrative}
              </p>
            </div>
            <div
              className="wx-outlook-day-metrics flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6"
              id={`wx-outlook-day-metrics-${day.date}`}
            >
              <div
                className="flex items-baseline gap-2"
                id={`wx-outlook-day-temps-${day.date}`}
              >
                <span
                  className="text-lg font-semibold text-gray-900"
                  id={`wx-outlook-day-high-${day.date}`}
                >
                  {renderTemperature(day.tempMaxC)}
                </span>
                <span
                  className="text-sm text-muted"
                  id={`wx-outlook-day-low-${day.date}`}
                >
                  {renderTemperature(day.tempMinC)}
                </span>
              </div>
              <div
                className="text-xs text-gray-600"
                id={`wx-outlook-day-precip-${day.date}`}
              >
                Chance: {renderPrecipProbability(day.precipProbabilityPct)} |
                Total: {renderPrecipAmount(day.precipMm)}
              </div>
              <div
                className="text-xs text-gray-600"
                id={`wx-outlook-day-wind-${day.date}`}
              >
                Wind: {renderWindSummary(day)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card p-6" id="wx-outlook-card">
      <div className="wx-outlook-header" id="wx-outlook-header">
        <div className="wx-outlook-heading" id="wx-outlook-heading">
          <h2
            className="text-xl sm:text-2xl font-semibold text-primary"
            id="wx-outlook-title"
          >
            5-Day Weather Outlook
          </h2>
          <p
            className="text-sm text-muted font-mono"
            id="wx-outlook-coordinates"
          >
            {coordinateLabel}
          </p>
        </div>

        <div
          className="wx-outlook-controls text-xs"
          id="wx-outlook-controls"
        >
          <div
            className="wx-outlook-toggles"
            id="wx-outlook-toggles"
          >
            <div className="wx-outlook-toggle-row" id="wx-outlook-temp-toggle">
              <span className="text-xs text-muted mr-2">Temp:</span>
              <button
                className={`btn btn-sm ${
                  useFahrenheit ? "btn-secondary" : "btn-primary"
                }`}
                id="wx-outlook-temp-c-toggle"
                onClick={() => setUseFahrenheit(false)}
              >
                °C
              </button>
              <button
                className={`btn btn-sm ${
                  useFahrenheit ? "btn-primary" : "btn-secondary"
                }`}
                id="wx-outlook-temp-f-toggle"
                onClick={() => setUseFahrenheit(true)}
              >
                °F
              </button>
            </div>
            <div className="wx-outlook-toggle-row" id="wx-outlook-wind-toggle">
              <span className="text-xs text-muted mr-2">Wind:</span>
              <button
                className={`btn btn-sm ${
                  useMph ? "btn-secondary" : "btn-primary"
                }`}
                id="wx-outlook-wind-kph-toggle"
                onClick={() => setUseMph(false)}
              >
                km/h
              </button>
              <button
                className={`btn btn-sm ${
                  useMph ? "btn-primary" : "btn-secondary"
                }`}
                id="wx-outlook-wind-mph-toggle"
                onClick={() => setUseMph(true)}
              >
                mph
              </button>
            </div>
          </div>
        </div>

        <div
          className="wx-outlook-attribution text-xs text-muted"
          id="wx-outlook-attribution"
        >
          <p
            className="font-medium text-muted sm:text-right"
            id="wx-outlook-source"
          >
            {attributionDetails.sourceLine}
          </p>
          {attributionDetails.officeLine && (
            <p
              className="text-muted sm:text-right"
              id="wx-outlook-office"
            >
              {attributionDetails.officeLine}
            </p>
          )}
          <p className="text-muted sm:text-right" id="wx-outlook-issued">
            Issued: {issuedDisplay}
          </p>
        </div>
      </div>

      <div className="mt-6" id="wx-outlook-body">
        {renderOutlookBody()}
      </div>

      <div
        className="mt-4 p-3 text-xs bg-secondary/50 rounded-lg"
        id="wx-outlook-disclaimer"
      >
        <strong>Advisory:</strong> Forecasts auto-refresh with coordinate
        updates. For mission-critical planning, cross-check with official
        briefings.
      </div>
    </div>
  );
}
