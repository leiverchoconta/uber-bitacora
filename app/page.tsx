import { SessionCard } from "@/components/session-card";
import { SessionForm } from "@/components/session-form";
import { SettingsPanel } from "@/components/settings-panel";
import {
  Banner,
  Button,
  NavLink,
  Section,
  Stat,
  StatGrid,
} from "@/components/ui";
import { WeekChart } from "@/components/week-chart";
import { requireSession } from "@/lib/auth";
import {
  addDays,
  addMonths,
  currentMonthKey,
  startOfWeek,
  today,
  weekMonthKey,
} from "@/lib/dates";
import {
  hours,
  money,
  monthName,
  number,
  percent,
  weekLabel,
} from "@/lib/format";
import { aggregate, monthReport, weekReport } from "@/lib/metrics";
import { getSessions, getSettings } from "@/lib/queries";
import { syncFuelEstimate } from "./actions";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    month?: string;
    error?: string;
    ok?: string;
  }>;
}) {
  await requireSession();

  const params = await searchParams;
  const [settings, sessions] = await Promise.all([
    getSettings(),
    getSessions(),
  ]);

  const now = today();
  const thisWeek = startOfWeek(now, settings.weekStartsOn);
  const weekStart = DATE_PATTERN.test(params.week ?? "")
    ? startOfWeek(params.week as string, settings.weekStartsOn)
    : thisWeek;
  const monthKey = MONTH_PATTERN.test(params.month ?? "")
    ? (params.month as string)
    : weekMonthKey(weekStart);

  const week = weekReport(sessions, weekStart, settings, now);
  const month = monthReport(sessions, monthKey, settings);
  const lifetime = aggregate(sessions, settings);

  const isThisWeek = weekStart === thisWeek;
  const reachedTarget = week.netAfterFixedCosts >= week.targets.net;
  const clampedPct = Math.max(0, Math.min(100, week.progressPct));

  return (
    <main className="mx-auto max-w-3xl px-4 pt-7 pb-20">
      <header className="mb-6 border-b-2 border-teal pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-ink-soft">bitácora de ruta</p>
            <h1 className="text-2xl text-teal">
              Semana del {weekLabel(weekStart)}
            </h1>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <NavLink
              href={`/?week=${addDays(weekStart, -7)}`}
              label="‹"
              title="Semana anterior"
            />
            <span className="text-ink-soft">
              {isThisWeek ? "semana actual" : "histórico"}
            </span>
            <NavLink
              href={`/?week=${addDays(weekStart, 7)}`}
              label="›"
              title="Semana siguiente"
              disabled={isThisWeek}
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="font-display text-5xl leading-none text-teal">
            {percent(week.progressPct)}
            <span className="text-[0.4em] text-ink-soft">
              {" "}
              de la meta semanal
            </span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-sm bg-line">
            <div
              className={`h-full transition-[width] ${
                reachedTarget ? "bg-moss" : "bg-gold"
              }`}
              style={{ width: `${clampedPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            {money(week.netAfterFixedCosts)} netos de {money(week.targets.net)}{" "}
            — la meta del mes repartida entre {week.targets.weeksInMonth}{" "}
            semanas, ya descontando {money(week.targets.fixedCosts)} de pases.
          </p>
        </div>
      </header>

      <Banner error={params.error} ok={params.ok} />

      <StatGrid>
        <Stat
          label="ingresos de la semana"
          value={money(week.totals.revenue)}
          sub={`${week.totals.trips} servicios`}
        />
        <Stat
          label="gasolina"
          value={money(week.totals.fuelCost)}
          sub={`${number(week.totals.gallons, 1)} galones`}
        />
        <Stat
          label="km recorridos"
          value={`${number(week.totals.km)} km`}
          sub={`meta ${number(week.targets.km)} km`}
        />
        <Stat
          label="km en vacío"
          value={percent(week.totals.emptyKmPct)}
          tone={week.totals.emptyKmPct > 40 ? "warn" : "ok"}
          sub={`${number(week.totals.emptyKm)} km sin pasajero`}
        />
        <Stat
          label="tarifa por km productivo"
          value={
            week.totals.productiveKm > 0
              ? money(week.totals.farePerProductiveKm)
              : "—"
          }
          tone={
            week.totals.productiveKm > 0 &&
            week.totals.farePerProductiveKm < settings.farePerKmTarget
              ? "warn"
              : "ok"
          }
          sub={`esperabas ${money(settings.farePerKmTarget)}`}
        />
        <Stat
          label="horas conectado"
          value={hours(week.totals.minutes)}
          sub={`meta ${hours(week.targets.minutes)}`}
        />
      </StatGrid>

      {isThisWeek ? (
        <div className="mt-5 rounded-sm bg-teal px-4 py-4 text-paper">
          <p className="text-[11px] opacity-75">ritmo para cerrar la semana</p>
          {week.daysRemaining && week.netRemaining > 0 ? (
            <>
              <p className="mt-1 font-display text-lg">
                Faltan {money(week.netRemaining)} en {week.daysRemaining}{" "}
                {week.daysRemaining === 1 ? "día" : "días"}
              </p>
              <p className="mt-2 text-xs leading-relaxed opacity-85">
                Son unos {number(week.kmPerRemainingDay ?? 0)} km y{" "}
                {hours(week.minutesPerRemainingDay ?? 0)} por día.
              </p>
            </>
          ) : (
            <p className="mt-1 font-display text-lg">
              Meta de la semana cumplida. Vas {money(-week.netRemaining || 0)}{" "}
              por encima.
            </p>
          )}
        </div>
      ) : null}

      {lifetime.fuelCostPerKm !== null ? (
        <div className="mt-5 rounded-sm border border-line bg-paper px-4 py-4">
          <p className="text-[11px] text-ink-soft">rendimiento real medido</p>
          <p className="mt-1 font-display text-lg text-teal">
            {money(lifetime.fuelCostPerKm)} por km
            {lifetime.kmPerGallon !== null
              ? ` · ${number(lifetime.kmPerGallon, 1)} km por galón`
              : ""}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Sobre {number(lifetime.km)} km de odómetro y{" "}
            {money(lifetime.fuelCost)} en gasolina. Tu meta usa un estimado de{" "}
            {money(settings.fuelCostPerKmEstimate)} por km.
          </p>
          {Math.abs(lifetime.fuelCostPerKm - settings.fuelCostPerKmEstimate) >
          15 ? (
            <form action={syncFuelEstimate} className="mt-2.5">
              <input type="hidden" name="week" value={weekStart} />
              <input
                type="hidden"
                name="fuelCostPerKmEstimate"
                value={Math.round(lifetime.fuelCostPerKm)}
              />
              <Button tone="secondary" type="submit">
                Usar {money(lifetime.fuelCostPerKm)}/km en la meta
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="mt-9">
        <Section
          title={monthName(monthKey)}
          aside={
            <span className="flex items-center gap-2.5 text-xs font-normal">
              <NavLink
                href={`/?week=${weekStart}&month=${addMonths(monthKey, -1)}`}
                label="‹"
                title="Mes anterior"
              />
              <NavLink
                href={`/?week=${weekStart}&month=${addMonths(monthKey, 1)}`}
                label="›"
                title="Mes siguiente"
                disabled={monthKey >= currentMonthKey()}
              />
            </span>
          }
        >
          <WeekChart report={month} currentWeekStart={thisWeek} />
        </Section>

        <Section title="Registrar sesión">
          <SessionForm weekStart={weekStart} today={now} />
        </Section>

        <Section title={`Sesiones (${week.sessions.length})`}>
          {week.sessions.length === 0 ? (
            <p className="border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
              Sin sesiones esta semana.
            </p>
          ) : (
            week.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                weekStart={weekStart}
              />
            ))
          )}
        </Section>

        <SettingsPanel settings={settings} weekStart={weekStart} />
      </div>
    </main>
  );
}
