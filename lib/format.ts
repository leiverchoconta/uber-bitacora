/** Display formatting, all in es-CO. Dates are plain `YYYY-MM-DD` strings. */

import { addDays } from "./dates";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function money(value: number): string {
  return cop.format(Math.round(value || 0));
}

export function number(value: number, decimals = 0): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

export function percent(value: number): string {
  return `${Math.round(value || 0)}%`;
}

export function hours(minutes: number, decimals = 1): string {
  return `${number((minutes || 0) / 60, decimals)} h`;
}

/** Plain `YYYY-MM-DD` rendered in UTC so it never drifts a day. */
function asUtcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    ...options,
  }).format(asUtcDate(date));
}

export function dayMonth(date: string): string {
  return formatDate(date, { day: "numeric", month: "short" });
}

export function weekdayDayMonth(date: string): string {
  return formatDate(date, { weekday: "long", day: "numeric", month: "short" });
}

export function monthName(monthKey: string): string {
  return formatDate(`${monthKey}-01`, { month: "long", year: "numeric" });
}

export function weekLabel(weekStart: string): string {
  return `${dayMonth(weekStart)} — ${dayMonth(addDays(weekStart, 6))}`;
}

export const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
