import { test, expect, type Locator, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

/**
 * Browser-level coverage for the global Saved spots / Recent forecasts drawer:
 * responsive layout and internal scroll, the single-row header with the added
 * hamburger, focus trap and return, every close path, the mobile-navigation
 * caret and mutual exclusion, body-scroll lock, route availability, and
 * axe WCAG 2.2 AA scans with the drawer open.
 */

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, "element should have a bounding box").not.toBeNull();
  return box as Box;
}

function centerY(box: Box): number {
  return box.y + box.height / 2;
}

function overlaps(a: Box, b: Box): boolean {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a];
  return right.x < left.x + left.width - 0.5;
}

async function noDocumentOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth + 1
  );
}

async function openDrawer(page: Page) {
  await page.getByTestId("mission-drawer-toggle").click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/**
 * The app uses HashRouter, so a non-root route lives under the URL hash
 * (`/#/guide`), never the path (`/guide`, which renders Home).
 */
async function gotoRoute(page: Page, route: string, width = 1280, height = 900) {
  await page.setViewportSize({ width, height });
  const url = route === "/" ? "/" : `/#${route}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".header-content")).toBeVisible();
  if (route !== "/") {
    await page.waitForFunction(
      (expected) => window.location.hash === `#${expected}`,
      route
    );
  }
}

test.describe("mission drawer", () => {
  test("opens as a full-height left sheet, single column, capped near 480px on desktop", async ({
    page,
  }) => {
    await gotoRoute(page, "/");
    await openDrawer(page);

    const panel = page.getByTestId("mission-drawer-panel");
    const backdrop = page.getByTestId("mission-drawer-backdrop");
    await expect(backdrop).toBeVisible();

    const panelBox = await boxOf(panel);
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    expect(panelBox.x).toBeLessThanOrEqual(1);
    expect(panelBox.width).toBeGreaterThan(360);
    expect(panelBox.width).toBeLessThanOrEqual(481);
    expect(panelBox.height).toBeGreaterThanOrEqual(
      (viewport as { height: number }).height - 2
    );

    // Body scrolls internally, not the document.
    const bodyScrolls = await page
      .getByTestId("mission-drawer-body")
      .evaluate((el) => el.scrollHeight >= el.clientHeight);
    expect(bodyScrolls).toBe(true);
    expect(await noDocumentOverflow(page)).toBe(true);
  });

  test("leaves the backdrop visible and avoids horizontal overflow at 390px and 320px", async ({
    page,
  }) => {
    for (const width of [390, 320]) {
      await gotoRoute(page, "/", width, 844);
      await openDrawer(page);

      const panelBox = await boxOf(page.getByTestId("mission-drawer-panel"));
      expect(
        panelBox.width,
        `panel should leave a backdrop strip at ${width}px`
      ).toBeLessThan(width - 16);
      expect(await noDocumentOverflow(page)).toBe(true);

      await page.getByTestId("mission-drawer-close").click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  });

  test("is reachable from a non-home route", async ({ page }) => {
    await gotoRoute(page, "/guide");
    // Confirm the Guide route actually rendered (not Home via a bad path).
    await expect(
      page.getByRole("heading", { name: "Field safety guide" })
    ).toBeVisible();

    await openDrawer(page);
    await expect(
      page.getByRole("dialog", { name: /saved spots and recent forecasts/i })
    ).toBeVisible();
  });

  test("moves focus into the panel, traps Tab, and returns focus to the trigger", async ({
    page,
  }) => {
    await gotoRoute(page, "/");
    const trigger = page.getByTestId("mission-drawer-toggle");
    await trigger.focus();
    await trigger.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();

    const focusInPanel = () =>
      page.evaluate(() => {
        const panel = document.querySelector(
          '[data-testid="mission-drawer-panel"]'
        );
        return (
          !!panel &&
          panel.contains(document.activeElement) &&
          document.activeElement !== document.body
        );
      });

    expect(await focusInPanel()).toBe(true);

    // Reverse-tab straight off the freshly focused panel must not escape.
    await page.keyboard.press("Shift+Tab");
    expect(await focusInPanel()).toBe(true);

    // Repeated forward and reverse traversal both stay contained.
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      expect(await focusInPanel()).toBe(true);
    }
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Shift+Tab");
      expect(await focusInPanel()).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("Save, Select, Run, and Rerun drive the correct browser navigation", async ({
    page,
  }) => {
    // Keep this deterministic and off live weather services: the Run step lands
    // on Results, which would otherwise fetch. Fail those requests fast.
    await page.route(
      /open-meteo\.com|weather\.gov|api\.weather\.gov|noaa\.gov|komoot\.io|ipapi\.co|ip-api\.com|ipinfo\.io/i,
      (route) => route.abort()
    );

    await gotoRoute(page, "/");

    // Save a spot at the default location.
    await openDrawer(page);
    await page.getByTestId("waypoint-name-input").fill("Dockside");
    await page.getByTestId("save-waypoint-button").click();
    await expect(
      page.getByTestId("waypoint-list").getByText("Dockside")
    ).toBeVisible();

    // Select returns Home with the drawer closed.
    await page.getByRole("button", { name: "Select" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/#\/$/);

    // Run records history, closes, and navigates to Results.
    await openDrawer(page);
    await page.getByRole("button", { name: "Run" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/#\/results\?.*name=Dockside/);

    // The drawer is global: Rerun straight from the Results route, no reload.
    await openDrawer(page);
    await page.getByRole("button", { name: "Rerun" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/#\/results\?/);
  });

  test("closes on Escape and on backdrop click but not on panel clicks", async ({
    page,
  }) => {
    await gotoRoute(page, "/");

    await openDrawer(page);
    await page.getByTestId("mission-drawer-panel").click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click the backdrop where it is actually exposed, right of the panel.
    const width = (page.viewportSize() as { width: number }).width;
    await page.mouse.click(width - 30, 300);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await openDrawer(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("locks body scroll while open and restores it on close", async ({ page }) => {
    await gotoRoute(page, "/");

    const overflowBefore = await page.evaluate(
      () => getComputedStyle(document.body).overflowY
    );

    await openDrawer(page);
    const overflowOpen = await page.evaluate(() => document.body.style.overflow);
    expect(overflowOpen).toBe("hidden");

    await page.getByTestId("mission-drawer-close").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const overflowAfter = await page.evaluate(
      () => getComputedStyle(document.body).overflowY
    );
    expect(overflowAfter).toBe(overflowBefore);
  });

  test("mobile navigation uses a down/up caret and is mutually exclusive with the drawer", async ({
    page,
  }) => {
    await gotoRoute(page, "/", 390, 844);

    const navToggle = page.getByTestId("mobile-menu-toggle");
    await expect(navToggle).toHaveAttribute("data-open", "false");
    await expect(navToggle.locator(".mobile-menu-toggle__caret")).toBeVisible();

    await navToggle.click();
    await expect(navToggle).toHaveAttribute("data-open", "true");
    await expect(page.locator(".mobile-menu-overlay")).toBeVisible();

    // Opening the drawer closes the mobile navigation.
    await openDrawer(page);
    await expect(page.locator(".mobile-menu-overlay")).toHaveCount(0);
  });

  test("header stays one contained row with the hamburger at 1280, 800, 390, and 320", async ({
    page,
  }) => {
    for (const width of [1280, 800, 390, 320]) {
      await gotoRoute(page, "/", width, width < 500 ? 720 : 900);

      const hamburger = page.getByTestId("mission-drawer-toggle");
      const title = page
        .locator(".header-brand")
        .getByRole("heading", { name: "Fishing Report" });
      const version = page.locator(".header-brand .app-version");
      const timestamp = page.locator(".header-brand .timestamp");

      for (const control of [hamburger, title, version, timestamp]) {
        await expect(control).toBeVisible();
      }

      const hamburgerBox = await boxOf(hamburger);
      const titleBox = await boxOf(title);
      const versionBox = await boxOf(version);
      const timestampBox = await boxOf(timestamp);

      // Hamburger precedes the title and shares its row.
      expect(hamburgerBox.x).toBeLessThan(titleBox.x);
      for (const box of [titleBox, versionBox, timestampBox]) {
        expect(
          Math.abs(centerY(hamburgerBox) - centerY(box)),
          `control left the hamburger row at ${width}px`
        ).toBeLessThanOrEqual(6);
      }
      expect(overlaps(hamburgerBox, titleBox)).toBe(false);
      expect(await noDocumentOverflow(page)).toBe(true);
    }
  });

  test("header keeps the hamburger, brand metadata, and Install App on one row at 320 and 800", async ({
    page,
  }) => {
    for (const width of [320, 800]) {
      await page.addInitScript(() => {
        const native = window.addEventListener.bind(window);
        window.addEventListener = ((type: string, ...rest: unknown[]) => {
          if (type === "beforeinstallprompt") {
            (window as unknown as { __ready?: boolean }).__ready = true;
          }
          // @ts-expect-error passthrough
          return native(type, ...rest);
        }) as typeof window.addEventListener;
      });
      await gotoRoute(page, "/", width, width < 500 ? 720 : 900);
      await page.waitForFunction(
        () => (window as unknown as { __ready?: boolean }).__ready === true
      );
      await page.evaluate(() => {
        const event = Object.assign(new Event("beforeinstallprompt"), {
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: "dismissed" as const }),
        });
        window.dispatchEvent(event);
      });

      const install = page.getByRole("button", { name: /install app/i });
      await expect(install).toBeVisible();

      const hamburger = page.getByTestId("mission-drawer-toggle");
      const title = page
        .locator(".header-brand")
        .getByRole("heading", { name: "Fishing Report" });

      const hamburgerBox = await boxOf(hamburger);
      const titleBox = await boxOf(title);
      const installBox = await boxOf(install);

      expect(
        Math.abs(centerY(hamburgerBox) - centerY(titleBox))
      ).toBeLessThanOrEqual(6);
      expect(
        Math.abs(centerY(hamburgerBox) - centerY(installBox)),
        `Install App left the header row at ${width}px`
      ).toBeLessThanOrEqual(6);
      expect(await noDocumentOverflow(page)).toBe(true);
    }
  });

  test("honors prefers-reduced-motion for the drawer", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await gotoRoute(page, "/");
    await openDrawer(page);

    const animation = await page
      .getByTestId("mission-drawer-panel")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");

    await context.close();
  });

  test("no new WCAG 2.2 AA violations when the drawer is open on Home", async ({
    page,
  }) => {
    await gotoRoute(page, "/");

    const closed = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    await openDrawer(page);
    const open = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      open.violations.length,
      `opening the drawer must not add violations (closed ${closed.violations.length}, open ${open.violations.length}): ` +
        open.violations.map((v) => v.id).join(", ")
    ).toBeLessThanOrEqual(closed.violations.length);

    const drawerScoped = await new AxeBuilder({ page })
      .include('[data-testid="mission-drawer"]')
      .withTags(WCAG_TAGS)
      .analyze();
    expect(
      drawerScoped.violations,
      drawerScoped.violations.map((v) => `${v.id}: ${v.help}`).join("\n")
    ).toEqual([]);
  });

  test("no WCAG 2.2 AA violations inside the drawer on a non-Home route", async ({
    page,
  }) => {
    await gotoRoute(page, "/about");
    await expect(
      page.getByRole("heading", { name: "About Fishing Forecast" })
    ).toBeVisible();
    await openDrawer(page);

    const drawerScoped = await new AxeBuilder({ page })
      .include('[data-testid="mission-drawer"]')
      .withTags(WCAG_TAGS)
      .analyze();
    expect(
      drawerScoped.violations,
      drawerScoped.violations.map((v) => `${v.id}: ${v.help}`).join("\n")
    ).toEqual([]);
  });
});
