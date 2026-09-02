import { expect, test } from "bun:test";
import {
  addDays,
  dayOfWeek,
  endOfWeek,
  startOfWeek,
  weekMonthKey,
  weeksInMonth,
} from "./dates";
import {
  aggregate,
  DEFAULT_SETTINGS,
  monthlyKmTarget,
  type Session,
  weeklyTargets,
  weekReport,
} from "./metrics";

const MONDAY = 1;

function session(date: string, over: Partial<Session> = {}): Session {
  return {
    date,
    minutes: 480,
    kmStart: 0,
    kmEnd: 100,
    fuelCost: 30_000,
    services: [{ km: 60, amount: 150_000, isAirport: false }],
    ...over,
  };
}

test("dayOfWeek matches the calendar", () => {
  expect(dayOfWeek("2026-09-02")).toBe(3); // Wednesday
  expect(dayOfWeek("1970-01-01")).toBe(4); // Thursday
  expect(dayOfWeek("2026-09-06")).toBe(0); // Sunday
});

test("weeks run from the configured start day", () => {
  expect(startOfWeek("2026-09-02", MONDAY)).toBe("2026-08-31");
  expect(endOfWeek("2026-08-31")).toBe("2026-09-06");
  // A Monday is already its own week start.
  expect(startOfWeek("2026-08-31", MONDAY)).toBe("2026-08-31");
  // Sunday-start weeks put that same Wednesday in a different week.
  expect(startOfWeek("2026-09-02", 0)).toBe("2026-08-30");
});

test("a straddling week belongs to the month holding its middle day", () => {
  // Aug 31 – Sep 6: middle day is Sep 3, so it is a September week.
  expect(weekMonthKey("2026-08-31")).toBe("2026-09");
  // Aug 24 – Aug 30: middle day is Aug 27.
  expect(weekMonthKey("2026-08-24")).toBe("2026-08");
});

test("weeks partition the calendar with no gaps or double counting", () => {
  const months = ["2025-12", "2026-01", "2026-02", "2026-08", "2026-09"];
  for (const monthKey of months) {
    const weeks = weeksInMonth(monthKey, MONDAY);
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(5);
    for (const weekStart of weeks) {
      expect(weekMonthKey(weekStart)).toBe(monthKey);
      expect(dayOfWeek(weekStart)).toBe(MONDAY);
    }
  }
  // Consecutive months must not claim the same week.
  const august = weeksInMonth("2026-08", MONDAY);
  const september = weeksInMonth("2026-09", MONDAY);
  expect(august.filter((w) => september.includes(w))).toEqual([]);
  // And they must be adjacent: no week left unassigned in between.
  expect(endOfWeek(august[august.length - 1])).toBe(addDays(september[0], -1));
});

test("aggregate splits productive from empty km", () => {
  const totals = aggregate(
    [
      session("2026-09-01", {
        kmStart: 1_000,
        kmEnd: 1_200,
        fuelCost: 60_000,
        services: [
          { km: 80, amount: 200_000, isAirport: false },
          { km: 70, amount: 210_000, isAirport: true },
        ],
      }),
    ],
    DEFAULT_SETTINGS,
  );

  expect(totals.km).toBe(200);
  expect(totals.productiveKm).toBe(150);
  expect(totals.emptyKm).toBe(50);
  expect(totals.emptyKmPct).toBe(25);
  expect(totals.revenue).toBe(410_000);
  expect(totals.net).toBe(350_000);
  expect(totals.trips).toBe(2);
  expect(totals.airportTrips).toBe(1);
  expect(totals.fuelCostPerKm).toBe(300);
});

test("aggregate of nothing does not divide by zero", () => {
  const totals = aggregate([], DEFAULT_SETTINGS);
  expect(totals.km).toBe(0);
  expect(totals.emptyKmPct).toBe(0);
  expect(totals.farePerKm).toBe(0);
  expect(totals.kmPerGallon).toBeNull();
  expect(totals.fuelCostPerKm).toBeNull();
});

test("monthly km target covers the net goal plus fixed costs", () => {
  const target = monthlyKmTarget(DEFAULT_SETTINGS);
  const marginPerKm =
    DEFAULT_SETTINGS.farePerKmTarget - DEFAULT_SETTINGS.fuelCostPerKmEstimate;
  expect(Math.round(target * marginPerKm)).toBe(
    DEFAULT_SETTINGS.netTargetMonthly + DEFAULT_SETTINGS.fixedCostsMonthly,
  );
});

test("an impossible fare/fuel ratio yields no target instead of a negative one", () => {
  expect(
    monthlyKmTarget({
      ...DEFAULT_SETTINGS,
      farePerKmTarget: 300,
      fuelCostPerKmEstimate: 400,
    }),
  ).toBe(0);
});

test("weekly targets are the monthly goals over that month's week count", () => {
  const targets = weeklyTargets("2026-08-31", DEFAULT_SETTINGS);
  expect(targets.weeksInMonth).toBe(weeksInMonth("2026-09", MONDAY).length);
  expect(targets.net).toBe(
    DEFAULT_SETTINGS.netTargetMonthly / targets.weeksInMonth,
  );
  expect(targets.fixedCosts).toBe(
    DEFAULT_SETTINGS.fixedCostsMonthly / targets.weeksInMonth,
  );
});

test("pace counts today as a day still available", () => {
  const report = weekReport([], "2026-08-31", DEFAULT_SETTINGS, "2026-09-06");
  expect(report.daysRemaining).toBe(1); // Sunday, the last day, still counts
  expect(report.kmPerRemainingDay).toBe(report.kmRemaining);

  const midweek = weekReport([], "2026-08-31", DEFAULT_SETTINGS, "2026-09-02");
  expect(midweek.daysRemaining).toBe(5);
});

test("a week outside today has no pace", () => {
  const past = weekReport([], "2026-08-24", DEFAULT_SETTINGS, "2026-09-02");
  expect(past.daysRemaining).toBeNull();
  expect(past.kmPerRemainingDay).toBeNull();
});

test("the week's fixed-cost share is charged against the net", () => {
  const report = weekReport(
    [session("2026-09-02", { services: [] })],
    "2026-08-31",
    DEFAULT_SETTINGS,
    "2026-09-02",
  );
  expect(report.totals.net).toBe(-30_000);
  expect(report.netAfterFixedCosts).toBe(-30_000 - report.targets.fixedCosts);
  expect(report.progressPct).toBeLessThan(0);
});

test("only sessions inside the week are counted", () => {
  const sessions = [
    session("2026-08-30"), // previous week
    session("2026-08-31"), // first day
    session("2026-09-06"), // last day
    session("2026-09-07"), // next week
  ];
  const report = weekReport(
    sessions,
    "2026-08-31",
    DEFAULT_SETTINGS,
    "2026-09-02",
  );
  expect(report.sessions.map((s) => s.date)).toEqual([
    "2026-09-06",
    "2026-08-31",
  ]);
});
