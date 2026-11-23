/**
 * Lighthouse CI release gate (AGENTS.md section 4: no new regressions, LCP at
 * or below 2.5 s on the test environment).
 *
 * Test environment: the production build at the site root, served by
 * `vite preview`, audited with Lighthouse's default mobile emulation and
 * simulated throttling, median of three runs. Hash routes share one document,
 * so the root URL covers the app shell; the audited route makes no weather
 * requests.
 *
 * Regression floors are the category medians measured on `main` at 7ae0196
 * with this configuration (performance 0.98, accessibility 0.93, best
 * practices 1.00, SEO 0.91, CLS 0). Accessibility is ratcheted to 0.99, the
 * score this change established. Raise floors as scores improve; never lower
 * them to make a run pass. Reports stay on the runner; nothing is uploaded.
 */
const PORT = 4175;

function atLeast(minScore) {
  return ["error", { minScore, aggregationMethod: "median-run" }];
}

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
      startServerReadyPattern: "Local",
      url: [`http://127.0.0.1:${PORT}/`],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500, aggregationMethod: "median-run" },
        ],
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: 0, aggregationMethod: "median-run" },
        ],
        "categories:performance": atLeast(0.98),
        "categories:accessibility": atLeast(0.99),
        "categories:best-practices": atLeast(1),
        "categories:seo": atLeast(0.91),
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
