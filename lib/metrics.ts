/**
 * Business logic for the logbook: aggregation, the weekly goal, and pace.
 *
 * Pure functions over plain data — no database, no React. This is the part
 * worth testing (see metrics.test.ts); everything else is plumbing.
 *
 * Money is COP as integers (no cents). Time is whole minutes. Distance is km.
 * Gallons are hundredths of a gallon. Nothing here is a float that matters.
 *
 * The driver configures exactly one number: the weekly take-home target.
 * Every other figure the app used to ask for is measured from the sessions.
 */

import {
  endOfWeek,
  startOfWeek,
  today,
  toEpochDay,
  weeksInMonth,
} from "./dates";

/** Weeks run Monday to Sunday. Not configurable — one driver, one convention. */
export const WEEK_STARTS_ON = 1;

export type Service = {
  km: number;
  amount: number;
  isAirport: boolean;
};

export type Session = {
  date: string;
  minutes: number;
  kmStart: number;
  kmEnd: number;
  /** Whether the tank was filled during this shift. */
  refueled: boolean;
  /** COP paid at the pump during this shift; 0 when there was no refuel. */
  fuelCost: number;
  /** Gallons loaded, in hundredths of a gallon; 0 when there was no refuel. */
  fuelGallonsX100: number;
  services: Service[];
};

/** One pass payment, recorded on the day it was actually paid. */
export type PassPayment = {
  date: string;
  amount: number;
  /**
   * Earnings ceiling this pass unlocks, or `null` for the ordinary 3-day pass,
   * which has no ceiling and is simply a cost.
   */
  earningsCap: number | null;
};

export type Settings = {
  /** Take-home target for one week, after fuel and passes. */
  netTargetWeekly: number;
};

export const DEFAULT_SETTINGS: Settings = {
  netTargetWeekly: 1_600_000,
};

export function sessionKm(session: Session): number {
  return session.kmEnd - session.kmStart;
}

export function sessionProductiveKm(session: Session): number {
  return session.services.reduce((sum, s) => sum + s.km, 0);
}

export function sessionRevenue(session: Session): number {
  return session.services.reduce((sum, s) => sum + s.amount, 0);
}

/**
 * What the shift produced minus the fuel loaded during it. Lumpy by design:
 * fuel is only recorded at a refuel, so the shift that filled the tank looks
 * worse than the ones that spent it. Only the weekly figure is comparable.
 */
export function sessionNetOfFuel(session: Session): number {
  return sessionRevenue(session) - session.fuelCost;
}

export type Totals = {
  km: number;
  productiveKm: number;
  emptyKm: number;
  emptyKmPct: number;
  /** Everything the trips paid, before any cost. */
  revenue: number;
  fuelCost: number;
  /** Revenue minus fuel. Passes are charged on top, per week. */
  netOfFuel: number;
  minutes: number;
  trips: number;
  airportTrips: number;
  refuels: number;
  gallons: number;
  farePerProductiveKm: number;
  farePerKm: number;
  /** Odometer km per real gallon loaded. `null` until a tank is recorded. */
  kmPerGallon: number | null;
  /** Measured fuel cost per km. `null` until a refuel is recorded. */
  fuelCostPerKm: number | null;
  /**
   * Measured take-home per km, before passes. Drives the km target, and is
   * `null` until a refuel exists — otherwise it would be the whole fare.
   */
  netOfFuelPerKm: number | null;
};

export function aggregate(sessions: Session[]): Totals {
  const km = sum(sessions, sessionKm);
  const productiveKm = sum(sessions, sessionProductiveKm);
  const revenue = sum(sessions, sessionRevenue);
  const fuelCost = sum(sessions, (s) => s.fuelCost);
  const emptyKm = km - productiveKm;
  const gallons = sum(sessions, (s) => s.fuelGallonsX100) / 100;
  const netOfFuel = revenue - fuelCost;
  const refuels = sessions.filter((s) => s.refueled).length;

  return {
    km,
    productiveKm,
    emptyKm,
    emptyKmPct: km > 0 ? (emptyKm / km) * 100 : 0,
    revenue,
    fuelCost,
    netOfFuel,
    minutes: sum(sessions, (s) => s.minutes),
    trips: sum(sessions, (s) => s.services.length),
    airportTrips: sum(
      sessions,
      (s) => s.services.filter((v) => v.isAirport).length,
    ),
    refuels,
    gallons,
    farePerProductiveKm: productiveKm > 0 ? revenue / productiveKm : 0,
    farePerKm: km > 0 ? revenue / km : 0,
    kmPerGallon: km > 0 && gallons > 0 ? km / gallons : null,
    // Both need a refuel behind them: with none recorded, `fuelCost` is 0 and
    // these would report a cost of nothing and a margin of the full fare.
    fuelCostPerKm: km > 0 && refuels > 0 ? fuelCost / km : null,
    netOfFuelPerKm: km > 0 && refuels > 0 ? netOfFuel / km : null,
  };
}

export function sessionsInWeek<T extends Session>(
  sessions: T[],
  weekStart: string,
): T[] {
  const weekEnd = endOfWeek(weekStart);
  return sessions
    .filter((s) => s.date >= weekStart && s.date <= weekEnd)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function passesBetween<T extends PassPayment>(
  passes: T[],
  from: string,
  to: string,
): T[] {
  return passes
    .filter((p) => p.date >= from && p.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Average connected time per week, over the weeks that have at least one
 * session. Replaces the hours target the driver used to type in: this is an
 * observation, not a goal, so weeks off do not drag it down.
 */
export function averageMinutesPerWeek(sessions: Session[]): number | null {
  if (sessions.length === 0) return null;
  const weeks = new Set(
    sessions.map((s) => startOfWeek(s.date, WEEK_STARTS_ON)),
  );
  return sum(sessions, (s) => s.minutes) / weeks.size;
}

export type Coverage<P extends PassPayment = PassPayment> = {
  pass: P;
  cap: number;
  /** Gross billing since the pass date, inclusive — what consumes the cap. */
  used: number;
  remaining: number;
  usedPct: number;
  exhausted: boolean;
};

/**
 * Remaining headroom under the most recent capped pass, or `null` when no
 * capped pass was ever recorded.
 *
 * The cap is consumed by gross billing, not by take-home: it is a ceiling on
 * what the platform lets the driver bill, so fuel and passes do not enter.
 * There is no expiry date in the model — a capped pass lasts until its ceiling
 * is used up.
 */
export function coverage<P extends PassPayment>(
  sessions: Session[],
  passes: P[],
): Coverage<P> | null {
  const capped = passes.filter((p) => p.earningsCap !== null);
  if (capped.length === 0) return null;

  const pass = capped.reduce((latest, p) =>
    p.date > latest.date ? p : latest,
  );
  const cap = pass.earningsCap as number;
  const used = sum(
    sessions.filter((s) => s.date >= pass.date),
    sessionRevenue,
  );

  return {
    pass,
    cap,
    used,
    remaining: Math.max(0, cap - used),
    usedPct: cap > 0 ? Math.min(100, (used / cap) * 100) : 0,
    exhausted: used >= cap,
  };
}

export type WeekReport<
  T extends Session = Session,
  P extends PassPayment = PassPayment,
> = {
  weekStart: string;
  weekEnd: string;
  sessions: T[];
  totals: Totals;
  /** Pass payments that fell inside this week, most recent first. */
  passes: P[];
  passCost: number;
  /** What the week actually left: revenue, minus fuel, minus passes paid. */
  net: number;
  target: number;
  /** Progress toward the weekly target, in percent. Can be negative. */
  progressPct: number;
  netRemaining: number;
  /**
   * Km still needed to close the week, derived from the measured take-home
   * per km. `null` until there is enough history to measure a positive
   * margin — the app shows a dash rather than inventing an assumption.
   */
  kmRemaining: number | null;
  /** Days left in the week counting today, or `null` for a past week. */
  daysRemaining: number | null;
  netPerRemainingDay: number | null;
  kmPerRemainingDay: number | null;
};

export function weekReport<T extends Session, P extends PassPayment>(
  sessions: T[],
  passes: P[],
  weekStart: string,
  settings: Settings,
  /** Measured take-home per km from all history, not just this week. */
  netOfFuelPerKm: number | null,
  now: string = today(),
): WeekReport<T, P> {
  const weekEnd = endOfWeek(weekStart);
  const inWeek = sessionsInWeek(sessions, weekStart);
  const totals = aggregate(inWeek);
  const weekPasses = passesBetween(passes, weekStart, weekEnd);
  const passCost = sum(weekPasses, (p) => p.amount);

  const net = totals.netOfFuel - passCost;
  const target = settings.netTargetWeekly;
  const netRemaining = Math.max(0, target - net);

  // Only a positive measured margin can be turned into a distance.
  const kmRemaining =
    netOfFuelPerKm !== null && netOfFuelPerKm > 0
      ? netRemaining / netOfFuelPerKm
      : null;

  // Today counts as a day you can still drive; a finished week has no pace.
  const daysRemaining =
    now >= weekStart && now <= weekEnd
      ? toEpochDay(weekEnd) - toEpochDay(now) + 1
      : null;

  return {
    weekStart,
    weekEnd,
    sessions: inWeek,
    totals,
    passes: weekPasses,
    passCost,
    net,
    target,
    progressPct: target > 0 ? (net / target) * 100 : 0,
    netRemaining,
    kmRemaining,
    daysRemaining,
    netPerRemainingDay: daysRemaining ? netRemaining / daysRemaining : null,
    kmPerRemainingDay:
      daysRemaining && kmRemaining !== null
        ? kmRemaining / daysRemaining
        : null,
  };
}

export type MonthWeek = {
  weekStart: string;
  net: number;
  totals: Totals;
  passCost: number;
  /** Whether anything was recorded at all — a net of 0 is otherwise ambiguous. */
  worked: boolean;
};

export type MonthReport = {
  monthKey: string;
  weeks: MonthWeek[];
  totals: Totals;
  passCost: number;
  /** The month's net after every pass that fell inside it. */
  net: number;
  weeklyTarget: number;
};

export function monthReport(
  sessions: Session[],
  passes: PassPayment[],
  monthKey: string,
  settings: Settings,
): MonthReport {
  const weekStarts = weeksInMonth(monthKey, WEEK_STARTS_ON);
  const weeks: MonthWeek[] = weekStarts.map((weekStart) => {
    const inWeek = sessionsInWeek(sessions, weekStart);
    const totals = aggregate(inWeek);
    const weekPasses = passesBetween(passes, weekStart, endOfWeek(weekStart));
    const passCost = sum(weekPasses, (p) => p.amount);
    return {
      weekStart,
      net: totals.netOfFuel - passCost,
      totals,
      passCost,
      worked: inWeek.length > 0 || weekPasses.length > 0,
    };
  });

  const totals = aggregate(
    weekStarts.flatMap((weekStart) => sessionsInWeek(sessions, weekStart)),
  );
  const passCost = weekStarts.reduce(
    (total, weekStart) =>
      total +
      sum(
        passesBetween(passes, weekStart, endOfWeek(weekStart)),
        (p) => p.amount,
      ),
    0,
  );

  return {
    monthKey,
    weeks,
    totals,
    passCost,
    net: totals.netOfFuel - passCost,
    weeklyTarget: settings.netTargetWeekly,
  };
}

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}
