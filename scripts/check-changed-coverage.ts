/**
 * Changed-file line coverage gate (AGENTS.md section 4: >= 80% line coverage
 * for changed files). Reads Vitest's json-summary report and fails when any
 * changed file that Vitest instruments falls below the threshold.
 *
 * Usage: tsx scripts/check-changed-coverage.ts [--base <ref>] [--summary <path>] [--threshold <pct>]
 *
 * "Changed" means files added, copied, modified, or renamed between the merge
 * base of <ref> and the working tree, plus untracked files, so the same command
 * works in CI and before a local commit. Files Vitest does not instrument (tests,
 * configs, coverage-excluded entry points) are not part of the gate.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_THRESHOLD = 80;
export const DEFAULT_SUMMARY_PATH = "coverage/coverage-summary.json";
export const DEFAULT_BASE_REF = "origin/main";

interface LineTotals {
  total: number;
  covered: number;
  pct: number;
}

export type CoverageSummary = Record<string, { lines: LineTotals }>;

export interface FileCoverageResult {
  file: string;
  total: number;
  covered: number;
  pct: number;
  passed: boolean;
}

export interface GateOptions {
  base: string;
  summary: string;
  threshold: number;
}

export type GitRunner = (args: string[]) => string;

export interface GateDependencies {
  git: GitRunner;
  readFile: (file: string) => string;
  repoRoot: string;
  log: (message: string) => void;
}

/** Repository-relative POSIX path, so Windows and Linux keys compare equal. */
export function toRepoPath(file: string, repoRoot: string): string {
  const relative = path.isAbsolute(file) ? path.relative(repoRoot, file) : file;
  return relative.split(path.sep).join("/").replace(/^\.\//, "");
}

/** Coverage results for the changed files that Vitest instrumented. */
export function evaluateChangedCoverage(
  summary: CoverageSummary,
  changedFiles: string[],
  repoRoot: string,
  threshold: number
): FileCoverageResult[] {
  const byPath = new Map<string, LineTotals>();
  for (const [file, entry] of Object.entries(summary)) {
    if (file !== "total") {
      byPath.set(toRepoPath(file, repoRoot), entry.lines);
    }
  }

  const changed = [...new Set(changedFiles.map((file) => toRepoPath(file, repoRoot)))];
  return changed
    .filter((file) => byPath.has(file))
    .sort()
    .map((file) => {
      const lines = byPath.get(file) as LineTotals;
      return {
        file,
        total: lines.total,
        covered: lines.covered,
        pct: lines.pct,
        passed: lines.total === 0 || lines.pct >= threshold,
      };
    });
}

function splitLines(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Files changed since the merge base with `baseRef`, including untracked files. */
export function listChangedFiles(baseRef: string, git: GitRunner): string[] {
  const mergeBase = git(["merge-base", baseRef, "HEAD"]).trim();
  const changed = splitLines(
    git(["diff", "--name-only", "--diff-filter=ACMR", mergeBase])
  );
  const untracked = splitLines(git(["ls-files", "--others", "--exclude-standard"]));
  return [...new Set([...changed, ...untracked])];
}

export function formatReport(results: FileCoverageResult[], threshold: number): string {
  if (results.length === 0) {
    return "No changed files are instrumented by Vitest; nothing to gate.";
  }
  const rows = results.map(
    (result) =>
      `${result.passed ? "PASS" : "FAIL"}  ${result.pct.toFixed(2).padStart(6)}%  ` +
      `${String(result.covered).padStart(4)}/${String(result.total).padEnd(4)}  ${result.file}`
  );
  const failed = results.filter((result) => !result.passed).length;
  const verdict =
    failed === 0
      ? `All ${results.length} changed files meet ${threshold}% line coverage.`
      : `${failed} of ${results.length} changed files are below ${threshold}% line coverage.`;
  return [`Changed-file line coverage (threshold ${threshold}%)`, ...rows, verdict].join("\n");
}

export function parseArgs(argv: string[]): GateOptions {
  const options: GateOptions = {
    base: DEFAULT_BASE_REF,
    summary: DEFAULT_SUMMARY_PATH,
    threshold: DEFAULT_THRESHOLD,
  };
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(`Missing value for ${flag}`);
    }
    if (flag === "--base") options.base = value;
    else if (flag === "--summary") options.summary = value;
    else if (flag === "--threshold") options.threshold = Number(value);
    else throw new Error(`Unknown option ${flag}`);
  }
  if (!Number.isFinite(options.threshold) || options.threshold < DEFAULT_THRESHOLD) {
    throw new Error(
      `Threshold must be a number of at least ${DEFAULT_THRESHOLD} (AGENTS.md).`
    );
  }
  return options;
}

/** Runs the gate and returns the process exit code. */
export function runChangedCoverageGate(
  options: GateOptions,
  deps: GateDependencies
): number {
  const summary = JSON.parse(deps.readFile(options.summary)) as CoverageSummary;
  const changed = listChangedFiles(options.base, deps.git);
  const results = evaluateChangedCoverage(
    summary,
    changed,
    deps.repoRoot,
    options.threshold
  );
  deps.log(formatReport(results, options.threshold));
  return results.every((result) => result.passed) ? 0 : 1;
}

function runGit(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" });
}

function isEntryPoint(): boolean {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntryPoint()) {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"]).trim();
  process.exitCode = runChangedCoverageGate(parseArgs(process.argv.slice(2)), {
    git: runGit,
    readFile: (file) => readFileSync(file, "utf8"),
    repoRoot: path.resolve(repoRoot),
    log: (message) => console.log(message),
  });
}
