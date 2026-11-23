import { defineConfig, type Plugin } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Deployment base path with leading and trailing slashes: "/" for the site
 * root, "/fishing-report/" for GitHub Pages (VITE_BASE_PATH in CI).
 */
export function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

const base = normalizeBasePath(process.env.VITE_BASE_PATH);

/**
 * GitHub Pages serves 404.html for unknown paths. The app uses hash routing,
 * so the page forwards a deep path to the same route under the deployed base
 * (never the origin root, which may belong to another site).
 */
export function renderNotFoundRedirect(basePath: string): string {
  const baseLiteral = JSON.stringify(basePath);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fishing Forecast</title>
  <script>
    var base = ${baseLiteral};
    var path = window.location.pathname;
    var route = path.indexOf(base) === 0 ? path.slice(base.length) : "";
    window.location.replace(base + (route ? "#/" + route : ""));
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>
`;
}

function notFoundRedirectPlugin(basePath: string): Plugin {
  return {
    name: "fishing-forecast:not-found-redirect",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "404.html",
        source: renderNotFoundRedirect(basePath),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    notFoundRedirectPlugin(base),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      includeAssets: [
        "fishing.svg",
        "images/sharing-fishing-report.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
      ],
      manifest: {
        name: "Fishing Forecast",
        short_name: "FishingForecast",
        description: "Science-based fishing predictions for North America",
        // Stable identity, launch URL, and scope all follow the deployment
        // base so the app never launches outside its own scope.
        id: base,
        start_url: base,
        scope: base,
        display: "standalone",
        theme_color: "#102820",
        background_color: "#eef3ef",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "fishing.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Offline navigations resolve to the precached shell under the base.
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "image" ||
              request.destination === "font",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  // "/fishing-report/" on GitHub Pages (VITE_BASE_PATH), "/" otherwise.
  base,
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    // Playwright specs under e2e/ are run by `npm run test:e2e`, not Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      // json-summary feeds scripts/check-changed-coverage.ts (AGENTS.md 80% gate).
      reporter: ["text-summary", "json-summary", "html"],
      // Non-unit-testable files: the Playwright configs and lighthouserc.cjs are
      // test-runner/CI config, and src/main.tsx is the ReactDOM bootstrap
      // (createRoot().render()).
      exclude: [
        ...configDefaults.coverage.exclude,
        "playwright.config.ts",
        "playwright.pwa.config.ts",
        "lighthouserc.cjs",
        "src/main.tsx",
      ],
    },
  },
});
