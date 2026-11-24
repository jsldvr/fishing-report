/**
 * Verifies a production build's PWA wiring for its deployment base:
 * one effective manifest link, a stable manifest id, a launch URL inside the
 * manifest scope, a service worker registered for that scope whose offline
 * navigation fallback stays inside it, a 404 redirect that stays under the
 * base, and a zoomable viewport.
 *
 * Usage: tsx scripts/verify-pwa-build.ts --base /fishing-report/ [--dist dist]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Arbitrary origin used only to resolve URLs the way a browser would. */
const ORIGIN = "https://pwa.check";

export interface BuildFiles {
  indexHtml: string;
  manifest: string;
  serviceWorker: string;
  registerServiceWorker: string;
  notFoundHtml: string;
  /** True when a URL path under the base exists in the build output. */
  exists: (pathUnderBase: string) => boolean;
}

interface WebManifest {
  id?: string;
  start_url?: string;
  scope?: string;
  icons?: Array<{ src: string }>;
}

function resolvePath(href: string, against: string): string {
  return new URL(href, new URL(against, ORIGIN)).pathname;
}

function isWithin(pathname: string, scope: string): boolean {
  return pathname.startsWith(scope);
}

function checkManifestLink(files: BuildFiles, base: string, errors: string[]): string | null {
  const links = [...files.indexHtml.matchAll(/<link\b[^>]*\brel=["']manifest["'][^>]*>/gi)];
  if (links.length !== 1) {
    errors.push(`index.html must have exactly one manifest link; found ${links.length}.`);
    return null;
  }
  const href = /\bhref=["']([^"']+)["']/i.exec(links[0][0])?.[1];
  if (!href) {
    errors.push("The manifest link has no href.");
    return null;
  }
  const manifestPath = resolvePath(href, base);
  if (!isWithin(manifestPath, base)) {
    errors.push(`Manifest ${manifestPath} is outside the base ${base}.`);
  }
  return manifestPath;
}

function checkManifest(
  files: BuildFiles,
  base: string,
  manifestPath: string,
  errors: string[]
): void {
  const manifest = JSON.parse(files.manifest) as WebManifest;
  if (!manifest.id) {
    errors.push("Manifest must declare a stable id.");
  } else if (resolvePath(manifest.id, manifestPath) !== base) {
    errors.push(`Manifest id resolves to ${resolvePath(manifest.id, manifestPath)}, expected ${base}.`);
  }
  const scope = resolvePath(manifest.scope ?? ".", manifestPath);
  if (scope !== base) {
    errors.push(`Manifest scope is ${scope}, expected ${base}.`);
  }
  const startUrl = resolvePath(manifest.start_url ?? ".", manifestPath);
  if (!isWithin(startUrl, scope)) {
    errors.push(`Manifest start_url ${startUrl} is outside scope ${scope}.`);
  }
  for (const icon of manifest.icons ?? []) {
    const iconPath = resolvePath(icon.src, manifestPath);
    if (!isWithin(iconPath, base) || !files.exists(iconPath.slice(base.length))) {
      errors.push(`Manifest icon ${iconPath} is missing from the build.`);
    }
  }
}

function checkServiceWorker(files: BuildFiles, base: string, errors: string[]): void {
  const registration = /register\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*scope:\s*['"]([^'"]+)['"]/.exec(
    files.registerServiceWorker
  );
  if (!registration) {
    errors.push("registerSW.js does not register a service worker with an explicit scope.");
  } else {
    if (registration[1] !== `${base}sw.js`) {
      errors.push(`Service worker URL is ${registration[1]}, expected ${base}sw.js.`);
    }
    if (registration[2] !== base) {
      errors.push(`Service worker scope is ${registration[2]}, expected ${base}.`);
    }
  }
  const fallback = /createHandlerBoundToURL\(\s*["']([^"']+)["']\s*\)/.exec(files.serviceWorker)?.[1];
  if (!fallback) {
    errors.push("sw.js has no offline navigation fallback.");
    return;
  }
  const fallbackPath = resolvePath(fallback, `${base}sw.js`);
  if (fallbackPath !== `${base}index.html`) {
    errors.push(`Offline navigation fallback is ${fallbackPath}, expected ${base}index.html.`);
  }
  if (!/url:\s*["']index\.html["']/.test(files.serviceWorker)) {
    errors.push("index.html is not precached, so the offline fallback cannot resolve.");
  }
}

function checkDocument(files: BuildFiles, base: string, errors: string[]): void {
  const viewport = /<meta\b[^>]*name=["']viewport["'][^>]*>/i.exec(files.indexHtml)?.[0] ?? "";
  if (/user-scalable\s*=\s*(no|0)|maximum-scale/i.test(viewport)) {
    errors.push("The viewport meta must not restrict zoom.");
  }
  if (!/<meta\b[^>]*name=["']color-scheme["'][^>]*content=["']light dark["']/i.test(files.indexHtml)) {
    errors.push('index.html must declare <meta name="color-scheme" content="light dark">.');
  }
  if (!files.notFoundHtml.includes(`var base = ${JSON.stringify(base)};`)) {
    errors.push(`404.html does not redirect under ${base}.`);
  }
}

/** All PWA wiring problems in a build for `base`; empty when it is correct. */
export function verifyPwaBuild(files: BuildFiles, base: string): string[] {
  const errors: string[] = [];
  const manifestPath = checkManifestLink(files, base, errors);
  if (manifestPath) {
    checkManifest(files, base, manifestPath, errors);
  }
  checkServiceWorker(files, base, errors);
  checkDocument(files, base, errors);
  return errors;
}

export function readBuildFiles(distDir: string): BuildFiles {
  const read = (file: string) => readFileSync(path.join(distDir, file), "utf8");
  return {
    indexHtml: read("index.html"),
    manifest: read("manifest.webmanifest"),
    serviceWorker: read("sw.js"),
    registerServiceWorker: read("registerSW.js"),
    notFoundHtml: read("404.html"),
    exists: (pathUnderBase) => existsSync(path.join(distDir, pathUnderBase)),
  };
}

export function parseVerifyArgs(argv: string[]): { base: string; dist: string } {
  const options = { base: "/", dist: "dist" };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    if (flag === "--base") options.base = value;
    else if (flag === "--dist") options.dist = value;
    else throw new Error(`Unknown option ${flag}`);
  }
  if (!options.base.startsWith("/") || !options.base.endsWith("/")) {
    throw new Error(`--base must start and end with "/"; got ${options.base}`);
  }
  return options;
}

function isEntryPoint(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntryPoint()) {
  const { base, dist } = parseVerifyArgs(process.argv.slice(2));
  const errors = verifyPwaBuild(readBuildFiles(dist), base);
  for (const error of errors) {
    console.error(`FAIL  ${error}`);
  }
  console.log(
    errors.length === 0
      ? `PWA build for base ${base} verified.`
      : `${errors.length} PWA problem(s) for base ${base}.`
  );
  process.exitCode = errors.length === 0 ? 0 : 1;
}
