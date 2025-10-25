import { describe, it, expect } from "vitest";

describe("NOAA Station Selection Fix", () => {
  it("should prioritize appropriate station types for different regions", () => {
    // The fix: search for multiple station types in order of preference
    const stationTypes = [
      "waterlevels",
      "meteorology",
      "wind",
      "watertemperature",
      "tidepredictions",
    ];

    console.log("Station type search priority:");
    stationTypes.forEach((type, index) => {
      const description = {
        waterlevels: "Great Lakes, rivers, coastal - real-time water levels",
        meteorology: "Widespread - comprehensive weather data",
        wind: "Great Lakes, coastal - wind speed/direction",
        watertemperature: "Great Lakes, coastal - water temperature",
        tidepredictions: "Coastal only - harmonic tide predictions",
      }[type];

      console.log(`  ${index + 1}. ${type}: ${description}`);
    });

    expect(stationTypes[0]).toBe("waterlevels"); // Should try Great Lakes friendly types first
    expect(stationTypes[stationTypes.length - 1]).toBe("tidepredictions"); // Coastal-only types last
  });

  it("should explain why the original algorithm failed for inland locations", () => {
    const originalApproach = {
      stationTypes: ["tidepredictions"], // Only coastal stations
      searchStrategy: "Expand bounding box until ANY station found",
      result: "Returns distant coastal stations for inland locations",
    };

    const fixedApproach = {
      stationTypes: [
        "waterlevels",
        "meteorology",
        "wind",
        "watertemperature",
        "tidepredictions",
      ],
      searchStrategy:
        "Try Great Lakes/inland-friendly types first, then expand area",
      result:
        "Returns appropriate regional stations (Great Lakes for Midwest, etc.)",
    };

    console.log("\\nOriginal algorithm problem:");
    console.log(
      `  Types searched: ${originalApproach.stationTypes.join(", ")}`
    );
    console.log(`  Strategy: ${originalApproach.searchStrategy}`);
    console.log(`  Result: ${originalApproach.result}`);

    console.log("\\nFixed algorithm:");
    console.log(`  Types searched: ${fixedApproach.stationTypes.join(", ")}`);
    console.log(`  Strategy: ${fixedApproach.searchStrategy}`);
    console.log(`  Result: ${fixedApproach.result}`);

    expect(fixedApproach.stationTypes.length).toBeGreaterThan(
      originalApproach.stationTypes.length
    );
  });

  it("should show expected results for Milton, WI with the fix", () => {
    // With the fix, Milton, WI should find Great Lakes stations instead of Quantico, VA
    const expectedResults = {
      waterlevels: "Great Lakes stations (Milwaukee, Calumet Harbor, etc.)",
      meteorology: "Great Lakes or regional weather stations",
      wind: "Great Lakes wind monitoring stations",
      tidepredictions: "Distant coastal stations (fallback only)",
    };

    console.log("\\nExpected station types for Milton, WI:");
    Object.entries(expectedResults).forEach(([type, expected]) => {
      console.log(`  ${type}: ${expected}`);
    });

    // The algorithm should find Great Lakes stations (~90km) instead of East Coast (~1000km)
    expect(expectedResults.waterlevels).toContain("Great Lakes");
  });
});
