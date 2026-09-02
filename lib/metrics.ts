/**
 * Business logic for the logbook: aggregation, weekly targets and pace.
 *
 * Pure functions over plain data — no database, no React. This is the part
 * worth testing (see metrics.test.ts); everything else is plumbing.
 *
 * Money is COP as integers (no cents). Time is whole minutes. Distance is km.
 */

import {
  endOfWeek,
  today,
  toEpochDay,
  weekMonthKey,
  weeksInMonth,
} from "./dates";

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
  fuelCost: number;
  services: Service[];
};

export type Settings = {
  /** Net income goal for the month, after fuel and fixed costs. */
  netTargetMonthly: number;
  /** Expected revenue per km, used to derive the km goal. */
  farePerKmTarget: number;
  /** Estimated fuel cost per km, used to derive the km goal. */
  fuelCostPerKmEstimate: number;
  gallonPrice: number;
  /** Monthly fixed costs ("pases"), prorated across the month's weeks. */
  fixedCostsMonthly: number;
  hoursTargetMonthly: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekStartsOn: number;
};

export const DEFAULT_SETTINGS: Settings = {
  netTargetMonthly: 6_400_000,
  farePerKmTarget: 2_000,
  fuelCostPerKmEstimate: 324,
  gallonPrice: 15_650,
  fixedCostsMonthly: 404_000,
  hoursTargetMonthly: 264,
  weekStartsOn: 1,
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

export function sessionNet(session: Session): number {
  return sessionRevenue(session) - session.fuelCost;
}

export type Totals = {
  km: number;
  productiveKm: number;
  emptyKm: number;
  emptyKmPct: number;
  revenue: number;
  fuelCost: number;
  /** Revenue minus fuel. Fixed costs are prorated separately, per week. */
  net: number;
  minutes: number;
  trips: number;
  airportTrips: number;
  farePerProductiveKm: number;
  farePerKm: number;
  gallons: number;
  /** Real km per gallon. `null` until there is fuel spending to divide by. */
  kmPerGallon: number | null;
  /** Real fuel cost per km, to sanity-check `fuelCostPerKmEstimate`. */
  fuelCostPerKm: number | null;
};

export function aggregate(sessions: Session[], settings: Settings): Totals {
  const km = sum(sessions, sessionKm);
  const productiveKm = sum(sessions, sessionProductiveKm);
  const revenue = sum(sessions, sessionRevenue);
  const fuelCost = sum(sessions, (s) => s.fuelCost);
  const emptyKm = km - productiveKm;
  const gallons =
    settings.gallonPrice > 0 ? fuelCost / settings.gallonPrice : 0;

  return {
    km,
    productiveKm,
    emptyKm,
    emptyKmPct: km > 0 ? (emptyKm / km) * 100 : 0,
    revenue,
    fuelCost,
    net: revenue - fuelCost,
    minutes: sum(sessions, (s) => s.minutes),
    trips: sum(sessions, (s) => s.services.length),
    airportTrips: sum(
      sessions,
      (s) => s.services.filter((v) => v.isAirport).length,
    ),
    farePerProductiveKm: productiveKm > 0 ? revenue / productiveKm : 0,
    farePerKm: km > 0 ? revenue / km : 0,
    gallons,
    kmPerGallon: km > 0 && gallons > 0 ? km / gallons : null,
    fuelCostPerKm: km > 0 ? fuelCost / km : null,
  };
}

/**
 * Km needed in a month to clear the net target: every km yields the expected
 * fare minus its fuel cost, and has to cover the fixed costs too.
 */
export function monthlyKmTarget(settings: Settings): number {
  const marginPerKm = settings.farePerKmTarget - settings.fuelCostPerKmEstimate;
  if (marginPerKm <= 0) return 0;
  return (settings.netTargetMonthly + settings.fixedCostsMonthly) / marginPerKm;
}

export type WeeklyTargets = {
  weeksInMonth: number;
  net: number;
  km: number;
  minutes: number;
  fixedCosts: number;
};

/** Monthly goals split evenly across the weeks that belong to that month. */
export function weeklyTargets(
  weekStart: string,
  settings: Settings,
): WeeklyTargets {
  const monthKey = weekMonthKey(weekStart);
  const count = weeksInMonth(monthKey, settings.weekStartsOn).length || 1;
  return {
    weeksInMonth: count,
    net: settings.netTargetMonthly / count,
    km: monthlyKmTarget(settings) / count,
    minutes: (settings.hoursTargetMonthly * 60) / count,
    fixedCosts: settings.fixedCostsMonthly / count,
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

export type WeekReport<T extends Session = Session> = {
  weekStart: string;
  weekEnd: string;
  sessions: T[];
  totals: Totals;
  targets: WeeklyTargets;
  /** Net after this week's share of the fixed costs — what actually lands. */
  netAfterFixedCosts: number;
  /** Progress toward the weekly net target, in percent (can exceed 100). */
  progressPct: number;
  netRemaining: number;
  kmRemaining: number;
  minutesRemaining: number;
  /** Days left in the week counting today, or `null` for a past week. */
  daysRemaining: number | null;
  kmPerRemainingDay: number | null;
  minutesPerRemainingDay: number | null;
};

export function weekReport<T extends Session>(
  sessions: T[],
  weekStart: string,
  settings: Settings,
  now: string = today(),
): WeekReport<T> {
  const weekEnd = endOfWeek(weekStart);
  const inWeek = sessionsInWeek(sessions, weekStart);
  const totals = aggregate(inWeek, settings);
  const targets = weeklyTargets(weekStart, settings);

  const netAfterFixedCosts = totals.net - targets.fixedCosts;
  const netRemaining = Math.max(0, targets.net - netAfterFixedCosts);
  const kmRemaining = Math.max(0, targets.km - totals.km);
  const minutesRemaining = Math.max(0, targets.minutes - totals.minutes);

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
    targets,
    netAfterFixedCosts,
    progressPct: targets.net > 0 ? (netAfterFixedCosts / targets.net) * 100 : 0,
    netRemaining,
    kmRemaining,
    minutesRemaining,
    daysRemaining,
    kmPerRemainingDay: daysRemaining ? kmRemaining / daysRemaining : null,
    minutesPerRemainingDay: daysRemaining
      ? minutesRemaining / daysRemaining
      : null,
  };
}

export type MonthReport = {
  monthKey: string;
  weeks: { weekStart: string; net: number; totals: Totals }[];
  totals: Totals;
  /** Month net after the full fixed costs, not a weekly share. */
  netAfterFixedCosts: number;
  weeklyNetTarget: number;
};

export function monthReport(
  sessions: Session[],
  monthKey: string,
  settings: Settings,
): MonthReport {
  const weekStarts = weeksInMonth(monthKey, settings.weekStartsOn);
  const weeks = weekStarts.map((weekStart) => {
    const totals = aggregate(sessionsInWeek(sessions, weekStart), settings);
    return { weekStart, net: totals.net, totals };
  });
  const totals = aggregate(
    weekStarts.flatMap((weekStart) => sessionsInWeek(sessions, weekStart)),
    settings,
  );

  return {
    monthKey,
    weeks,
    totals,
    netAfterFixedCosts: totals.net - settings.fixedCostsMonthly,
    weeklyNetTarget: settings.netTargetMonthly / (weekStarts.length || 1),
  };
}

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}
