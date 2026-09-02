import { dayMonth, money } from "@/lib/format";
import type { MonthReport } from "@/lib/metrics";

/**
 * Net per week for the month, as CSS bars with the weekly target as a dashed
 * line. Four or five bars do not justify a charting library.
 */
export function WeekChart({
  report,
  currentWeekStart,
}: {
  report: MonthReport;
  currentWeekStart: string;
}) {
  const scale = Math.max(
    report.weeklyTarget * 1.25,
    ...report.weeks.map((w) => w.net),
    1,
  );
  const targetPct = Math.min(100, (report.weeklyTarget / scale) * 100);

  return (
    <div className="border border-line bg-paper px-4 pt-5 pb-2">
      <div className="relative flex h-40 items-end gap-2 pt-4">
        <div
          className="absolute inset-x-0 border-t border-dashed border-rust"
          style={{ bottom: `${targetPct}%` }}
        >
          <span className="absolute right-0 -top-4 text-[10px] text-rust">
            meta {money(report.weeklyTarget)}
          </span>
        </div>

        {report.weeks.map((week) => {
          const height = Math.max(0, (week.net / scale) * 100);
          const reached = week.net >= report.weeklyTarget;
          const isCurrent = week.weekStart === currentWeekStart;
          return (
            <div
              key={week.weekStart}
              className="flex h-full flex-1 flex-col items-center justify-end"
            >
              <span className="mb-1 whitespace-nowrap text-[10px] text-ink-soft">
                {week.net > 0 ? money(week.net) : "—"}
              </span>
              <div
                className={`w-[70%] rounded-t-sm ${
                  reached ? "bg-moss" : "bg-gold"
                } ${isCurrent ? "outline-2 -outline-offset-2 outline-teal" : ""}`}
                style={{ height: `${height}%` }}
              />
              <span className="mt-1.5 text-center text-[10px] text-ink-soft">
                {dayMonth(week.weekStart)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-line px-1 pt-3 pb-1">
        <span className="text-[11px] text-ink-soft">
          neto del mes, ya con los pases
        </span>
        <span
          className={`font-display text-xl ${
            report.net >= 0 ? "text-teal" : "text-rust"
          }`}
        >
          {money(report.net)}
        </span>
      </div>
    </div>
  );
}
