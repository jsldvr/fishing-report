export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          About Fishing Forecast
        </h1>
        <p className="text-lg text-gray-600">
          Science-based fishing predictions for North America
        </p>
      </div>

      <div className="grid gap-8">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 mb-2">
                🌙 Lunar Phase Analysis
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Based on solunar theory, which suggests that fish are more
                active during certain moon phases. We calculate the moon's phase
                angle and illumination to determine optimal fishing times. The
                algorithm favors both new moon and full moon periods, with
                scoring based on{" "}
                <code className="bg-gray-100 px-1 rounded">
                  0.6 × |cos(2α)| + 0.4 × illumination
                </code>
                .
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 mb-2">
                🌤️ Weather Conditions
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Real-time weather data from Open-Meteo API, focusing on daytime
                hours (6 AM - 6 PM local time). We analyze temperature comfort
                (optimal 10-24°C), wind conditions (best 3-18 km/h),
                precipitation levels, and cloud cover. The scoring weights are:
                35% wind, 25% clouds, 20% precipitation, 20% temperature.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 mb-2">
                📊 Scoring Algorithm
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Final bite scores (0-100) combine lunar and weather factors.
                Without almanac data: 44% moon + 56% weather. With almanac data:
                35% moon + 45% weather + 20% almanac. This produces a
                comprehensive prediction that balances traditional solunar
                theory with modern weather science.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Data Sources</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Open-Meteo API v1 (free, no registration required)</li>
                <li>Client-side astronomical calculations for lunar data</li>
                <li>Photon API by Komoot for address geocoding</li>
                <li>HTML5 Geolocation API for GPS position detection</li>
                <li>NOAA Tides and Currents API for marine conditions</li>
                <li>National Weather Service API for weather outlook</li>
                <li>IP geolocation services for fallback positioning</li>
                <li>All data fetched in real-time, no caching</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Coverage Area</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>United States (all 50 states)</li>
                <li>Canada (all provinces and territories)</li>
                <li>Mexico</li>
                <li>Puerto Rico and other US territories</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Technology Stack
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>React 18 + TypeScript 5.2</li>
                <li>Vite 7.1 build system with HMR</li>
                <li>React Router 6.20 for client-side routing</li>
                <li>Vitest + Playwright for testing</li>
                <li>ESLint + TypeScript compiler for quality</li>
                <li>Static deployment to GitHub Pages</li>
                <li>Zero runtime dependencies, pure client-side</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Timezone Handling
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  tz-lookup library for coordinate-based timezone detection
                </li>
                <li>Native JavaScript Date API for DST calculations</li>
                <li>Local time display with UTC reference</li>
                <li>Daylight window filtering (6 AM - 6 PM local)</li>
                <li>Cross-platform timezone support</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card p-6" id="source-spec-sheet-card">
          <h2
            className="text-xl font-semibold mb-4"
            id="source-spec-sheet-heading"
          >
            Source Spec Sheet
          </h2>
          <div className="space-y-4" id="source-spec-sheet-content">
            <p className="text-gray-600 leading-relaxed" id="source-spec-intro">
              Treat this field brief as your survival guide for the{" "}
              <a
                className="text-info font-medium"
                id="source-spec-link"
                href="https://github.com/jsldvr/fishing-report"
                target="_blank"
                rel="noreferrer"
              >
                jsldvr/fishing-report
              </a>{" "}
              codebase. Follow the checkpoints below to clone, fork, and deploy
              your own instance.
            </p>
            <ul
              className="text-sm text-gray-600 space-y-3"
              id="source-spec-steps"
            >
              <li className="leading-relaxed" id="source-spec-step-1">
                <span
                  className="font-medium text-gray-900"
                  id="source-spec-step-1-label"
                >
                  Deploy Beacon:
                </span>{" "}
                Fork the repository from GitHub so your squad has a safe staging
                ground.
              </li>
              <li className="leading-relaxed" id="source-spec-step-2">
                <span
                  className="font-medium text-gray-900"
                  id="source-spec-step-2-label"
                >
                  Secure Local Copy:
                </span>{" "}
                Clone the fork with{" "}
                <code
                  className="bg-gray-100 px-1 rounded"
                  id="source-spec-step-2-command"
                >
                  git clone
                  https://github.com/&lt;your-handle&gt;/fishing-report.git
                </code>{" "}
                and navigate into the project folder.
              </li>
              <li className="leading-relaxed" id="source-spec-step-3">
                <span
                  className="font-medium text-gray-900"
                  id="source-spec-step-3-label"
                >
                  Resupply Dependencies:
                </span>{" "}
                Run{" "}
                <code
                  className="bg-gray-100 px-1 rounded"
                  id="source-spec-step-3-command"
                >
                  npm install
                </code>{" "}
                to provision all mission-critical packages.
              </li>
              <li className="leading-relaxed" id="source-spec-step-4">
                <span
                  className="font-medium text-gray-900"
                  id="source-spec-step-4-label"
                >
                  Launch Field Ops:
                </span>{" "}
                Use{" "}
                <code
                  className="bg-gray-100 px-1 rounded"
                  id="source-spec-step-4-command"
                >
                  npm run dev
                </code>{" "}
                to activate the local dev server, or{" "}
                <code
                  className="bg-gray-100 px-1 rounded"
                  id="source-spec-step-4b-command"
                >
                  npm run build
                </code>{" "}
                for a production-ready kit.
              </li>
            </ul>
            <p className="text-xs text-gray-500" id="source-spec-outro">
              Field intel: the project relies on Vite + React 18 with
              TypeScript, so keep Node 18+ in your go-bag.
            </p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Algorithm Validation</h2>
          <p className="text-gray-600 mb-4">
            Our TypeScript implementation is a 1:1 port of the original Python
            algorithm, ensuring consistent scoring across platforms. Key
            validation points:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>Moon phase calculations match astronomical data</li>
            <li>Weather scoring uses identical heuristics and weights</li>
            <li>Component combination follows original formula</li>
            <li>Deterministic output for identical inputs</li>
          </ul>
          <p className="text-sm text-gray-500 italic">
            Note: Forecasts are for entertainment and research purposes. Always
            consider local conditions, regulations, and safety when fishing.
          </p>
        </div>
      </div>
    </div>
  );
}
