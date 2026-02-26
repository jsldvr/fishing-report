import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import type { MissionState } from "../lib/missionStorage";

const navigateMock = vi.fn();
const missionStateMock: MissionState = {
  schemaVersion: 1,
  waypoints: [],
  history: [],
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../components/LocationInput", () => ({
  default: ({ onLocationChange }: { onLocationChange: (lat: number, lon: number, name?: string) => void }) => (
    <button
      className="btn"
      id="mock-set-location"
      type="button"
      onClick={() => onLocationChange(42.7754, -88.939, "Milton, Wisconsin")}
    >
      Set Milton Location
    </button>
  ),
}));

vi.mock("../components/DateRangePicker", () => ({
  default: ({ onDateRangeChange }: { onDateRangeChange: (startDate: string, days: number) => void }) => (
    <button
      className="btn"
      id="mock-set-date"
      type="button"
      onClick={() => onDateRangeChange("2026-02-25", 3)}
    >
      Set Mission Date
    </button>
  ),
}));

vi.mock("../lib/missionStorage", async () => {
  const actual = await vi.importActual<typeof import("../lib/missionStorage")>(
    "../lib/missionStorage"
  );

  return {
    ...actual,
    loadMissionState: () => ({
      schemaVersion: 1,
      waypoints: [...missionStateMock.waypoints],
      history: [...missionStateMock.history],
    }),
    saveMissionState: vi.fn(),
  };
});

describe("Home", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    missionStateMock.waypoints = [];
    missionStateMock.history = [];
  });

  it("saves, renames, and deletes a waypoint", () => {
    vi.spyOn(window, "prompt").mockReturnValue("Milton Pier");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Waypoint name"), {
      target: { value: "Milton Launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Milton Launch")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByText("Milton Pier")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Milton Pier")).not.toBeInTheDocument();
  });

  it("runs mission from waypoint and records history rerun", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Milton Location" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Mission Date" }));

    fireEvent.change(screen.getByLabelText("Waypoint name"), {
      target: { value: "Milton Mission" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(navigateMock).toHaveBeenCalledWith(
      "/results?lat=42.7754&lon=-88.939&startDate=2026-02-25&days=3&name=Milton+Mission"
    );

    fireEvent.click(screen.getByRole("button", { name: "Rerun" }));
    expect(navigateMock).toHaveBeenCalledTimes(2);
  });
});
