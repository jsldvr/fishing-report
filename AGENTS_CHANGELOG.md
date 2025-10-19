# Changelog

## 2025-10-19
### Version 1.1.1 Legal Compliance Pack
- Updated `package.json` version to `1.1.1`.
- Added dedicated Privacy Policy, Terms of Service, Cookie Consent, and Compliance Statement pages with comprehensive legal copy.
- Wired footer links to the new legal pages and extended routing to expose each document.
- Styled the legal briefing pages and footer with existing tactical UI patterns for visual consistency.
- Surfaced current version in the header status bar (`VERSION CTRL: X.X.X`) using the package metadata.

### Version 1.1.0 Release Prep
- Bumped `package.json` version to `1.1.0` for the release branch workflow.
- Added Open Graph image meta tag pointing to `public/images/sharing-fishing-report.png` for social sharing.
- Reordered primary and mobile navigation links to `INTEL → WX → GUIDE → MISSION` and updated the WX icon to `🌦`.
- Introduced automated GitHub release workflow that tags and publishes releases from `release/*` branches using the `package.json` version.

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
  - **REDESIGNED `ScoreCard`** with modern card layout and improved visual hierarchy
  - Modified `Results` page to use enhanced weather fetching
  - Added gradient headers, better spacing, and color-coded sections

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

- **UI/UX Improvements**
  - **Redesigned ScoreCard layout** with gradient headers and modern styling
  - Enhanced visual hierarchy with color-coded sections and better typography
  - Improved spacing and readability with rounded corners and shadows
  - Added animated progress bars and status badges
  - Better mobile responsiveness with responsive grid layouts

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
- Added WX Intel Hub page with curated weather resources and updated navigation links.
- Corrected WX resource link to CDC extreme heat guidance.
- Fixed UCAR MetEd resource link.
- Added Guide page with survival FAQs and navigation entry.
