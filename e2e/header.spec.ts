import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * The only browser-level coverage in the repo. It verifies the responsive
 * header's real layout (single row, contained, no overflow), the shared
 * version/timestamp pill treatment, the conditional Install App control, and
 * basic mobile-menu operation. Nothing else about the app is exercised here.
 */

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PillStyle {
  backgroundColor: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  borderRadius: string;
  fontFamily: string;
  paddingTop: string;
  paddingLeft: string;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, "element should have a bounding box").not.toBeNull();
  return box as Box;
}

function onSameRow(reference: Box, item: Box): boolean {
  const referenceCenter = reference.y + reference.height / 2;
  const itemCenter = item.y + item.height / 2;
  return Math.abs(referenceCenter - itemCenter) <= reference.height / 2;
}

function horizontallyDisjoint(a: Box, b: Box): boolean {
  const tolerance = 0.5;
  return a.x + a.width <= b.x + tolerance || b.x + b.width <= a.x + tolerance;
}

function contains(outer: Box, inner: Box): boolean {
  const tolerance = 1;
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

function noElementOverflow(page: Page, selector: string): Promise<boolean> {
  return page
    .locator(selector)
    .evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
}

function noDocumentOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth + 1
  );
}

function pillStyle(locator: Locator): Promise<PillStyle> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderTopWidth,
      borderStyle: style.borderTopStyle,
      borderColor: style.borderTopColor,
      borderRadius: style.borderTopLeftRadius,
      fontFamily: style.fontFamily,
      paddingTop: style.paddingTop,
      paddingLeft: style.paddingLeft,
    };
  });
}

function isNonTransparent(color: string): boolean {
  if (color === "transparent") {
    return false;
  }
  const channels = color.match(/rgba?\(([^)]+)\)/);
  if (!channels) {
    return true;
  }
  const parts = channels[1].split(",").map((part) => part.trim());
  return parts.length < 4 || parseFloat(parts[3]) > 0;
}

test("desktop header is one contained row with matching metadata pills", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const headerContent = page.locator(".header-content");
  const headerBrand = page.locator(".header-brand");
  const headerNav = page.locator(".header-nav");
  const version = headerBrand.locator(".app-version");
  const timestamp = headerBrand.locator(".timestamp");

  await expect(
    headerBrand.getByRole("heading", { name: "Fishing Report" })
  ).toBeVisible();
  await expect(version).toBeVisible();
  await expect(timestamp).toBeVisible();

  const versionStyle = await pillStyle(version);
  const timestampStyle = await pillStyle(timestamp);
  expect(versionStyle).toEqual(timestampStyle);
  expect(isNonTransparent(versionStyle.backgroundColor)).toBe(true);
  expect(parseFloat(versionStyle.borderWidth)).toBeGreaterThan(0);
  expect(versionStyle.borderStyle).toBe("solid");
  expect(parseFloat(versionStyle.borderRadius)).toBeGreaterThan(20);

  const contentBox = await boxOf(headerContent);
  const brandBox = await boxOf(headerBrand);
  const navBox = await boxOf(headerNav);

  expect(onSameRow(brandBox, navBox)).toBe(true);
  expect(horizontallyDisjoint(brandBox, navBox)).toBe(true);
  expect(contains(contentBox, brandBox)).toBe(true);
  expect(contains(contentBox, navBox)).toBe(true);

  const childrenContained = await headerContent.evaluate((el) => {
    const parent = el.getBoundingClientRect();
    return Array.from(el.children).every((child) => {
      const rect = child.getBoundingClientRect();
      return (
        rect.left >= parent.left - 1 &&
        rect.right <= parent.right + 1 &&
        rect.top >= parent.top - 1 &&
        rect.bottom <= parent.bottom + 1
      );
    });
  });
  expect(childrenContained).toBe(true);

  expect(await noElementOverflow(page, ".header-content")).toBe(true);
  expect(await noDocumentOverflow(page)).toBe(true);
});

test("narrow mobile header keeps one row with Install App and a working menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const headerContent = page.locator(".header-content");
  const headerBrand = page.locator(".header-brand");
  await expect(headerContent).toBeVisible();

  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });
    window.dispatchEvent(event);
  });

  const title = headerBrand.getByRole("heading", { name: "Fishing Report" });
  const version = headerBrand.locator(".app-version");
  const timestamp = headerBrand.locator(".timestamp");
  const installButton = page.getByRole("button", { name: /install app/i });
  const menuToggle = page.getByRole("button", { name: /toggle navigation/i });

  await expect(title).toBeVisible();
  await expect(installButton).toBeVisible();
  await expect(version).toBeVisible();
  await expect(timestamp).toBeVisible();
  await expect(menuToggle).toBeVisible();

  const contentBox = await boxOf(headerContent);
  const rowItems = [
    await boxOf(title),
    await boxOf(version),
    await boxOf(timestamp),
    await boxOf(installButton),
    await boxOf(menuToggle),
  ];

  for (const item of rowItems) {
    expect(onSameRow(contentBox, item)).toBe(true);
    expect(contains(contentBox, item)).toBe(true);
  }
  for (let i = 0; i < rowItems.length - 1; i += 1) {
    expect(horizontallyDisjoint(rowItems[i], rowItems[i + 1])).toBe(true);
  }

  expect(await noElementOverflow(page, ".header-content")).toBe(true);
  expect(await noDocumentOverflow(page)).toBe(true);

  await expect(page.locator(".nav-primary")).toBeHidden();

  await menuToggle.click();
  await expect(page.locator(".mobile-menu-overlay")).toBeVisible();
  await menuToggle.click();
  await expect(page.locator(".mobile-menu-overlay")).toHaveCount(0);
});
