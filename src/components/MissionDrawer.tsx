import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { useMissionContext } from "../state/missionContext";
import { useMissionActions } from "../state/useMissionActions";
import type { MissionRun, Waypoint } from "../lib/missionStorage";

const DRAWER_TITLE_ID = "mission-drawer-title";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => element.offsetParent !== null || element === container);
}

function formatHistoryTimestamp(iso: string): string {
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
}

interface MissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
  inertTargetRef: RefObject<HTMLElement>;
}

/**
 * Global, GitHub-inspired left modal sheet holding the Saved spots and Recent
 * forecasts experience. Available from every route. Implements the W3C modal
 * dialog pattern: focus entry and trap, focus return to the trigger, an inert
 * and scroll-locked background, and Escape / backdrop / close-button dismissal.
 */
export default function MissionDrawer({
  isOpen,
  onClose,
  triggerRef,
  inertTargetRef,
}: MissionDrawerProps) {
  const { missionState, recentHistory, draft } = useMissionContext();
  const {
    runWaypoint,
    rerunHistory,
    selectWaypoint,
    saveWaypoint,
    renameWaypoint,
    deleteWaypoint,
  } = useMissionActions({ onClose });

  const panelRef = useRef<HTMLDivElement>(null);
  const [waypointNameDraft, setWaypointNameDraft] = useState("");
  const [waypointError, setWaypointError] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    setWaypointError(null);
    try {
      saveWaypoint(waypointNameDraft);
    } catch (error) {
      setWaypointError(
        error instanceof Error ? error.message : "Unable to save waypoint"
      );
    }
  }, [saveWaypoint, waypointNameDraft]);

  const handleRename = useCallback(
    (waypoint: Waypoint) => {
      const nextName = window.prompt("Rename waypoint", waypoint.name);
      if (!nextName || nextName.trim() === waypoint.name) {
        return;
      }
      setWaypointError(null);
      try {
        renameWaypoint(waypoint.id, nextName);
      } catch (error) {
        setWaypointError(
          error instanceof Error ? error.message : "Unable to rename waypoint"
        );
      }
    },
    [renameWaypoint]
  );

  const handleDelete = useCallback(
    (waypoint: Waypoint) => {
      const confirmed = window.confirm(
        `Delete waypoint "${waypoint.name}"? This cannot be undone.`
      );
      if (!confirmed) {
        return;
      }
      deleteWaypoint(waypoint.id);
    },
    [deleteWaypoint]
  );

  // Focus entry, focus trap, and Escape while open.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panel = panelRef.current;
    panel?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }
      const focusables = getFocusableElements(panelRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const outside = !panelRef.current.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Body scroll lock and inert background, always cleaned up on close/unmount.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const inertTarget = inertTargetRef.current;
    inertTarget?.setAttribute("inert", "");
    inertTarget?.setAttribute("aria-hidden", "true");

    return () => {
      body.style.overflow = previousOverflow;
      inertTarget?.removeAttribute("inert");
      inertTarget?.removeAttribute("aria-hidden");
    };
  }, [isOpen, inertTargetRef]);

  // Return focus to the trigger when the drawer closes.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);

  const hasLocationCoordinates =
    Number.isFinite(draft.lat) && Number.isFinite(draft.lon);
  const canSaveWaypoint =
    hasLocationCoordinates && waypointNameDraft.trim().length > 0;
  const selectedLocationLabel =
    waypointNameDraft.trim() || draft.name || `${draft.lat}, ${draft.lon}`;

  return createPortal(
    <div
      className="mission-drawer"
      id="mission-drawer"
      data-testid="mission-drawer"
      data-open={isOpen}
      hidden={!isOpen}
    >
      {isOpen && (
        <>
          <div
            className="mission-drawer__backdrop"
            id="mission-drawer-backdrop"
            data-testid="mission-drawer-backdrop"
            onClick={onClose}
          />
          <div
            className="mission-drawer__panel"
            id="mission-drawer-panel"
            data-testid="mission-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={DRAWER_TITLE_ID}
            tabIndex={-1}
            ref={panelRef}
          >
            <div className="mission-drawer__header" id="mission-drawer-header">
              <h2 className="mission-drawer__title" id={DRAWER_TITLE_ID}>
                Saved spots and recent forecasts
              </h2>
              <button
                className="mission-drawer__close btn btn-secondary"
                id="mission-drawer-close"
                data-testid="mission-drawer-close"
                type="button"
                onClick={onClose}
                aria-label="Close saved spots and recent forecasts"
              >
                <Icon name="xmark" />
              </button>
            </div>

            <div
              className="mission-drawer__body"
              id="mission-drawer-body"
              data-testid="mission-drawer-body"
            >
              <section className="mission-drawer__section" id="saved-spots-section">
                <h3 className="text-lg font-semibold mb-3 text-primary">
                  <Icon name="mapPin" className="mr-2" />
                  Saved spots
                </h3>
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
                    className="input mission-drawer__waypoint-input"
                    id="waypoint-name-input"
                    data-testid="waypoint-name-input"
                    type="text"
                    value={waypointNameDraft}
                    onChange={(event) =>
                      setWaypointNameDraft(event.target.value)
                    }
                    placeholder="Spot name"
                  />
                  <button
                    className="btn btn-primary mission-drawer__save-waypoint-btn"
                    id="save-waypoint-button"
                    data-testid="save-waypoint-button"
                    type="button"
                    onClick={handleSave}
                    disabled={!canSaveWaypoint}
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-muted mb-4">
                  Selected location: {selectedLocationLabel}
                </p>
                {waypointError && (
                  <p className="text-sm text-error mb-3" id="waypoint-error">
                    {waypointError}
                  </p>
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
                              {waypoint.lat.toFixed(4)},{" "}
                              {waypoint.lon.toFixed(4)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-secondary mission-drawer__waypoint-select-btn"
                              id={`waypoint-select-${waypoint.id}`}
                              type="button"
                              onClick={() => selectWaypoint(waypoint)}
                            >
                              Select
                            </button>
                            <button
                              className="btn btn-primary mission-drawer__waypoint-run-btn"
                              id={`waypoint-run-${waypoint.id}`}
                              type="button"
                              onClick={() => runWaypoint(waypoint)}
                            >
                              Run
                            </button>
                            <button
                              className="btn btn-secondary mission-drawer__waypoint-rename-btn"
                              id={`waypoint-rename-${waypoint.id}`}
                              type="button"
                              onClick={() => handleRename(waypoint)}
                            >
                              Rename
                            </button>
                            <button
                              className="btn btn-secondary mission-drawer__waypoint-delete-btn"
                              id={`waypoint-delete-${waypoint.id}`}
                              type="button"
                              onClick={() => handleDelete(waypoint)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className="mission-drawer__section"
                id="recent-forecasts-section"
              >
                <h3 className="text-lg font-semibold mb-3 text-primary">
                  <Icon name="book" className="mr-2" />
                  Recent forecasts
                </h3>
                <p className="text-sm text-secondary mb-3">
                  Your last 5 forecasts. Up to 10 are kept.
                </p>
                {recentHistory.length === 0 ? (
                  <p className="text-sm text-muted">No recent forecasts yet.</p>
                ) : (
                  <ul className="grid gap-2" id="mission-history-list">
                    {recentHistory.map((historyItem: MissionRun) => (
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
                            className="btn btn-primary mission-drawer__history-rerun-btn"
                            id={`history-rerun-${historyItem.id}`}
                            type="button"
                            onClick={() => rerunHistory(historyItem)}
                          >
                            Rerun
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
