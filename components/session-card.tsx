import { addService, deleteService, deleteSession } from "@/app/actions";
import { Button, Input } from "@/components/ui";
import { hours, money, number, weekdayDayMonth } from "@/lib/format";
import { sessionKm, sessionNet, sessionProductiveKm } from "@/lib/metrics";
import type { StoredSession } from "@/lib/queries";

export function SessionCard({
  session,
  weekStart,
}: {
  session: StoredSession;
  weekStart: string;
}) {
  const km = sessionKm(session);
  const productiveKm = sessionProductiveKm(session);
  const net = sessionNet(session);
  const emptyPct = km > 0 ? ((km - productiveKm) / km) * 100 : 0;

  return (
    <article className="mb-3.5 border border-line border-l-[3px] border-l-gold bg-paper">
      <header className="flex flex-wrap justify-between gap-2 px-4 py-3.5">
        <div>
          <div className="text-sm font-semibold text-teal">
            {weekdayDayMonth(session.date)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-soft">
            {hours(session.minutes)} · {number(km)} km ·{" "}
            {session.services.length} servicios
          </div>
        </div>
        <div className="text-right">
          <div
            className={`font-display text-lg ${net >= 0 ? "text-ink" : "text-rust"}`}
          >
            {money(net)}
          </div>
          <div className="text-[11px] text-ink-soft">neto de la sesión</div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-3">
        <Metric label="km productivos" value={`${number(productiveKm)} km`} />
        <Metric
          label="km en vacío"
          value={`${number(emptyPct)}%`}
          warn={emptyPct > 40}
        />
        <Metric label="gasolina" value={money(session.fuelCost)} />
      </div>

      <div className="px-4 pt-2.5 pb-3.5">
        {session.services.length === 0 ? (
          <p className="text-[11px] text-ink-soft">
            Sin servicios registrados aún.
          </p>
        ) : (
          <ul>
            {session.services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between border-b border-dashed border-line py-1.5 text-xs last:border-b-0"
              >
                <span>
                  {number(service.km)} km · {money(service.amount)}
                  {service.isAirport ? " · aeropuerto" : ""}
                </span>
                <form action={deleteService}>
                  <input type="hidden" name="week" value={weekStart} />
                  <input type="hidden" name="serviceId" value={service.id} />
                  <Button tone="link" type="submit">
                    borrar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addService}
          className="mt-2.5 flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="week" value={weekStart} />
          <input type="hidden" name="sessionId" value={session.id} />
          <Input
            type="number"
            name="km"
            placeholder="km"
            min="0"
            step="1"
            inputMode="numeric"
            required
            compact
            aria-label="Km del servicio"
            className="w-20"
          />
          <Input
            type="number"
            name="amount"
            placeholder="valor"
            min="0"
            step="500"
            inputMode="numeric"
            required
            compact
            aria-label="Valor del servicio en COP"
            className="w-28"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <input type="checkbox" name="isAirport" className="size-4" />
            aeropuerto
          </label>
          <Button tone="secondary" type="submit">
            Agregar
          </Button>
        </form>

        <form action={deleteSession} className="mt-2">
          <input type="hidden" name="week" value={weekStart} />
          <input type="hidden" name="sessionId" value={session.id} />
          <Button tone="link" type="submit">
            eliminar sesión
          </Button>
        </form>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-bg px-3 py-2.5 text-[11px]">
      <div className="text-ink-soft">{label}</div>
      <div className={`mt-0.5 text-sm ${warn ? "text-rust" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
