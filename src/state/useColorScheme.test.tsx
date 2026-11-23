import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useColorScheme } from "./useColorScheme";
import {
  applyOverrideToDocument,
  getSystemScheme,
  nextOverride,
  readStoredOverride,
  subscribeToSystemScheme,
  writeStoredOverride,
} from "../lib/colorScheme";

interface FakeMediaQuery {
  matches: boolean;
  listeners: Set<() => void>;
}

let systemDark: FakeMediaQuery;
let meta: HTMLMetaElement;

function setSystemDark(matches: boolean) {
  systemDark.matches = matches;
  systemDark.listeners.forEach((listener) => listener());
}

beforeEach(() => {
  localStorage.clear();
  systemDark = { matches: false, listeners: new Set() };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      media: query,
      get matches() {
        return systemDark.matches;
      },
      addEventListener: (_type: string, listener: () => void) =>
        systemDark.listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        systemDark.listeners.delete(listener),
    })),
  });
  meta = document.createElement("meta");
  meta.name = "color-scheme";
  meta.content = "light dark";
  document.head.append(meta);
});

afterEach(() => {
  meta.remove();
  document.documentElement.removeAttribute("data-color-scheme");
  vi.restoreAllMocks();
});

describe("useColorScheme", () => {
  it("follows the system with no override on first render", () => {
    systemDark.matches = true;
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.override).toBeNull();
    expect(result.current.rendered).toBe("dark");
    expect(meta.content).toBe("light dark");
    expect(document.documentElement).not.toHaveAttribute("data-color-scheme");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("tracks system changes while following the system", () => {
    const { result } = renderHook(() => useColorScheme());
    expect(result.current.rendered).toBe("light");

    act(() => setSystemDark(true));

    expect(result.current.rendered).toBe("dark");
    expect(meta.content).toBe("light dark");
    expect(document.documentElement).not.toHaveAttribute("data-color-scheme");
  });

  it("stores the opposite of the system, then returns to system", () => {
    const { result } = renderHook(() => useColorScheme());

    act(() => result.current.toggle());
    expect(result.current.override).toBe("dark");
    expect(meta.content).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(result.current.next).toBeNull();

    act(() => result.current.toggle());
    expect(result.current.override).toBeNull();
    expect(result.current.rendered).toBe("light");
    expect(meta.content).toBe("light dark");
    expect(document.documentElement).not.toHaveAttribute("data-color-scheme");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("keeps a pinned override when the system later matches it", () => {
    const { result } = renderHook(() => useColorScheme());
    act(() => result.current.toggle());

    act(() => setSystemDark(true));
    expect(result.current.override).toBe("dark");
    act(() => setSystemDark(false));
    expect(result.current.rendered).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("restores a stored override from an earlier visit", () => {
    localStorage.setItem("theme", "light");
    systemDark.matches = true;
    const { result } = renderHook(() => useColorScheme());

    expect(result.current.rendered).toBe("light");
    expect(meta.content).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "light");
  });

  it("syncs an override changed in another tab", () => {
    const { result } = renderHook(() => useColorScheme());

    act(() => {
      localStorage.setItem("theme", "dark");
      window.dispatchEvent(new StorageEvent("storage", { key: "theme" }));
    });
    expect(result.current.rendered).toBe("dark");

    act(() => {
      localStorage.removeItem("theme");
      window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    });
    expect(result.current.rendered).toBe("dark");

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.rendered).toBe("light");
  });

  it("still applies the scheme when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const { result } = renderHook(() => useColorScheme());

    act(() => result.current.toggle());
    expect(result.current.rendered).toBe("dark");
    expect(meta.content).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-color-scheme", "dark");
  });
});

describe("color scheme helpers", () => {
  it("only pins a scheme that differs from the system", () => {
    expect(nextOverride("light", "light")).toBe("dark");
    expect(nextOverride("dark", "light")).toBeNull();
    expect(nextOverride("dark", "dark")).toBe("light");
    expect(nextOverride("light", "dark")).toBeNull();
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem("theme", "sepia");
    expect(readStoredOverride()).toBeNull();
    writeStoredOverride("light");
    expect(readStoredOverride()).toBe("light");
    writeStoredOverride(null);
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("treats a missing matchMedia as a light system with no subscription", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(getSystemScheme()).toBe("light");
    const unsubscribe = subscribeToSystemScheme(() => undefined);
    expect(unsubscribe()).toBeUndefined();
  });

  it("does nothing when the document has no color-scheme meta", () => {
    meta.remove();
    expect(() => applyOverrideToDocument("dark")).not.toThrow();
  });
});
