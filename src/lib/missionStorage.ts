export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface MissionRun {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  startDate: string;
  days: number;
  timestampIso: string;
}

export interface MissionState {
  schemaVersion: 1;
  waypoints: Waypoint[];
  history: MissionRun[];
}

export interface MissionDraft {
  lat: number;
  lon: number;
  name?: string;
  startDate: string;
  days: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = "fishing-report.mission-state.v1";
const HISTORY_LIMIT = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function getStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isValidWaypoint(value: unknown): value is Waypoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    isNonEmptyString(item.id) &&
    isNonEmptyString(item.name) &&
    isFiniteNumber(item.lat) &&
    isFiniteNumber(item.lon) &&
    isNonEmptyString(item.createdAtIso) &&
    isNonEmptyString(item.updatedAtIso)
  );
}

function isValidMissionRun(value: unknown): value is MissionRun {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;
  const hasOptionalName = item.name === undefined || typeof item.name === "string";

  return (
    isNonEmptyString(item.id) &&
    isFiniteNumber(item.lat) &&
    isFiniteNumber(item.lon) &&
    hasOptionalName &&
    isNonEmptyString(item.startDate) &&
    isFiniteNumber(item.days) &&
    isNonEmptyString(item.timestampIso)
  );
}

export function createDefaultMissionState(): MissionState {
  return {
    schemaVersion: 1,
    waypoints: [],
    history: [],
  };
}

export function loadMissionState(storage: StorageLike | null = getStorage()): MissionState {
  if (!storage) {
    return createDefaultMissionState();
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDefaultMissionState();
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.schemaVersion !== 1) {
      storage.removeItem(STORAGE_KEY);
      return createDefaultMissionState();
    }

    const waypoints = Array.isArray(parsed.waypoints)
      ? parsed.waypoints.filter((item) => isValidWaypoint(item))
      : [];
    const history = Array.isArray(parsed.history)
      ? parsed.history.filter((item) => isValidMissionRun(item))
      : [];

    return {
      schemaVersion: 1,
      waypoints,
      history,
    };
  } catch {
    storage.removeItem(STORAGE_KEY);
    return createDefaultMissionState();
  }
}

export function saveMissionState(
  state: MissionState,
  storage: StorageLike | null = getStorage()
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to persist mission state to storage:", error);
  }
}

export function hasDuplicateWaypointName(
  waypoints: Waypoint[],
  name: string,
  excludeId?: string
): boolean {
  const normalized = normalizeName(name).toLowerCase();
  return waypoints.some(
    (waypoint) =>
      waypoint.id !== excludeId &&
      waypoint.name.trim().toLowerCase() === normalized
  );
}

export function addWaypoint(
  state: MissionState,
  payload: Pick<Waypoint, "name" | "lat" | "lon">
): MissionState {
  const name = normalizeName(payload.name);

  if (!name) {
    throw new Error("Waypoint name is required");
  }

  if (hasDuplicateWaypointName(state.waypoints, name)) {
    throw new Error("Waypoint name already exists");
  }

  const timestamp = nowIso();
  const nextWaypoint: Waypoint = {
    id: createId("wp"),
    name,
    lat: payload.lat,
    lon: payload.lon,
    createdAtIso: timestamp,
    updatedAtIso: timestamp,
  };

  return {
    ...state,
    waypoints: [...state.waypoints, nextWaypoint],
  };
}

export function renameWaypoint(
  state: MissionState,
  waypointId: string,
  nextName: string
): MissionState {
  const normalizedName = normalizeName(nextName);
  if (!normalizedName) {
    throw new Error("Waypoint name is required");
  }

  if (hasDuplicateWaypointName(state.waypoints, normalizedName, waypointId)) {
    throw new Error("Waypoint name already exists");
  }

  let didUpdate = false;
  const updatedWaypoints = state.waypoints.map((waypoint) => {
    if (waypoint.id !== waypointId) {
      return waypoint;
    }

    didUpdate = true;
    return {
      ...waypoint,
      name: normalizedName,
      updatedAtIso: nowIso(),
    };
  });

  if (!didUpdate) {
    throw new Error("Waypoint not found");
  }

  return {
    ...state,
    waypoints: updatedWaypoints,
  };
}

export function deleteWaypoint(state: MissionState, waypointId: string): MissionState {
  return {
    ...state,
    waypoints: state.waypoints.filter((waypoint) => waypoint.id !== waypointId),
  };
}

export function recordMissionRun(state: MissionState, draft: MissionDraft): MissionState {
  const mission: MissionRun = {
    id: createId("run"),
    lat: draft.lat,
    lon: draft.lon,
    name: draft.name?.trim() || undefined,
    startDate: draft.startDate,
    days: draft.days,
    timestampIso: nowIso(),
  };

  const nextHistory = [mission, ...state.history].slice(0, HISTORY_LIMIT);

  return {
    ...state,
    history: nextHistory,
  };
}

export const missionStorage = {
  storageKey: STORAGE_KEY,
  historyLimit: HISTORY_LIMIT,
  createDefaultMissionState,
  loadMissionState,
  saveMissionState,
  addWaypoint,
  renameWaypoint,
  deleteWaypoint,
  recordMissionRun,
  hasDuplicateWaypointName,
};
