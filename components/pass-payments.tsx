import { addPassPayment, deletePassPayment } from "@/app/actions";
import { Button, Field, Input } from "@/components/ui";
import { dayMonth, money } from "@/lib/format";
import type { StoredPassPayment } from "@/lib/queries";

/**
 * Pass payments for the week on screen. Recorded as they happen rather than
 * prorated: the pass is paid about every three days on no fixed weekday, so a
 * week costs whatever actually fell inside it.
 */
export function PassPayments({
  passes,
  total,
  weekStart,
  defaultDate,
}: {
  passes: StoredPassPayment[];
  total: number;
  weekStart: string;
  /** Today when the week on screen contains it, otherwise that week's Monday. */
  defaultDate: string;
}) {
  return (
    <div className="border border-line bg-paper p-4">
      {passes.length === 0 ? (
        <p className="text-[11px] text-ink-soft">
          Sin pases pagados en esta semana.
        </p>
      ) : (
        <ul>
          {passes.map((pass) => (
            <li
              key={pass.id}
              className="flex items-center justify-between border-b border-dashed border-line py-1.5 text-xs last:border-b-0"
            >
              <span>
                {dayMonth(pass.date)} · {money(pass.amount)}
                {pass.earningsCap !== null
                  ? ` · tope ${money(pass.earningsCap)}`
                  : ""}
              </span>
              <form action={deletePassPayment}>
                <input type="hidden" name="week" value={weekStart} />
                <input type="hidden" name="passId" value={pass.id} />
                <Button tone="link" type="submit">
                  borrar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {passes.length > 0 ? (
        <p className="mt-2.5 border-t border-line pt-2.5 text-xs text-ink-soft">
          {passes.length} {passes.length === 1 ? "pase" : "pases"} esta semana ·{" "}
          <strong className="text-ink">{money(total)}</strong>
        </p>
      ) : null}

      <form
        action={addPassPayment}
        className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3"
      >
        <input type="hidden" name="week" value={weekStart} />
        <Field label="Fecha del pase">
          <Input
            type="date"
            name="date"
            defaultValue={defaultDate}
            compact
            required
            className="w-40"
          />
        </Field>
        <Field label="Valor (COP)">
          <Input
            type="number"
            name="amount"
            step="1000"
            min="1"
            inputMode="numeric"
            compact
            required
            className="w-28"
          />
        </Field>
        <Field
          label="Tope de ganancias"
          hint="Solo si el pase trae techo; vacío para el de 3 días"
        >
          <Input
            type="number"
            name="earningsCap"
            step="1000"
            min="0"
            inputMode="numeric"
            compact
            placeholder="sin tope"
            className="w-32"
          />
        </Field>
        <Button tone="secondary" type="submit">
          Registrar pase
        </Button>
      </form>
    </div>
  );
}
