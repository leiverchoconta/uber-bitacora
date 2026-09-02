/**
 * Date helpers over plain `YYYY-MM-DD` strings.
 *
 * All arithmetic goes through epoch days computed with `Date.UTC`, so results
 * never shift with the server's timezone — the app renders on Vercel (UTC)
 * but the driver's day is a Bogota day.
 */

const MS_PER_DAY = 86_400_000;

/** Day-of-week index of epoch day 0 (1970-01-01 was a Thursday). */
const EPOCH_DOW = 4;

export const TIME_ZONE = "America/Bogota";

/** `en-CA` formats as `YYYY-MM-DD`, which is exactly our storage shape. */
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function today(): string {
  return dayFormatter.format(new Date());
}

export function currentMonthKey(): string {
  return today().slice(0, 7);
}

export function toEpochDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromEpochDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromEpochDay(toEpochDay(date) + days);
}

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay`. */
export function dayOfWeek(date: string): number {
  return (((toEpochDay(date) + EPOCH_DOW) % 7) + 7) % 7;
}

export function startOfWeek(date: string, weekStartsOn: number): string {
  const offset = (dayOfWeek(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function endOfWeek(weekStart: string): string {
  return addDays(weekStart, 6);
}

/**
 * The month a week belongs to, decided by its middle day, so a week straddling
 * two months counts once — toward the month that holds most of it.
 */
export function weekMonthKey(weekStart: string): string {
  return addDays(weekStart, 3).slice(0, 7);
}

/**
 * Every week whose middle day falls inside `monthKey`, ascending. Weeks
 * partition the calendar: each one belongs to exactly one month.
 */
export function weeksInMonth(monthKey: string, weekStartsOn: number): string[] {
  const firstDay = `${monthKey}-01`;
  const lastDay = lastDayOfMonth(monthKey);
  const from = toEpochDay(startOfWeek(addDays(firstDay, -7), weekStartsOn));
  const to = toEpochDay(startOfWeek(addDays(lastDay, 7), weekStartsOn));

  const weeks: string[] = [];
  for (let day = from; day <= to; day += 7) {
    const weekStart = fromEpochDay(day);
    if (weekMonthKey(weekStart) === monthKey) weeks.push(weekStart);
  }
  return weeks;
}

export function lastDayOfMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function addMonths(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1 + months, 1));
  return shifted.toISOString().slice(0, 7);
}
