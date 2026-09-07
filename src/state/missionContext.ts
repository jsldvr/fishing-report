import { createContext, useContext } from "react";
import { getCurrentDateISO } from "../lib/time";
import type { MissionRun, MissionState } from "../lib/missionStorage";

/**
 * Application-level forecast draft. Home's location and date controls read and
 * write this, a valid direct Results URL synchronizes into it, and every other
 * route retains whatever was last active. See requirements 11-15.
 */
export interface ForecastDraft {
  lat: number;
  lon: number;
  name: string;
  startDate: string;
  days: number;
}

/** Requirement 15: fallback values when no valid active draft exists. */
export const DEFAULT_DRAFT_LOCATION = {
  lat: 40.7128,
  lon: -74.006,
  days: 3,
} as const;

export function createDefaultDraft(): ForecastDraft {
  return {
    lat: DEFAULT_DRAFT_LOCATION.lat,
    lon: DEFAULT_DRAFT_LOCATION.lon,
    name: "",
    startDate: getCurrentDateISO(),
    days: DEFAULT_DRAFT_LOCATION.days,
  };
}

export interface ApplyDraftOptions {
  /** Bump the location prefill token so a mounted LocationInput re-syncs. */
  prefill?: boolean;
}

export interface MissionContextValue {
  missionState: MissionState;
  recentHistory: MissionRun[];
  updateMissionState: (updater: (state: MissionState) => MissionState) => void;
  draft: ForecastDraft;
  locationPrefillToken: number;
  setDraftLocation: (lat: number, lon: number, name?: string) => void;
  setDraftDateRange: (startDate: string, days: number) => void;
  applyDraft: (next: Partial<ForecastDraft>, options?: ApplyDraftOptions) => void;
}

export const MissionContext = createContext<MissionContextValue | null>(null);

export function useMissionContext(): MissionContextValue {
  const value = useContext(MissionContext);
  if (!value) {
    throw new Error("useMissionContext must be used within a MissionProvider");
  }
  return value;
}
