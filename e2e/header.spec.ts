import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Browser-level coverage of the responsive header's real layout (one row on
 * wider screens, two rows at 480px and below, contained, no overflow), the shared
 * version/timestamp pill treatment, the conditional Install App control, and
 * basic mobile-menu operation. Nothing else about the app is exercised here.
 */

declare global {
  interface Window {
    /** Set by trackInstallPromptListener() once the app subscribes. */
    __installPromptListenerReady?: boolean;
  }
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NamedBox {
  name: string;
  box: Box;
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

// Minimum horizontal clearance between the Install App button and the menu
// toggle whenever the two share vertical space. A squeezed single row at 320px
// measured only 1.40px (Firefox) and 1.73px (WebKit) on Ubuntu CI with the
// longer "Fishing Forecast" title and the wider Linux font fallbacks, so the
// header now uses two rows at 480px and below.
const MIN_INSTALL_MENU_GAP_PX = 8;

// Widest viewport that uses the two-row header (src/index.css).
const TWO_ROW_MAX_WIDTH = 480;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, "element should have a bounding box").not.toBeNull();
  return box as Box;
}

function verticalCenter(box: Box): number {
  return box.y + box.height / 2;
}

function describeBox(box: Box): string {
  return `x=${box.x.toFixed(1)}..${(box.x + box.width).toFixed(1)} (w=${box.width.toFixed(1)})`;
}

/** Signed horizontal gap: positive means `a` ends before `b` starts. */
function horizontalGap(a: Box, b: Box): number {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a];
  return right.x - (left.x + left.width);
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

/** True when `upper` ends at or above the top of `lower`: distinct rows. */
function isAbove(upper: Box, lower: Box): boolean {
  return upper.y + upper.height <= lower.y + 0.5;
}

function verticallyOverlaps(a: Box, b: Box): boolean {
  return !isAbove(a, b) && !isAbove(b, a);
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

/**
 * Assert no two named controls overlap horizontally. On failure the message
 * names both controls and reports their x ranges and the (negative) gap.
 */
function expectNoPairOverlaps(items: NamedBox[]): void {
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      const gap = horizontalGap(a.box, b.box);
      expect(
        gap,
        `"${a.name}" [${describeBox(a.box)}] and "${b.name}" [${describeBox(b.box)}] overlap: gap=${gap.toFixed(2)}px`
      ).toBeGreaterThanOrEqual(-0.5);
    }
  }
}

/**
 * Assert practical clearance between two adjacent controls and return the
 * measured gap so the caller can report it per engine.
 */
function expectClearance(left: NamedBox, right: NamedBox, minPx: number): number {
  const gap = horizontalGap(left.box, right.box);
  expect(
    gap,
    `expected >= ${minPx}px between "${left.name}" [${describeBox(left.box)}] and ` +
      `"${right.name}" [${describeBox(right.box)}]; measured ${gap.toFixed(2)}px`
  ).toBeGreaterThanOrEqual(minPx);
  return gap;
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

/**
 * Must run before page.goto(). Wraps window.addEventListener so the page records
 * exactly when the app subscribes to `beforeinstallprompt`, letting the test
 * dispatch the synthetic event only after React has mounted and registered its
 * handler (a real race on WebKit otherwise).
 */
function trackInstallPromptListener(page: Page): Promise<void> {
  return page.addInitScript(() => {
    window.__installPromptListenerReady = false;
    const nativeAddEventListener = window.addEventListener;
    window.addEventListener = function trackedAddEventListener(
      this: Window,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      if (type === "beforeinstallprompt") {
        window.__installPromptListenerReady = true;
      }
      return nativeAddEventListener.call(this, type, listener, options);
    } as typeof window.addEventListener;
  });
}

/**
 * Wait for the app's `beforeinstallprompt` listener, then dispatch one synthetic
 * event of the same shape the real platform provides. Deterministic: no fixed
 * sleeps, polls only on the observable listener-ready flag.
 */
async function dispatchInstallPrompt(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__installPromptListenerReady === true);
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" as const }),
    });
    window.dispatchEvent(event);
  });
}

async function openHeader(page: Page, width: number, height: number): Promise<void> {
  await trackInstallPromptListener(page);
  await page.setViewportSize({ width, height });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".header-content")).toBeVisible();
}

test("desktop header is one contained row with matching metadata pills", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const headerContent = page.locator(".header-content");
  const headerBrand = page.locator(".header-brand");
  const headerNav = page.locator(".header-nav");
  const drawerToggle = headerBrand.getByTestId("mission-drawer-toggle");
  const title = headerBrand.getByRole("heading", { name: "Fishing Forecast" });
  const version = headerBrand.locator(".app-version");
  const timestamp = headerBrand.locator(".timestamp");

  await expect(drawerToggle).toBeVisible();
  await expect(title).toBeVisible();
  await expect(version).toBeVisible();
  await expect(timestamp).toBeVisible();

  // The always-visible drawer hamburger sits immediately before the title.
  const drawerToggleBox = await boxOf(drawerToggle);
  const titleLeadBox = await boxOf(title);
  expect(drawerToggleBox.x).toBeLessThan(titleLeadBox.x);
  expect(onRowWith(titleLeadBox, drawerToggleBox)).toBe(true);

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
  expectNoPairOverlaps([
    { name: "brand title", box: titleBox },
    { name: "app version", box: versionBox },
    { name: "status timestamp", box: timestampBox },
    { name: "header nav", box: navBox },
  ]);

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

interface HeaderControls {
  content: Locator;
  drawerToggle: Locator;
  title: Locator;
  version: Locator;
  timestamp: Locator;
  installButton: Locator;
  menuToggle: Locator;
}

function headerControls(page: Page): HeaderControls {
  const brand = page.locator(".header-brand");
  return {
    content: page.locator(".header-content"),
    drawerToggle: brand.getByTestId("mission-drawer-toggle"),
    title: brand.getByRole("heading", { name: "Fishing Forecast" }),
    version: brand.locator(".app-version"),
    timestamp: brand.locator(".timestamp"),
    installButton: brand.getByRole("button", { name: /install app/i }),
    menuToggle: page.getByRole("button", { name: /toggle navigation/i }),
  };
}

/** Visible, contained, non-overlapping, and no header or page overflow. */
async function expectContainedHeader(
  page: Page,
  controls: HeaderControls,
  items: NamedBox[]
): Promise<void> {
  for (const control of Object.values(controls)) {
    await expect(control).toBeVisible();
  }
  const contentBox = await boxOf(controls.content);
  for (const { name, box } of items) {
    expect(contains(contentBox, box), `"${name}" is not contained by the header`).toBe(
      true
    );
  }
  expect(await noElementOverflow(page, ".header-content")).toBe(true);
  // .header-brand can, in principle, be forced narrower than its own
  // children (flex-shrink with min-width: 0): scrollWidth would then exceed
  // clientWidth even though every child individually still fits inside the
  // larger .header-content box, silently eating into the Install App /
  // menu-toggle clearance. Catch that case explicitly.
  expect(await noElementOverflow(page, ".header-brand")).toBe(true);
  expect(await noDocumentOverflow(page)).toBe(true);
}

async function namedBoxes(controls: HeaderControls): Promise<Record<string, NamedBox>> {
  const entries: Array<[string, string, Locator]> = [
    ["drawer", "drawer hamburger", controls.drawerToggle],
    ["title", "brand title", controls.title],
    ["version", "app version", controls.version],
    ["timestamp", "status timestamp", controls.timestamp],
    ["install", "Install App button", controls.installButton],
    ["menu", "menu toggle", controls.menuToggle],
  ];
  const boxes: Record<string, NamedBox> = {};
  for (const [key, name, locator] of entries) {
    boxes[key] = { name, box: await boxOf(locator) };
  }
  return boxes;
}

/** Keyboard reaches Install App, then the menu toggle, which opens and closes the menu. */
async function expectKeyboardOperableMenu(
  page: Page,
  controls: HeaderControls
): Promise<void> {
  await controls.drawerToggle.focus();
  await page.keyboard.press("Tab");
  await expect(controls.installButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(controls.menuToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".mobile-menu-overlay")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".mobile-menu-overlay")).toHaveCount(0);
}

test("narrow mobile header uses two rows with Install App and a working menu", async ({
  page,
}, testInfo) => {
  await openHeader(page, 320, 568);
  await dispatchInstallPrompt(page);
  const controls = headerControls(page);

  for (const width of [320, 360, 375, 390, 412, TWO_ROW_MAX_WIDTH]) {
    await page.setViewportSize({ width, height: 568 });
    const b = await namedBoxes(controls);
    await expectContainedHeader(page, controls, Object.values(b));

    // Row one: the drawer trigger, then the title.
    expect(onRowWith(b.title.box, b.drawer.box), `drawer left the title row at ${width}px`).toBe(
      true
    );
    expect(b.drawer.box.x).toBeLessThan(b.title.box.x);
    expectNoPairOverlaps([b.drawer, b.title]);

    // Row two, wholly below row one: version, timestamp, Install App, in order.
    for (const item of [b.timestamp, b.install]) {
      expect(
        onRowWith(b.version.box, item.box),
        `"${item.name}" left the metadata row at ${width}px`
      ).toBe(true);
    }
    for (const item of [b.version, b.timestamp, b.install]) {
      expect(
        isAbove(b.title.box, item.box) && isAbove(b.drawer.box, item.box),
        `"${item.name}" is not on a row below the title at ${width}px`
      ).toBe(true);
    }
    expect(b.version.box.x).toBeLessThan(b.timestamp.box.x);
    expect(b.timestamp.box.x).toBeLessThan(b.install.box.x);
    expectNoPairOverlaps([b.version, b.timestamp, b.install]);

    // The menu toggle ends the header, clear of both rows: where it shares
    // vertical space with a control it keeps the full clearance.
    for (const item of [b.title, b.install]) {
      expect(b.menu.box.x).toBeGreaterThan(item.box.x);
      if (verticallyOverlaps(item.box, b.menu.box)) {
        const gap = expectClearance(item, b.menu, MIN_INSTALL_MENU_GAP_PX);
        console.log(
          `[${testInfo.project.name}] ${width}px ${item.name} -> menu toggle gap: ${gap.toFixed(2)}px`
        );
      }
    }

    await expect(page.locator(".nav-primary")).toBeHidden();
    await expectKeyboardOperableMenu(page, controls);
  }
});

test("header above the two-row width keeps one row with Install App", async ({
  page,
}, testInfo) => {
  await openHeader(page, TWO_ROW_MAX_WIDTH + 1, 568);
  await dispatchInstallPrompt(page);
  const controls = headerControls(page);

  for (const width of [TWO_ROW_MAX_WIDTH + 1, 560, 640]) {
    await page.setViewportSize({ width, height: 568 });
    const b = await namedBoxes(controls);
    await expectContainedHeader(page, controls, Object.values(b));

    const items = [b.drawer, b.title, b.version, b.timestamp, b.install, b.menu];
    for (const { name, box } of items) {
      expect(onRowWith(b.title.box, box), `"${name}" left the title row at ${width}px`).toBe(
        true
      );
    }
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i - 1].box.x, `${items[i - 1].name} before ${items[i].name}`).toBeLessThan(
        items[i].box.x
      );
    }
    expectNoPairOverlaps(items);
    const gap = expectClearance(b.install, b.menu, MIN_INSTALL_MENU_GAP_PX);
    console.log(
      `[${testInfo.project.name}] ${width}px Install App -> menu toggle gap: ${gap.toFixed(2)}px`
    );
    await expectKeyboardOperableMenu(page, controls);
  }
});

test("tablet-width header with Install App visible never overlaps navigation", async ({
  page,
}, testInfo) => {
  // Mid-width regression: inline desktop nav is shown above 640px, and a fired
  // beforeinstallprompt widens the brand group. Without the guard the nowrap
  // brand items overrun .header-nav across ~641-888px.
  await openHeader(page, 800, 900);

  const headerContent = page.locator(".header-content");
  const headerBrand = page.locator(".header-brand");
  const headerNav = page.locator(".header-nav");

  await dispatchInstallPrompt(page);

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

  expectNoPairOverlaps([
    { name: "header brand", box: brandBox },
    { name: "header nav", box: navBox },
  ]);
  const brandNavGap = expectClearance(
    { name: "Install App button", box: installBox },
    { name: "header nav", box: navBox },
    MIN_INSTALL_MENU_GAP_PX
  );
  console.log(
    `[${testInfo.project.name}] 800px Install App -> header nav gap: ${brandNavGap.toFixed(2)}px`
  );

  expect(contains(contentBox, brandBox)).toBe(true);
  expect(contains(contentBox, navBox)).toBe(true);
  expect(await noElementOverflow(page, ".header-content")).toBe(true);
  expect(await noDocumentOverflow(page)).toBe(true);
});
