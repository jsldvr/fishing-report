# Changelog

## 2026-11-21 v1.7.0

### Version Bump to 1.7.0

- **Updated** `package.json` and `package-lock.json` (root `version` and `packages[""].version`) to version 1.7.0 to match the `release/1.7.0` branch; the user-facing location, calendar, theme, and PWA changes below warrant the SemVer minor bump. This release also ships the 2026-09-27 public app name change, which was recorded before this bump

### PWA Manifest, Scope, and Offline Navigation

- **Fixed** the duplicate manifest link: removed the root-relative `<link rel="manifest" href="/manifest.webmanifest">` from `index.html`, leaving the single link vite-plugin-pwa injects with the deployment base
- **Derived** every PWA URL in `vite.config.ts` from one normalized base (`normalizeBasePath`, `/` or `/fishing-report/`): manifest `id`, `start_url`, and `scope` are all the base, and the Workbox `navigateFallback` is `<base>index.html`, so the app never launches or falls back outside its own scope
- **Replaced** `public/404.html` (which redirected to the origin root) with a build-time `404.html` emitted by a small Vite plugin that forwards a deep path to the matching hash route under the base; **removed** the unlinked `public/manifest.json`, whose `start_url: "/"` and `#2563eb` theme color diverged from the real manifest
- **Identity migration**: installs made before this change had no manifest `id`, so their computed identity was the origin root (`start_url: "/"`), which also launched outside the `/fishing-report/` scope. The new stable id `/fishing-report/` is a different app identity; browsers treat it as a new app, and users with an earlier install must reinstall and may remove the old icon. Saved spots and history are origin-scoped `localStorage` and are unaffected
- **Added** `scripts/verify-pwa-build.ts` (`npm run verify:pwa -- --base <base>`): fails a build with more or fewer than one manifest link, a missing or wrong `id`, a `start_url` outside scope, missing icons, a service worker registered for a different scope, an offline fallback outside the base or not precached, a zoom-restricting viewport, a missing `color-scheme` meta, or a 404 redirect outside the base; it rejects the previously reviewed `/fishing-report/` build
- **Added** `playwright.pwa.config.ts` and `e2e/pwa/pwa.spec.ts` (`npm run test:e2e:pwa`), which build for `/fishing-report/`, serve with `vite preview`, and check the single in-scope manifest, Chromium installability through CDP (`Page.getAppManifest` and `Page.getInstallabilityErrors` report no errors), and offline reloads and deep links served by the service worker inside the base

### Zoom and Reflow

- **Removed** `maximum-scale=1.0, user-scalable=no` from the viewport meta so mobile users can pinch-zoom
- **Added** browser checks that Home (including the location error state), the My Forecasts drawer, and Results keep every visible control inside the viewport at 320 CSS px (1280 px at 400%) and 640 CSS px (1280 px at 200%); controls are measured individually because `body` hides horizontal overflow

### Location Validation, Errors, and IME-Safe Search

- **Fixed** stale-coordinate submission: `LocationInput` now reports the validity of the visible fields (`onValidityChange`), and Home disables Get fishing outlook while a field is empty or out of range, so a forecast can no longer launch with the last valid shared draft; the blocked-state message ("Fix the location above to continue.") is linked to the button with `aria-describedby`
- **Added** per-field errors for latitude and longitude (empty, non-numeric, outside 14 to 83 or -180 to -50), shown after the user leaves the field; each field exposes `aria-invalid` (always `true` or `false`) and lists its error id in `aria-describedby` only while the error is shown; a new error is announced once through one polite live region about 500 ms after blur
- **Made** Enter in the search box IME-safe: it does nothing while `isComposing` is true or `keyCode` is 229 (Safari delivers `compositionend` before the confirming keydown)
- **Replaced** blocking `alert()` messages for search and device location failures with a `role="status"` message in the location panel; wording is unchanged
- **Added** BEM classes and ids to the changed interactive nodes (`location-input__search-field`, `location-search-button`, `location-input__coordinate`, `use-my-location-button`, `home__generate-button`, `theme-toggle`)

### Location Privacy

- **Removed** browser logging of coordinates and raw IP lookup responses: every `console` call in the location flow, and the coordinates in the NWS, Open-Meteo, and `[marine]` diagnostics in `src/lib/enhancedWeather.ts`
- **Moved** the IP fallback into `src/lib/locationLookup.ts` with the same services in the same order (ipapi.co, ip-api.com, ipinfo.io) and the same parsing; it still runs automatically when device location is denied or unavailable, and no consent gate or tracking was added
- **Added** a notice next to Use my location, linked to the button with `aria-describedby`, that explains the IP fallback and names the three services before the user invokes it, with a link to the Privacy Policy
- **Added** a "Location Lookup and Third-Party Services" section to the Privacy Policy describing device location, the IP fallback and what each service receives, the Photon geocoder, the weather and tide services that receive forecast coordinates, and what is kept in `localStorage`; the subtitle now notes the November 21, 2026 update

### Calendar Dates and Fishing-Location Times

- **Fixed** `getCurrentDateISO`, which returned the UTC date (already tomorrow in a North American evening); it now returns today in the viewer's zone, or in an explicit IANA zone
- **Fixed** `addDaysToDate`, which parsed local midnight and read back the UTC date, shifting a day for viewers east of UTC; calendar arithmetic is now zone-free
- **Fixed** the forecast default and earliest selectable start date, which used the viewer's today: a viewer in Auckland planning for Anchorage could not select Anchorage's current day. The default draft date, the date picker's `min`, and its uncontrolled default now use the fishing location's today (`getLocationTodayISO`, `DateRangePicker` `timeZone` prop). The draft records whether the start date was chosen (`startDateChosen`): a date passed by a valid Results URL is always a choice, even when it equals the previous default, while the date picker's own changes count only when they differ from the current date (it echoes its value on mount). An unchosen default follows the new location's today when the location moves, and a chosen date is kept
- **Added** calendar and zone helpers in `src/lib/time.ts` (`calendarDateInZone`, `daysBetweenDates`, `zonedWallTimeToInstant`, `zonedDayBounds`, `hourInZone`, `formatCalendarDate`, `describeCalendarDateInZone`, `formatTimeInZone`) built on `Intl.DateTimeFormat` with explicit IANA zones and cached formatters; Temporal is not used because Safari does not ship it
- **Fixed** `getTimezoneOffsetMinutes`, which only matched two-digit hours and parsed ICU's `GMT-5` as UTC; sun and moon times were unaffected because the error cancelled out, as verified by comparing old and new output across 108 location, date, and moon-phase cases
- **Fixed** the ScoreCard date subtext, which formatted the UTC midnight of the forecast date in the location zone and showed the previous evening (for example `11/20/2026, 07:00:00 PM EST` for Nov 21); it now shows the calendar date and zone (`11/21/2026 EST`), and card headings format the calendar date without any zone shift
- **Fixed** tide times in Coastal Conditions and the Next high/low tide recommendations, which used the viewer's zone; they now use the fishing location's zone, and the tide events kept for a day are the location's local day instead of the UTC day (NOAA predictions are still requested in GMT across the date and the next day)
- **Fixed** NWS grid value selection: interval `validTime` values such as `2026-11-21T16:00:00+00:00/PT1H` failed to parse, so the daylight filter never matched and the first UTC-day value (the previous local evening) was used; values are now selected by start instant within the location's local day and averaged over local daylight hours, using the NWS point's own `timeZone`
- **Fixed** Open-Meteo `forecast_days`, which was counted from the UTC date and could omit the last requested day in a North American evening; it is now counted from the location's today
- **Fixed** the solunar day rating, which read moon-transit and solar-noon hours in the viewer's zone; it now reads them in the location's zone
- **Unchanged**: bite-score weights, source selection order, and the barometric trend; the trend still anchors at 12:00 UTC and still parses interval `validTime` values as NaN (see Known Issues)

### System-Aware Theme

- **Fixed** the initial theme flash: an inline pre-paint script in `index.html` applies a stored override to `<meta name="color-scheme">` and `:root[data-color-scheme]` before first paint; with no override the document declares `light dark` and follows the system without JavaScript
- **Changed** the theme model to the system default plus explicit overrides (`src/lib/colorScheme.ts`, `src/state/useColorScheme.ts`): the floating toggle switches to the opposite of what is rendered, stores it only when it differs from the system, and removes the stored value when it matches, so an override can always return to the system; a pinned override survives later system changes, other tabs stay in sync, and blocked storage still applies the scheme for the page view. The existing `theme` key is kept so earlier overrides still apply
- **Synchronized** the root `color-scheme` property with the override and converted the theme tokens in `src/index.css` to `light-dark()`, so tokens, form controls, scrollbars, and the canvas follow the same scheme, including live system changes; removed the JavaScript-only `[data-theme="dark"]` rules. An attribute maps the override instead of `:root:has(> head > meta[...])`, which measured 15 to 50 ms of added Total Blocking Time
- **Darkened** the light `--text-tertiary` token from `#64748b` (4.24:1 on the page background) to `#5d6c82` (4.76:1), the only axe violation found on Home and Results; the dark value is unchanged

### Narrow Header and Install App Contrast

- **Fixed** the header Install App label contrast: it used `.btn-secondary`'s page text color, which in the light scheme is `#14231d` on the always-dark `--deep-water` header (`#102820`), 1.04:1. It now uses the header's light-on-dark control treatment (`.header-brand__install`, with a `--sand` focus outline). This was the `color-contrast` failure (weight 7) behind the hosted Lighthouse accessibility score of 0.95 (run 45104060003, job 137461189574): Chrome on Linux fires `beforeinstallprompt`, so the button rendered there but not in local Windows runs. Reproduced at 0.95 with the same audit in Ubuntu 24.04 (WSL) at ce0a684; 0.99 after the fix, with only the pre-existing `aria-allowed-role` remaining
- **Changed** the header to two rows at 480px and below: the My Forecasts trigger and title on the first row, and version, timestamp, and Install App (`.header-brand__meta`, which is `display: contents` on wider screens) on the second, with the menu toggle at the end. DOM and focus order are unchanged, the row keeps the Install App height so the button's late appearance shifts nothing (CLS 0), and the squeezed single-row sizes (0.78rem title, 0.53rem pills, 0.55rem button without its icon) were removed in favor of the 640px sizes. The single row failed in CI Firefox and WebKit at 320px with 1.40px and 1.73px of Install App to menu clearance (run 45104059971); in Ubuntu Firefox the rename to "Fishing Forecast" widened the title by 11.78px, and the clearance is now 69.05px
- **Updated** the browser checks: `e2e/header.spec.ts` checks the two-row layout at 320, 360, 375, 390, 412, and 480px (row membership, order, containment, overflow, menu clearance, and keyboard order from the trigger to Install App to the menu toggle, which opens and closes the menu) and the single row with Install App at 481, 560, and 640px; `e2e/mission-drawer.spec.ts` expects the metadata on the second row at 480px and below; `e2e/web-hardening.spec.ts` adds axe scans of Home with Install App visible at 1280, 412, and 320px in light and dark, dispatching the synthetic install prompt only after the app subscribes to it (an earlier dispatch is lost on WebKit); the light scan fails on the previous styles with the same 1.04:1 finding

### Release Gates

- **Fixed** the lint failures: the unused `photonError` binding, the `Date.now()` render-purity error in `ScoreCard` (relative ages are now measured from first render), and the Fast Refresh warning (`hasMarineDisplayData` moved to `src/lib/marineDisplay.ts`)
- **Added** `.github/workflows/quality.yml` for pull requests to `main`, manual dispatch, and `workflow_call`: lint, type-check, Vitest with coverage, the changed-file coverage gate, PWA builds verified and HTML-validated for `/` and `/fishing-report/`, and Lighthouse CI
- **Gated** deployment: `.github/workflows/pages.yml` now calls `quality.yml` and `playwright.yml` (Chromium dev-server and PWA suites, including the axe scans) as reusable workflows, and `build-and-deploy` `needs` both, so a failing, cancelled, or unfinished gate blocks the deploy of that commit; the deploy job re-verifies and HTML-validates the exact artifact it uploads. Its duplicate lint, type-check, and test steps were removed because the gates run them. `playwright.yml` takes a `cross-browser: skip` input from the caller so Firefox and WebKit keep the `AGENTS.md` schedule instead of running on every deploy
- **Added** HTML validation required by `AGENTS.md`: `html-validate` 11.21.1 (dev dependency; lockfile additions are limited to its graph) with `.htmlvalidate.json` extending `html-validate:recommended` (`valid-id` in its HTML5 `relaxed` mode, because vite-plugin-pwa injects `id="vite-plugin-pwa:register-sw"`). `npm run lint` now also runs `lint:html` on `index.html`, and `lint:html:dist` validates the built `index.html` and `404.html`. `index.html` and the 404 template now use an uppercase DOCTYPE and unclosed void elements
- **Added** `scripts/check-changed-coverage.ts` (`npm run coverage:changed -- --base <ref>`): fails when any changed file that Vitest instruments is below 80% line coverage; changed means committed, working-tree, and untracked changes since the merge base, and thresholds below 80 are refused. Vitest now writes a `json-summary` report; the new Playwright and Lighthouse configs are excluded from coverage as runner config, like `playwright.config.ts`
- **Added** `lighthouserc.cjs`: the root production build under `vite preview`, default mobile emulation and simulated throttling, median of three runs, asserting LCP <= 2500 ms, CLS 0, and category floors equal to the `main` medians at 7ae0196 (performance 0.98, best practices 1, SEO 0.91), with accessibility ratcheted from 0.93 to this change's 0.99; the filesystem target writes the reports to `lighthouse-reports/`
- **Added** the PWA Playwright suite to `.github/workflows/playwright.yml` on the same engine schedule as the existing suite, and lint plus PWA verification to `.github/workflows/pages.yml` before deployment
- **Added** `e2e/web-hardening.spec.ts`: reflow at 320 and 640 CSS px, the color scheme on the first animation frame for the system and override states, root and native-control `color-scheme`, live system changes, return to system, and axe WCAG 2.2 AA scans with zero violations for Home, the location error state, Privacy, and Results (mocked weather) in light and dark; axe waits for entrance animations to finish
- **Added** focused unit and component tests: `src/lib/time.test.ts` (late-evening dates, positive and negative viewer zones, DST days of 23 and 25 hours, headings, location-zone time labels, solunar output independent of the viewer's zone), `src/lib/openMeteo.test.ts`, `src/lib/nwsWeather.fetch.test.ts`, `src/lib/noaaMarine.tides.test.ts`, `src/lib/enhancedWeather.fetch.test.ts` (including no coordinates in console output), `src/lib/locationLookup.test.ts`, `src/components/LocationInput.test.tsx`, `src/components/MarineConditions.test.tsx`, `src/pages/Home.location.test.tsx`, `src/state/useColorScheme.test.tsx`, plus additions to `ScoreCard.test.tsx`, `LegalPages.test.tsx`, and `App.test.tsx`
- **Moved** the jobs that run `html-validate` (the `checks` and `pwa-build` jobs in `.github/workflows/quality.yml` and `build-and-deploy` in `.github/workflows/pages.yml`) from Node 20 to Node 24: `html-validate` 11 requires Node `^22.22.0 || >=24.8.0`, and its CLI fails on Node 20 with `TypeError: fs.globSync is not a function`. The validator version and rules are unchanged; the other jobs keep Node 20
- **Bounded** `npm run test:coverage` to four Vitest workers (`--maxWorkers=4`, the vCPU count of a GitHub-hosted Ubuntu runner): with the default worker count on a 22-CPU machine, coverage-instrumented component tests in `MissionDrawer.test.tsx` and `Home.location.test.tsx` exceeded the 5000 ms test timeout, although they pass in about 2 s alone. Tests and the timeout are unchanged
- **Kept** the Lighthouse reports from passing and failing runs: the first hosted Lighthouse job (run 45104060003) failed accessibility at 0.95 but kept nothing, because `actions/upload-artifact@v4` skips hidden paths such as `.lighthouseci` by default. `lighthouserc.cjs` now writes to the non-hidden `lighthouse-reports/` (gitignored), and the `quality.yml` Lighthouse job uploads only its `*.report.html`, `*.report.json`, and `manifest.json` as the `lighthouse-reports` artifact whenever the LHCI step ran, with `if-no-files-found: error` so missing reports fail the job; LHCI's internal `.lighthouseci` store is not uploaded
- **Upgraded** `@playwright/test` from 1.62.1 to 1.64.0 (lockfile changes are limited to `@playwright/test`, `playwright`, and `playwright-core`; browsers move to WebKit 27.2, Chromium 156, and Firefox 157, still installed by `npx playwright install --with-deps`; Node `>=20`, so `playwright.yml` keeps Node 20). The first Linux WebKit run of the PWA suite (run 45263958765, job 138005799731) failed the offline test at `page.reload()` with "WebKit encountered an internal error". This is Playwright's WebKit offline emulation (microsoft/playwright#42775, fixed by #42894 in 1.64.0), not the service worker or test timing. In the CI image (Ubuntu 26.04, Node 20.20.2) with 1.62.1, a controlling worker with the precached shell failed every navigation after `context.setOffline(true)`, with or without a 3 s settle, but served both the About reload and the deep path (200, from the service worker) when the origin was actually stopped. A framework-free worker failed the same way, while Chromium and Firefox passed. The PWA suite failed 5 of 5. With 1.64.0 the same probes pass, the WebKit PWA suite passed 10 of 10, and both the dev-server and PWA suites pass on all three engines. A navigation with no worker still fails offline, and the test still fails with `navigateFallback` removed. The Windows-only WebKit `fixme` on the offline test was removed because the test now passes there
- **Documented** the new commands and gates in `README.md`

### Known Issues

- The NWS barometric trend still parses interval `validTime` values with `new Date()`, which yields NaN, so it reports STEADY whenever the feed uses the interval form. Fixing it changes bite scores and was left for an explicit decision
- Weather outlook day labels on the Wx page (`src/lib/weatherOutlookUtils.ts`) are formatted in the viewer's zone and can shift a day for the OpenWeatherMap fallback; that module was outside this change
- Lighthouse reports pre-existing `aria-allowed-role` (the Forecast window heading uses `role="button"`) and `robots-txt` findings; both are reflected in the category floors and were not changed
- Unchanged: forecast scoring weights, weather-source order, the drawer implementation, authentication, backend, tracking, and the repository name

## 2026-09-27

### Public App Name: Fishing Forecast

- **Changed** the `README.md` heading and opening description from "Tactical Fishing Intel Platform" to "Fishing Forecast", described as an open source, static browser app that people can run locally or deploy to any static host; clone and deployment instructions and the `jsldvr/fishing-report` repository path are unchanged
- **Renamed** the public app name from "Fishing Report" to "Fishing Forecast" in the header `.brand-title` (`src/App.tsx`), the Home hero (`src/pages/Home.tsx`), the Cookie Consent, Compliance Statement, Privacy Policy, and Terms of Service pages, and the `src/index.css` banner comment
- **Verified** the browser title (`index.html`), generated PWA manifest (`vite.config.ts`), `public/manifest.json`, `public/404.html`, About, and Results already use "Fishing Forecast" and remain aligned
- **Updated** exact header-name expectations in `src/App.test.tsx`, `e2e/header.spec.ts`, and `e2e/mission-drawer.spec.ts`
- **Added** `src/pages/LegalPages.test.tsx`, which renders the Compliance Statement, Cookie Consent, Privacy Policy, and Terms of Service pages, asserts each names the app "Fishing Forecast" with no remaining "Fishing Report", and confirms the Privacy Policy domain wording is unchanged; this brings those previously untested changed files to the `AGENTS.md` 80% line-coverage threshold
- **Unchanged**: the `jsldvr/fishing-report` repository name and URLs, the `fishing-report` package name, the `/fishing-report/` deployment base path, `fishing-report.*` localStorage keys, third-party API User-Agent identifiers, asset filenames, the Privacy Policy "fishing-report domain" wording, application behavior, and the version (still 1.6.0)

## 2026-09-07 v1.6.0

### Version Bump to 1.6.0

- **Updated** `package.json` and `package-lock.json` (root `version` and `packages[""].version`) to version 1.6.0; a new user-facing feature warrants the SemVer minor bump

### Global Saved Spots and Recent Forecasts Drawer

- **Moved** the Home `#mission-panel` (Saved spots and Recent forecasts) into a new global, GitHub-inspired left modal drawer in `src/components/MissionDrawer.tsx`, opened from every SPA route by an always-visible hamburger placed immediately before the `.brand-title` in `src/App.tsx`
- **Removed** the inline Saved spots and Recent forecasts panel from `src/pages/Home.tsx` main content; the hero location and date controls remain
- **Preserved** the `fishing-report.mission-state.v1` localStorage schema (schema version 1, 10-record history cap), every label and explanatory string, the save/select/run/rename/delete/rerun semantics, the native rename `prompt` and delete `confirm`, and the "last 5 shown, up to 10 kept" display limit
- **Added** application-level shared state in `src/state/`, mounted by `src/App.tsx`: `MissionProvider` owns the persisted mission state, the forecast draft (`lat`, `lon`, `name`, `startDate`, `days`), and the shared saved-spot name draft; `useMissionActions` centralizes record-history-and-navigate so Home and the drawer share one code path; `missionContext` exposes the value and the `useMissionContext` hook (`src/main.tsx` is left as the unchanged ReactDOM bootstrap)
- **Preserved** the saved-spot name behavior across the move: a named location (typed search or selected waypoint) prefills the shared Spot name draft, the drawer's Spot name field is bound to it, and the primary Home forecast still uses it as the forecast-name fallback (location name, then Spot name draft, then no name)
- **Added** `src/state/ResultsDraftSync.tsx`: a valid direct `/results` URL (`lat`, `lon`, `startDate`, `days`, `name`, validated exactly as the existing Results page validates) becomes the active draft; other routes retain the last active draft; opening a Results URL never records forecast history
- **Defaulted** the draft to latitude 40.7128, longitude -74.006, the current local date, and 3 days when no valid active draft exists
- **Made** `src/components/DateRangePicker.tsx` accept controlled `startDate` and `days` props so Home's date controls read and write the shared draft; the uncontrolled default behavior is unchanged
- **Loaded** mission state once through the existing storage layer and write it back only on genuine changes, so React Strict Mode produces no duplicate writes or history records
- **Replaced** the mobile navigation hamburger/X control in `src/App.tsx` with the existing caret icon: a down caret when closed and an up caret (`data-open="true"`, 180deg rotation) when open, exposing `aria-expanded`; navigation destinations and content are unchanged
- **Coordinated** overlay state in `src/App.tsx`: opening the drawer closes the mobile navigation and vice versa, and a route change clears any stale open state for both
- **Implemented** the W3C modal dialog pattern for the drawer: `role="dialog"`, `aria-modal="true"`, an accessible title, focus moved into the panel on open, a focus trap that treats the panel container and anything outside it as the wrap boundary so Tab and Shift+Tab (including a Shift+Tab issued immediately after opening) always land back on a control inside the dialog, focus returned to the hamburger on close, `inert` plus `aria-hidden` on `#app-shell` while open, a locked `document.body` scroll, and Escape / backdrop / close-button dismissal, with all listeners, `inert`, and body styles cleaned up on close and unmount
- **Exposed** `aria-expanded` and `aria-controls="mission-drawer"` on the hamburger trigger; the drawer renders through a portal to `document.body` and is `hidden` (no layout impact) when closed; user-entered spot names render through normal React text escaping (no `dangerouslySetInnerHTML`)
- **Styled** the drawer in `src/index.css` with the existing design tokens: a left-anchored, full-viewport-height single-column sheet that scrolls internally, capped near 480px on desktop and `calc(100vw - 2.5rem)` at <=480px so the dim backdrop stays visible at 390px and 320px, with `env(safe-area-inset-*)` padding, no horizontal overflow, and `prefers-reduced-motion` honored; removed the now-unused `.hamburger-line` rules
- **Laid out** each saved-spot card with explicit `.mission-drawer__list-row` / `.mission-drawer__waypoint-actions` rules (the project's utility CSS has no `flex-wrap` class): the four `btn-sm` actions wrap on their own full-width row as an even two-up grid at <=480px, so Select / Run / Rename / Delete are never clipped by the panel edge at 390px or 320px; saved-spot and history names use `overflow-wrap: anywhere` so an unbounded single-token name wraps instead of widening the scrolling body
- **Added** `@axe-core/playwright` (4.13.0) as the only new development dependency; lockfile changes are limited to the two root version fields and the `@axe-core/playwright` / `axe-core` graph
- **Added** unit and component coverage: `src/state/MissionProvider.test.tsx`, `src/state/ResultsDraftSync.test.tsx`, `src/components/MissionDrawer.test.tsx` (including saved-spot-name prefill and forecast-name fallback regressions), a rewritten `src/pages/Home.test.tsx` (panel absent, shared-draft wiring) and `src/App.test.tsx` (hamburger placement and ARIA, every close path, focus entry / immediate Shift+Tab and repeated forward/reverse trap / return, inert and body-scroll lock with cleanup, navigation/drawer mutual exclusion, caret open/closed state); tests use `data-testid` hooks per `AGENTS.md`
- **Added** Playwright coverage in `e2e/mission-drawer.spec.ts`: desktop and mobile drawer layout, a populated saved-spot card at 390px and 320px asserting no action-button is clipped and the scrolling body has no horizontal overflow, header layout at 1280/800/390/320, the existing Install-button scenario, immediate and repeated forward/reverse focus trap and return, Escape and backdrop closing, browser-level Save / Select / Run / Rerun navigation (weather hosts aborted, no live-service dependency), the mobile navigation caret, mutual exclusion, internal drawer scrolling, body-scroll lock, hash-aware route availability on a real non-Home route, and `@axe-core/playwright` scans on Home and a non-Home route with the drawer open; the `openDrawer` helper waits for the slide-in to settle before reading geometry; `e2e/header.spec.ts` updated for the new hamburger
- **Tuned** `playwright.config.ts` for the browser release gate: CI runs serially with `retries: 0` and `failOnFlakyTests: true` so any non-first-try failure blocks release; local dev keeps `retries: 1` only to avoid re-running the whole suite over an occasional slow browser-process launch under parallel load
- **Unchanged**: authentication, backend/cloud sync, the mission storage schema, forecast and weather calculations, Results validation rules, navigation destinations and copy, and the theme toggle

### UAT Drawer Polish

- **Renamed** the drawer title from "Saved spots and recent forecasts" to "My Forecasts" in `src/components/MissionDrawer.tsx`; aligned the hamburger trigger's accessible label ("Open My Forecasts" in `src/App.tsx`) and the close control's accessible label ("Close My Forecasts") to match; the internal "Saved spots" and "Recent forecasts" section headings and all saved/recent content, actions, storage, routing, and modal behavior are unchanged
- **Removed** default browser list markers and indentation from the populated Saved spots and Recent forecasts lists with a new `.mission-drawer__list` reset (`list-style: none`, no margin, no padding) applied to both `<ul>` elements in `src/index.css`; card spacing, borders, action layout, long-name wrapping, and empty-state copy are unchanged
- **Restyled** `.mission-drawer__close` in `src/index.css` as a dedicated icon-only X control: removed the generic `.btn.btn-secondary` classes from the button in `src/components/MissionDrawer.tsx`, replaced with a transparent-at-rest, borderless 44x44 CSS-pixel target using existing design tokens for hover/active (`--bg-tertiary`, `--text-primary`) and `:focus-visible` (`--border-focus`); still a native `button` with an accessible name, keyboard activation, and the existing close/focus-return behavior
- **Added** a targeted `margin-right` on `.header-brand__drawer-toggle` at the existing <=640px and <=480px breakpoints in `src/index.css` so the hamburger keeps at least 8 CSS pixels of separation from "Fishing Report" at 320px, 375px, and 390px, without widening the shared `.header-brand` `gap` that governs the tightly-tuned version/timestamp/Install App/menu-toggle spacing
- **Extended** `e2e/mission-drawer.spec.ts`: the header-row test now covers 375px and asserts the trigger-title gap is at least 8px at every mobile width; added a computed-style check that both populated lists resolve `list-style-type: none` with zero margin/padding, and a check that the close control is >=44x44px, contained within the panel, transparent and borderless at rest, and shows a `:focus-visible` outline on keyboard focus; updated the dialog accessible-name assertions (here and in `src/App.test.tsx`) to "My Forecasts"
- **Unchanged**: mission data, storage, shared draft state, forecast/weather behavior, routing destinations, the focus trap and modal lifecycle, drawer dimensions, and mobile navigation behavior; `package.json` and `package-lock.json` remain at 1.6.0

### Cross-Browser 320px Header Spacing Fix

- **Fixed** a Linux Firefox/WebKit-only regression (CI jobs 106188024827 and 106188024873, run 35551890041) where the Install App-to-menu-toggle clearance at 320px measured only 2.25px/2.61px against the then-4px assertion. With `justify-content: space-between` and exactly two `.header-content` children, the rendered gap equals `(available width) - (.header-brand content width) - (.header-nav width)`, independent of any explicit `gap` value on either container once the wider Linux serif/mono font fallbacks push `.header-brand`'s content close to its available width; the prior narrow-mobile hamburger-to-title `margin-right` fix reduced that leftover further, exposing the failure
- **Recovered** real, font-independent width at the existing `max-width: 480px` breakpoint in `src/index.css` rather than widening any nominal gap (which this layout mechanics make a no-op): `.header-container` padding `0.3rem` to `0.2rem`, `.header-brand`'s shared internal `gap` `0.18rem` to `0.14rem`, `.app-version`/`.timestamp` horizontal padding `0.2rem` to `0.15rem`, and `.header-brand .btn` (Install App) horizontal padding `0.26rem` to `0.2rem`; no header content is hidden, truncated, or resized in a way that clips text
- **Preserved** the My Forecasts trigger-to-title gap (pure margin + gap, not font-width-dependent) comfortably above its 8px floor: measured 9.42-9.43px locally after the `.header-brand` gap reduction, versus 10.06-10.08px before
- **Raised** `MIN_INSTALL_MENU_GAP_PX` in `e2e/header.spec.ts` from 4 to 8, and added an explicit `.header-brand` `scrollWidth`/`clientWidth` no-overflow assertion alongside the existing `.header-content` one, so a shrunk `.header-brand` box with overflowing children (a false pass) fails loudly instead of silently eating into the measured clearance; no existing visibility, row-alignment, pairwise-overlap, containment, or overflow assertion was weakened
- **Verified** locally (Windows) across Chromium, Firefox, and WebKit: 320px Install App-to-menu-toggle gap ~25.5-25.6px (up from ~14.7px), 5x-repeated zero-retry Firefox and WebKit runs stable at the same value, and the full `CI=1 npx playwright test` suite (serial, zero retries) at 54/54; no local Linux Playwright environment was available to reproduce the Ubuntu CI font metrics directly (an existing WSL Ubuntu-24.04 distro has no Linux Node or Playwright browsers installed, and standing that up was treated as new infrastructure requiring approval), so jobs 106188024827 and 106188024873 remain unverified until the user pushes and reruns CI
- **Unchanged**: `App.tsx` markup, `playwright.config.ts`, `.github/workflows/playwright.yml`, `package.json`, and `package-lock.json` (still 1.6.0)

### Cross-Browser Drawer Style Test Fix

- **Fixed** a brittle assertion in the My Forecasts close-control style test (`e2e/mission-drawer.spec.ts`) responsible for Ubuntu WebKit CI job 106192124294 (run 35553359181) failing at line 260 before ever reaching the keyboard-focus check: the resting-background assertion matched only the two literal strings `"rgba(0, 0, 0, 0)"` and `"transparent"`, which does not cover every engine's serialized form of a fully transparent computed color; the CI job's own log did not report its computed color, so the exact value that failed there is unknown -- the patch below addresses both this potential serialization difference and the separately verified hover/transition race, either of which could explain it
- **Added** a top-level `backgroundAlpha(locator)` helper that reads a locator's computed `backgroundColor`, paints it onto a cleared 1x1 canvas primed with an opaque sentinel fill, and reads back `getImageData(...).data[3]`; the resting-background check now asserts the parsed alpha is exactly `0` (not a string match), with the raw computed value and parsed alpha included in the failure message; an unparseable color leaves the opaque sentinel in place and fails the assertion rather than passing silently
- **Diagnosed and fixed a second, real defect in the test itself**: a five-repeat local Firefox run reproduced the failure with `backgroundColor="rgb(238, 243, 239)"`, which is exactly `--fog`, reached through `--neutral-100`/`--bg-tertiary` -- the background `.mission-drawer__close:hover, :active` applies. `openDrawer` leaves Playwright's virtual pointer wherever it last clicked (the header trigger), so the "resting" sample could land while the close control still matched its own hover/active rule; this was never a stylesheet-loading or Vite dev-server timing race. Added a top-level `pointerPseudoState(locator)` helper (`el.matches(":hover")` / `el.matches(":active")`); the test now moves the pointer to a quiet spot in the panel body before sampling, asserts the control is not `:hover` or `:active`, and polls the parsed alpha (bounded, 1s timeout) so the 150ms `background-color` transition cannot be sampled mid-flight -- rather than reading the style once. 12/12 runs clean across four independent process launches (Chromium, Firefox, WebKit) plus 10x-repeated Firefox and WebKit runs after this fix, versus 1-of-10 local Firefox failures before it
- **Strengthened** the existing keyboard-focus diagnostic without weakening it: still tabs to the close control and asserts it is focused, and now also reads `outlineStyle`, `outlineWidth`, and `outlineColor` together, asserting `outlineStyle` is not `"none"` and `outlineWidth` is at least 2px, with all three values in the failure message; no `:focus-visible` CSS rule was duplicated or changed, since local runs after the transparency and pseudo-state fixes show the existing `.mission-drawer__close:focus-visible` outline applying correctly
- **Retained** every other existing check in this test unchanged: 44x44 CSS pixel minimum target, containment inside the panel, no title overlap, zero-width border at rest, closing on click, and no document overflow
- **Verified** locally across Chromium, Firefox, and WebKit with zero retries: focused three-engine run, 10x-repeated Firefox and WebKit runs, four separate fresh-process three-engine runs, and two `CI=1` full-suite runs at 54/54 each; `src/index.css` was not touched, since no run showed the focused close control lacking a visible outline
- **Not claimed resolved**: Ubuntu WebKit CI job 106192124294 itself; a successor GitHub Actions job after this change is pushed is required to confirm

## 2026-09-07 v1.5.4

### Version Bump to 1.5.4

- **Updated** package.json and package-lock.json to version 1.5.4

### Results Forecast Card Section Order

- **Moved** the score-breakdown `.forecast-card__section` (`#<cardId>-score-breakdown`) in `src/components/ScoreCard.tsx` so it renders immediately before the Today's outlook `.forecast-card__summary` block; the card header still precedes both and the two sections remain immediate siblings
- **Preserved** all content, conditions, classes, ids, values, calculations, styling, and data sources for both sections; the only production change is DOM order plus one test hook
- **Added** `data-testid="score-card-breakdown"` to the breakdown section so tests can assert order via `data-testid` rather than `id`, per `AGENTS.md`
- **Added** `src/components/ScoreCard.test.tsx` cases: an explicit assertion that the breakdown's `nextElementSibling` is the outlook summary, plus focused component tests (astronomical/solunar detail sections, almanac metric and callout, Open-Meteo safety source, risk factors and recommendations, non-Fahrenheit/non-mph unit paths, low data-quality styling with relative timestamps, NWS pressure-trend badge, and further safety-rating labels) that raise `ScoreCard.tsx` line coverage from 71.85% to 97.05%
- **Unchanged**: forecast types, API contracts, scoring logic, data flow, and CSS

## 2026-08-30 v1.5.3

### Version Bump to 1.5.3

- **Updated** package.json and package-lock.json to version 1.5.3

### Single-Row Full-Width Header

- **Consolidated** the header into one responsive row: `.brand-title`, app version, `#status-timestamp`, and the conditional Install App control now render inline in that order inside `.header-brand`, with navigation kept at the opposite end of the same `.header-content` row
- **Removed** the `.brand-icon` fish glyph, the `.brand-subtitle` tagline, and the `#status-bar` second-row wrapper from `src/App.tsx`
- **Removed** the 1280px `max-width` cap from `.header-container` so inner header content spans the available viewport width, subject to the existing responsive horizontal padding
- **Removed** obsolete `.brand-icon`, `.brand-subtitle`, `.brand-text`, and `.status-bar` rules, including the landscape rule that hid the status bar
- **Tuned** mobile brand gaps, typography, and Install App button sizing (down to the 480px breakpoint) so the row stays on one line without horizontal overflow when the Install App control is visible; version and timestamp are never hidden to fit
- **Preserved** the `APP_VERSION` source, timestamp formatting, `beforeinstallprompt` handling, navigation destinations, and mobile-menu behavior
- **Added** `src/App.test.tsx` covering removed elements, approved DOM order, conditional Install App rendering and activation, mobile-menu operation, and theme toggling
- **Styled** `#app-version` and `#status-timestamp` as a matching pair of compact, neutral pills: a subtle translucent light background, a low-contrast translucent border, fully rounded corners, and tight padding derived from the existing `rgba(238, 243, 239, ...)` header palette; monospace typography, text content, IDs, and order are unchanged, and pill padding tightens at the 640px and 480px breakpoints to keep the header on one row
- **Fixed** a tablet-width overlap: when `beforeinstallprompt` exposes the Install App control, the inline desktop nav now collapses to the menu toggle from 960px down (via `.header-content:has(.header-brand .btn)`), so the `nowrap` brand group no longer overruns `.header-nav` across roughly 641-888px; without the Install App button the inline nav still shows at those widths
- **Fixed** a cross-browser 320px regression: tightened the `<=480px` header gaps, brand-title and pill typography, and Install App button padding so the Install App button and menu toggle keep ~18px of measured clearance in Chromium, Firefox, and WebKit (up from the prior ~2px that held only on Windows and overlapped on Linux Firefox/WebKit); all five controls stay visible, ordered, on one row, contained, and free of horizontal overflow

### React Router 7 Migration Cleanup

- **Removed** the obsolete `future={{ v7_startTransition, v7_relativeSplatPath }}` prop from `<HashRouter>` in `src/main.tsx`; both flags are default behavior in `react-router-dom` 7 and the prop no longer type-checks, which had been failing `npm run type-check` and `npm run build`

### Minimal Playwright Header Verification

- **Added** a deliberately small Playwright setup (`@playwright/test` dev dependency only, one `test:e2e` script, a minimal `playwright.config.ts`, and a single `e2e/header.spec.ts` smoke spec) that verifies the responsive header in a real browser: desktop and 320px mobile layout, matching version/timestamp pill treatment, the conditional Install App state, a single header row with no clipping/overlap/horizontal overflow, and basic mobile-menu operation
- **Added** `.github/workflows/playwright.yml` with tiered execution: Chromium on every pull request to `main`, plus Firefox and WebKit on `release/*` pull requests, a weekly schedule, and manual dispatch; each job installs only the browser it needs and uploads no reports or artifacts
- **Scoped out** screenshots, visual baselines, video, traces, HTML/blob reports, codegen/debug/UI scripts, axe, Lighthouse, and broad end-to-end flows; the config runs against the Vite dev server so browser-layout verification does not depend on the production `tsc` build step
- **Documented** the narrow Playwright policy in `AGENTS.md` and the local commands in `README.md`, noting that Playwright's WebKit and Chromium are engine proxies, not exact Safari or Edge coverage
- **Made** the synthetic `beforeinstallprompt` dispatch deterministic: the spec now waits for the app's mounted `window.addEventListener("beforeinstallprompt", ...)` registration (recorded via an init-script wrapper) before dispatching, removing a WebKit race, with no fixed sleeps; setup is shared by the mobile and tablet cases
- **Improved** overlap diagnostics: pairwise checks now name the affected controls and report their x ranges and the measured gap, and an explicit assertion requires >=4px of Install App / menu-toggle clearance with the per-engine measurement logged

### GitHub Actions Runtime Warning Cleanup

- **Updated** `actions/checkout` and `actions/setup-node` from `@v4` to `@v7` across `playwright.yml`, `validate-release.yml`, `release.yml`, and `pages.yml` to clear the deprecated action-runtime warnings; the application `node-version` stays `20` and no triggers, permissions, jobs, matrices, or commands changed

## 2026-07-03 v1.5.2

### Version Bump to 1.5.2

- **Updated** package.json and package-lock.json to version 1.5.2

### Home Page Location Row Layout

- **Changed** the Home page Location card so Latitude, Longitude, and "Use my location" render in a single row at viewport widths >=640px, instead of the coordinate fields on one row and the button on its own row below
- **Fixed** a mobile regression from the initial change: Latitude and Longitude now stay side by side below 640px (matching prior behavior) instead of stacking into three separate rows

## 2026-07-03

### Version Bump to 1.5.1

- **Updated** package.json and package-lock.json to version 1.5.1
- **Verified** App.tsx continues to display the version from package.json

### Weather Trust and Accuracy Overhaul

- **Removed** all synthetic/default weather fallbacks (20C / 10 km/h / 50% clouds / 1013.25 hPa) from `enhancedWeather.ts` and `openMeteo.ts`; weather fetchers now throw or report UNAVAILABLE instead of fabricating data
- **Changed** `fetchEnhancedWeather` to return a discriminated result (`OK` / `FALLBACK` / `UNAVAILABLE`); total source failure blocks the bite score
- **Added** `buildUnavailableForecast` in `forecast.ts` producing a blocked forecast (safety UNKNOWN, score suppressed) and a degraded ScoreCard state ("Forecast unavailable / Check official weather before fishing")
- **Fixed** NWS precipitation semantics: grid `probabilityOfPrecipitation` is now `precipProbabilityPct` (0-100), never converted to or displayed as a rain amount; `precipMm` is optional and NWS leaves it unset
- **Fixed** NWS unit conversions with uom-aware converters (`windSpeed` km/h no longer multiplied by 3.6; pressure Pa->hPa; temperature degF->degC) and Open-Meteo wind requested explicitly in km/h
- **Changed** reliability timestamps to use source-reported update times (NWS grid `updateTime`); freshness is UNKNOWN when the source provides none, and `forecastGeneratedIso` is tracked separately
- **Renamed** user-facing "Confidence" to "Data Quality" in ScoreCard and Home copy; internal `confidenceLevel`/`confidenceScore` field names retained
- **Added** result-card trust summary (outlook + safety, best solunar window, why, data quality) above metrics; unavailable-days banner on Results page
- **Changed** safety score penalty (DANGEROUS -> 0) to apply regardless of weather source
- **Added** validation harness: `npm run validate:weather` (25-location deterministic report) and `tests/weatherValidation.test.ts` covering source selection, fallback, blocking, unit conversion, precipitation semantics, safety overrides, and data-quality rules

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

### Results Page Cleanup

- **Removed** the dev-only `WeatherDebugInfo` section from forecast cards and only render the NWS alerts block when alerts exist
- **Added** ScoreCard tests to assert alert section visibility when active alerts are present or absent
- **Result** Cleaner results UI without developer debug panels, no empty NWS sections

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
