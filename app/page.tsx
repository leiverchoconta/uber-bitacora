import { CoveragePanel } from "@/components/coverage-panel";
import { PassPayments } from "@/components/pass-payments";
import { SessionCard } from "@/components/session-card";
import { SessionForm } from "@/components/session-form";
import { SettingsPanel } from "@/components/settings-panel";
import { Banner, NavLink, Section, Stat, StatGrid } from "@/components/ui";
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
import {
  aggregate,
  averageMinutesPerWeek,
  coverage,
  monthReport,
  WEEK_STARTS_ON,
  weekReport,
} from "@/lib/metrics";
import { getPassPayments, getSessions, getSettings } from "@/lib/queries";

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
  const [{ settings, saved }, sessions, passes] = await Promise.all([
    getSettings(),
    getSessions(),
    getPassPayments(),
  ]);

  const now = today();
  const thisWeek = startOfWeek(now, WEEK_STARTS_ON);
  const weekStart = DATE_PATTERN.test(params.week ?? "")
    ? startOfWeek(params.week as string, WEEK_STARTS_ON)
    : thisWeek;
  const monthKey = MONTH_PATTERN.test(params.month ?? "")
    ? (params.month as string)
    : weekMonthKey(weekStart);

  // Every derived assumption comes from measured history, never from a
  // number the driver typed into settings.
  const lifetime = aggregate(sessions);
  const week = weekReport(
    sessions,
    passes,
    weekStart,
    settings,
    lifetime.netOfFuelPerKm,
    now,
  );
  const month = monthReport(sessions, passes, monthKey, settings);
  const averageWeeklyMinutes = averageMinutesPerWeek(sessions);
  const passCoverage = coverage(sessions, passes);

  const isThisWeek = weekStart === thisWeek;
  const reachedTarget = week.net >= week.target;
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
            <strong className="text-ink">{money(week.net)}</strong> netos de{" "}
            {money(week.target)} — facturaste {money(week.totals.revenue)} y se
            fueron {money(week.totals.fuelCost)} en gasolina
            {week.passCost > 0
              ? ` y ${money(week.passCost)} en ${week.passes.length} ${
                  week.passes.length === 1 ? "pase" : "pases"
                }`
              : " (sin pases registrados esta semana)"}
            .
          </p>
        </div>
      </header>

      <Banner error={params.error} ok={params.ok} />

      <StatGrid>
        <Stat
          label="facturado (bruto)"
          value={money(week.totals.revenue)}
          sub={`${week.totals.trips} servicios`}
        />
        <Stat
          label="neto de la semana"
          value={money(week.net)}
          tone={reachedTarget ? "ok" : undefined}
          sub={`meta ${money(week.target)}`}
        />
        <Stat
          label="km recorridos"
          value={`${number(week.totals.km)} km`}
          sub={
            week.kmRemaining !== null
              ? `faltan ${number(week.kmRemaining)} km`
              : "sin tanqueo registrado aún"
          }
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
          sub={
            lifetime.productiveKm > 0
              ? `tu promedio ${money(lifetime.farePerProductiveKm)}`
              : "aún sin promedio"
          }
        />
        <Stat
          label="horas conectado"
          value={hours(week.totals.minutes)}
          sub={
            averageWeeklyMinutes !== null
              ? `promedio ${hours(averageWeeklyMinutes)} por semana`
              : "sin promedio aún"
          }
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
                {money(week.netPerRemainingDay ?? 0)} por día
                {week.kmPerRemainingDay !== null
                  ? `, unos ${number(week.kmPerRemainingDay)} km con tu margen medido de ${money(
                      lifetime.netOfFuelPerKm ?? 0,
                    )} por km. No cuenta los pases que aún no has pagado esta semana`
                  : ". Registra un turno con tanqueo y la app calcula los km"}
                .
              </p>
            </>
          ) : (
            <p className="mt-1 font-display text-lg">
              Meta de la semana cumplida. Vas {money(week.net - week.target)}{" "}
              por encima.
            </p>
          )}
        </div>
      ) : null}

      {isThisWeek && passCoverage ? (
        <CoveragePanel coverage={passCoverage} />
      ) : null}

      {lifetime.kmPerGallon !== null ? (
        <div className="mt-5 rounded-sm border border-line bg-paper px-4 py-4">
          <p className="text-[11px] text-ink-soft">rendimiento real medido</p>
          <p className="mt-1 font-display text-lg text-teal">
            {number(lifetime.kmPerGallon, 1)} km por galón ·{" "}
            {money(lifetime.fuelCostPerKm ?? 0)} por km
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            Sobre {number(lifetime.km)} km de odómetro y{" "}
            {number(lifetime.gallons, 2)} galones en {lifetime.refuels}{" "}
            {lifetime.refuels === 1 ? "tanqueo" : "tanqueos"}. Con más tanqueos
            el número se afina.
          </p>
        </div>
      ) : null}

      <div className="mt-9">
        <Section title="Pases de la semana">
          <PassPayments
            passes={week.passes}
            total={week.passCost}
            weekStart={weekStart}
            defaultDate={isThisWeek ? now : weekStart}
          />
        </Section>

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

        <SettingsPanel
          settings={settings}
          saved={saved}
          weekStart={weekStart}
        />
      </div>
    </main>
  );
}
