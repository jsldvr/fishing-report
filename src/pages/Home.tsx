import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LocationInput from "../components/LocationInput";
import DateRangePicker from "../components/DateRangePicker";
import Icon from "../components/Icon";
import {
  addWaypoint,
  deleteWaypoint,
  loadMissionState,
  recordMissionRun,
  renameWaypoint,
  saveMissionState,
  type MissionDraft,
  type MissionRun,
  type MissionState,
  type Waypoint,
} from "../lib/missionStorage";

export default function Home() {
  const navigate = useNavigate();
  const [location, setLocation] = useState({
    lat: 40.7128,
    lon: -74.006,
    name: "",
  });
  const [dateRange, setDateRange] = useState({ startDate: "", days: 3 });
  const [missionState, setMissionState] = useState<MissionState>(() =>
    loadMissionState()
  );
  const [prefillToken, setPrefillToken] = useState(0);
  const [waypointNameDraft, setWaypointNameDraft] = useState("");
  const [waypointError, setWaypointError] = useState<string | null>(null);

  const recentHistory = useMemo(
    () => missionState.history.slice(0, 5),
    [missionState.history]
  );

  const updateMissionState = useCallback(
    (updater: (state: MissionState) => MissionState) => {
      setMissionState((previous) => updater(previous));
    },
    []
  );

  useEffect(() => {
    saveMissionState(missionState);
  }, [missionState]);

  const handleLocationChange = useCallback(
    (lat: number, lon: number, name?: string) => {
      setLocation({ lat, lon, name: name || "" });
      if (name) {
        setWaypointNameDraft(name);
      }
    },
    []
  );

  const handleDateRangeChange = useCallback(
    (startDate: string, days: number) => {
      setDateRange({ startDate, days });
    },
    []
  );

  const runMission = useCallback(
    (draft: MissionDraft) => {
      updateMissionState((current) => recordMissionRun(current, draft));

      const params = new URLSearchParams({
        lat: draft.lat.toString(),
        lon: draft.lon.toString(),
        startDate: draft.startDate,
        days: draft.days.toString(),
      });

      if (draft.name) {
        params.set("name", draft.name);
      }

      navigate(`/results?${params.toString()}`);
    },
    [navigate, updateMissionState]
  );

  const handleGenerateForecast = () => {
    runMission({
      lat: location.lat,
      lon: location.lon,
      name: location.name || waypointNameDraft.trim() || undefined,
      startDate: dateRange.startDate,
      days: dateRange.days,
    });
  };

  const applyWaypoint = useCallback((waypoint: Waypoint) => {
    setLocation({
      lat: waypoint.lat,
      lon: waypoint.lon,
      name: waypoint.name,
    });
    setWaypointNameDraft(waypoint.name);
    setPrefillToken((previous) => previous + 1);
  }, []);

  const handleSaveWaypoint = useCallback(() => {
    setWaypointError(null);
    try {
      updateMissionState((current) =>
        addWaypoint(current, {
          name: waypointNameDraft,
          lat: location.lat,
          lon: location.lon,
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save waypoint";
      setWaypointError(message);
    }
  }, [location.lat, location.lon, updateMissionState, waypointNameDraft]);

  const handleRenameWaypoint = useCallback(
    (waypoint: Waypoint) => {
      const nextName = window.prompt("Rename waypoint", waypoint.name);
      if (!nextName || nextName.trim() === waypoint.name) {
        return;
      }

      setWaypointError(null);
      try {
        updateMissionState((current) =>
          renameWaypoint(current, waypoint.id, nextName)
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to rename waypoint";
        setWaypointError(message);
      }
    },
    [updateMissionState]
  );

  const handleDeleteWaypoint = useCallback(
    (waypoint: Waypoint) => {
      const confirmed = window.confirm(
        `Delete waypoint "${waypoint.name}"? This cannot be undone.`
      );
      if (!confirmed) {
        return;
      }

      updateMissionState((current) => deleteWaypoint(current, waypoint.id));
    },
    [updateMissionState]
  );

  const handleRunWaypoint = useCallback(
    (waypoint: Waypoint) => {
      runMission({
        lat: waypoint.lat,
        lon: waypoint.lon,
        name: waypoint.name,
        startDate: dateRange.startDate,
        days: dateRange.days,
      });
    },
    [dateRange.days, dateRange.startDate, runMission]
  );

  const handleRunHistory = useCallback(
    (historyItem: MissionRun) => {
      runMission({
        lat: historyItem.lat,
        lon: historyItem.lon,
        name: historyItem.name,
        startDate: historyItem.startDate,
        days: historyItem.days,
      });
    },
    [runMission]
  );

  const formatHistoryTimestamp = (iso: string) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const hasWaypointName = waypointNameDraft.trim().length > 0;

  const hasLocationCoordinates =
    Number.isFinite(location.lat) && Number.isFinite(location.lon);

  const isValid =
    hasLocationCoordinates && Boolean(dateRange.startDate) && dateRange.days > 0;

  const canSaveWaypoint = hasLocationCoordinates && hasWaypointName;

  const selectedLocationLabel =
    waypointNameDraft.trim() || location.name || `${location.lat}, ${location.lon}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card hero-panel mb-6">
        <h1 className="hero-title mb-2">Fishing Report</h1>
        <p className="hero-tagline mb-6">
          Plan around verified weather, water, and solunar conditions.
        </p>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <LocationInput
            onLocationChange={handleLocationChange}
            initialLat={location.lat}
            initialLon={location.lon}
            initialName={location.name}
            prefillToken={prefillToken}
          />

          <DateRangePicker
            onDateRangeChange={handleDateRangeChange}
            maxDays={7}
          />
        </div>

        <div className="text-center">
          <button
            className="btn btn-primary btn-lg"
            id="generate-forecast-button"
            onClick={handleGenerateForecast}
            disabled={!isValid}
          >
            <Icon name="fish" className="mr-2" />
            Get fishing outlook
          </button>

          {!isValid && (
            <p className="text-sm text-muted mt-2">
              <Icon name="warning" className="mr-2" />
              Choose a location and forecast window to continue.
            </p>
          )}
        </div>
      </div>

      <div className="trust-strip mb-8" id="trust-strip">
        <span className="trust-strip__label">Sources checked:</span>
        <span className="trust-strip__sources">
          NWS &middot; Open-Meteo &middot; NOAA marine &middot; Alerts
        </span>
        <span className="trust-strip__note">
          Every forecast shows its data quality plainly — never a false
          100%. If weather can't be verified, we say so instead of guessing.
        </span>
      </div>

      <div className="card p-6 mb-8 mission-panel" id="mission-panel">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold mb-3 text-primary">
              <Icon name="mapPin" className="mr-2" />
              Saved spots
            </h2>
            <p className="text-sm text-secondary mb-3">
              Save the spots you fish often and jump straight to their
              outlook.
            </p>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="waypoint-name-input"
            >
              Spot name
            </label>
            <div className="flex gap-2 mb-2">
              <input
                className="input mission-panel__waypoint-input"
                id="waypoint-name-input"
                type="text"
                value={waypointNameDraft}
                onChange={(event) => setWaypointNameDraft(event.target.value)}
                placeholder="Spot name"
              />
              <button
                className="btn btn-primary mission-panel__save-waypoint-btn"
                id="save-waypoint-button"
                onClick={handleSaveWaypoint}
                disabled={!canSaveWaypoint}
              >
                Save
              </button>
            </div>
            <p className="text-xs text-muted mb-4">
              Selected location: {selectedLocationLabel}
            </p>
            {waypointError && (
              <p className="text-sm text-error mb-3">{waypointError}</p>
            )}

            {missionState.waypoints.length === 0 ? (
              <p className="text-sm text-muted">No saved spots yet.</p>
            ) : (
              <ul className="grid gap-2" id="waypoint-list">
                {missionState.waypoints.map((waypoint) => (
                  <li
                    className="bg-accent border border-primary rounded-lg p-3"
                    id={`waypoint-item-${waypoint.id}`}
                    key={waypoint.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{waypoint.name}</p>
                        <p className="text-xs text-muted">
                          {waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary mission-panel__waypoint-select-btn"
                          id={`waypoint-select-${waypoint.id}`}
                          onClick={() => applyWaypoint(waypoint)}
                        >
                          Select
                        </button>
                        <button
                          className="btn btn-primary mission-panel__waypoint-run-btn"
                          id={`waypoint-run-${waypoint.id}`}
                          onClick={() => handleRunWaypoint(waypoint)}
                        >
                          Run
                        </button>
                        <button
                          className="btn btn-secondary mission-panel__waypoint-rename-btn"
                          id={`waypoint-rename-${waypoint.id}`}
                          onClick={() => handleRenameWaypoint(waypoint)}
                        >
                          Rename
                        </button>
                        <button
                          className="btn btn-secondary mission-panel__waypoint-delete-btn"
                          id={`waypoint-delete-${waypoint.id}`}
                          onClick={() => handleDeleteWaypoint(waypoint)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 text-primary">
              <Icon name="book" className="mr-2" />
              Recent forecasts
            </h2>
            <p className="text-sm text-secondary mb-3">
              Your last 5 forecasts. Up to 10 are kept.
            </p>
            {recentHistory.length === 0 ? (
              <p className="text-sm text-muted">No recent forecasts yet.</p>
            ) : (
              <ul className="grid gap-2" id="mission-history-list">
                {recentHistory.map((historyItem) => (
                  <li
                    className="bg-accent border border-primary rounded-lg p-3"
                    id={`history-item-${historyItem.id}`}
                    key={historyItem.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {historyItem.name ||
                            `${historyItem.lat.toFixed(4)}, ${historyItem.lon.toFixed(4)}`}
                        </p>
                        <p className="text-xs text-muted">
                          {historyItem.startDate} for {historyItem.days} day
                          {historyItem.days === 1 ? "" : "s"} |{" "}
                          {formatHistoryTimestamp(historyItem.timestampIso)}
                        </p>
                      </div>
                      <button
                        className="btn btn-primary mission-panel__history-rerun-btn"
                        id={`history-rerun-${historyItem.id}`}
                        onClick={() => handleRunHistory(historyItem)}
                      >
                        Rerun
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">
            <Icon name="moon" className="text-3xl" />
          </div>
          <h3 className="font-semibold mb-2 text-primary">Moon phase</h3>
          <p className="text-sm text-secondary">
            Solunar theory: moon phase and illumination help predict when fish
            feed most actively.
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">
            <Icon name="storm" className="text-3xl" />
          </div>
          <h3 className="font-semibold mb-2 text-primary">
            Weather conditions
          </h3>
          <p className="text-sm text-secondary">
            Live temperature, wind, precipitation, and cloud cover from NWS
            and Open-Meteo.
          </p>
        </div>

        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">
            <Icon name="chart" className="text-3xl" />
          </div>
          <h3 className="font-semibold mb-2 text-primary">
            Combined outlook
          </h3>
          <p className="text-sm text-secondary">
            Moon and weather combined into one score, with data quality shown
            plainly.
          </p>
        </div>
      </div>
    </div>
  );
}
