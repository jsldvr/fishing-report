import { defineConfig, devices } from "@playwright/test";

/**
 * PWA checks need a production build with a service worker, which the dev
 * server used by playwright.config.ts never registers. This config builds for
 * the GitHub Pages base path and serves it with `vite preview`.
 */
const HOST = "127.0.0.1";
const PORT = 4174;
export const PWA_BASE = "/fishing-report/";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e/pwa",
  fullyParallel: false,
  forbidOnly: isCI,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: `http://${HOST}:${PORT}`,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host ${HOST} --port ${PORT} --strictPort`,
    env: { VITE_BASE_PATH: PWA_BASE },
    url: `http://${HOST}:${PORT}${PWA_BASE}`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
  },
});
