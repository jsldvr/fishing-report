import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THRESHOLD,
  evaluateChangedCoverage,
  formatReport,
  listChangedFiles,
  parseArgs,
  runChangedCoverageGate,
  toRepoPath,
  type CoverageSummary,
} from "./check-changed-coverage";

const repoRoot = path.resolve("/repo");

function lines(total: number, covered: number) {
  return { lines: { total, covered, pct: total === 0 ? 100 : (covered / total) * 100 } };
}

const summary: CoverageSummary = {
  total: lines(300, 250),
  [path.join(repoRoot, "src", "lib", "time.ts")]: lines(100, 95),
  [path.join(repoRoot, "src", "components", "LocationInput.tsx")]: lines(100, 70),
  [path.join(repoRoot, "src", "types", "forecast.ts")]: lines(0, 0),
  [path.join(repoRoot, "src", "pages", "Results.tsx")]: lines(100, 2),
};

describe("changed-file coverage gate", () => {
  it("normalizes absolute and relative paths to repository POSIX paths", () => {
    expect(toRepoPath(path.join(repoRoot, "src", "App.tsx"), repoRoot)).toBe("src/App.tsx");
    expect(toRepoPath("./src/App.tsx", repoRoot)).toBe("src/App.tsx");
  });

  it("gates only changed, instrumented files", () => {
    const results = evaluateChangedCoverage(
      summary,
      [
        "src/lib/time.ts",
        "src/components/LocationInput.tsx",
        "src/types/forecast.ts",
        "README.md",
        "src/lib/time.ts",
      ],
      repoRoot,
      DEFAULT_THRESHOLD
    );

    expect(results.map((result) => [result.file, result.passed])).toEqual([
      ["src/components/LocationInput.tsx", false],
      ["src/lib/time.ts", true],
      ["src/types/forecast.ts", true],
    ]);
  });

  it("reports pass and fail rows with a verdict", () => {
    const results = evaluateChangedCoverage(
      summary,
      ["src/lib/time.ts", "src/components/LocationInput.tsx"],
      repoRoot,
      80
    );
    const report = formatReport(results, 80);
    expect(report).toContain("FAIL   70.00%    70/100   src/components/LocationInput.tsx");
    expect(report).toContain("PASS   95.00%    95/100   src/lib/time.ts");
    expect(report).toContain("1 of 2 changed files are below 80% line coverage.");
    expect(formatReport([], 80)).toMatch(/nothing to gate/);
    expect(formatReport(results.slice(1), 80)).toContain(
      "All 1 changed files meet 80% line coverage."
    );
  });

  it("lists committed, working-tree, and untracked changes since the merge base", () => {
    const git = vi.fn((args: string[]) => {
      if (args[0] === "merge-base") return "abc123\n";
      if (args[0] === "diff") return "src/lib/time.ts\r\nsrc/App.tsx\n";
      return "src/lib/colorScheme.ts\nsrc/App.tsx\n";
    });

    expect(listChangedFiles("origin/main", git)).toEqual([
      "src/lib/time.ts",
      "src/App.tsx",
      "src/lib/colorScheme.ts",
    ]);
    expect(git).toHaveBeenCalledWith(["merge-base", "origin/main", "HEAD"]);
    expect(git).toHaveBeenCalledWith(["diff", "--name-only", "--diff-filter=ACMR", "abc123"]);
  });

  it("parses options and refuses a threshold below the AGENTS.md minimum", () => {
    expect(parseArgs([])).toEqual({
      base: "origin/main",
      summary: "coverage/coverage-summary.json",
      threshold: 80,
    });
    expect(
      parseArgs(["--base", "abc", "--summary", "s.json", "--threshold", "90"])
    ).toEqual({ base: "abc", summary: "s.json", threshold: 90 });
    expect(() => parseArgs(["--threshold", "50"])).toThrow(/at least 80/);
    expect(() => parseArgs(["--threshold"])).toThrow(/Missing value/);
    expect(() => parseArgs(["--nope", "1"])).toThrow(/Unknown option/);
  });

  it("returns a failing exit code when any changed file is below threshold", () => {
    const log = vi.fn();
    const deps = {
      readFile: () => JSON.stringify(summary),
      repoRoot,
      log,
      git: (args: string[]) => {
        if (args[0] === "merge-base") return "abc\n";
        if (args[0] === "diff") return "src/components/LocationInput.tsx\n";
        return "";
      },
    };

    expect(runChangedCoverageGate(parseArgs([]), deps)).toBe(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));

    const passing = { ...deps, git: (args: string[]) => (args[0] === "diff" ? "src/lib/time.ts\n" : args[0] === "merge-base" ? "abc" : "") };
    expect(runChangedCoverageGate(parseArgs([]), passing)).toBe(0);
  });
});
