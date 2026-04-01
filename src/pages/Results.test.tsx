import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Results from "./Results";

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

vi.mock("../lib/enhancedWeather", () => ({
  fetchEnhancedWeather: vi.fn().mockResolvedValue({}),
}));

vi.mock("../lib/offlineForecastCache", () => ({
  buildForecastCacheKey: vi.fn().mockReturnValue("test-key"),
  getOfflineForecastCache: vi.fn().mockReturnValue(null),
  isCacheStale: vi.fn().mockReturnValue(false),
  saveOfflineForecastCache: vi.fn(),
}));

vi.mock("../lib/forecast", () => ({
  forecastForDay: vi.fn().mockReturnValue({
    date: "2026-01-01",
    biteScore0100: 50,
    moon: { phaseAngleDeg: 0, illumination: 0.5, phaseName: "Quarter" },
    weather: { tempC: 20, windKph: 10, precipMm: 0, cloudPct: 50, pressureHpa: 1013 },
    almanac: {},
    components: { moon: 50, weather: 50 },
  }),
}));

vi.mock("../lib/time", async () => {
  const actual = await vi.importActual<typeof import("../lib/time")>(
    "../lib/time"
  );
  return {
    ...actual,
    getTimezoneFromCoords: vi.fn().mockReturnValue("America/New_York"),
    getAstronomicalTimes: vi.fn().mockReturnValue({}),
    getSolunarTimes: vi.fn().mockReturnValue({}),
  };
});

function renderWithParams(params: string) {
  return render(
    <MemoryRouter initialEntries={[`/results?${params}`]}>
      <Results />
    </MemoryRouter>
  );
}

describe("Results — URL parameter validation", () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it("shows missing error when lat param is absent", async () => {
    renderWithParams("lon=-97.5&startDate=2026-06-01&days=3");
    expect(await screen.findByText("Missing required parameters")).toBeInTheDocument();
  });

  it("shows missing error when lon param is absent", async () => {
    renderWithParams("lat=35.4&startDate=2026-06-01&days=3");
    expect(await screen.findByText("Missing required parameters")).toBeInTheDocument();
  });

  it("shows missing error when startDate param is absent", async () => {
    renderWithParams("lat=35.4&lon=-97.5&days=3");
    expect(await screen.findByText("Missing required parameters")).toBeInTheDocument();
  });

  it("shows missing error when days param is absent", async () => {
    renderWithParams("lat=35.4&lon=-97.5&startDate=2026-06-01");
    expect(await screen.findByText("Missing required parameters")).toBeInTheDocument();
  });

  it("shows outside North America error for 0,0 coordinates (not 'missing')", async () => {
    renderWithParams("lat=0&lon=0&startDate=2026-06-01&days=3");
    expect(
      await screen.findByText("Location is outside North America")
    ).toBeInTheDocument();
    expect(screen.queryByText("Missing required parameters")).not.toBeInTheDocument();
  });

  it("shows range error when days > 7", async () => {
    renderWithParams("lat=35.4&lon=-97.5&startDate=2026-06-01&days=8");
    expect(await screen.findByText("Days must be between 1 and 7")).toBeInTheDocument();
  });

  it("shows range error when days = 0 (present but out of range)", async () => {
    renderWithParams("lat=35.4&lon=-97.5&startDate=2026-06-01&days=0");
    expect(await screen.findByText("Days must be between 1 and 7")).toBeInTheDocument();
    expect(screen.queryByText("Missing required parameters")).not.toBeInTheDocument();
  });

  it("error state renders a back-to-home button with correct id", async () => {
    renderWithParams("lon=-97.5&startDate=2026-06-01&days=3");
    const button = await screen.findByRole("button", { name: "Back to Home" });
    expect(button).toHaveAttribute("id", "action-back-home-error");
  });
});
