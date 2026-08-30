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

// A control that has dropped to a second row is offset from the reference row by
// at least a line height (~18px+); real single-row centering differs by ~1px.
const ROW_ALIGNMENT_TOLERANCE_PX = 6;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, "element should have a bounding box").not.toBeNull();
  return box as Box;
}

function verticalCenter(box: Box): number {
  return box.y + box.height / 2;
}

/**
 * True when `item` sits on the same visual row as `reference`. `reference` must
 * be a single-line element (the brand title), never an elastic container whose
 * height grows when its children wrap.
 */
function onRowWith(reference: Box, item: Box): boolean {
  return (
    Math.abs(verticalCenter(reference) - verticalCenter(item)) <=
    ROW_ALIGNMENT_TOLERANCE_PX
  );
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

function expectNoPairOverlaps(boxes: Box[]): void {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      expect(
        horizontallyDisjoint(boxes[i], boxes[j]),
        `header items ${i} and ${j} overlap horizontally`
      ).toBe(true);
    }
  }
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
  const title = headerBrand.getByRole("heading", { name: "Fishing Report" });
  const version = headerBrand.locator(".app-version");
  const timestamp = headerBrand.locator(".timestamp");

  await expect(title).toBeVisible();
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
  const titleBox = await boxOf(title);
  const versionBox = await boxOf(version);
  const timestampBox = await boxOf(timestamp);
  const navBox = await boxOf(headerNav);

  // Brand metadata and navigation share the brand title's row (no wrapping).
  for (const item of [versionBox, timestampBox, navBox]) {
    expect(onRowWith(titleBox, item)).toBe(true);
  }
  expectNoPairOverlaps([titleBox, versionBox, timestampBox, navBox]);

  // Navigation sits at the opposite end and everything stays inside the header.
  expect(navBox.x).toBeGreaterThan(titleBox.x + titleBox.width);
  expect(contains(contentBox, await boxOf(headerBrand))).toBe(true);
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
  const titleBox = await boxOf(title);
  const orderedBoxes = [
    titleBox,
    await boxOf(version),
    await boxOf(timestamp),
    await boxOf(installButton),
    await boxOf(menuToggle),
  ];

  // Every control shares the brand title's row; a wrap moves a control's center
  // far past ROW_ALIGNMENT_TOLERANCE_PX and fails here even though horizontal
  // spacing and page overflow would still look fine.
  for (const item of orderedBoxes) {
    expect(onRowWith(titleBox, item)).toBe(true);
    expect(contains(contentBox, item)).toBe(true);
  }
  expectNoPairOverlaps(orderedBoxes);

  expect(await noElementOverflow(page, ".header-content")).toBe(true);
  expect(await noDocumentOverflow(page)).toBe(true);

  await expect(page.locator(".nav-primary")).toBeHidden();

  await menuToggle.click();
  await expect(page.locator(".mobile-menu-overlay")).toBeVisible();
  await menuToggle.click();
  await expect(page.locator(".mobile-menu-overlay")).toHaveCount(0);
});

test("tablet-width header with Install App visible never overlaps navigation", async ({
  page,
}) => {
  // Mid-width regression: inline desktop nav is shown above 640px, and a fired
  // beforeinstallprompt widens the brand group. Without the guard the nowrap
  // brand items overrun .header-nav across ~641-888px.
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const headerContent = page.locator(".header-content");
  const headerBrand = page.locator(".header-brand");
  const headerNav = page.locator(".header-nav");
  await expect(headerContent).toBeVisible();

  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });
    window.dispatchEvent(event);
  });

  const installButton = page.getByRole("button", { name: /install app/i });
  await expect(installButton).toBeVisible();

  // With Install App present at tablet width the inline links collapse to the
  // menu toggle so the brand group has room.
  await expect(page.locator(".nav-primary")).toBeHidden();
  await expect(
    page.getByRole("button", { name: /toggle navigation/i })
  ).toBeVisible();

  const contentBox = await boxOf(headerContent);
  const brandBox = await boxOf(headerBrand);
  const navBox = await boxOf(headerNav);
  const installBox = await boxOf(installButton);

  expect(horizontallyDisjoint(brandBox, navBox)).toBe(true);
  expect(horizontallyDisjoint(installBox, navBox)).toBe(true);
  expect(contains(contentBox, brandBox)).toBe(true);
  expect(contains(contentBox, navBox)).toBe(true);
  expect(await noElementOverflow(page, ".header-content")).toBe(true);
  expect(await noDocumentOverflow(page)).toBe(true);
});
