import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import Home from "./Home";
import { renderWithMission } from "../../tests/missionRender";
import { getCurrentDateISO } from "../lib/time";

const navigateMock = vi.fn();

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
  default: ({
    onLocationChange,
  }: {
    onLocationChange: (lat: number, lon: number, name?: string) => void;
  }) => (
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
  default: ({
    onDateRangeChange,
  }: {
    onDateRangeChange: (startDate: string, days: number) => void;
  }) => (
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

describe("Home", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    localStorage.clear();
  });

  it("no longer renders the Saved spots or Recent forecasts panel", () => {
    renderWithMission(<Home />);

    expect(screen.queryByText("Saved spots")).toBeNull();
    expect(screen.queryByText("Recent forecasts")).toBeNull();
    expect(screen.queryByTestId("waypoint-list")).toBeNull();
    expect(screen.queryByTestId("mission-history-list")).toBeNull();
    expect(screen.queryByLabelText("Spot name")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("runs the primary forecast from the shared draft defaults", () => {
    renderWithMission(<Home />);

    const button = screen.getByRole("button", { name: /get fishing outlook/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    expect(navigateMock).toHaveBeenCalledWith(
      `/results?lat=40.7128&lon=-74.006&startDate=${getCurrentDateISO()}&days=3`
    );
  });

  it("feeds the shared draft from the Home location and date controls", () => {
    renderWithMission(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Set Milton Location" }));
    fireEvent.click(screen.getByRole("button", { name: "Set Mission Date" }));
    fireEvent.click(screen.getByRole("button", { name: /get fishing outlook/i }));

    const expected = new URLSearchParams({
      lat: "42.7754",
      lon: "-88.939",
      startDate: "2026-02-25",
      days: "3",
    });
    expected.set("name", "Milton, Wisconsin");

    expect(navigateMock).toHaveBeenCalledWith(`/results?${expected.toString()}`);
  });
});
