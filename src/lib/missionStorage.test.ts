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

  it("swallows storage write errors so mission actions stay usable", () => {
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
      removeItem: () => {
        // no-op
      },
    };

    expect(() =>
      saveMissionState(createDefaultMissionState(), failingStorage)
    ).not.toThrow();
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

  it("loads default state when storage is null", () => {
    const state = loadMissionState(null);
    expect(state).toEqual(createDefaultMissionState());
  });

  it("resets state and clears storage when schema version does not match", () => {
    storage.setItem(
      missionStorage.storageKey,
      JSON.stringify({ schemaVersion: 99, waypoints: [], history: [] })
    );

    const state = loadMissionState(storage);

    expect(state).toEqual(createDefaultMissionState());
    expect(storage.getItem(missionStorage.storageKey)).toBeNull();
  });

  it("filters out invalid waypoints during load and keeps valid ones", () => {
    const validWaypoint = {
      id: "wp_abc",
      name: "Good Spot",
      lat: 40,
      lon: -74,
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };

    storage.setItem(
      missionStorage.storageKey,
      JSON.stringify({
        schemaVersion: 1,
        waypoints: [
          validWaypoint,
          { id: "", name: "", lat: "bad", lon: null }, // invalid
        ],
        history: [],
      })
    );

    const state = loadMissionState(storage);
    expect(state.waypoints).toHaveLength(1);
    expect(state.waypoints[0].name).toBe("Good Spot");
  });

  it("renameWaypoint throws when waypoint id is not found", () => {
    const state = createDefaultMissionState();
    expect(() => renameWaypoint(state, "non-existent-id", "New Name")).toThrow(
      "Waypoint not found"
    );
  });

  it("renameWaypoint throws when new name collides with another waypoint", () => {
    let state = createDefaultMissionState();
    state = addWaypoint(state, { name: "Spot A", lat: 40, lon: -74 });
    state = addWaypoint(state, { name: "Spot B", lat: 41, lon: -75 });

    expect(() =>
      renameWaypoint(state, state.waypoints[1].id, "Spot A")
    ).toThrow("Waypoint name already exists");
  });

  it("renameWaypoint allows keeping the same name (rename to self)", () => {
    let state = createDefaultMissionState();
    state = addWaypoint(state, { name: "Spot A", lat: 40, lon: -74 });

    const id = state.waypoints[0].id;
    const renamed = renameWaypoint(state, id, "Spot A");
    expect(renamed.waypoints[0].name).toBe("Spot A");
  });

  it("addWaypoint throws for an empty name", () => {
    expect(() =>
      addWaypoint(createDefaultMissionState(), { name: "   ", lat: 40, lon: -74 })
    ).toThrow("Waypoint name is required");
  });

  it("recordMissionRun trims optional name whitespace", () => {
    const state = recordMissionRun(createDefaultMissionState(), {
      lat: 40,
      lon: -74,
      name: "  My Run  ",
      startDate: "2026-02-25",
      days: 3,
    });

    expect(state.history[0].name).toBe("My Run");
  });

  it("recordMissionRun stores run with undefined name when name is empty", () => {
    const state = recordMissionRun(createDefaultMissionState(), {
      lat: 40,
      lon: -74,
      name: "",
      startDate: "2026-02-25",
      days: 3,
    });

    expect(state.history[0].name).toBeUndefined();
  });
});
