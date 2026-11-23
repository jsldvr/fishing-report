import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import Home from "./Home";
import { renderWithMission } from "../../tests/missionRender";
import { getLocationTodayISO } from "../lib/time";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => navigateMock };
});

function generateButton() {
  return screen.getByRole("button", { name: /get fishing outlook/i });
}

describe("Home with the real location controls", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    localStorage.clear();
  });

  it("blocks a forecast while a visible coordinate is cleared", () => {
    renderWithMission(<Home />);
    fireEvent.change(screen.getByLabelText(/latitude/i), {
      target: { value: "47.6062" },
    });
    expect(generateButton()).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/latitude/i), { target: { value: "" } });

    expect(generateButton()).toBeDisabled();
    expect(generateButton()).toHaveAccessibleDescription(
      "Fix the location above to continue."
    );
    fireEvent.click(generateButton());
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("blocks a forecast while a visible coordinate is out of range", () => {
    renderWithMission(<Home />);
    fireEvent.change(screen.getByLabelText(/longitude/i), {
      target: { value: "-10" },
    });
    expect(generateButton()).toBeDisabled();
  });

  it("submits the corrected visible location, not the stale draft", () => {
    renderWithMission(<Home />);
    const lat = screen.getByLabelText(/latitude/i);
    const lon = screen.getByLabelText(/longitude/i);

    fireEvent.change(lat, { target: { value: "" } });
    fireEvent.change(lat, { target: { value: "47.6062" } });
    fireEvent.change(lon, { target: { value: "-122.3321" } });
    fireEvent.click(generateButton());

    expect(navigateMock).toHaveBeenCalledWith(
      `/results?lat=47.6062&lon=-122.3321&startDate=${getLocationTodayISO(47.6062, -122.3321)}&days=3`
    );
  });
});
