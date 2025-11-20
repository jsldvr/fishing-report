# Changelog

## 2025-11-19 v1.3.0

### Version Bump to 1.3.0

- **Updated** package.json and package-lock.json to version 1.3.0
- **Verified** status bar in App.tsx displays new version via package.json import

### Marine Section Visibility Fix

- **Added** `hasMarineDisplayData` helper in `MarineConditions.tsx` to check for station, tide, or metric data before rendering
- **Modified** `ScoreCard.tsx` to conditionally render marine section only when displayable data exists, preventing empty wrappers
- **Updated** `nwsWeather.ts` to omit marine object from weather data when no wave or temperature data is available, reducing payload for inland locations
- **Added** comprehensive Vitest+RTL tests for ScoreCard marine rendering and helper logic, ensuring no empty sections appear
- **Result** Cleaner UI for inland forecasts; marine content only shows when relevant data is present

### Weather Alerts Visibility Fix

- **Modified** `WeatherAlerts.tsx` to return `null` when `activeAlerts` is empty, preventing empty alerts wrapper from rendering
- **Added** Vitest+RTL tests in `WeatherAlerts.test.tsx` to assert no rendering when no alerts, and proper display when alerts exist
- **Result** Cleaner UI when no weather alerts are active; alerts block only appears when relevant

### Fishing Safety Alert Enhancement

- **Enhanced** `assessSafety` in `nwsWeather.ts` to account for all NWS alerts, including Moderate/Minor severity and broadened hazards (winter/snow/fog/flood/smoke/etc.)
- **Implemented** severity-based downgrades: Moderate → FAIR, Minor → GOOD, Severe/Extreme → DANGEROUS
- **Added** hazard keyword downgrades only for EXCELLENT ratings to GOOD
- **Implemented** urgency/certainty nudging only for EXCELLENT ratings to GOOD
- **Updated** recommendations and riskFactors to include alert details and instructions
- **Made** `assessSafety` public and added comprehensive Vitest tests in `nwsWeather.test.ts` covering various alert scenarios
- **Result** More accurate fishing safety ratings that consider all active weather alerts, preventing EXCELLENT ratings when hazards are present

### Fishing Safety Severe Convective Enhancement

- **Expanded** hazard handling in `assessSafety` to include severe-convective keywords (outlook, watch, severe, hail, supercell, meso, tstorm, thunderstorm, tornado, damaging wind, straight-line, downburst, microburst)
- **Implemented** stricter downgrades: severe-convective alerts force rating to at least FAIR, with POOR for high urgency/certainty or elevated weather conditions
- **Updated** Minor alerts to FAIR when severe-convective, Moderate alerts remain FAIR but can downgrade to POOR under severe conditions
- **Enhanced** riskFactors to highlight severe convective hazards separately
- **Added** comprehensive tests for HWO, severe watches, tornado watches, and regression guards for non-severe alerts
- **Result** Prevents GOOD/EXCELLENT ratings for Hazardous Weather Outlooks and severe watches, ensuring safer fishing recommendations

### SPC Outlook Integration

- **Added** `spcOutlook.ts` client to query SPC Day 1 convective outlooks and map risks to fishing safety downgrades
- **Extended** `assessSafety` to accept SPC outlook data, lowering ratings for MRGL/SLGT/ENH/MDT/HIGH categories and recording outlook context
- **Updated** safety tests to cover SPC outlook-driven downgrades
- **Result** Fishing safety now reflects SPC severe weather outlooks even when no local NWS alerts are issued

## 2025-11-19

### Font Awesome Icon Replacement

- **Created** reusable `Icon` component wired to the bundled free Font Awesome sets (solid + regular) so UI elements can reference semantic icon names instead of inline glyphs
- **Replaced** every emoji/glyph UI marker (navigation, cards, alerts, debug panels, forms, etc.) with `<Icon />` usage, ensuring BEM-friendly markup and accessible fallbacks
- **Scrubbed** data strings (e.g., enhanced weather recommendations and alert prompts) to remove emoji prefixes so component-level icons handle all presentation
- **Updated** supporting copy (LocationInput instructions, outlook separators, tide cards) to stick to ASCII separators, preventing stray glyphs outside Font Awesome
- **Validated** the refactor with `npm run lint` to confirm TypeScript and lint rules still pass

## 2025-11-19

### Icon Library Install

- **Added** Font Awesome React packages (`@fortawesome/react-fontawesome`, `@fortawesome/fontawesome-svg-core`, `@fortawesome/free-solid-svg-icons`, `@fortawesome/free-regular-svg-icons`, `@fortawesome/free-brands-svg-icons`) to provide a large, open-source icon set without relying on external CDNs
- **Prepared** codebase to replace existing icons with bundled assets for cross-browser compatibility

## 2025-10-29

### NWS Office Card Accordion Implementation

- **Converted** Local NWS Office card to accordion functionality, closed by default
- **Added** React state management with `useState` for accordion toggle state
- **Implemented** click and keyboard (Enter/Space) handlers for accessibility
- **Applied** existing `mission-timeline-toggle` and `mission-timeline-content` CSS classes for consistent styling
- **Enhanced** with proper ARIA attributes (`aria-expanded`, `aria-controls`, `aria-hidden`) for screen reader support
- **Added** visual toggle indicator (▾) that rotates when accordion opens/closes
- **Enhanced** title to show office name on desktop: "Local NWS Office {officeName}" (hidden on mobile with `hidden sm:inline`)
- **Refined** title formatting by removing dash separator for cleaner appearance
- **Added** responsive utility classes `.hidden`, `.inline`, and `.sm:inline` for mobile-responsive content display
- **Result** Improved UX with collapsible details, consistent with Mission Timeline pattern, better information hierarchy

### NWS Office Card Content and Styling Updates

- **Updated** card title from "Your Local NWS Office" to "Local NWS Office" for more concise labeling
- **Converted** NWSOfficeInfo component from custom blue theme to standard `.card` styling
- **Replaced** `bg-blue-50 rounded-lg border border-blue-200` with `card p-6` class
- **Updated** all text colors from blue theme (`text-blue-900`, `text-blue-700`, etc.) to semantic colors (`text-primary`, `text-secondary`)
- **Standardized** border colors to use CSS custom properties (`var(--border-primary)`)
- **Result** Consistent visual design across all cards, better theme compatibility, cleaner maintenance

### Results Page Summary Cards ID Selectors

- **Added** comprehensive id selectors to all summary cards in Results page
- **Enhanced** Overall Outlook card with `overall-outlook-card`, `overall-outlook-title`, `overall-outlook-score`, `overall-outlook-label` ids
- **Enhanced** Best Day card with `best-day-card`, `best-day-title`, `best-day-date`, `best-day-score` ids
- **Enhanced** NWS Office card with `nws-office-section`, `nws-office-card` ids and internal element ids
- **Updated** NWSOfficeInfo component to accept optional `id` prop with cascading internal element ids
- **Result** Full compliance with project HTML conventions, improved testability and CSS targeting

### Results Page NWS Office Information Optimization

- **Moved** NWS Office information from individual forecast cards to shared section at top of results page
- **Added** NWS Office section below Overall Outlook and Best Day summary cards
- **Removed** duplicate NWS Office displays from each forecast card to reduce repetition
- **Enhanced** user experience by providing local office information once at top level
- **Result** Cleaner forecast cards, better information hierarchy, reduced visual clutter

## 2025-10-25

### Pre-Merge Version Validation & Package Fix

- **Added** new workflow `validate-release.yml` for pre-merge version validation
- **Added** support for both `release/*` and `fix/*` branch patterns
- **Added** detailed error messages with fix instructions for version mismatches
- **Fixed** package.json version updated from 1.2.2 to 1.2.3 to match release branch
- **Enhanced** PR validation runs on open, sync, and reopen events
- **Result** Prevents merging PRs with version mismatches, catches issues before merge

## 2025-10-25

### Release Workflow Enhancement

- **Changed** automatic release trigger from push to release branches to PR merge into main
- **Added** condition that release only triggers when PR is merged (not just closed)
- **Added** validation that source branch starts with `release/` prefix
- **Enhanced** branch version extraction to use PR head ref instead of current branch
- **Result** More controlled release process - releases only happen on successful merges to main

## 2025-10-25

### NOAA Marine Station Selection Fix

- **Fixed** bug where inland locations (e.g., Milton, WI) returned distant coastal stations (e.g., Quantico, VA at 1000+ km)
- **Root Cause:** Algorithm only searched for `tidepredictions` stations, excluding Great Lakes/inland stations
- **Changed** `findNearestStation` to search multiple station types in priority order:
  1. `waterlevels` - Great Lakes, rivers, coastal water levels
  2. `meteorology` - Widespread weather stations
  3. `wind` - Wind monitoring (Great Lakes friendly)
  4. `watertemperature` - Water temperature monitoring
  5. `tidepredictions` - Coastal tide predictions (fallback only)
- **Added** comprehensive test suite (`tests/noaaFix.test.ts`, `tests/noaaMarine.test.ts`) demonstrating issue and fix
- **Created** `src/lib/noaaStationTypes.ts` documenting NOAA CO-OPS station types and selection strategy
- **Result:** Inland locations now find appropriate regional stations (~90km) instead of distant coastal stations

## 2025-10-25

### Playwright Removal

- **Removed** Playwright dependencies and all E2E testing infrastructure
- **Deleted** playwright.config.ts, e2e/ directory, and playwright-report/ directory
- **Removed** Playwright GitHub Actions workflow (.github/workflows/playwright.yml)
- **Removed** all Playwright-related npm scripts (test:e2e, test:e2e:ui, test:e2e:debug, test:e2e:headed, test:codegen)
- **Updated** AGENTS.md policy to remove Playwright testing requirements
- **Cleaned** node_modules and package-lock.json to remove Playwright packages

## 2025-10-24

### React Router Future Flags

- **Added** React Router v7 future flags to eliminate deprecation warnings
- **Configured** `v7_startTransition: true` for React.startTransition wrapping
- **Configured** `v7_relativeSplatPath: true` for relative route resolution

### WX Page Simplification

- **Removed** interactive weather functionality from WX page (`#wx-location-card` and `#wx-outlook-card`)
- **Simplified** WX page to static resource page only
- **Eliminated** all location detection, coordinate input, and weather forecast components
- **Preserved** static weather resource links and preparedness guides

### Playwright E2E Testing Setup

### Playwright E2E Testing Setup

- **Added** Playwright test framework with comprehensive browser support (Chromium, Firefox, WebKit)
- **Configured** automatic dev server startup for E2E tests using Vite preview mode
- **Created** fishing-forecast.spec.ts with 10 tests covering core application functionality:
  - Homepage title and content validation
  - Location input form testing (text input and coordinate inputs)
  - Feature cards display verification
  - Navigation flow from home to results page
  - Coordinate geocoding functionality
  - Mobile responsive viewport testing
  - Form validation and button states
- **Enhanced** components with data-testid attributes for reliable test targeting:
  - `data-testid="weather-alerts"` on WeatherAlerts component
  - `data-testid="marine-conditions"` on MarineConditions component
  - `data-testid="score-card"` on ScoreCard component
- **Installed** VS Code extensions for improved testing workflow:
  - Playwright Test for VSCode (already installed)
  - Playwright Test Runner for individual test execution
- **Added** comprehensive test scripts in package.json:
  - `test:e2e` - Run all E2E tests
  - `test:e2e:ui` - Interactive UI mode
  - `test:e2e:debug` - Debug mode with step-through
  - `test:e2e:headed` - Headed mode for visual debugging
  - `test:codegen` - Record interactions to generate test code
- **Created** PLAYWRIGHT_SETUP.md documentation with testing patterns and troubleshooting guide
- **Verified** all 10 tests pass across Chromium browser with 23.7s execution time

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
