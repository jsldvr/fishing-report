# 🎣 Fishing Forecast

A production-ready React + TypeScript application that provides science-based fishing predictions for North America. Combines lunar phase calculations, real-time weather data, and optional almanac ratings to generate bite scores for optimal fishing times.

## Features

- **🌙 Lunar Phase Analysis**: Based on solunar theory with precise astronomical calculations
- **🌤️ Real-time Weather**: Open-Meteo API integration (no API key required)  
- **📍 North America Coverage**: US, Canada, Mexico, and territories with proper timezone handling
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **⚡ Static Deployment**: Zero runtime dependencies, deploys to GitHub Pages
- **🔄 Automatic Updates**: Nightly builds ensure fresh forecast data

## Quick Start

### Local Development

```bash
# Clone and install dependencies
git clone https://github.com/jsldvr/fishing-report.git
cd fishing-report
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173

# Run tests
npm test

# Build for production
npm run build
```

### Deployment to GitHub Pages

1. **Enable GitHub Pages** in repository settings → Pages → Source: "GitHub Actions"

2. **Push to main branch** - the workflow automatically:
   - Builds and tests the application  
   - Deploys to `https://[username].github.io/fishing-report/`
   - Runs nightly at midnight America/Chicago time

3. **Manual deployment**: Use "Actions" tab → "Build and Deploy to GitHub Pages" → "Run workflow"

## Usage

### Basic Forecast

1. **Enter Location**: Use city search, coordinates, or current location
2. **Select Date Range**: Choose start date and number of days (1-7)
3. **Generate Forecast**: Get daily bite scores and detailed breakdowns

### Understanding Scores

- **🎣 75-100**: Excellent conditions - prime fishing time
- **🐟 50-74**: Good conditions - favorable for fishing  
- **💤 0-49**: Poor conditions - consider alternative activities

### Component Breakdown

Each forecast shows weighted contributions:
- **🌙 Moon**: Phase angle and illumination analysis
- **🌤️ Weather**: Temperature, wind, precipitation, cloud cover
- **📖 Almanac**: Optional third-party fishing ratings (when available)

## Algorithm Details

### Scoring Methodology

The algorithm is a 1:1 TypeScript port of the original Python implementation:

#### Moon Phase (0-1 scale)
```typescript
score = 0.6 × |cos(2α)| + 0.4 × illumination
```
- Favors new moon (0°) and full moon (180°) phases
- Incorporates illumination for brightness preference
- Based on solunar theory principles

#### Weather Conditions (0-1 scale)
```typescript
score = 0.35×wind + 0.25×clouds + 0.2×precipitation + 0.2×temperature
```
- **Wind**: Optimal 3-18 km/h (light to moderate breeze)
- **Clouds**: Best 10-40% (partly cloudy conditions)
- **Rain**: Minimal precipitation preferred
- **Temperature**: Comfort zone 10-24°C (50-75°F)

#### Final Combination
- **Without almanac**: 44% moon + 56% weather
- **With almanac**: 35% moon + 45% weather + 20% almanac

### Validation & Testing

Run validation tests to verify algorithm parity:

```bash
# Algorithm unit tests
npm test

# Compare with Python output (requires Python setup)
python forecast.py --lat 40.7128 --lon -74.0060 --days 3
# Then check TypeScript equivalent in browser
```

## Project Structure

```
fishing-report/
├── src/
│   ├── lib/                 # Core algorithms
│   │   ├── forecast.ts     # Main scoring logic (ported from Python)
│   │   ├── openMeteo.ts    # Weather API client
│   │   └── time.ts         # Timezone utilities
│   ├── components/         # React components
│   │   ├── LocationInput.tsx
│   │   ├── DateRangePicker.tsx
│   │   └── ScoreCard.tsx
│   ├── pages/             # Route pages
│   │   ├── Home.tsx
│   │   ├── Results.tsx
│   │   └── About.tsx
│   └── types/             # TypeScript definitions
├── tests/                 # Unit tests
├── scripts/              # Build utilities
├── public/              # Static assets
└── .github/workflows/   # CI/CD
```

## Configuration

### Environment Variables

Optional environment variables for enhanced features:

```bash
# None required for basic operation
# All data sources are public APIs or client-side calculations
```

### Customization

#### Adding Locations for Prebuild

Edit `scripts/build-data.ts` to add popular fishing locations:

```typescript
const SAMPLE_LOCATIONS = [
  { name: 'Lake Tahoe, CA', lat: 39.0968, lon: -120.0324 },
  { name: 'Kenai River, AK', lat: 60.5544, lon: -151.2583 },
  // Add more locations...
];
```

#### Adjusting Algorithm Weights

Modify scoring weights in `src/lib/forecast.ts`:

```typescript
// Weather component weights
const score = 0.35 * windS + 0.25 * cloudS + 0.2 * precipS + 0.2 * tempS;

// Final combination weights  
const wm = 0.35, ww = 0.45, wa = 0.20; // With almanac
const wm = 0.44, ww = 0.56;           // Without almanac
```

## Performance Optimization

### Bundle Size Monitoring

Target: <250 KB gzipped JavaScript on first load

```bash
npm run build
npx bundlesize  # Add to package.json for CI monitoring
```

### Optimization Features

- **Code Splitting**: Routes loaded on-demand
- **Asset Optimization**: Images and SVG minified  
- **Caching Strategy**: Service worker for offline capability
- **API Efficiency**: Batch requests, proper error handling

## Browser Support

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Required APIs**: Fetch, Geolocation, Intl.DateTimeFormat
- **Graceful degradation**: Core functionality without geolocation

## Data Sources & Attribution

- **Weather Data**: [Open-Meteo API](https://open-meteo.com/) (CC BY 4.0)
- **Geocoding**: [OpenStreetMap Nominatim](https://nominatim.org/) 
- **Lunar Calculations**: Astronomical formulas (public domain)
- **Timezone Data**: IANA Time Zone Database via `tz-lookup`

## Contributing

### Development Workflow

1. **Fork and clone** the repository
2. **Create feature branch**: `git checkout -b feature/new-algorithm`
3. **Make changes** with tests and documentation
4. **Verify builds**: `npm run build && npm test`  
5. **Submit pull request** with detailed description

### Code Standards

- **TypeScript**: Strict mode with full type coverage
- **Testing**: Unit tests for algorithm functions
- **Linting**: ESLint + Prettier configuration
- **Commits**: Conventional commit format

### Algorithm Changes

When modifying scoring algorithms:

1. **Update tests** with expected outputs
2. **Validate against Python** reference implementation  
3. **Document reasoning** for weight adjustments
4. **Consider backward compatibility** for existing users

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache and reinstall
rm -rf node_modules dist .vite
npm install
npm run build
```

**API Rate Limits**
- Open-Meteo: 10,000 requests/day per IP
- Implement client-side caching if needed

**Timezone Issues**  
- Verify `tz-lookup` data includes your target location
- Test with various DST transition dates

**GitHub Pages 404s**
- Ensure `base: '/fishing-report/'` in `vite.config.ts`
- Check that `404.html` redirects properly for SPA routing

### Performance Issues

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Check lighthouse score
npx lighthouse http://localhost:4173 --view
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Solunar Theory**: John Alden Knight's research on lunar influence
- **Open-Meteo**: Excellent free weather API service  
- **React Team**: Outstanding development framework
- **Fishing Community**: Feedback and validation of scoring accuracy

---

**Disclaimer**: Forecasts are for entertainment and research purposes. Always consider local conditions, weather warnings, fishing regulations, and safety when planning fishing activities.
