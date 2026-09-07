import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MissionProvider } from "./MissionProvider";
import { useMissionContext } from "./missionContext";
import { getCurrentDateISO } from "../lib/time";
import * as missionStorage from "../lib/missionStorage";

function Probe() {
  const {
    draft,
    locationPrefillToken,
    recentHistory,
    setDraftLocation,
    setDraftDateRange,
    applyDraft,
    updateMissionState,
  } = useMissionContext();

  return (
    <div>
      <output data-testid="draft">
        {`${draft.lat}|${draft.lon}|${draft.startDate}|${draft.days}|${draft.name}`}
      </output>
      <output data-testid="token">{locationPrefillToken}</output>
      <output data-testid="recent-count">{recentHistory.length}</output>
      <button
        type="button"
        onClick={() => setDraftLocation(42.7754, -88.939, "Milton")}
      >
        set-location
      </button>
      <button
        type="button"
        onClick={() => setDraftDateRange("2026-02-25", 5)}
      >
        set-dates
      </button>
      <button
        type="button"
        onClick={() => applyDraft({ name: "Applied" }, { prefill: true })}
      >
        apply
      </button>
      <button
        type="button"
        onClick={() =>
          updateMissionState((current) =>
            missionStorage.recordMissionRun(current, {
              lat: 1,
              lon: -80,
              startDate: "2026-02-25",
              days: 3,
            })
          )
        }
      >
        record-run
      </button>
    </div>
  );
}

function renderProvider(strict = false) {
  const tree = (
    <MissionProvider>
      <Probe />
    </MissionProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("MissionProvider", () => {
  it("starts from the approved default draft", () => {
    renderProvider();
    expect(screen.getByTestId("draft").textContent).toBe(
      `40.7128|-74.006|${getCurrentDateISO()}|3|`
    );
  });

  it("updates the draft from location and date controls", () => {
    renderProvider();

    fireEvent.click(screen.getByText("set-location"));
    fireEvent.click(screen.getByText("set-dates"));

    expect(screen.getByTestId("draft").textContent).toBe(
      "42.7754|-88.939|2026-02-25|5|Milton"
    );
  });

  it("bumps the location prefill token only when applyDraft asks for it", () => {
    renderProvider();
    expect(screen.getByTestId("token").textContent).toBe("0");

    fireEvent.click(screen.getByText("set-location"));
    expect(screen.getByTestId("token").textContent).toBe("0");

    fireEvent.click(screen.getByText("apply"));
    expect(screen.getByTestId("token").textContent).toBe("1");
    expect(screen.getByTestId("draft").textContent).toContain("Applied");
  });

  it("persists mission-state changes through the existing storage layer", () => {
    const saveSpy = vi.spyOn(missionStorage, "saveMissionState");
    renderProvider();

    fireEvent.click(screen.getByText("record-run"));

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("recent-count").textContent).toBe("1");
  });

  it("does not double-write or double-record under React Strict Mode", () => {
    const saveSpy = vi.spyOn(missionStorage, "saveMissionState");
    renderProvider(true);

    // Hydration must not write.
    expect(saveSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("record-run"));

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("recent-count").textContent).toBe("1");
  });
});
