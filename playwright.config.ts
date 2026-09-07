import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright setup: it exists only to verify browser-dependent header
 * layout that jsdom cannot establish. No screenshots, video, traces, or HTML
 * reports. It runs against the Vite dev server so the pre-existing production
 * `tsc` failure in `src/main.tsx` does not block browser-layout verification.
 */
const HOST = "127.0.0.1";
const PORT = 4173;
const baseURL = `http://${HOST}:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // CI runs serially (workers: 1), which avoids the parallel browser-launch
  // contention that causes local flake, so CI takes zero retries and any
  // non-first-try failure blocks the release. Local dev keeps one retry purely
  // to avoid re-running the whole suite over an occasional slow launch.
  workers: isCI ? 1 : undefined,
  retries: isCI ? 0 : 1,
  // A test that only passes on retry still fails the run -- never a green CI on
  // an intermittent regression.
  failOnFlakyTests: isCI,
  reporter: "line",
  use: {
    baseURL,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
