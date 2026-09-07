import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { MissionProvider } from "../state/MissionProvider";
import { missionStorage, type MissionRun } from "../lib/missionStorage";
import { getCurrentDateISO } from "../lib/time";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => navigateMock };
});

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MissionProvider>
        <App />
      </MissionProvider>
    </MemoryRouter>
  );
}

function openDrawer() {
  fireEvent.click(screen.getByTestId("mission-drawer-toggle"));
  return screen.getByRole("dialog");
}

function seedHistory(count: number) {
  const history: MissionRun[] = Array.from({ length: count }, (_, index) => ({
    id: `run_${index}`,
    lat: 40 + index,
    lon: -74 - index,
    name: `Seed ${index}`,
    startDate: "2026-02-25",
    days: 3,
    timestampIso: `2026-02-25T12:0${index % 10}:00.000Z`,
  }));
  localStorage.setItem(
    missionStorage.storageKey,
    JSON.stringify({ schemaVersion: 1, waypoints: [], history })
  );
}

function saveWaypoint(name: string) {
  fireEvent.change(screen.getByTestId("waypoint-name-input"), {
    target: { value: name },
  });
  fireEvent.click(screen.getByTestId("save-waypoint-button"));
}

function installEnvironmentMocks() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

beforeAll(installEnvironmentMocks);

beforeEach(() => {
  installEnvironmentMocks();
  navigateMock.mockReset();
  localStorage.clear();
  document.body.style.overflow = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MissionDrawer", () => {
  it("is available from every route and preserves the saved/recent copy", () => {
    renderApp("/about");
    openDrawer();

    expect(screen.getByText("Saved spots")).toBeInTheDocument();
    expect(screen.getByText("Recent forecasts")).toBeInTheDocument();
    expect(
      screen.getByText("Your last 5 forecasts. Up to 10 are kept.")
    ).toBeInTheDocument();
    expect(screen.getByText("No saved spots yet.")).toBeInTheDocument();
    expect(screen.getByText("No recent forecasts yet.")).toBeInTheDocument();
  });

  it("saves the active location under the entered spot name", () => {
    renderApp();
    openDrawer();
    saveWaypoint("Test Spot");

    const list = document.getElementById("waypoint-list") as HTMLElement;
    expect(within(list).getByText("Test Spot")).toBeInTheDocument();
    expect(within(list).getByText("40.7128, -74.0060")).toBeInTheDocument();
  });

  it("selects a saved spot: updates the draft, closes, and navigates Home", () => {
    renderApp();
    openDrawer();
    saveWaypoint("Dock A");

    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    expect(navigateMock).toHaveBeenCalledWith("/");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("runs a saved spot: records history, closes, and navigates Results", () => {
    renderApp();
    openDrawer();
    saveWaypoint("Dock B");

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(navigateMock).toHaveBeenCalledWith(
      `/results?lat=40.7128&lon=-74.006&startDate=${getCurrentDateISO()}&days=3&name=Dock+B`
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    openDrawer();
    const historyList = document.getElementById(
      "mission-history-list"
    ) as HTMLElement;
    expect(within(historyList).getByText("Dock B")).toBeInTheDocument();
  });

  it("renames a saved spot through the existing prompt flow", () => {
    vi.spyOn(window, "prompt").mockReturnValue("Renamed Spot");
    renderApp();
    openDrawer();
    saveWaypoint("Original Spot");

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    const item = document.getElementById("waypoint-list") as HTMLElement;
    expect(within(item).getByText("Renamed Spot")).toBeInTheDocument();
  });

  it("deletes a saved spot through the existing confirm flow", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp();
    openDrawer();
    saveWaypoint("Doomed Spot");
    expect(screen.getByText("Doomed Spot")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("No saved spots yet.")).toBeInTheDocument();
  });

  it("reruns a recorded forecast: closes and navigates Results again", () => {
    renderApp();
    openDrawer();
    saveWaypoint("Rerun Spot");
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(navigateMock).toHaveBeenCalledTimes(1);

    openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Rerun" }));

    expect(navigateMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows at most the five most recent forecasts while storage keeps ten", () => {
    seedHistory(12);
    renderApp();
    openDrawer();

    const historyList = document.getElementById(
      "mission-history-list"
    ) as HTMLElement;
    expect(historyList.querySelectorAll("li")).toHaveLength(5);
    expect(within(historyList).getByText("Seed 0")).toBeInTheDocument();
    expect(within(historyList).queryByText("Seed 5")).toBeNull();
  });

  it("traps focus inside the panel", () => {
    renderApp();
    openDrawer();
    const panel = screen.getByTestId("mission-drawer-panel");

    document.body.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it("restores body scroll on unmount", () => {
    const view = renderApp();
    openDrawer();
    expect(document.body.style.overflow).toBe("hidden");

    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
