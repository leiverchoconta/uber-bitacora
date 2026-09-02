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
  averageMinutesPerWeek,
  DEFAULT_SETTINGS,
  monthReport,
  passesBetween,
  type Session,
  sessionNetOfFuel,
  WEEK_STARTS_ON,
  weekReport,
} from "./metrics";

function session(date: string, over: Partial<Session> = {}): Session {
  return {
    date,
    minutes: 480,
    kmStart: 0,
    kmEnd: 100,
    refueled: false,
    fuelCost: 0,
    fuelGallonsX100: 0,
    services: [{ km: 60, amount: 150_000, isAirport: false }],
    ...over,
  };
}

// --- calendar ---------------------------------------------------------------

test("dayOfWeek matches the calendar", () => {
  expect(dayOfWeek("2026-09-02")).toBe(3); // Wednesday
  expect(dayOfWeek("1970-01-01")).toBe(4); // Thursday
  expect(dayOfWeek("2026-09-06")).toBe(0); // Sunday
});

test("weeks run Monday to Sunday", () => {
  expect(WEEK_STARTS_ON).toBe(1);
  expect(startOfWeek("2026-09-02", WEEK_STARTS_ON)).toBe("2026-08-31");
  expect(endOfWeek("2026-08-31")).toBe("2026-09-06");
  expect(startOfWeek("2026-08-31", WEEK_STARTS_ON)).toBe("2026-08-31");
});

test("a straddling week belongs to the month holding its middle day", () => {
  expect(weekMonthKey("2026-08-31")).toBe("2026-09");
  expect(weekMonthKey("2026-08-24")).toBe("2026-08");
});

test("weeks partition the calendar with no gaps or double counting", () => {
  for (const monthKey of ["2025-12", "2026-01", "2026-02", "2026-09"]) {
    const weeks = weeksInMonth(monthKey, WEEK_STARTS_ON);
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(5);
    for (const weekStart of weeks) {
      expect(weekMonthKey(weekStart)).toBe(monthKey);
      expect(dayOfWeek(weekStart)).toBe(WEEK_STARTS_ON);
    }
  }
  const august = weeksInMonth("2026-08", WEEK_STARTS_ON);
  const september = weeksInMonth("2026-09", WEEK_STARTS_ON);
  expect(august.filter((w) => september.includes(w))).toEqual([]);
  expect(endOfWeek(august[august.length - 1])).toBe(addDays(september[0], -1));
});

// --- aggregation ------------------------------------------------------------

test("aggregate splits productive from empty km", () => {
  const totals = aggregate([
    session("2026-09-01", {
      kmStart: 1_000,
      kmEnd: 1_200,
      services: [
        { km: 80, amount: 200_000, isAirport: false },
        { km: 70, amount: 210_000, isAirport: true },
      ],
    }),
  ]);

  expect(totals.km).toBe(200);
  expect(totals.productiveKm).toBe(150);
  expect(totals.emptyKm).toBe(50);
  expect(totals.emptyKmPct).toBe(25);
  expect(totals.revenue).toBe(410_000);
  expect(totals.trips).toBe(2);
  expect(totals.airportTrips).toBe(1);
});

test("fuel economy comes from real gallons and odometer km", () => {
  const totals = aggregate([
    session("2026-09-01", {
      kmStart: 0,
      kmEnd: 300,
      refueled: true,
      fuelCost: 90_000,
      fuelGallonsX100: 575, // 5.75 gal
      services: [],
    }),
  ]);

  expect(totals.refuels).toBe(1);
  expect(totals.gallons).toBe(5.75);
  expect(totals.kmPerGallon).toBeCloseTo(300 / 5.75, 6);
  expect(totals.fuelCostPerKm).toBe(300);
  expect(totals.netOfFuelPerKm).toBe(-300); // no trips: pure cost
});

test("no refuel yet means no fuel figure at all, not a zero", () => {
  const totals = aggregate([session("2026-09-01")]);
  expect(totals.gallons).toBe(0);
  expect(totals.fuelCost).toBe(0);
  expect(totals.kmPerGallon).toBeNull();
  // Without a refuel these are unmeasured, not measured as zero — reporting
  // 0 COP/km of fuel would make the margin the whole fare.
  expect(totals.fuelCostPerKm).toBeNull();
  expect(totals.netOfFuelPerKm).toBeNull();
});

test("the margin stays unmeasured until a tank is recorded", () => {
  // Real distance and real revenue, but no fuel: revenue/km is not a margin.
  const noRefuel = aggregate([
    session("2026-09-01", {
      kmStart: 0,
      kmEnd: 400,
      services: [{ km: 200, amount: 1_000_000, isAirport: false }],
    }),
  ]);
  expect(noRefuel.km).toBe(400);
  expect(noRefuel.netOfFuel).toBe(1_000_000);
  expect(noRefuel.netOfFuelPerKm).toBeNull();

  const withRefuel = aggregate([
    session("2026-09-01", {
      kmStart: 0,
      kmEnd: 400,
      refueled: true,
      fuelCost: 120_000,
      fuelGallonsX100: 750,
      services: [{ km: 200, amount: 1_000_000, isAirport: false }],
    }),
  ]);
  expect(withRefuel.netOfFuelPerKm).toBe((1_000_000 - 120_000) / 400);
});

test("aggregate of nothing does not divide by zero", () => {
  const totals = aggregate([]);
  expect(totals.km).toBe(0);
  expect(totals.emptyKmPct).toBe(0);
  expect(totals.farePerKm).toBe(0);
  expect(totals.kmPerGallon).toBeNull();
  expect(totals.fuelCostPerKm).toBeNull();
  expect(totals.netOfFuelPerKm).toBeNull();
});

test("a session's net charges only the fuel loaded during it", () => {
  const dry = session("2026-09-01");
  const wet = session("2026-09-02", {
    refueled: true,
    fuelCost: 120_000,
    fuelGallonsX100: 800,
  });
  expect(sessionNetOfFuel(dry)).toBe(150_000);
  expect(sessionNetOfFuel(wet)).toBe(30_000);
});

// --- passes -----------------------------------------------------------------

test("passes are counted by the day they were paid, on any weekday", () => {
  const passes = [
    { date: "2026-08-30", amount: 40_000 }, // previous week
    { date: "2026-08-31", amount: 40_000 }, // Monday, first day
    { date: "2026-09-03", amount: 40_000 }, // Thursday, mid-week
    { date: "2026-09-06", amount: 40_000 }, // Sunday, last day
    { date: "2026-09-07", amount: 40_000 }, // next week
  ];
  const inWeek = passesBetween(passes, "2026-08-31", "2026-09-06");
  expect(inWeek.map((p) => p.date)).toEqual([
    "2026-09-06",
    "2026-09-03",
    "2026-08-31",
  ]);
});

// --- the weekly goal --------------------------------------------------------

test("the weekly target is used whole, never divided", () => {
  const report = weekReport(
    [],
    [],
    "2026-08-31",
    DEFAULT_SETTINGS,
    null,
    "2026-09-02",
  );
  expect(report.target).toBe(DEFAULT_SETTINGS.netTargetWeekly);
  expect(report.netRemaining).toBe(DEFAULT_SETTINGS.netTargetWeekly);
  expect(report.progressPct).toBe(0);
});

test("the week's net is revenue minus fuel minus the passes actually paid", () => {
  const report = weekReport(
    [
      session("2026-09-01", {
        services: [{ km: 60, amount: 300_000, isAirport: false }],
      }),
      session("2026-09-02", {
        refueled: true,
        fuelCost: 100_000,
        fuelGallonsX100: 650,
        services: [{ km: 50, amount: 200_000, isAirport: false }],
      }),
    ],
    [
      { date: "2026-09-01", amount: 40_000 },
      { date: "2026-09-04", amount: 40_000 },
      { date: "2026-09-09", amount: 40_000 }, // next week, must not count
    ],
    "2026-08-31",
    { netTargetWeekly: 1_000_000 },
    null,
    "2026-09-02",
  );

  expect(report.totals.revenue).toBe(500_000);
  expect(report.totals.netOfFuel).toBe(400_000);
  expect(report.passCost).toBe(80_000);
  expect(report.net).toBe(320_000);
  expect(report.progressPct).toBe(32);
  expect(report.netRemaining).toBe(680_000);
});

test("km remaining is derived from the measured margin, not an assumption", () => {
  const report = weekReport(
    [],
    [],
    "2026-08-31",
    { netTargetWeekly: 1_000_000 },
    1_250, // measured take-home per km
    "2026-09-02",
  );
  expect(report.kmRemaining).toBe(800);
  expect(report.daysRemaining).toBe(5);
  expect(report.kmPerRemainingDay).toBe(160);
});

test("without measured history there is no km figure to show", () => {
  const noHistory = weekReport(
    [],
    [],
    "2026-08-31",
    DEFAULT_SETTINGS,
    null,
    "2026-09-02",
  );
  expect(noHistory.kmRemaining).toBeNull();
  expect(noHistory.kmPerRemainingDay).toBeNull();

  // A negative margin cannot be turned into a distance either.
  const losing = weekReport(
    [],
    [],
    "2026-08-31",
    DEFAULT_SETTINGS,
    -400,
    "2026-09-02",
  );
  expect(losing.kmRemaining).toBeNull();
});

test("pace counts today as a day still available", () => {
  const sunday = weekReport(
    [],
    [],
    "2026-08-31",
    DEFAULT_SETTINGS,
    1_000,
    "2026-09-06",
  );
  expect(sunday.daysRemaining).toBe(1);
  expect(sunday.netPerRemainingDay).toBe(sunday.netRemaining);
});

test("a week outside today has no pace", () => {
  const past = weekReport(
    [],
    [],
    "2026-08-24",
    DEFAULT_SETTINGS,
    1_000,
    "2026-09-02",
  );
  expect(past.daysRemaining).toBeNull();
  expect(past.netPerRemainingDay).toBeNull();
  expect(past.kmPerRemainingDay).toBeNull();
});

test("only sessions inside the week are counted", () => {
  const sessions = [
    session("2026-08-30"),
    session("2026-08-31"),
    session("2026-09-06"),
    session("2026-09-07"),
  ];
  const report = weekReport(
    sessions,
    [],
    "2026-08-31",
    DEFAULT_SETTINGS,
    null,
    "2026-09-02",
  );
  expect(report.sessions.map((s) => s.date)).toEqual([
    "2026-09-06",
    "2026-08-31",
  ]);
});

test("a target already met shows nothing remaining and over 100%", () => {
  const report = weekReport(
    [
      session("2026-09-01", {
        services: [{ km: 400, amount: 1_500_000, isAirport: false }],
      }),
    ],
    [],
    "2026-08-31",
    { netTargetWeekly: 1_000_000 },
    1_000,
    "2026-09-02",
  );
  expect(report.net).toBe(1_500_000);
  expect(report.progressPct).toBe(150);
  expect(report.netRemaining).toBe(0);
  expect(report.kmRemaining).toBe(0);
});

// --- observations -----------------------------------------------------------

test("average hours per week counts only the weeks actually worked", () => {
  expect(averageMinutesPerWeek([])).toBeNull();
  // Two sessions in one week, one in another: 3 weeks on the calendar, 2 worked.
  const average = averageMinutesPerWeek([
    session("2026-08-31", { minutes: 300 }),
    session("2026-09-02", { minutes: 500 }),
    session("2026-09-15", { minutes: 400 }),
  ]);
  expect(average).toBe(1_200 / 2);
});

test("the month charges every pass that fell inside it", () => {
  const report = monthReport(
    [
      session("2026-09-02", {
        services: [{ km: 60, amount: 500_000, isAirport: false }],
      }),
    ],
    [
      { date: "2026-09-02", amount: 40_000 },
      { date: "2026-09-20", amount: 40_000 },
      { date: "2026-10-20", amount: 40_000 }, // another month
    ],
    "2026-09",
    DEFAULT_SETTINGS,
  );
  expect(report.totals.revenue).toBe(500_000);
  expect(report.passCost).toBe(80_000);
  expect(report.net).toBe(420_000);
  expect(report.weeklyTarget).toBe(DEFAULT_SETTINGS.netTargetWeekly);
  expect(report.weeks.length).toBe(
    weeksInMonth("2026-09", WEEK_STARTS_ON).length,
  );
});
