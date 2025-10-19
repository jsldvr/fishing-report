# Changelog

## 2025-10-19
### Enhanced Weather Integration (Major Update)
- **Added National Weather Service (NWS) API integration**
  - Implemented `NWSWeatherService` class with full API support
  - Added weather alerts, marine conditions, and barometric pressure trends
  - Created safety assessment system with risk factors and recommendations
  - Enhanced weather scoring algorithm with NWS-specific bonuses

- **New Types & Interfaces**
  - Added `EnhancedWeatherData`, `SafetyAssessment`, `NWSAlert`, `MarineWeatherData`
  - Extended `ForecastScore` to use enhanced weather data
  - Added `NWSPointMetadata` for location intelligence

- **Enhanced Components**
  - Created `WeatherAlerts` component for safety warnings and marine conditions
  - Updated `ScoreCard` to display barometric trends and enhanced data
  - Modified `Results` page to use enhanced weather fetching

- **Smart Weather Fusion**
  - Implemented `fetchEnhancedWeather` with NWS priority for US locations
  - Automatic fallback to Open-Meteo for international locations or API failures
  - Enhanced weather scoring with pressure trends and marine conditions

- **Safety Features**
  - Real-time weather alert integration
  - Fishing safety rating system (EXCELLENT → DANGEROUS)
  - Risk factor identification and safety recommendations

- **Local NWS Office Integration**
  - Added `NWSOfficeInfo` and `LocalWeatherOfficeInfo` types
  - Implemented office lookup with distance calculation
  - Created `NWSOfficeInfo` component for office details
  - Added 50+ NWS Weather Forecast Office coordinates
  - Shows local meteorologist contact information and coverage area

- **Bug Fixes**
  - Fixed NWS alerts API zone ID extraction (was passing full URL)
  - Corrected NWS office API response parsing
  - Enhanced error handling for API failures

### Previous Updates
- Updated `public/fishing.svg` to use a simple 🎣 emoji favicon.
- Pointed favicon links to `/fishing.svg` to avoid duplicate `/fishing-report/` path segments.
- Added `.gap-8` utility in `src/index.css` to restore spacing on the About page grid.
- Added global disclaimer footer in `src/App.tsx`.
- Removed manual bullet characters from About page lists to avoid double bullets.
- Added vertical rhythm utilities and relaxed line-height for About page content spacing.
- Added Source Spec Sheet survival guide section to `src/pages/About.tsx`.
- Moved the theme toggle button to bottom-left across viewports via `src/index.css`.
- Styled unit toggle buttons with shared `btn` components and new secondary variant.
- Added ids to updated Results page buttons for consistent FE selectors.
- Made Results header stack vertically on small screens with new responsive classes and ids.
- Added `range-input` styling (border, height, padding tweaks) and updated Home date range slider with class/id order.
- Made Mission Timeline card collapsible by default with keyboard-accessible toggle, dynamic spacing, and supporting styles.
