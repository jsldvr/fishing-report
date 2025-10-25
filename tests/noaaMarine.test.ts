import { describe, it, expect } from "vitest";

// Mock the noaaMarine module to test the logic without hitting real APIs
describe("NOAA Marine Station Selection", () => {
  describe("findNearestStation logic", () => {
    it("should demonstrate why distant stations are returned for inland locations", async () => {
      // Milton, Wisconsin coordinates (inland location)
      const miltonWI = { lat: 42.7711, lon: -88.9423 };

      // Mock NOAA API response that would typically return distant coastal stations
      const mockStations = [
        {
          id: "8637611",
          name: "Quantico, Va.",
          lat: 38.5617,
          lng: -77.2961,
          state: "VA",
        },
        {
          id: "9087031",
          name: "Milwaukee, WI",
          lat: 43.0186,
          lng: -87.8877,
          state: "WI",
        },
      ];

      // Calculate distances manually to understand the issue
      const R = 6371; // Earth's radius in km
      const toRad = (degrees: number) => (degrees * Math.PI) / 180;

      const haversineDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ) => {
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Calculate distances from Milton, WI to each station
      const distances = mockStations.map((station) => ({
        ...station,
        distanceKm: haversineDistance(
          miltonWI.lat,
          miltonWI.lon,
          station.lat,
          station.lng
        ),
      }));

      console.log("Distances from Milton, WI:");
      distances.forEach((station) => {
        console.log(`${station.name}: ${station.distanceKm.toFixed(1)} km`);
      });

      // Sort by distance (this is what the current code does)
      const sorted = distances.sort((a, b) => a.distanceKm - b.distanceKm);

      console.log(
        `Nearest station: ${sorted[0].name} at ${sorted[0].distanceKm.toFixed(
          1
        )} km`
      );

      // The issue: even the "nearest" station might be very far for inland locations
      expect(sorted[0].distanceKm).toBeGreaterThan(50); // Demonstrating the problem
    });

    it("should show the BOUNDING_BOX_DELTAS expansion behavior", () => {
      const BOUNDING_BOX_DELTAS = [0.3, 0.6, 1.0, 1.5, 2.5];

      console.log("Bounding box expansion for Milton, WI (42.7711, -88.9423):");
      BOUNDING_BOX_DELTAS.forEach((delta) => {
        const miltonLat = 42.7711;
        const miltonLon = -88.9423;

        const minLon = Math.max(-180, Math.min(180, miltonLon - delta));
        const minLat = Math.max(-90, Math.min(90, miltonLat - delta));
        const maxLon = Math.max(-180, Math.min(180, miltonLon + delta));
        const maxLat = Math.max(-90, Math.min(90, miltonLat + delta));

        const bbox = [minLon, minLat, maxLon, maxLat];

        // Calculate approximate coverage area
        const latSpanKm = (maxLat - minLat) * 111; // ~111 km per degree latitude
        const lonSpanKm =
          (maxLon - minLon) * 111 * Math.cos((miltonLat * Math.PI) / 180);

        console.log(
          `Delta ${delta}: bbox=${bbox
            .map((x) => x.toFixed(1))
            .join(",")}, coverage≈${Math.round(latSpanKm)}x${Math.round(
            lonSpanKm
          )}km`
        );
      });

      // This shows how the algorithm progressively expands search area
      // until it finds ANY station, regardless of distance
      expect(BOUNDING_BOX_DELTAS.length).toBe(5);
    });
  });
});
