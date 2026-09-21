import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadMissionState,
  saveMissionState,
  type MissionState,
} from "../lib/missionStorage";
import {
  MissionContext,
  createDefaultDraft,
  type ApplyDraftOptions,
  type ForecastDraft,
  type MissionContextValue,
} from "./missionContext";

/** Home displays the five most recent runs; storage keeps up to ten. */
const RECENT_HISTORY_LIMIT = 5;

interface MissionProviderProps {
  children: ReactNode;
}

/**
 * Owns persisted mission state plus the shared forecast draft. Mission state is
 * loaded once from the existing storage layer and written back only on genuine
 * changes so React Strict Mode's double invocation cannot produce duplicate
 * writes or history records.
 */
export function MissionProvider({ children }: MissionProviderProps) {
  const [missionState, setMissionState] = useState<MissionState>(loadMissionState);
  const [draft, setDraft] = useState<ForecastDraft>(createDefaultDraft);
  const [locationPrefillToken, setLocationPrefillToken] = useState(0);
  const [waypointNameDraft, setWaypointNameDraft] = useState("");
  const lastSerializedRef = useRef<string>();

  useEffect(() => {
    const serialized = JSON.stringify(missionState);
    if (lastSerializedRef.current === undefined) {
      lastSerializedRef.current = serialized;
      return;
    }
    if (lastSerializedRef.current === serialized) {
      return;
    }
    lastSerializedRef.current = serialized;
    saveMissionState(missionState);
  }, [missionState]);

  const updateMissionState = useCallback(
    (updater: (state: MissionState) => MissionState) => {
      setMissionState((previous) => updater(previous));
    },
    []
  );

  const setDraftLocation = useCallback(
    (lat: number, lon: number, name?: string) => {
      const nextName = name ?? "";
      setDraft((previous) => {
        if (
          previous.lat === lat &&
          previous.lon === lon &&
          previous.name === nextName
        ) {
          return previous;
        }
        return { ...previous, lat, lon, name: nextName };
      });
      // A named location prefills the saved-spot name, as the inline panel did.
      if (name) {
        setWaypointNameDraft(name);
      }
    },
    []
  );

  const setDraftDateRange = useCallback((startDate: string, days: number) => {
    setDraft((previous) => {
      if (previous.startDate === startDate && previous.days === days) {
        return previous;
      }
      return { ...previous, startDate, days };
    });
  }, []);

  const applyDraft = useCallback(
    (next: Partial<ForecastDraft>, options?: ApplyDraftOptions) => {
      setDraft((previous) => ({ ...previous, ...next }));
      if (options?.prefill) {
        setLocationPrefillToken((token) => token + 1);
      }
    },
    []
  );

  const recentHistory = useMemo(
    () => missionState.history.slice(0, RECENT_HISTORY_LIMIT),
    [missionState.history]
  );

  const value = useMemo<MissionContextValue>(
    () => ({
      missionState,
      recentHistory,
      updateMissionState,
      draft,
      locationPrefillToken,
      waypointNameDraft,
      setWaypointNameDraft,
      setDraftLocation,
      setDraftDateRange,
      applyDraft,
    }),
    [
      missionState,
      recentHistory,
      updateMissionState,
      draft,
      locationPrefillToken,
      waypointNameDraft,
      setDraftLocation,
      setDraftDateRange,
      applyDraft,
    ]
  );

  return (
    <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
  );
}
