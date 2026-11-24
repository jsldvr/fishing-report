import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseVerifyArgs, readBuildFiles, verifyPwaBuild, type BuildFiles } from "./verify-pwa-build";

function build(base: string, overrides: Partial<BuildFiles> = {}): BuildFiles {
  const present = new Set(["icons/icon-192.png", "fishing.svg"]);
  return {
    indexHtml: `<!doctype html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light dark" />
      <link rel="manifest" href="${base}manifest.webmanifest"></head></html>`,
    manifest: JSON.stringify({
      id: base,
      start_url: base,
      scope: base,
      icons: [{ src: "icons/icon-192.png" }, { src: "fishing.svg" }],
    }),
    serviceWorker: `e.precacheAndRoute([{url:"index.html",revision:"1"}]);e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("${base}index.html")))`,
    registerServiceWorker: `navigator.serviceWorker.register('${base}sw.js', { scope: '${base}' })`,
    notFoundHtml: `<script>var base = ${JSON.stringify(base)};</script>`,
    exists: (file) => present.has(file),
    ...overrides,
  };
}

describe("verifyPwaBuild", () => {
  it.each(["/", "/fishing-report/"])("accepts a correct build for base %s", (base) => {
    expect(verifyPwaBuild(build(base), base)).toEqual([]);
  });

  it("rejects the previously reviewed /fishing-report/ build", () => {
    const base = "/fishing-report/";
    const errors = verifyPwaBuild(
      build(base, {
        indexHtml: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="manifest" href="/fishing-report/manifest.webmanifest">`,
        manifest: JSON.stringify({ start_url: "/", scope: "/fishing-report/" }),
        serviceWorker: `{url:"index.html"} createHandlerBoundToURL("/index.html")`,
        notFoundHtml: "window.location.replace(`${window.location.origin}/`)",
      }),
      base
    );

    expect(errors).toEqual([
      "index.html must have exactly one manifest link; found 2.",
      "Offline navigation fallback is /index.html, expected /fishing-report/index.html.",
      "The viewport meta must not restrict zoom.",
      'index.html must declare <meta name="color-scheme" content="light dark">.',
      "404.html does not redirect under /fishing-report/.",
    ]);
  });

  it("checks manifest identity, scope, launch URL, and icons", () => {
    const base = "/fishing-report/";
    const errors = verifyPwaBuild(
      build(base, {
        manifest: JSON.stringify({
          start_url: "/",
          scope: "/",
          icons: [{ src: "icons/missing.png" }],
        }),
      }),
      base
    );
    expect(errors).toEqual([
      "Manifest must declare a stable id.",
      "Manifest scope is /, expected /fishing-report/.",
      "Manifest icon /fishing-report/icons/missing.png is missing from the build.",
    ]);

    expect(
      verifyPwaBuild(
        build(base, {
          manifest: JSON.stringify({ id: "/", start_url: "/elsewhere/", scope: base }),
        }),
        base
      )
    ).toEqual([
      "Manifest id resolves to /, expected /fishing-report/.",
      "Manifest start_url /elsewhere/ is outside scope /fishing-report/.",
    ]);
  });

  it("checks the manifest link and service worker registration", () => {
    const base = "/fishing-report/";
    expect(
      verifyPwaBuild(build(base, { indexHtml: '<link rel="manifest">' }), base)
    ).toContain("The manifest link has no href.");
    expect(
      verifyPwaBuild(
        build(base, { indexHtml: '<meta name="color-scheme" content="light dark"><link rel="manifest" href="/other/m.json">' }),
        base
      )[0]
    ).toBe("Manifest /other/m.json is outside the base /fishing-report/.");
    expect(
      verifyPwaBuild(
        build(base, {
          registerServiceWorker: "navigator.serviceWorker.register('/sw.js', { scope: '/' })",
        }),
        base
      )
    ).toEqual([
      "Service worker URL is /sw.js, expected /fishing-report/sw.js.",
      "Service worker scope is /, expected /fishing-report/.",
    ]);
    expect(
      verifyPwaBuild(build(base, { registerServiceWorker: "" , serviceWorker: "" }), base)
    ).toEqual([
      "registerSW.js does not register a service worker with an explicit scope.",
      "sw.js has no offline navigation fallback.",
    ]);
    expect(
      verifyPwaBuild(
        build(base, { serviceWorker: `createHandlerBoundToURL("${base}index.html")` }),
        base
      )
    ).toEqual(["index.html is not precached, so the offline fallback cannot resolve."]);
  });
});

describe("verify-pwa-build CLI helpers", () => {
  it("parses and validates arguments", () => {
    expect(parseVerifyArgs([])).toEqual({ base: "/", dist: "dist" });
    expect(parseVerifyArgs(["--base", "/fishing-report/", "--dist", "out"])).toEqual({
      base: "/fishing-report/",
      dist: "out",
    });
    expect(() => parseVerifyArgs(["--base", "fishing-report"])).toThrow(/must start and end/);
    expect(() => parseVerifyArgs(["--dist"])).toThrow(/Missing value/);
    expect(() => parseVerifyArgs(["--x", "1"])).toThrow(/Unknown option/);
  });

  it("reads build files from a dist directory", () => {
    const dist = mkdtempSync(path.join(tmpdir(), "pwa-build-"));
    try {
      const files = build("/");
      writeFileSync(path.join(dist, "index.html"), files.indexHtml);
      writeFileSync(path.join(dist, "manifest.webmanifest"), files.manifest);
      writeFileSync(path.join(dist, "sw.js"), files.serviceWorker);
      writeFileSync(path.join(dist, "registerSW.js"), files.registerServiceWorker);
      writeFileSync(path.join(dist, "404.html"), files.notFoundHtml);
      mkdirSync(path.join(dist, "icons"));
      writeFileSync(path.join(dist, "icons", "icon-192.png"), "");
      writeFileSync(path.join(dist, "fishing.svg"), "");

      expect(verifyPwaBuild(readBuildFiles(dist), "/")).toEqual([]);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});
