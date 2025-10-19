import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();

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
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">🌙 Lunar Phase Analysis</h3>
              <p className="text-gray-600">
                Based on solunar theory, which suggests that fish are more active during certain moon phases. 
                We calculate the moon's phase angle and illumination to determine optimal fishing times. 
                The algorithm favors both new moon and full moon periods, with scoring based on 
                <code className="bg-gray-100 px-1 rounded">0.6 × |cos(2α)| + 0.4 × illumination</code>.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">🌤️ Weather Conditions</h3>
              <p className="text-gray-600">
                Real-time weather data from Open-Meteo API, focusing on daytime hours (6 AM - 6 PM local time). 
                We analyze temperature comfort (optimal 10-24°C), wind conditions (best 3-18 km/h), 
                precipitation levels, and cloud cover. The scoring weights are: 35% wind, 25% clouds, 
                20% precipitation, 20% temperature.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">📊 Scoring Algorithm</h3>
              <p className="text-gray-600">
                Final bite scores (0-100) combine lunar and weather factors. Without almanac data: 
                44% moon + 56% weather. With almanac data: 35% moon + 45% weather + 20% almanac. 
                This produces a comprehensive prediction that balances traditional solunar theory 
                with modern weather science.
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
                <li>• Open-Meteo weather API (no key required)</li>
                <li>• Astronomical calculations for lunar phase</li>
                <li>• OpenStreetMap Nominatim for geocoding</li>
                <li>• Browser geolocation for current position</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Coverage Area</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• United States (all 50 states)</li>
                <li>• Canada (all provinces and territories)</li>
                <li>• Mexico</li>
                <li>• Puerto Rico and other US territories</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Technology Stack</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• React 18 + TypeScript</li>
                <li>• Vite for build tooling</li>
                <li>• Static deployment to GitHub Pages</li>
                <li>• No backend servers required</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Timezone Handling</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Automatic detection from coordinates</li>
                <li>• DST-aware calculations</li>
                <li>• Local time display with UTC reference</li>
                <li>• Daylight window filtering (6 AM - 6 PM)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Algorithm Validation</h2>
          <p className="text-gray-600 mb-4">
            Our TypeScript implementation is a 1:1 port of the original Python algorithm, 
            ensuring consistent scoring across platforms. Key validation points:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 mb-4">
            <li>• Moon phase calculations match astronomical data</li>
            <li>• Weather scoring uses identical heuristics and weights</li>
            <li>• Component combination follows original formula</li>
            <li>• Deterministic output for identical inputs</li>
          </ul>
          <p className="text-sm text-gray-500 italic">
            Note: Forecasts are for entertainment and research purposes. 
            Always consider local conditions, regulations, and safety when fishing.
          </p>
        </div>

        <div className="text-center">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Try the Forecast Tool
          </button>
        </div>
      </div>
    </div>
  );
}
