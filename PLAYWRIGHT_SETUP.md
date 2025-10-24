# Playwright E2E Testing Setup

## Overview
This project now includes Playwright for end-to-end testing across multiple browsers (Chromium, Firefox, WebKit).

## Installation
Playwright and its dependencies are already installed. If you need to reinstall:

```bash
npm install --save-dev @playwright/test playwright
npx playwright install
sudo npx playwright install-deps
```

## Available Scripts

- `npm run test:e2e` - Run all E2E tests across all browsers
- `npm run test:e2e:ui` - Run tests with interactive UI mode
- `npm run test:e2e:debug` - Run tests in debug mode
- `npm run test:e2e:headed` - Run tests in headed mode (show browser)
- `npm run test:codegen` - Generate test code by recording interactions

## Project-Specific Commands

- `npm run test:e2e -- --project=chromium` - Run tests only on Chrome
- `npm run test:e2e -- --project=firefox` - Run tests only on Firefox  
- `npm run test:e2e -- --project=webkit` - Run tests only on Safari/WebKit

## Test Structure

Tests are located in the `e2e/` directory:
- `e2e/fishing-forecast.spec.ts` - Main app functionality tests
- `e2e/example.spec.ts` - Default Playwright example tests

## Key Testing Patterns

### Data Test IDs
Components include `data-testid` attributes for reliable element selection:
- `data-testid="weather-alerts"` - Weather alerts component
- `data-testid="marine-conditions"` - Marine conditions component  
- `data-testid="score-card"` - Forecast score cards

### Form Testing
The location input form uses these selectors:
- Location text input: `getByPlaceholder(/Oklahoma City, OK or 35.3383, -97.4867/i)`
- Coordinate inputs: `getByPlaceholder('40.7128')` and `getByPlaceholder('-74.0060')`
- Search button: `getByRole('button', { name: /Recon/i })`
- Submit button: `getByRole('button', { name: /Execute Mission Brief/i })`

### Navigation Testing
The app uses React Router, test navigation with:
```typescript
await page.getByRole('button', { name: /Execute Mission Brief/i }).click();
await expect(page).toHaveURL(/\/results/);
```

## Configuration

The Playwright config (`playwright.config.ts`) includes:
- Base URL: `http://localhost:4173`
- Auto-start dev server: `npm run build && npm run preview`
- Screenshots on failure
- Video recording on failure
- Test timeout: 30 seconds
- Multiple browser support

## Debugging Tests

1. **UI Mode**: `npm run test:e2e:ui` - Interactive test runner
2. **Debug Mode**: `npm run test:e2e:debug` - Step through tests
3. **Headed Mode**: `npm run test:e2e:headed` - See browser while testing
4. **Code Generation**: `npm run test:codegen` - Record interactions

## CI/CD Integration

A GitHub Actions workflow (`.github/workflows/playwright.yml`) is included for running E2E tests in CI.

## Browser Support

Tests run on:
- **Chromium** (Chrome/Edge equivalent)
- **Firefox** (Mozilla Firefox)
- **WebKit** (Safari equivalent)

Mobile viewports are tested at 375x667 (iPhone SE size).

## Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByLabel`, `getByPlaceholder` over CSS selectors
2. **Wait for states**: Use `await expect(element).toBeVisible()` instead of hard waits
3. **Test user flows**: Focus on complete user journeys, not isolated components
4. **Data attributes**: Use `data-testid` for components that are hard to select semantically
5. **Cross-browser**: Run tests on all browsers before releases

## Troubleshooting

### Tests timing out
- Increase timeouts in `playwright.config.ts`
- Use `page.waitForLoadState()` for slow-loading pages
- Check network requests with `page.waitForResponse()`

### Element not found
- Use `page.locator().first()` for multiple matches
- Check element visibility with `await expect(element).toBeVisible()`
- Use browser dev tools in headed mode to inspect elements

### Flaky tests
- Add proper waits instead of `setTimeout`
- Use `toPass()` for retryable assertions
- Check for race conditions in async operations