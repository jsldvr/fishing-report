import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  COLOR_SCHEME_STORAGE_KEY,
  applyOverrideToDocument,
  getSystemScheme,
  nextOverride,
  readStoredOverride,
  subscribeToSystemScheme,
  writeStoredOverride,
  type ColorScheme,
} from "../lib/colorScheme";

function getServerSystemScheme(): ColorScheme {
  return "light";
}

export interface ColorSchemeState {
  /** Explicit override, or null when following the system preference. */
  override: ColorScheme | null;
  system: ColorScheme;
  /** The scheme actually on screen. */
  rendered: ColorScheme;
  /** What a toggle would select next (null = return to system). */
  next: ColorScheme | null;
  toggle: () => void;
}

/**
 * System-aware color scheme with a two-state override toggle. Tracks system
 * preference changes and overrides made in other tabs.
 */
export function useColorScheme(): ColorSchemeState {
  const [override, setOverride] = useState<ColorScheme | null>(
    readStoredOverride
  );
  const system = useSyncExternalStore(
    subscribeToSystemScheme,
    getSystemScheme,
    getServerSystemScheme
  );

  useEffect(() => {
    applyOverrideToDocument(override);
  }, [override]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === COLOR_SCHEME_STORAGE_KEY) {
        setOverride(readStoredOverride());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const rendered = override ?? system;
  const next = nextOverride(rendered, system);

  const toggle = useCallback(() => {
    writeStoredOverride(next);
    setOverride(next);
  }, [next]);

  return { override, system, rendered, next, toggle };
}
