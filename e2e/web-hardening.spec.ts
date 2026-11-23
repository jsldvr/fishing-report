import { test, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

/**
 * Browser-only checks for the production web hardening work that jsdom cannot
 * establish: real layout reflow at 320 CSS px and at 200% zoom, the color
 * scheme on the first rendered frame and on native controls, and axe WCAG 2.2
 * AA scans of the core flows in both color schemes.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const EXTERNAL_SERVICES =
  /weather\.gov|noaa\.gov|komoot\.io|ipapi\.co|ip-api\.com|ipinfo\.io|openweathermap\.org/i;
// Denver: inland (no marine lookups) and US (NWS first, aborted here, so the
// Open-Meteo fallback supplies deterministic weather).
const DENVER = { lat: 39.7392, lon: -104.9903, zone: "America/Denver" };

function calendarDateIn(zone: string, offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
  return parts;
}

async function mockWeatherServices(page: Page) {
  await page.route(EXTERNAL_SERVICES, (route) => route.abort());
  await page.route(/api\.open-meteo\.com/, (route) => {
    const time: string[] = [];
    for (const offset of [0, 1, 2]) {
      const date = calendarDateIn(DENVER.zone, offset);
      for (let hour = 0; hour < 24; hour += 1) {
        time.push(`${date}T${String(hour).padStart(2, "0")}:00`);
      }
    }
    const filled = (value: number) => time.map(() => value);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        hourly: {
          time,
          temperature_2m: filled(17),
          precipitation: filled(0),
          cloud_cover: filled(30),
          pressure_msl: filled(1014),
          windspeed_10m: filled(9),
        },
      }),
    });
  });
}

async function gotoHome(page: Page) {
  await page.route(EXTERNAL_SERVICES, (route) => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /get fishing outlook/i })).toBeVisible();
}

async function gotoResults(page: Page) {
  await mockWeatherServices(page);
  const query = new URLSearchParams({
    lat: String(DENVER.lat),
    lon: String(DENVER.lon),
    startDate: calendarDateIn(DENVER.zone),
    days: "2",
    name: "Denver",
  });
  await page.goto(`/#/results?${query}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("score-card").first()).toBeVisible({ timeout: 20_000 });
}

/**
 * Visible interactive controls that extend past either viewport edge. body
 * hides horizontal overflow, so the document scroll width alone could mask
 * clipped controls.
 */
async function clippedControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const selector = "a[href], button, input, select, textarea, [role='button'], [tabindex='0']";
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const shown =
          box.width > 0 && box.height > 0 && style.visibility !== "hidden" && !element.closest("[inert]");
        return shown && (box.left < -1 || box.right > width + 1);
      })
      .map((element) => element.id || element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName);
  });
}

async function documentOverflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
}

async function expectNoAxeViolations(page: Page, label: string) {
  // Entrance animations fade content in; contrast is only meaningful at rest.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished))
  );
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) => `${label} ${violation.id} ${node.target.join(" ")}: ${node.failureSummary?.split("\n")[1]?.trim() ?? violation.help}`
    )
  );
  expect(summary).toEqual([]);
}

async function openDrawerSettled(page: Page) {
  await page.getByTestId("mission-drawer-toggle").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  // Wait for the slide-in animation so geometry reads are stable.
  await expect
    .poll(async () => (await page.getByTestId("mission-drawer-panel").boundingBox())?.x ?? -999)
    .toBeGreaterThanOrEqual(-0.5);
}

test.describe("zoom and reflow", () => {
  test("the viewport allows pinch zoom", async ({ page }) => {
    await gotoHome(page);
    const content = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(content).toBe("width=device-width, initial-scale=1.0");
  });

  // 320 CSS px is 1280 px at 400% (WCAG 1.4.10); 640 CSS px is 1280 px at 200%.
  for (const width of [320, 640]) {
    test(`Home, the drawer, and Results keep every control on screen at ${width} CSS px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 720 });

      await gotoHome(page);
      expect(await documentOverflows(page)).toBe(false);
      expect(await clippedControls(page)).toEqual([]);

      // Invalid-location error state must also reflow.
      await page.getByLabel(/longitude/i).fill("-10");
      await page.getByLabel(/longitude/i).blur();
      await expect(page.locator("#longitude-error")).toBeVisible();
      expect(await clippedControls(page)).toEqual([]);

      await openDrawerSettled(page);
      expect(await documentOverflows(page)).toBe(false);
      expect(await clippedControls(page)).toEqual([]);
      await page.keyboard.press("Escape");

      await gotoResults(page);
      expect(await documentOverflows(page)).toBe(false);
      expect(await clippedControls(page)).toEqual([]);
    });
  }
});

test.describe("color scheme", () => {
  /** Records the color-scheme meta at the first animation frame. */
  async function recordFirstFrame(page: Page) {
    await page.addInitScript(() => {
      requestAnimationFrame(() => {
        const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
        const override = document.documentElement.getAttribute("data-color-scheme");
        (window as unknown as { __firstFrameScheme?: string }).__firstFrameScheme =
          `${meta?.content ?? "missing"}|${override ?? "system"}`;
      });
    });
  }

  async function firstFrameScheme(page: Page): Promise<string | undefined> {
    await page.waitForFunction(() => "__firstFrameScheme" in window);
    return page.evaluate(
      () => (window as unknown as { __firstFrameScheme?: string }).__firstFrameScheme
    );
  }

  async function rootScheme(page: Page) {
    return page.evaluate(() => ({
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      inputScheme: getComputedStyle(document.getElementById("latitude")!).colorScheme,
      background: getComputedStyle(document.body).backgroundImage,
      inputBackground: getComputedStyle(document.getElementById("latitude")!).backgroundColor,
    }));
  }

  test("follows the system with no override, including later system changes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await recordFirstFrame(page);
    await gotoHome(page);

    expect(await firstFrameScheme(page)).toBe("light dark|system");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
    const dark = await rootScheme(page);
    expect(dark.colorScheme).toBe("light dark");
    expect(dark.inputScheme).toBe("light dark");
    expect(dark.inputBackground).toBe("rgb(26, 42, 36)");
    await expect(page.getByTestId("theme-toggle")).toHaveAccessibleName("Switch to light theme");

    await page.emulateMedia({ colorScheme: "light" });
    await expect
      .poll(async () => (await rootScheme(page)).inputBackground)
      .toBe("rgb(255, 255, 255)");
    await expect(page.getByTestId("theme-toggle")).toHaveAccessibleName("Switch to dark theme");
  });

  test("applies a stored override before the first frame and on native controls", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await recordFirstFrame(page);
    await gotoHome(page);

    expect(await firstFrameScheme(page)).toBe("dark|dark");
    const scheme = await rootScheme(page);
    expect(scheme.colorScheme).toBe("dark");
    expect(scheme.inputScheme).toBe("dark");
    expect(scheme.inputBackground).toBe("rgb(26, 42, 36)");

    // The override holds when the system later matches and then diverges.
    await page.emulateMedia({ colorScheme: "dark" });
    await page.emulateMedia({ colorScheme: "light" });
    expect((await rootScheme(page)).colorScheme).toBe("dark");
  });

  test("an override can return to the system preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await gotoHome(page);
    const toggle = page.getByTestId("theme-toggle");

    await toggle.click();
    expect((await rootScheme(page)).colorScheme).toBe("dark");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
    await expect(toggle).toHaveAccessibleName("Switch to light theme (follow system setting)");

    await toggle.click();
    expect((await rootScheme(page)).colorScheme).toBe("light dark");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();

    await page.reload();
    await expect(page.getByLabel(/latitude/i)).toBeVisible();
    expect((await rootScheme(page)).colorScheme).toBe("light dark");
  });
});

test.describe("accessibility (axe WCAG 2.2 AA)", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`Home and the location error state in ${scheme} scheme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });

      await gotoHome(page);
      await expectNoAxeViolations(page, `Home (${scheme})`);

      await page.getByLabel(/latitude/i).fill("");
      await page.getByLabel(/latitude/i).blur();
      await expect(page.locator("#latitude-error")).toBeVisible();
      await expect(page.getByLabel(/latitude/i)).toHaveAttribute("aria-invalid", "true");
      await expectNoAxeViolations(page, `Home location error (${scheme})`);
    });

    test(`Privacy in ${scheme} scheme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoHome(page);
      await page.goto("/#/privacy");
      await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
      await expectNoAxeViolations(page, `Privacy (${scheme})`);
    });

    test(`Results in ${scheme} scheme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await gotoResults(page);
      await expectNoAxeViolations(page, `Results (${scheme})`);
    });
  }
});
