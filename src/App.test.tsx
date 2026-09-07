import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { MissionProvider } from "./state/MissionProvider";
import packageJson from "../package.json";

const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

interface InstallPromptOverrides {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <MissionProvider>
        <App />
      </MissionProvider>
    </MemoryRouter>
  );
}

function dispatchInstallPrompt(overrides: Partial<InstallPromptOverrides> = {}) {
  const event = Object.assign(new Event("beforeinstallprompt"), overrides);
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

function getBrand() {
  const brand = document.querySelector(".header-brand");
  expect(brand).not.toBeNull();
  return brand as HTMLElement;
}

function getDrawerTrigger() {
  return screen.getByTestId("mission-drawer-toggle");
}

function openDrawer() {
  fireEvent.click(getDrawerTrigger());
  return screen.getByRole("dialog");
}

beforeAll(() => {
  // jsdom implements neither of these; App calls both on mount.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(window, "scrollTo", { writable: true, value: vi.fn() });
});

beforeEach(() => {
  localStorage.clear();
  document.body.style.overflow = "";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("App header", () => {
  it("does not render the brand icon, subtitle, or status-bar wrapper", () => {
    renderApp();

    expect(document.querySelector(".brand-icon")).toBeNull();
    expect(document.querySelector(".brand-subtitle")).toBeNull();
    expect(document.querySelector(".brand-text")).toBeNull();
    expect(document.querySelector(".status-bar")).toBeNull();
    expect(document.getElementById("status-bar")).toBeNull();
  });

  it("renders the title, version, and timestamp inline in the approved order", () => {
    renderApp();

    const brand = within(getBrand());
    const title = brand.getByRole("heading", { name: "Fishing Report" });
    const version = brand.getByText(`v${packageJson.version}`);
    const timestamp = brand.getByText(TIME_PATTERN);

    expect(title.compareDocumentPosition(version) & FOLLOWING).toBeTruthy();
    expect(version.compareDocumentPosition(timestamp) & FOLLOWING).toBeTruthy();
  });

  it("omits the Install App control, without a placeholder, when no prompt is available", () => {
    renderApp();

    expect(
      within(getBrand()).queryByRole("button", { name: /install app/i })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /install app/i })
    ).toBeNull();
  });

  it("shows the Install App control after the timestamp once the prompt fires", () => {
    renderApp();
    dispatchInstallPrompt();

    const brand = within(getBrand());
    const timestamp = brand.getByText(TIME_PATTERN);
    const installButton = brand.getByRole("button", { name: /install app/i });

    expect(
      timestamp.compareDocumentPosition(installButton) & FOLLOWING
    ).toBeTruthy();
  });

  it("runs the stored install prompt when the Install App control is activated", async () => {
    renderApp();
    const prompt = vi.fn().mockResolvedValue(undefined);
    dispatchInstallPrompt({
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /install app/i }));
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: /install app/i })
    ).toBeNull();
  });

  it(
    "keeps the mobile menu toggle available and operable",
    () => {
      renderApp();

      const toggle = screen.getByRole("button", { name: /toggle navigation/i });
      expect(toggle).toBeInTheDocument();

      fireEvent.click(toggle);
      const overlay = document.getElementById("mobile-menu-overlay");
      expect(overlay).toBeInTheDocument();

      fireEvent.click(
        within(overlay as HTMLElement).getByRole("link", { name: /home/i })
      );
      expect(document.getElementById("mobile-menu-overlay")).toBeNull();
    },
    15000
  );

  it("toggles the theme from the floating control", () => {
    renderApp();

    const themeToggle = screen.getByRole("button", { name: /toggle theme/i });

    fireEvent.click(themeToggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(themeToggle);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

describe("App drawer trigger", () => {
  it("places an always-visible hamburger immediately before the brand title with drawer ARIA", () => {
    renderApp();

    const brand = getBrand();
    const trigger = getDrawerTrigger();
    const title = within(brand).getByRole("heading", { name: "Fishing Report" });

    expect(brand.firstElementChild).toBe(trigger);
    expect(trigger.compareDocumentPosition(title) & FOLLOWING).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-controls", "mission-drawer");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("exposes the hamburger on every route", () => {
    renderApp("/about");
    expect(getDrawerTrigger()).toBeInTheDocument();
    openDrawer();
    expect(
      screen.getByRole("dialog", { name: /saved spots and recent forecasts/i })
    ).toBeInTheDocument();
  });

  it("opens a modal dialog and reflects aria-expanded", () => {
    renderApp();
    const dialog = openDrawer();

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Saved spots and recent forecasts");
    expect(getDrawerTrigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("moves focus into the drawer on open and back to the trigger on close", () => {
    renderApp();
    openDrawer();

    const panel = screen.getByTestId("mission-drawer-panel");
    expect(panel).toHaveFocus();

    fireEvent.click(screen.getByTestId("mission-drawer-close"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(getDrawerTrigger()).toHaveFocus();
  });

  it("closes on Escape", () => {
    renderApp();
    openDrawer();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on backdrop click but not on clicks inside the panel", () => {
    renderApp();
    openDrawer();

    fireEvent.click(screen.getByTestId("mission-drawer-panel"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mission-drawer-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("locks body scroll and makes the app shell inert while open, cleaning up on close", () => {
    renderApp();
    openDrawer();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.getElementById("app-shell")).toHaveAttribute("inert");

    fireEvent.click(screen.getByTestId("mission-drawer-close"));
    expect(document.body.style.overflow).toBe("");
    expect(document.getElementById("app-shell")).not.toHaveAttribute("inert");
  });

  it("keeps the mobile navigation and the drawer mutually exclusive", () => {
    renderApp();

    // Opening the drawer closes an open mobile menu.
    fireEvent.click(screen.getByRole("button", { name: /toggle navigation/i }));
    expect(document.getElementById("mobile-menu-overlay")).toBeInTheDocument();

    openDrawer();
    expect(document.getElementById("mobile-menu-overlay")).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Toggling the mobile navigation clears any open drawer state.
    fireEvent.click(
      document.getElementById("mobile-menu-toggle") as HTMLElement
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.getElementById("mobile-menu-overlay")).toBeInTheDocument();
  });

  it("shows a down caret when the mobile menu is closed and an up caret when open", () => {
    renderApp();

    const toggle = screen.getByRole("button", { name: /toggle navigation/i });
    expect(toggle).toHaveAttribute("data-open", "false");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.querySelector(".mobile-menu-toggle__caret")).not.toBeNull();
    expect(toggle.querySelector(".hamburger-line")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("data-open", "true");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
