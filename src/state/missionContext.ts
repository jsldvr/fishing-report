import { createContext, useContext } from "react";
import { getLocationTodayISO } from "../lib/time";
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
  /** Calendar date (YYYY-MM-DD) at the fishing location. */
  startDate: string;
  days: number;
  /**
   * True once the user (or a Results URL) set startDate. Until then the start
   * date is a default that follows the current location's today.
   */
  startDateChosen: boolean;
}

export type ForecastDraftChange = Partial<Omit<ForecastDraft, "startDateChosen">>;

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
    startDate: getLocationTodayISO(
      DEFAULT_DRAFT_LOCATION.lat,
      DEFAULT_DRAFT_LOCATION.lon
    ),
    days: DEFAULT_DRAFT_LOCATION.days,
    startDateChosen: false,
  };
}

/**
 * Applies a draft change. A supplied start date is a choice, and is kept from
 * then on, when it differs from the current one or when `explicitStartDate`
 * says so (a Results URL names its date even if it equals the old default).
 * The date picker echoes its current value on mount, so for it only a
 * different date counts. While the start date is still the default, moving
 * the location moves it to the new location's today.
 * Returns `previous` unchanged when nothing differs.
 */
export function mergeDraft(
  previous: ForecastDraft,
  change: ForecastDraftChange,
  explicitStartDate = false
): ForecastDraft {
  const merged: ForecastDraft = { ...previous, ...change };
  const suppliedDate = change.startDate !== undefined;
  if (suppliedDate && (explicitStartDate || change.startDate !== previous.startDate)) {
    merged.startDateChosen = true;
  }
  const moved = merged.lat !== previous.lat || merged.lon !== previous.lon;
  if (moved && !merged.startDateChosen) {
    merged.startDate = getLocationTodayISO(merged.lat, merged.lon);
  }
  const unchanged = (Object.keys(merged) as Array<keyof ForecastDraft>).every(
    (key) => merged[key] === previous[key]
  );
  return unchanged ? previous : merged;
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
  /**
   * Shared saved-spot name draft. A named location (typed search or selected
   * waypoint) prefills it, the drawer's Spot name field is bound to it, and the
   * primary Home forecast uses it as the forecast-name fallback -- the behavior
   * the inline Home panel had before the move.
   */
  waypointNameDraft: string;
  setWaypointNameDraft: (name: string) => void;
  setDraftLocation: (lat: number, lon: number, name?: string) => void;
  setDraftDateRange: (startDate: string, days: number) => void;
  applyDraft: (next: ForecastDraftChange, options?: ApplyDraftOptions) => void;
}

export const MissionContext = createContext<MissionContextValue | null>(null);

export function useMissionContext(): MissionContextValue {
  const value = useContext(MissionContext);
  if (!value) {
    throw new Error("useMissionContext must be used within a MissionProvider");
  }
  return value;
}
