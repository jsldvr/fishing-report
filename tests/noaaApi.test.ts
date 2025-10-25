import { describe, it } from "vitest";

// Test to investigate what NOAA stations are actually available
describe("NOAA API Investigation", () => {
  it("should show what stations NOAA actually returns for Milton, WI area", async () => {
    const miltonWI = { lat: 42.7711, lon: -88.9423 };
    const BOUNDING_BOX_DELTAS = [0.3, 0.6, 1.0, 1.5, 2.5];

    const buildBoundingBox = (lat: number, lon: number, delta: number) => {
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value));
      const minLon = clamp(lon - delta, -180, 180);
      const minLat = clamp(lat - delta, -90, 90);
      const maxLon = clamp(lon + delta, -180, 180);
      const maxLat = clamp(lat + delta, -90, 90);
      return [minLon, minLat, maxLon, maxLat];
    };

    const haversineDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ) => {
      const R = 6371;
      const toRad = (degrees: number) => (degrees * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    console.log("\\nInvestigating NOAA stations for Milton, WI...");

    for (const delta of BOUNDING_BOX_DELTAS) {
      const bbox = buildBoundingBox(miltonWI.lat, miltonWI.lon, delta);
      const url = new URL(
        "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json"
      );
      url.searchParams.set("type", "tidepredictions");
      url.searchParams.set("bbox", bbox.join(","));
      url.searchParams.set("units", "metric");

      console.log(
        `\\nDelta ${delta}: bbox=${bbox.map((x) => x.toFixed(1)).join(",")}`
      );

      try {
        const response = await fetch(url.toString());
        if (!response.ok) {
          console.log(
            `  API returned ${response.status}: ${response.statusText}`
          );
          continue;
        }

        const data = (await response.json()) as {
          stations?: Array<{
            id: string;
            name: string;
            lat: number;
            lng: number;
            state?: string;
          }>;
        };

        const stations = data.stations || [];
        console.log(`  Found ${stations.length} stations:`);

        if (stations.length > 0) {
          const enriched = stations
            .map((station) => ({
              ...station,
              distanceKm: haversineDistance(
                miltonWI.lat,
                miltonWI.lon,
                station.lat,
                station.lng
              ),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);

          enriched.slice(0, 5).forEach((station) => {
            console.log(
              `    ${station.name} (${
                station.state
              }): ${station.distanceKm.toFixed(1)} km`
            );
          });

          // This is the key insight: what does the algorithm actually return?
          console.log(
            `  -> Algorithm would return: ${
              enriched[0].name
            } at ${enriched[0].distanceKm.toFixed(1)} km`
          );

          // Stop at first successful bbox (this is what the real algorithm does)
          break;
        } else {
          console.log("    No stations found in this bounding box");
        }
      } catch (error) {
        console.log(`  Error: ${error}`);
      }
    }
  }, 30000); // 30 second timeout for API calls
});
