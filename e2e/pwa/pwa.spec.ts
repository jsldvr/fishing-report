import { test, expect, type Page } from "@playwright/test";

/**
 * Production-build PWA behavior under the GitHub Pages base path: a single
 * manifest whose identity, launch URL, and scope stay under the base, browser
 * installability where the engine exposes it (Chromium via CDP), and offline
 * navigation served by the service worker from inside the deployed path.
 */
const BASE = "/fishing-report/";

async function waitForControllingServiceWorker(page: Page) {
  await page.goto(BASE);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // clientsClaim makes the active worker take control without a reload.
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
      timeout: 15_000,
    })
    .toBe(true);
}

test("links exactly one manifest whose identity and launch URL stay in scope", async ({
  page,
  baseURL,
}) => {
  await page.goto(BASE);
  const links = page.locator('link[rel="manifest"]');
  await expect(links).toHaveCount(1);

  const href = await links.first().evaluate((link) => (link as HTMLLinkElement).href);
  expect(new URL(href).pathname).toBe(`${BASE}manifest.webmanifest`);

  const manifest = await (await page.request.get(href)).json();
  const resolve = (value: string) => new URL(value, href).href;
  expect(resolve(manifest.id)).toBe(`${baseURL}${BASE}`);
  expect(resolve(manifest.scope)).toBe(`${baseURL}${BASE}`);
  expect(resolve(manifest.start_url).startsWith(resolve(manifest.scope))).toBe(true);
});

test("is installable in Chromium with no manifest errors", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Installability is only exposed through Chromium CDP.");
  await waitForControllingServiceWorker(page);

  const cdp = await page.context().newCDPSession(page);
  const manifest = await cdp.send("Page.getAppManifest");
  expect(manifest.errors).toEqual([]);
  expect(manifest.url).toContain(`${BASE}manifest.webmanifest`);

  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  expect(installabilityErrors).toEqual([]);
});

test("serves navigations offline from the precached shell inside the base", async ({
  page,
  context,
}) => {
  // Needs @playwright/test >= 1.64.0 for WebKit: earlier releases fail every
  // service-worker navigation after setOffline(true) with "WebKit encountered
  // an internal error" (microsoft/playwright#42775).
  await waitForControllingServiceWorker(page);
  await context.setOffline(true);

  try {
    // A reload is a real document navigation (a hash-only goto would not be).
    await page.goto(`${BASE}#/about`);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "About Fishing Forecast" })
    ).toBeVisible();

    // An unknown path under the base falls back to the app shell offline.
    await page.goto(`${BASE}some/deep/link`);
    await expect(page.getByRole("button", { name: /get fishing outlook/i })).toBeVisible();
    expect(new URL(page.url()).pathname.startsWith(BASE)).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});
