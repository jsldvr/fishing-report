# 🎣 Tactical Fishing Intel Platform

**Mission-critical angling intelligence for the modern outdoorsman.** This ain't your grandpa's fishing app - it's a full-stack React/TypeScript tactical platform delivering real-time situational awareness for water operations across North America.

Built by suburban tacti-cool operators, for suburban tacti-cool operators who understand that fish are just another target requiring proper intel, timing, and environmental assessment.

## 🎯 Operational Capabilities

### Core Intelligence Systems
- **🌙 Lunar Phase Targeting**: Solunar theory calculations with astronomical precision - because fish operate on nature's timeline, not yours
- **� Marine Conditions**: Real-time NOAA CO-OPS integration with Great Lakes support - inland warriors get proper station selection now
- **🌤️ Weather Intel**: Multi-source meteorological data (Open-Meteo, NWS) with zero API key dependencies - operational security maintained
- **� Location Services**: GPS integration with fallback to manual coordinates - works when cell towers don't
- **⚡ Zero-Dependency Deployment**: Static assets only - deploys anywhere, runs offline when SHTF

### Force Multipliers
- **📱 Mobile-First**: Responsive design optimized for field use on any device
- **🔄 Automated Updates**: Nightly intel refresh ensures current conditions
- **🎯 Multi-Day Planning**: 7-day forecast window for tactical mission planning
- **📍 Continental Coverage**: US, Canada, Mexico coverage with proper timezone handling
- **🛡️ Hardened Architecture**: Production-ready codebase with comprehensive testing

## 🚀 Rapid Deployment

### Field Development Setup

```bash
# Clone the tactical package
git clone https://github.com/jsldvr/fishing-report.git
cd fishing-report

# Install dependencies (Node.js 20+ required)
npm install

# Hot development server
npm run dev
# Live reload at http://localhost:5173 - modify and see changes instantly

# Run full test suite
npm test
# Unit tests, integration tests, and marine station validation

# Production build
npm run build
# Optimized static assets ready for deployment
```

### Production Deployment Options

#### GitHub Pages (Recommended)
1. **Enable Pages**: Repository Settings → Pages → Source: "GitHub Actions"
2. **Auto-Deploy**: Push to `main` triggers automatic build/deploy pipeline
3. **Live URL**: `https://[username].github.io/fishing-report/`
4. **Nightly Updates**: Automated rebuilds at 0600 UTC for fresh data

#### Alternative Deployments
- **Netlify**: Drag `dist/` folder for instant deployment
- **Vercel**: Connect GitHub repo for automatic deployments  
- **Apache/Nginx**: Serve static files from any web server
- **S3 + CloudFront**: AWS static hosting with CDN
- **Local Network**: Run on field laptop for offline operations

## ⚡ Mission Execution

### Target Acquisition Process

1. **Location Input**: GPS coordinates, city search, or manual entry - multiple vectors for target acquisition
2. **Time Window Selection**: 1-7 day operational window planning
3. **Intelligence Generation**: Real-time analysis with detailed breakdown of all contributing factors
4. **Mission Planning**: Use intel to optimize timing and resource allocation

### Threat Assessment Matrix

- **� 75-100 (CRITICAL)**: Prime engagement window - all systems green, maximum probability of success
- **⚠️ 50-74 (ELEVATED)**: Good conditions - favorable probability, proceed with confidence
- **❌ 0-49 (LOW)**: Suboptimal conditions - consider alternative operations or target adjustment

### Intel Breakdown Components

Each assessment provides weighted analysis from multiple intelligence sources:
- **🌙 Lunar Phase**: Astronomical calculations based on solunar theory - nature's operational tempo
- **� Marine Conditions**: NOAA station data with improved inland coverage (Great Lakes operators now properly supported)
- **🌤️ Weather Systems**: Multi-source meteorological analysis with field-relevant factors
- **🎯 Composite Score**: Algorithmic fusion of all intelligence sources for actionable assessment

## 🧠 Intelligence Algorithm

### Tactical Scoring System

**Field-tested algorithmic fusion** combining multiple environmental factors. This isn't some weekend warrior guesswork - it's precision-engineered assessment based on documented solunar research and operational meteorology.

#### Lunar Phase Analysis (Solunar Foundation)
```typescript
moonScore = 0.6 × |cos(2 × phaseAngle)| + 0.4 × illumination
```
- **Peak Windows**: New moon (0°) and full moon (180°) - maximum gravitational influence
- **Illumination Factor**: Brightness correlation with feeding behavior
- **Scientific Basis**: John Alden Knight's solunar theory with modern astronomical precision

#### Environmental Conditions Matrix
```typescript
weatherScore = 0.35×wind + 0.25×clouds + 0.2×precipitation + 0.2×temperature
```
- **Wind Assessment**: 3-18 km/h optimal (light to moderate breeze) - surface disturbance without equipment compromise
- **Cloud Coverage**: 10-40% ideal (partial overcast) - reduces UV penetration, increases activity
- **Precipitation**: Minimal preferred - light rain acceptable, heavy precip degrades conditions
- **Temperature**: 10-24°C operational zone (50-75°F) - comfort range for extended operations

#### Marine Station Intelligence (v1.2.3 Enhancement)
**MAJOR UPGRADE**: Fixed station selection algorithm that was returning distant coastal stations for inland operations.

- **Station Priority**: Waterlevels → Meteorology → Wind → Temperature → Tide Predictions
- **Coverage Improvement**: Great Lakes and inland water bodies now properly supported
- **Distance Optimization**: ~90km regional stations vs. 1000+ km coastal fallbacks
- **Validation**: Comprehensive test suite ensures proper station selection

#### Final Assessment Weights
- **Standard Configuration**: 44% lunar + 56% environmental
- **Enhanced Mode**: 35% lunar + 45% environmental + 20% almanac (when available)

### System Validation & QA

**Trust but verify** - comprehensive testing ensures reliable intel in the field:

```bash
# Full test suite execution
npm test
# Includes: algorithm validation, API integration, marine station selection

# Type safety verification  
npm run type-check
# Ensures no runtime surprises in production

# Production build test
npm run build && npm run preview
# Validates optimized bundle performance
```

**Field Testing Protocol**: Each algorithm change is validated against known conditions and historical data. The v1.2.3 marine station fix was extensively tested with inland locations (Milton, WI) to ensure proper Great Lakes station selection.

## 🏗️ System Architecture

**Modular, mission-critical codebase** designed for maintainability and field reliability:

```
fishing-report/
├── src/
│   ├── lib/                     # Core intelligence systems
│   │   ├── forecast.ts         # Primary scoring algorithm
│   │   ├── enhancedWeather.ts  # Weather data fusion
│   │   ├── noaaMarine.ts       # Marine conditions (v1.2.3 enhanced)
│   │   ├── noaaStationTypes.ts # Station selection strategy
│   │   ├── nwsWeather.ts       # National Weather Service integration
│   │   ├── openMeteo.ts        # Open-Meteo API client
│   │   ├── weatherOutlook.ts   # Extended forecast processing
│   │   └── time.ts             # Timezone/temporal utilities
│   ├── components/             # React UI components
│   │   ├── LocationInput.tsx   # GPS/coordinate input
│   │   ├── DateRangePicker.tsx # Mission window selector
│   │   ├── ScoreCard.tsx       # Intelligence display
│   │   ├── MarineConditions.tsx # NOAA marine data
│   │   ├── WeatherAlerts.tsx   # NWS warning system
│   │   └── WeatherOutlookPanel.tsx # Extended forecast
│   ├── pages/                  # Application routes
│   │   ├── Home.tsx           # Mission planning interface
│   │   ├── Results.tsx        # Intelligence display
│   │   ├── Wx.tsx             # Weather-focused view
│   │   └── Guide.tsx          # Operational documentation
│   └── types/                 # TypeScript definitions
├── tests/                     # Comprehensive test suite
│   ├── forecast.test.ts      # Algorithm validation
│   ├── noaaMarine.test.ts    # Marine station testing
│   └── noaaFix.test.ts       # Station selection validation
├── scripts/                  # Build and deployment tools
├── .github/workflows/        # CI/CD pipeline
│   ├── release.yml          # Automated release system
│   ├── validate-release.yml # Pre-merge validation
│   └── pages.yml            # Deployment automation
└── public/                  # Static assets and PWA config
```

## ⚙️ System Configuration

### Operational Security

**Zero API keys required** - all data sources use public endpoints for operational security. No credentials to compromise, no rate limits to breach, no dependencies on third-party authentication systems.

```bash
# No environment variables required for basic operations
# All intelligence sources are public APIs or client-side calculations
```

### Mission Customization

#### High-Value Target Locations

Preload strategic locations in `scripts/build-data.ts`:

```typescript
const TACTICAL_LOCATIONS = [
  { name: 'Lake Tahoe, CA', lat: 39.0968, lon: -120.0324 },
  { name: 'Kenai River, AK', lat: 60.5544, lon: -151.2583 },
  { name: 'Boundary Waters, MN', lat: 47.9493, lon: -91.5008 },
  { name: 'Chesapeake Bay, MD', lat: 38.7849, lon: -76.8721 },
  // Add your AO's prime fishing intel locations
];
```

#### Algorithm Tuning

Fine-tune assessment weights in `src/lib/forecast.ts` based on local conditions:

```typescript
// Environmental factor weights (adjust for regional preferences)
const weatherScore = 0.35*windS + 0.25*cloudS + 0.2*precipS + 0.2*tempS;

// Final intelligence fusion weights
const standardMode = { moon: 0.44, weather: 0.56 };                    // Base configuration
const enhancedMode = { moon: 0.35, weather: 0.45, almanac: 0.20 };     // With third-party intel
```

### Marine Station Configuration (v1.2.3)

**Station Selection Priority** (automatically optimized):
1. `waterlevels` - Great Lakes, rivers, coastal monitoring
2. `meteorology` - Comprehensive weather stations  
3. `wind` - Wind monitoring (Great Lakes optimized)
4. `watertemperature` - Temperature monitoring
5. `tidepredictions` - Coastal tide predictions (fallback only)

This ensures inland operators get relevant regional stations instead of distant coastal fallbacks.

## 🚄 Performance Optimization

### Resource Efficiency Targets

**Field-tested performance standards** for reliable operation on any device:

- **Bundle Size**: <250 KB gzipped JavaScript (first load)
- **Load Time**: <2.5s LCP on 3G networks
- **Memory Usage**: <50MB peak for mobile operations
- **Offline Capability**: Core functions work without network

```bash
# Performance monitoring
npm run build
npx lighthouse http://localhost:4173 --view

# Bundle analysis
npx vite-bundle-analyzer dist
```

### Tactical Optimizations

- **Code Splitting**: Route-based loading - only load what you need for the mission
- **Asset Compression**: All images and vectors optimized for bandwidth conservation
- **Aggressive Caching**: Service worker implementation for offline field operations
- **API Batching**: Efficient data fetching with proper fallback strategies
- **Progressive Enhancement**: Core functionality works even when advanced features fail

## 📱 Platform Compatibility

**Multi-platform support** for any device you've got in the field:

- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (full tactical display)
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+ (optimized for single-handed operation)
- **Tablet**: Full responsive design scales from phone to desktop
- **Legacy Fallback**: Core intelligence functions work even on older hardware

### Required Platform APIs
- **Fetch API**: For intelligence gathering (universally supported)
- **Geolocation**: GPS coordinate acquisition (graceful fallback to manual entry)
- **Intl.DateTimeFormat**: Timezone handling (critical for accurate timing)

### Field Resilience
- **Network Independence**: Works offline once loaded
- **Device Agnostic**: Responsive design adapts to any screen size
- **Touch Optimized**: Large target areas for field use with gloves
- **High Contrast**: Readable in bright sunlight conditions

## 📡 Intelligence Sources

**Multi-source data fusion** from reliable, public intelligence feeds:

- **Meteorological**: [Open-Meteo API](https://open-meteo.com/) (CC BY 4.0) - European weather service with global coverage
- **Marine Conditions**: [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/) - Official US marine observation network
- **Weather Alerts**: [National Weather Service API](https://weather.gov/documentation/services-web-api) - Official US weather warnings
- **Geocoding**: [OpenStreetMap Nominatim](https://nominatim.org/) - Open-source location services
- **Astronomical**: Custom solunar calculations based on published research (public domain)
- **Timezone**: IANA Time Zone Database via `tz-lookup` - Official global timezone data

### Data Reliability
- **Government Sources**: NOAA and NWS provide official, authoritative data
- **Redundant Systems**: Multiple weather sources with automatic failover
- **Real-time Updates**: Fresh data every request, nightly cache refresh
- **Historical Validation**: Algorithms tested against known conditions and outcomes

## 🤝 Contributing to the Mission

### Development Protocol

**Proper operational procedures** for code contributions:

1. **Recon Phase**: Fork and clone the repository
2. **Branch Creation**: `git checkout -b feature/enhanced-targeting`
3. **Development**: Make changes with comprehensive testing and documentation
4. **Quality Assurance**: `npm run build && npm test && npm run type-check`
5. **Mission Brief**: Submit PR with detailed operational description

### Code Standards (Non-Negotiable)

- **TypeScript Strict Mode**: Full type coverage - no runtime surprises in the field
- **Comprehensive Testing**: Unit tests for all algorithm functions - trust but verify
- **Pre-commit Validation**: Automated version validation prevents deployment failures
- **ESLint + Prettier**: Consistent code formatting for team operations
- **Conventional Commits**: Proper commit messaging for change tracking

### Algorithm Enhancement Protocol

**Critical procedures** when modifying intelligence algorithms:

1. **Test Suite Updates**: Add tests with expected outputs before making changes
2. **Field Validation**: Test against known conditions and historical data
3. **Documentation**: Document reasoning for any weight or calculation adjustments  
4. **Backward Compatibility**: Consider impact on existing operators and deployments
5. **Performance Impact**: Ensure changes don't degrade field performance

### Release Management (v1.2.3+)

**Automated deployment pipeline** with built-in safeguards:

- **Pre-merge Validation**: Version consistency checks prevent broken releases
- **Automated Testing**: Full test suite runs on every PR
- **Release Triggers**: Successful merge to `main` from `release/*` or `fix/*` branches
- **Rollback Capability**: Tagged releases enable quick reversion if needed

## 🔧 Field Troubleshooting

### Common Operational Issues

**Build System Failures**
```bash
# Nuclear option - clear all caches and rebuild
rm -rf node_modules dist .vite package-lock.json
npm install
npm run build
```

**Intelligence Gathering Failures**
- **Open-Meteo**: 10,000 requests/day per IP - well within operational limits
- **NOAA API**: No rate limits on public endpoints - rock solid reliability
- **Network Issues**: App caches data locally - core functions work offline

**Station Selection Problems (Fixed in v1.2.3)**
- **Inland Locations**: Now properly selects Great Lakes/regional stations
- **Distance Issues**: Algorithm prioritizes waterlevels → meteorology → wind → temperature → tide predictions
- **Validation**: Comprehensive test suite ensures proper station selection

**Deployment Issues**
```bash
# GitHub Pages configuration
# Ensure base: '/fishing-report/' in vite.config.ts
# Verify 404.html handles SPA routing properly

# Alternative deployment validation
npm run build && npm run preview
# Test production build locally before deployment
```

**Timezone and Coordinate Issues**
- **DST Handling**: Test around transition dates (March/November)
- **Location Coverage**: tz-lookup includes global timezone data
- **GPS Fallback**: Manual coordinate entry when geolocation fails

### Performance Diagnostics

```bash
# Bundle size analysis
npm run build
npx vite-bundle-analyzer dist

# Field performance testing
npx lighthouse http://localhost:4173 --view --throttling-method=devtools

# Memory usage monitoring (Chrome DevTools)
# Network tab for API call efficiency
# Performance tab for rendering bottlenecks
```

## 📜 License & Legal

MIT License - see [LICENSE](LICENSE) for full operational terms.

## 🙏 Acknowledgments & Intel Sources

- **John Alden Knight**: Original solunar theory research - the tactical foundation
- **NOAA/NWS**: Reliable government weather and marine intelligence
- **Open-Meteo**: European weather service with global coverage and no API restrictions  
- **React/TypeScript Teams**: Solid development frameworks for mission-critical applications
- **Field Operators**: Real-world feedback and validation from actual fishing operations
- **Open Source Community**: Contributions that make this platform more effective

## 🎯 Recent Mission Updates

### v1.2.3 - Marine Station Intelligence Fix
- **Fixed**: Inland location station selection (Milton, WI no longer returns Quantico, VA stations)
- **Enhanced**: Great Lakes and inland water body support with proper regional station selection
- **Added**: Pre-merge validation system prevents version mismatches in deployment
- **Improved**: Station selection algorithm with comprehensive test coverage

---

## ⚠️ Operational Disclaimer

**This intelligence platform is for tactical planning and situational awareness.** Always combine with:

- **Local Intelligence**: Current conditions, hazards, and access restrictions
- **Weather Warnings**: Official NWS alerts and marine conditions
- **Regulatory Compliance**: Fishing licenses, seasons, limits, and protected areas  
- **Safety Protocol**: Proper equipment, communication plan, and emergency procedures

**Remember**: Technology enhances human judgment - it doesn't replace it. Stay alert, stay alive, stay fishing.
