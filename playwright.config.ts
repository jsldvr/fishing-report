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
  workers: isCI ? 1 : undefined,
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
