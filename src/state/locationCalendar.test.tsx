import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DateRangePicker from "../components/DateRangePicker";
import Home from "../pages/Home";
import { renderWithMission } from "../../tests/missionRender";
import ResultsDraftSync from "./ResultsDraftSync";
import {
  createDefaultDraft,
  mergeDraft,
  useMissionContext,
  type ForecastDraft,
} from "./missionContext";

// Real zone lookup: this file is about the difference between the viewer's
// calendar day and the fishing location's.
vi.unmock("tz-lookup");

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => vi.fn() };
});

const ORIGINAL_TZ = process.env.TZ;
// 12:30Z on Nov 21: already Nov 22 in Auckland (viewer), still Nov 21 in
// Anchorage and New York (fishing locations).
const NOW = new Date("2026-11-21T12:30:00Z");
const ANCHORAGE = { lat: 61.2181, lon: -149.9003 };
const AUCKLAND = { lat: -36.8485, lon: 174.7633 };

beforeEach(() => {
  process.env.TZ = "Pacific/Auckland";
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

function startDateInput() {
  return screen.getByLabelText("Start date") as HTMLInputElement;
}

describe("mergeDraft", () => {
  function draft(overrides: Partial<ForecastDraft> = {}): ForecastDraft {
    return { ...createDefaultDraft(), ...overrides };
  }

  it("defaults to the default location's today, not the viewer's", () => {
    expect(createDefaultDraft()).toMatchObject({
      startDate: "2026-11-21",
      startDateChosen: false,
    });
  });

  it("moves an unchosen default date to the new location's today", () => {
    const moved = mergeDraft(draft({ startDate: "2026-11-22" }), ANCHORAGE);
    expect(moved).toMatchObject({ ...ANCHORAGE, startDate: "2026-11-21" });
    // Auckland is a valid zone even though it is outside North America.
    expect(mergeDraft(draft(), AUCKLAND).startDate).toBe("2026-11-22");
  });

  it("keeps a chosen date when the location changes", () => {
    const chosen = mergeDraft(draft(), { startDate: "2026-11-25", days: 2 });
    expect(chosen.startDateChosen).toBe(true);
    expect(mergeDraft(chosen, ANCHORAGE).startDate).toBe("2026-11-25");
  });

  it("keeps an explicit date that equals the old default when the location moves", () => {
    // 06:30Z: Nov 21 in New York (default draft), still Nov 20 in Anchorage.
    vi.setSystemTime(new Date("2026-11-21T06:30:00Z"));
    const base = createDefaultDraft();
    expect(base.startDate).toBe("2026-11-21");

    const fromResults = mergeDraft(
      base,
      { ...ANCHORAGE, startDate: "2026-11-21", days: 3 },
      true
    );
    expect(fromResults).toMatchObject({ startDate: "2026-11-21", startDateChosen: true });

    // Without the explicit flag (the picker echoing its value) it stays a default.
    expect(mergeDraft(base, { ...ANCHORAGE, startDate: "2026-11-21" })).toMatchObject({
      startDate: "2026-11-20",
      startDateChosen: false,
    });
  });

  it("does not treat an unchanged date or a duration change as a choice", () => {
    const base = draft();
    expect(mergeDraft(base, { startDate: base.startDate })).toBe(base);
    const longer = mergeDraft(base, { days: 5 });
    expect(longer).toMatchObject({ days: 5, startDateChosen: false });
  });
});

describe("DateRangePicker in the fishing location's zone", () => {
  it("uses the location's today as default and minimum", () => {
    render(<DateRangePicker onDateRangeChange={vi.fn()} timeZone="America/Anchorage" />);
    expect(startDateInput().value).toBe("2026-11-21");
    expect(startDateInput().min).toBe("2026-11-21");
  });

  it("falls back to the viewer's today without a location zone", () => {
    render(<DateRangePicker onDateRangeChange={vi.fn()} />);
    expect(startDateInput().value).toBe("2026-11-22");
    expect(startDateInput().min).toBe("2026-11-22");
  });

  it("reports changes and toggles the forecast window details", () => {
    const onChange = vi.fn();
    render(<DateRangePicker onDateRangeChange={onChange} timeZone="America/Anchorage" />);

    fireEvent.change(startDateInput(), { target: { value: "2026-11-23" } });
    fireEvent.change(screen.getByLabelText(/Duration/), { target: { value: "5" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-23", 5);
    expect(screen.getByText("Forecast window:").parentElement).toHaveTextContent(
      "Forecast window: 2026-11-232026-11-27"
    );

    const toggle = screen.getByRole("button", { name: /forecast window/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(toggle, { key: "Enter" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(toggle, { key: " " });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(toggle, { key: "a" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});

describe("Results URL date in the shared draft", () => {
  function DraftProbe() {
    const { draft } = useMissionContext();
    return (
      <output data-testid="draft">{`${draft.startDate}|${draft.startDateChosen}`}</output>
    );
  }

  it("keeps the URL's date even when it equals the previous default", () => {
    vi.setSystemTime(new Date("2026-11-21T06:30:00Z"));
    const query = new URLSearchParams({
      lat: String(ANCHORAGE.lat),
      lon: String(ANCHORAGE.lon),
      startDate: "2026-11-21",
      days: "3",
    });
    renderWithMission(
      <>
        <ResultsDraftSync />
        <DraftProbe />
      </>,
      { route: `/results?${query}` }
    );

    expect(screen.getByTestId("draft")).toHaveTextContent("2026-11-21|true");
  });
});

describe("Home forecast date for a distant fishing location", () => {
  it("lets an Auckland viewer plan for Anchorage's current day", () => {
    renderWithMission(<Home />);
    fireEvent.change(screen.getByLabelText(/latitude/i), {
      target: { value: String(ANCHORAGE.lat) },
    });
    fireEvent.change(screen.getByLabelText(/longitude/i), {
      target: { value: String(ANCHORAGE.lon) },
    });

    expect(startDateInput().value).toBe("2026-11-21");
    expect(startDateInput().min).toBe("2026-11-21");
  });

  it("preserves a chosen date when the location changes", () => {
    renderWithMission(<Home />);
    fireEvent.change(startDateInput(), { target: { value: "2026-11-25" } });

    fireEvent.change(screen.getByLabelText(/latitude/i), {
      target: { value: String(ANCHORAGE.lat) },
    });
    fireEvent.change(screen.getByLabelText(/longitude/i), {
      target: { value: String(ANCHORAGE.lon) },
    });

    expect(startDateInput().value).toBe("2026-11-25");
    expect(startDateInput().min).toBe("2026-11-21");
  });
});
