# Changelog

## 2025-10-19
### WX Outlook Header Flex Cleanup
- **Removed** flex-based layout from the outlook header and controls to return the section to block flow for the upcoming styling iteration.
- **Realigned** `#wx-outlook-controls` so the controls set anchors to the right edge per the revised layout direction.
- **Adjusted** `#wx-outlook-attribution` to stack on mobile while restoring flex alignment from the small breakpoint upward, including the requested source paragraph spacing tweak.
- **Stacked** `#wx-location-form` inputs on mobile by defaulting the layout to a column flex direction and restoring the row alignment from the small breakpoint.

### Astronomical Timezone Alignment Fix
- **Refactored** sun and moon time calculations to derive instants in the forecast location's timezone instead of the server locale.
- **Adjusted** solar time corrections to leverage real timezone offsets, eliminating multi-hour sunrise/sunset skew on the results page.
- **Updated** solunar period generation to reuse the timezone-aware instants so downstream formatting stays accurate.
- **Verified** the build (`npm run build`) to ensure the TypeScript refactor compiles cleanly.

### Forecast Metric Helper Text
- **Clarified** the Moon metric header with inline guidance describing how lunar phase strength influences bite scoring.
- **Explained** the Weather metric header with helper copy detailing which conditions contribute to the score.
- **Styled** new helper text with compact typography to preserve the metric layout.

### GPS Lock Icon Fix
- **Replaced** the garbled glyph on the Home page GPS button with the intended 📍 icon to restore the “GPS Lock” label.

### WX Location Acquisition Parity
- **Matched** the WX page coordinate handling with the home workflow by validating against the North America bounds before applying updates.
- **Implemented** the multi-phase geolocation flow (quick lookup, watch fallback, cached retry, and IP-based estimate) while keeping the minimal WX UI intact.
- **Auto-seeded** the WX form with smart geolocation on load without surfacing spinner noise unless the user explicitly requests GPS.

### WX NWS Attribution Details
- **Extended** the 5-day outlook fetcher to pull the issuing NWS forecast office metadata alongside the forecast.
- **Augmented** the WX outlook attribution line to cite the responsible office name, location, and ID so users know which local office issued the guidance.
- **Tweaked** the attribution layout to break the office detail onto its own line and prevent duplicate city/state labels.
- **Reworked** the WX outlook header into stacked sections with widened desktop spacing so titles, unit toggles, and attribution never overlap.

## 2025-10-19
### Fishing Forecast Card Layout Cleanup
- **Refined** `ScoreCard` markup with structured sections and explicit ids for reliable targeting and accessibility.
- **Aligned** bite score, component metrics, and detail panels with consistent spacing via new `.forecast-card*` utility classes.
- **Introduced** dedicated forecast card CSS to normalize progress bars, grids, and callouts while preserving the existing theme.
- **Wrapped** marine, safety, and NWS panels in shared section dividers for uniform borders and rhythm throughout the results list.
- **Improved** dark mode readability across forecast card sections by tying typography colors to the global theme palette.

## 2025-10-19
### Coastal Marine Conditions Integration
- **Added** NOAA Tides & Currents service to locate nearby tide stations and pull tide, wave, wind, and water temperature samples for daily forecasts.
- **Enriched** safety assessment pipeline with marine-aware downgrades and actionable tide timing recommendations for salt-water anglers.
- **Exposed** a coastal conditions panel on each results card showing station distance, wave height, wind, water temperature, and upcoming tide events.
- **Guarded** NOAA data requests by caching station product support and skipping unsupported wave/wind endpoints to prevent repeated API errors.
- **Improved** Weather Alerts panel with friendly placeholders so alert and marine sections describe where information will appear when data is unavailable.

## 2025-10-19
### Weather Day Cards Desktop Layout Enhancement
- **Added** CSS rule for `.wx-outlook-day-card > div:first-child` on desktop (≥1024px)
- **Set** first child div to `display: flex; flex-direction: column; width: 25%`
- **Improved** layout proportions for day info section on large screens

## 2025-10-19
### Weather Outlook Disclaimer Border Removal
- **Removed** left border from `#wx-outlook-disclaimer` element
- **Removed** `border-l-4 border-coyote-500` Tailwind classes from disclaimer component
- **Simplified** disclaimer styling to clean background-only appearance

## 2025-10-19
### Weather Day Cards Mobile Flex Direction Fix
- **Added** `display: flex; flex-direction: column` to `.wx-outlook-day-card` on mobile
- **Added** `display: flex; flex-direction: column` to `.wx-outlook-day-card > div` on mobile
- **Enforced** consistent vertical stacking of card elements on mobile view

## 2025-10-19
### Weather Day Cards Mobile Overflow Fix  
- **Fixed** horizontal overflow on mobile for `.wx-outlook-day-card` components
- **Added** `min-width: 0` and `overflow-wrap: break-word` to prevent text overflow
- **Enhanced** word breaking with `word-break: break-word` and `hyphens: auto` for long weather descriptions
- **Reduced** font size from `text-xs` to `0.7rem` on mobile for better fit
- **Added** `overflow: hidden` to grid container and flex-shrink properties to child elements
- **Implemented** mobile-first approach with `display: flex; flex-direction: column` override for grid on small screens

## 2025-10-19
### Weather Day Cards Mobile Layout Fix
- **Fixed** mobile responsive behavior for `.wx-outlook-day-card` components
- **Changed** grid breakpoints from `md:grid-cols-2 lg:grid-cols-5` to `lg:grid-cols-5` for single column on mobile/tablet
- **Changed** card layout breakpoints from `md:flex-row` to `lg:flex-row` to maintain vertical layout until large screens
- **Updated** metrics layout breakpoints from `md:flex-row` to `lg:flex-row` for consistency
- **Added** mobile-specific CSS with reduced padding and visual separator between day info and metrics
- **Enhanced** card appearance on mobile with subtle border-top on metrics section

## 2025-10-19
### Geolocation Error Handling Improvements
- **Enhanced** GPS button error messages with actionable guidance for location permission issues
- **Added** specific error handling for `POSITION_UNAVAILABLE` and improved timeout messages
- **Improved** geolocation settings: longer timeout (15s), disabled high accuracy for better compatibility, cache acceptance
- **Added** helpful tooltip to GPS button explaining permission requirement
- **Added** inline help text showing GPS requirements and coordinate format
- **Optimized** initial location detection with less aggressive settings and better caching

## 2025-10-19
### WX Location Card UX Redesign
- **Redesigned** `#wx-location-card` to clean one-line form with intuitive workflow
- **Added** auto-detection of user location on page load using Geolocation API
- **Added** GPS button with 📍 icon for quick current location input
- **Simplified** coordinate input to single text field accepting multiple formats (lat, lon)
- **Enhanced** error handling with specific messages for geolocation failures
- **Improved** mobile responsiveness with stacked layout on small screens
- **Removed** separate latitude/longitude fields and location label for cleaner UX

## 2025-10-19
### WX Outlook Card Layout Fixes
- **Added** `btn-sm` styles for proper toggle button sizing with padding 0.375rem×0.75rem, font-size 0.75rem, and tactical styling.
- **Enhanced** `#wx-outlook-card` responsive layout with mobile-first approach, improved header flex behavior, and better toggle grouping.
- **Improved** mobile responsiveness: toggles stack vertically on mobile, horizontal on larger screens, with proper label spacing.
- **Updated** disclaimer styling with tactical border-left accent, better padding, and advisory language formatting.
- **Fixed** component structure with responsive padding (p-4 sm:p-6), larger breakpoints (lg:) for header layout, and semantic grouping of controls.

## 2025-10-19
### Version 1.2.0 WX Outlook Integration
- Deployed `fetchWeatherOutlook` service with NWS-first sourcing and OpenWeatherMap fallback plus shared utilities for compass headings and formatting.
- Added `WeatherOutlookPanel` React component and coordinate form on `src/pages/Wx.tsx` to surface a 5-day forecast with unit toggles and validation.
- Restyled outlook cards with tactical horizontal layout, responsive stacking, and reinforced border/shadow treatments.
- Declared `src/vite-env.d.ts` to expose `import.meta.env` typings for the new OpenWeatherMap key requirement.

## 2025-10-19
### Version 1.1.2 Mobile Readiness
- Locked the viewport scaling behavior in `index.html` so mobile users cannot zoom when focusing inputs, keeping the layout stable.
- **Fixed HashRouter scroll restoration**: Simplified scroll reset to use `location.pathname` dependency and immediate `window.scrollTo(0, 0)` call, removing overcomplicated timing logic that failed to work.
- **Updated contact emails**: Changed placeholder `@tacticalfishingintel.example` addresses to `nospam@sldvr.com` in Privacy Policy and Cookie Consent pages.

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
