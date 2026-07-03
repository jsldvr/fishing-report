import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
        start_url: "/",
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
        navigateFallback: "/index.html",
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
  // Use repo root when deployed to GitHub Pages, else default to root for local dev
  base: process.env.VITE_BASE_PATH || "/",
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
  },
});
