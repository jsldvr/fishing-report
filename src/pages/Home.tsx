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
    <div className="home-page max-w-7xl mx-auto px-4 py-8" id="home-page">
      <section className="home-planner-strip" id="home-planner-strip">
        <div className="home-planner-strip__controls" id="home-planner-controls">
          <LocationInput
            onLocationChange={handleLocationChange}
            initialLat={location.lat}
            initialLon={location.lon}
            initialName={location.name}
            prefillToken={prefillToken}
            embedded
          />

          <DateRangePicker
            onDateRangeChange={handleDateRangeChange}
            maxDays={7}
            embedded
          />
        </div>

        <div className="home-planner-strip__actions" id="home-planner-actions">
          <button
            className="btn btn-primary home-planner-strip__cta"
            id="action-generate-forecast"
            onClick={handleGenerateForecast}
            disabled={!isValid}
          >
            <Icon name="target" className="mr-2" />
            Generate Forecast
          </button>

          {!isValid && (
            <p className="text-sm text-muted" id="home-planner-validation-message">
              <Icon name="warning" className="mr-2" />
              Add a valid location and date window to continue.
            </p>
          )}
        </div>
      </section>

      <section className="home-support-row" id="home-support-row">
        <div className="home-support-row__panel" id="waypoints-panel">
          <h2 className="text-lg font-semibold mb-3 text-primary">
            <Icon name="mapPin" className="mr-2" />
            Saved Waypoints
          </h2>
          <p className="text-sm text-secondary mb-3">
            Save frequent locations and run a report with one click.
          </p>
          <label
            className="block text-sm font-medium mb-2"
            htmlFor="waypoint-name-input"
          >
            Waypoint name
          </label>
          <div className="flex gap-2 mb-2">
            <input
              className="input mission-panel__waypoint-input"
              id="waypoint-name-input"
              type="text"
              value={waypointNameDraft}
              onChange={(event) => setWaypointNameDraft(event.target.value)}
              placeholder="Waypoint name"
            />
            <button
              className="btn btn-secondary mission-panel__save-waypoint-btn"
              id="save-waypoint-button"
              onClick={handleSaveWaypoint}
              disabled={!canSaveWaypoint}
            >
              Save
            </button>
          </div>
          <p className="text-xs text-muted mb-4">
            Current location: {selectedLocationLabel}
          </p>
          {waypointError && (
            <p className="text-sm text-error mb-3">{waypointError}</p>
          )}

          {missionState.waypoints.length === 0 ? (
            <p className="text-sm text-muted">No waypoints saved yet.</p>
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

        <div className="home-support-row__panel" id="history-panel">
          <h2 className="text-lg font-semibold mb-3 text-primary">
            <Icon name="book" className="mr-2" />
            Recent Forecasts
          </h2>
          <p className="text-sm text-secondary mb-3">
            Latest 5 runs shown. Full history keeps up to 10 reports.
          </p>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-muted">No recent forecasts yet.</p>
          ) : (
            <ul className="grid gap-2 list-none" id="mission-history-list">
              {recentHistory.map((historyItem) => (
                <li
                  className="border border-primary rounded-lg p-3"
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
                      className="btn btn-secondary mission-panel__history-rerun-btn"
                      id={`history-rerun-${historyItem.id}`}
                      onClick={() => handleRunHistory(historyItem)}
                    >
                      Run again
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="home-notes-row" id="home-notes-row">
        <div className="home-note" id="home-note-lunar">
          <h3 className="font-semibold mb-2 text-primary">Lunar conditions</h3>
          <p className="text-sm text-secondary">
            Moon phase and illumination are included in each day score.
          </p>
        </div>

        <div className="home-note" id="home-note-weather">
          <h3 className="font-semibold mb-2 text-primary">Weather signals</h3>
          <p className="text-sm text-secondary">
            Temperature, wind, precipitation, and cloud data are weighted into
            the forecast.
          </p>
        </div>

        <div className="home-note" id="home-note-source">
          <h3 className="font-semibold mb-2 text-primary">Source quality</h3>
          <p className="text-sm text-secondary">
            Reliability indicators help explain data freshness and confidence.
          </p>
        </div>
      </section>
    </div>
  );
}
