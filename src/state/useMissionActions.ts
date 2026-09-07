import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  addWaypoint,
  deleteWaypoint as deleteWaypointRecord,
  recordMissionRun,
  renameWaypoint as renameWaypointRecord,
  type MissionDraft,
  type MissionRun,
  type Waypoint,
} from "../lib/missionStorage";
import { useMissionContext, type ForecastDraft } from "./missionContext";

interface UseMissionActionsOptions {
  /** Called after a successful Select, Run, or Rerun navigation. */
  onClose?: () => void;
}

/** Builds the existing Results query string; shared so no route logic is duplicated. */
export function buildResultsQuery(run: MissionDraft): string {
  const params = new URLSearchParams({
    lat: run.lat.toString(),
    lon: run.lon.toString(),
    startDate: run.startDate,
    days: run.days.toString(),
  });
  if (run.name) {
    params.set("name", run.name);
  }
  return params.toString();
}

function draftToRun(draft: ForecastDraft, waypointNameDraft: string): MissionDraft {
  return {
    lat: draft.lat,
    lon: draft.lon,
    // Mirror the inline Home panel: the location name wins, then the saved-spot
    // name field, then no name.
    name: draft.name.trim() || waypointNameDraft.trim() || undefined,
    startDate: draft.startDate,
    days: draft.days,
  };
}

/**
 * Centralizes every mission action so Home and the drawer share one code path
 * for recording history and navigating (requirement 16, no duplicated logic).
 */
export function useMissionActions(options: UseMissionActionsOptions = {}) {
  const { onClose } = options;
  const {
    draft,
    waypointNameDraft,
    setWaypointNameDraft,
    updateMissionState,
    applyDraft,
  } = useMissionContext();
  const navigate = useNavigate();

  const recordAndOpenResults = useCallback(
    (run: MissionDraft) => {
      updateMissionState((current) => recordMissionRun(current, run));
      navigate(`/results?${buildResultsQuery(run)}`);
      onClose?.();
    },
    [navigate, onClose, updateMissionState]
  );

  const runDraft = useCallback(() => {
    recordAndOpenResults(draftToRun(draft, waypointNameDraft));
  }, [draft, waypointNameDraft, recordAndOpenResults]);

  const runWaypoint = useCallback(
    (waypoint: Waypoint) => {
      recordAndOpenResults({
        lat: waypoint.lat,
        lon: waypoint.lon,
        name: waypoint.name,
        startDate: draft.startDate,
        days: draft.days,
      });
    },
    [draft.startDate, draft.days, recordAndOpenResults]
  );

  const rerunHistory = useCallback(
    (run: MissionRun) => {
      recordAndOpenResults({
        lat: run.lat,
        lon: run.lon,
        name: run.name,
        startDate: run.startDate,
        days: run.days,
      });
    },
    [recordAndOpenResults]
  );

  const selectWaypoint = useCallback(
    (waypoint: Waypoint) => {
      applyDraft(
        { lat: waypoint.lat, lon: waypoint.lon, name: waypoint.name },
        { prefill: true }
      );
      setWaypointNameDraft(waypoint.name);
      navigate("/");
      onClose?.();
    },
    [applyDraft, navigate, onClose, setWaypointNameDraft]
  );

  const saveWaypoint = useCallback(
    (name: string) => {
      updateMissionState((current) =>
        addWaypoint(current, { name, lat: draft.lat, lon: draft.lon })
      );
    },
    [draft.lat, draft.lon, updateMissionState]
  );

  const renameWaypoint = useCallback(
    (id: string, nextName: string) => {
      updateMissionState((current) =>
        renameWaypointRecord(current, id, nextName)
      );
    },
    [updateMissionState]
  );

  const deleteWaypoint = useCallback(
    (id: string) => {
      updateMissionState((current) => deleteWaypointRecord(current, id));
    },
    [updateMissionState]
  );

  return {
    runDraft,
    runWaypoint,
    rerunHistory,
    selectWaypoint,
    saveWaypoint,
    renameWaypoint,
    deleteWaypoint,
  };
}
