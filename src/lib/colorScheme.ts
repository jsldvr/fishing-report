/**
 * Color-scheme preference model. No stored value means "follow the system";
 * a stored "light" or "dark" is an explicit override. The override is
 * reflected in `<meta name="color-scheme">` and `:root[data-color-scheme]`;
 * index.css maps the attribute onto the root `color-scheme` property so
 * tokens (light-dark()) and native controls follow.
 *
 * index.html applies a stored override with an inline script before first
 * paint; keep its storage key, meta, and attribute handling in sync with this
 * module.
 */

export type ColorScheme = "light" | "dark";

/** Pre-existing key, so overrides saved by earlier versions keep working. */
export const COLOR_SCHEME_STORAGE_KEY = "theme";

export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

const FOLLOW_SYSTEM_CONTENT = "light dark";

/** Root attribute carrying an explicit override; absent when following the system. */
export const COLOR_SCHEME_ATTRIBUTE = "data-color-scheme";

function isColorScheme(value: unknown): value is ColorScheme {
  return value === "light" || value === "dark";
}

/** The stored override, or null when following the system (or storage is blocked). */
export function readStoredOverride(): ColorScheme | null {
  try {
    const value = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    return isColorScheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** Persists an override, or removes it to return to the system preference. */
export function writeStoredOverride(override: ColorScheme | null): void {
  try {
    if (override) {
      localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, override);
    } else {
      localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
    }
  } catch {
    // Storage can be blocked; the scheme still applies for this page view.
  }
}

/** Current system preference. */
export function getSystemScheme(): ColorScheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia(SYSTEM_DARK_QUERY).matches ? "dark" : "light";
}

/** Subscribes to system preference changes; returns the unsubscribe function. */
export function subscribeToSystemScheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  const query = window.matchMedia(SYSTEM_DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Reflects the override (or the system default) in the color-scheme meta hint
 * and in `:root[data-color-scheme]`, which index.css maps onto the root
 * `color-scheme` property. Unchanged values are not rewritten, because any
 * root attribute write triggers a document-wide style recalculation.
 */
export function applyOverrideToDocument(override: ColorScheme | null): void {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]'
  );
  const content = override ?? FOLLOW_SYSTEM_CONTENT;
  if (meta && meta.content !== content) {
    meta.content = content;
  }
  const root = document.documentElement;
  if (root.getAttribute(COLOR_SCHEME_ATTRIBUTE) === override) {
    return;
  }
  if (override) {
    root.setAttribute(COLOR_SCHEME_ATTRIBUTE, override);
  } else {
    root.removeAttribute(COLOR_SCHEME_ATTRIBUTE);
  }
}

/**
 * Two-state toggle rule: switch to the opposite of what is rendered. When that
 * target equals the system preference the user is undoing an override, so the
 * result is null (follow the system) rather than a pinned value.
 */
export function nextOverride(
  rendered: ColorScheme,
  system: ColorScheme
): ColorScheme | null {
  const target: ColorScheme = rendered === "dark" ? "light" : "dark";
  return target === system ? null : target;
}
