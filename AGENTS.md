# AGENTS POLICY

## 0. Scope
- Applies to: Web front end, agent code, and infra in this repo.

## 1. Changelog
- Location: /AGENTS_CHANGELOG.md using and following current format.

## 2. Front End Markup Conventions
- Every interactive node must include (class and id, in that order):
  - `class` following BEM: block__element--modifier
  - `id`; avoid duplicate ids.
- Lint with html-validate/eslint-plugin.
- Data hooks for tests use `data-testid="..."` (never `id`).

## 3. Browser Support
- Supported browsers: latest 2 versions of Chrome, Firefox, Edge, and Safari.
- Mobile: iOS Safari latest, Chrome on Android latest.
- Breakage in any supported browser blocks release.

## 4. Testing Requirements
- Unit: ≥80% line coverage for changed files; run in CI.
- Integration: component tests for new FE functionality.
- E2E: Playwright is the single source of truth.
  - New UI flows require at least one E2E path test.
  - Run E2E against Chromium, WebKit, and Firefox in CI.
  - Flaky tests quarantined within 24h or fixed before release.
- Visual regression: enable per critical pages with Playwright snapshots.
- Accessibility: axe-core checks must pass; no new WCAG 2.2 AA violations.
- Performance: Lighthouse CI. No new regressions; LCP ≤2.5s on test env.

## 5. Agent Behavior
- TBD based on agent type; follow best practices for reliability, latency, and resource use.

## 6. Security and Privacy
- No PII in logs. Secrets only via environment manager.

## 7. AGENTS files
- All AGENTS-related docs go in the `AGENTS/` directory.

