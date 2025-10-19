# Changelog

## 2025-10-19
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
