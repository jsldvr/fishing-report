import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResultsDraftSync from "./ResultsDraftSync";
import { MissionProvider } from "./MissionProvider";
import { useMissionContext } from "./missionContext";
import { missionStorage } from "../lib/missionStorage";
import { getCurrentDateISO } from "../lib/time";

function DraftProbe() {
  const { draft } = useMissionContext();
  return (
    <output data-testid="draft">
      {`${draft.lat}|${draft.lon}|${draft.startDate}|${draft.days}|${draft.name}`}
    </output>
  );
}

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MissionProvider>
        <ResultsDraftSync />
        <DraftProbe />
      </MissionProvider>
    </MemoryRouter>
  );
}

function draftValue() {
  return screen.getByTestId("draft").textContent;
}

describe("ResultsDraftSync", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("makes a valid direct Results query the active draft", () => {
    renderAt("/results?lat=41.5&lon=-71.3&startDate=2026-02-25&days=4&name=Bay");
    expect(draftValue()).toBe("41.5|-71.3|2026-02-25|4|Bay");
  });

  it("ignores an out-of-range or malformed Results query", () => {
    renderAt("/results?lat=41.5&lon=-71.3&startDate=2026-02-25&days=99");
    expect(draftValue()).toBe(`40.7128|-74.006|${getCurrentDateISO()}|3|`);
  });

  it("leaves the draft untouched on non-Results routes", () => {
    renderAt("/about?lat=41.5&lon=-71.3&startDate=2026-02-25&days=4");
    expect(draftValue()).toBe(`40.7128|-74.006|${getCurrentDateISO()}|3|`);
  });

  it("never records forecast history when a Results URL is opened", () => {
    renderAt("/results?lat=41.5&lon=-71.3&startDate=2026-02-25&days=4&name=Bay");
    const raw = localStorage.getItem(missionStorage.storageKey);
    if (raw) {
      expect(JSON.parse(raw).history).toEqual([]);
    }
  });
});
