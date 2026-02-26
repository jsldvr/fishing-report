import { beforeEach, describe, expect, it } from "vitest";
import {
  addWaypoint,
  createDefaultMissionState,
  deleteWaypoint,
  loadMissionState,
  missionStorage,
  recordMissionRun,
  renameWaypoint,
  saveMissionState,
} from "./missionStorage";

function createMemoryStorage() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("missionStorage", () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("loads default state when storage is empty", () => {
    const state = loadMissionState(storage);

    expect(state.waypoints).toEqual([]);
    expect(state.history).toEqual([]);
    expect(state.schemaVersion).toBe(1);
  });

  it("falls back safely when storage payload is corrupted", () => {
    storage.setItem(missionStorage.storageKey, "not-json");

    const state = loadMissionState(storage);

    expect(state).toEqual(createDefaultMissionState());
    expect(storage.getItem(missionStorage.storageKey)).toBeNull();
  });

  it("persists and reloads valid state", () => {
    const base = createDefaultMissionState();
    const withWaypoint = addWaypoint(base, {
      name: "Milton Run",
      lat: 42.7754,
      lon: -88.939,
    });

    saveMissionState(withWaypoint, storage);
    const loaded = loadMissionState(storage);

    expect(loaded.waypoints).toHaveLength(1);
    expect(loaded.waypoints[0].name).toBe("Milton Run");
  });

  it("rejects duplicate waypoint names case-insensitively", () => {
    const state = addWaypoint(createDefaultMissionState(), {
      name: "South Padre",
      lat: 26.1037,
      lon: -97.1647,
    });

    expect(() =>
      addWaypoint(state, {
        name: " south padre ",
        lat: 26.2,
        lon: -97.1,
      })
    ).toThrow("Waypoint name already exists");
  });

  it("renames and deletes a waypoint", () => {
    const state = addWaypoint(createDefaultMissionState(), {
      name: "Old Name",
      lat: 40,
      lon: -74,
    });

    const waypointId = state.waypoints[0].id;
    const renamed = renameWaypoint(state, waypointId, "New Name");
    expect(renamed.waypoints[0].name).toBe("New Name");

    const deleted = deleteWaypoint(renamed, waypointId);
    expect(deleted.waypoints).toHaveLength(0);
  });

  it("keeps only the most recent history entries up to the limit", () => {
    let state = createDefaultMissionState();

    for (let i = 0; i < missionStorage.historyLimit + 2; i += 1) {
      state = recordMissionRun(state, {
        lat: 40 + i,
        lon: -74 - i,
        name: `Run ${i}`,
        startDate: "2026-02-25",
        days: 3,
      });
    }

    expect(state.history).toHaveLength(missionStorage.historyLimit);
    expect(state.history[0].name).toBe("Run 11");
  });
});
