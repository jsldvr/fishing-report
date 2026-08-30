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
import packageJson from "../package.json";

const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

interface InstallPromptOverrides {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
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

    expect(within(getBrand()).queryByRole("button")).toBeNull();
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

  it("keeps the mobile menu toggle available and operable", () => {
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
  });

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
