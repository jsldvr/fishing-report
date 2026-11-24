import { afterEach, describe, expect, it } from "vitest";
import {
  addDaysToDate,
  calendarDateInZone,
  daysBetweenDates,
  describeCalendarDateInZone,
  formatCalendarDate,
  formatTimeInZone,
  getAstronomicalTimes,
  getCurrentDateISO,
  getSolunarTimes,
  getTimezoneFromCoords,
  getViewerTimeZone,
  hourInZone,
  isCalendarDate,
  isHourInDaylightWindow,
  validateNorthAmericaCoords,
  zonedDayBounds,
  zonedWallTimeToInstant,
} from "./time";

const ORIGINAL_TZ = process.env.TZ;
const HOUR_MS = 3_600_000;

/** Runs `fn` as a viewer in `timeZone` (Node re-reads TZ on assignment). */
function asViewerIn<T>(timeZone: string, fn: () => T): T {
  process.env.TZ = timeZone;
  return fn();
}

/** ICU separates times and meridiems with a narrow no-break space. */
function plainSpaces(text: string): string {
  return text.replace(/\s/g, " ");
}

afterEach(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe("getCurrentDateISO", () => {
  // 22:30 Saturday Nov 21 in Chicago is already Sunday Nov 22 in UTC.
  const lateChicagoEvening = new Date("2026-11-22T04:30:00Z");

  it("keeps the North American calendar day late in the evening", () => {
    expect(getCurrentDateISO("America/Chicago", lateChicagoEvening)).toBe(
      "2026-11-21"
    );
    expect(getCurrentDateISO("America/Los_Angeles", lateChicagoEvening)).toBe(
      "2026-11-21"
    );
    expect(getCurrentDateISO("UTC", lateChicagoEvening)).toBe("2026-11-22");
  });

  it("defaults to the viewer's zone rather than UTC", () => {
    const viewerToday = asViewerIn("America/Chicago", () => {
      expect(getViewerTimeZone()).toBe("America/Chicago");
      return getCurrentDateISO(undefined, lateChicagoEvening);
    });
    expect(viewerToday).toBe("2026-11-21");
  });

  it("reads the date of an instant in an explicit zone", () => {
    expect(calendarDateInZone(new Date("2026-01-01T03:00:00Z"), "Asia/Tokyo")).toBe(
      "2026-01-01"
    );
    expect(
      calendarDateInZone(new Date("2026-01-01T03:00:00Z"), "America/New_York")
    ).toBe("2025-12-31");
  });
});

describe("addDaysToDate", () => {
  const viewerZones = [
    "UTC",
    "America/Los_Angeles",
    "Pacific/Honolulu",
    "Europe/Berlin",
    "Pacific/Auckland",
    "Asia/Kolkata",
  ];

  it.each(viewerZones)("adds calendar days for a viewer in %s", (zone) => {
    asViewerIn(zone, () => {
      expect(addDaysToDate("2026-11-21", 0)).toBe("2026-11-21");
      expect(addDaysToDate("2026-11-21", 1)).toBe("2026-11-22");
      expect(addDaysToDate("2026-11-21", 6)).toBe("2026-11-27");
      expect(addDaysToDate("2026-11-21", -21)).toBe("2026-10-31");
      expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
      expect(addDaysToDate("2028-02-28", 1)).toBe("2028-02-29");
    });
  });

  it.each(viewerZones)("crosses US DST transitions for a viewer in %s", (zone) => {
    asViewerIn(zone, () => {
      expect(addDaysToDate("2026-03-07", 1)).toBe("2026-03-08");
      expect(addDaysToDate("2026-03-08", 1)).toBe("2026-03-09");
      expect(addDaysToDate("2026-10-31", 1)).toBe("2026-11-01");
      expect(addDaysToDate("2026-11-01", 1)).toBe("2026-11-02");
    });
  });

  it("rejects values that are not real calendar dates", () => {
    expect(() => addDaysToDate("2026-02-30", 1)).toThrow(RangeError);
    expect(() => addDaysToDate("not-a-date", 1)).toThrow(RangeError);
    expect(isCalendarDate("2026-02-28")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-2-1")).toBe(false);
  });

  it("counts calendar days independent of DST", () => {
    expect(daysBetweenDates("2026-03-07", "2026-03-10")).toBe(3);
    expect(daysBetweenDates("2026-11-03", "2026-10-31")).toBe(-3);
    expect(daysBetweenDates("2026-11-21", "2026-11-21")).toBe(0);
  });
});

describe("zoned day bounds", () => {
  it("is 24 hours on an ordinary day", () => {
    const { startMs, endMs } = zonedDayBounds("2026-07-01", "America/New_York");
    expect(new Date(startMs).toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(endMs - startMs).toBe(24 * HOUR_MS);
  });

  it("is 23 hours on the spring-forward day", () => {
    const { startMs, endMs } = zonedDayBounds("2026-03-08", "America/New_York");
    expect(new Date(startMs).toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(endMs - startMs).toBe(23 * HOUR_MS);
  });

  it("is 25 hours on the fall-back day", () => {
    const { startMs, endMs } = zonedDayBounds("2026-11-01", "America/Los_Angeles");
    expect(new Date(startMs).toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(endMs - startMs).toBe(25 * HOUR_MS);
  });

  it("resolves local wall-clock times on both sides of a transition", () => {
    expect(
      zonedWallTimeToInstant("2026-03-08", "America/New_York", 12 * 60).toISOString()
    ).toBe("2026-03-08T16:00:00.000Z");
    expect(
      zonedWallTimeToInstant("2026-11-01", "America/New_York", 12 * 60).toISOString()
    ).toBe("2026-11-01T17:00:00.000Z");
  });

  it("reads hours in the location zone", () => {
    const instant = new Date("2026-11-21T23:30:00Z");
    expect(hourInZone(instant, "America/Los_Angeles")).toBe(15);
    expect(hourInZone(instant, "America/New_York")).toBe(18);
    expect(hourInZone(new Date("2026-11-22T05:00:00Z"), "America/New_York")).toBe(0);
  });
});

describe("calendar date display", () => {
  it.each(["America/Los_Angeles", "Pacific/Auckland", "UTC"])(
    "keeps the heading's calendar day for a viewer in %s",
    (zone) => {
      asViewerIn(zone, () => {
        expect(formatCalendarDate("2026-11-21")).toBe("Saturday, Nov 21");
        expect(
          formatCalendarDate("2026-03-08", { month: "2-digit", day: "2-digit" })
        ).toBe("03/08");
      });
    }
  );

  it.each(["America/New_York", "Asia/Tokyo"])(
    "labels the date in the fishing location's zone for a viewer in %s",
    (zone) => {
      asViewerIn(zone, () => {
        expect(describeCalendarDateInZone("2026-11-21", "America/Los_Angeles")).toEqual({
          local: "11/21/2026 PST",
          utc: "2026-11-21T08:00:00.000Z",
          timezone: "America/Los_Angeles",
        });
        expect(describeCalendarDateInZone("2026-07-04", "America/Chicago").local).toBe(
          "07/04/2026 CDT"
        );
      });
    }
  );

  it.each(["America/Los_Angeles", "Europe/London"])(
    "formats condition times in the location zone for a viewer in %s",
    (zone) => {
      asViewerIn(zone, () => {
        expect(
          plainSpaces(formatTimeInZone("2026-11-21T20:15:00Z", "America/New_York"))
        ).toBe("3:15 PM");
        expect(
          plainSpaces(formatTimeInZone("2026-03-08T07:30:00Z", "America/New_York"))
        ).toBe("3:30 AM");
      });
    }
  );

  it("returns unparseable times unchanged", () => {
    expect(formatTimeInZone("not-a-time", "America/New_York")).toBe("not-a-time");
  });
});

describe("astronomical and solunar times", () => {
  const lat = 40.7128;
  const lon = -74.006;

  it("formats sun and moon times in the location zone", () => {
    const times = getAstronomicalTimes("2026-06-21", lat, lon, "America/New_York");
    expect(plainSpaces(times.sunrise)).toMatch(/^05:\d{2} AM$/);
    expect(plainSpaces(times.sunset)).toMatch(/^08:\d{2} PM$/);
    expect(times.solarNoon).toBeTruthy();
    expect(times.moonrise).toBeTruthy();
    expect(times.moonset).toBeTruthy();
  });

  it("derives the zone from coordinates when none is supplied", () => {
    expect(getTimezoneFromCoords(lat, lon)).toBe("America/New_York");
    const derived = getAstronomicalTimes("2026-06-21", lat, lon);
    const explicit = getAstronomicalTimes("2026-06-21", lat, lon, "America/New_York");
    expect(derived).toEqual(explicit);
  });

  it("handles polar day and night", () => {
    const polarNight = getAstronomicalTimes("2026-12-21", 80, -100, "America/Edmonton");
    expect(polarNight.sunrise).toBe(polarNight.sunset);
    const polarDay = getAstronomicalTimes("2026-06-21", 80, -100, "America/Edmonton");
    expect(polarDay.sunrise).not.toBe(polarDay.sunset);
  });

  it("produces the same solunar periods and rating for every viewer zone", () => {
    const results = ["America/Los_Angeles", "Europe/Berlin", "Asia/Tokyo"].map(
      (zone) =>
        asViewerIn(zone, () =>
          getSolunarTimes("2026-11-21", lat, lon, 0.95, "America/New_York")
        )
    );
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(results[0].majorPeriods).toHaveLength(2);
    expect(results[0].minorPeriods).toHaveLength(2);
    expect(results[0].dayRating).toBeGreaterThanOrEqual(2);
    expect(results[0].dayRating).toBeLessThanOrEqual(4);
  });

  it("rates mid-cycle moons lower than new or full moons", () => {
    const quarter = getSolunarTimes("2026-11-21", lat, lon, 0.25);
    const full = getSolunarTimes("2026-11-21", lat, lon, 0.95);
    expect(full.dayRating).toBeGreaterThan(quarter.dayRating);
    const gibbous = getSolunarTimes("2026-11-21", lat, lon, 0.5);
    expect(gibbous.dayRating).toBeGreaterThanOrEqual(quarter.dayRating);
  });
});

describe("coordinate and hour helpers", () => {
  it("validates North American bounds", () => {
    expect(validateNorthAmericaCoords(40, -74)).toBe(true);
    expect(validateNorthAmericaCoords(13.9, -74)).toBe(false);
    expect(validateNorthAmericaCoords(40, -49)).toBe(false);
  });

  it("reads the hour from a local ISO date-time", () => {
    expect(isHourInDaylightWindow("2026-11-21T06:00")).toBe(true);
    expect(isHourInDaylightWindow("2026-11-21T19:00")).toBe(false);
    expect(isHourInDaylightWindow("malformed")).toBe(true);
  });
});
