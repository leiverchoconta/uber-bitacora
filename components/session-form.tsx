import { addSession } from "@/app/actions";
import { Button, Field, Input, Textarea } from "@/components/ui";

/**
 * Plain form posting to a Server Action: no client JavaScript, so it works
 * on a phone with a bad connection and submits before hydration.
 *
 * The fuel fields are always visible — without JavaScript nothing can be
 * hidden — so the "tanqueé" checkbox is what makes them required or refused.
 */
export function SessionForm({
  weekStart,
  today,
}: {
  weekStart: string;
  today: string;
}) {
  return (
    <form action={addSession} className="border border-line bg-paper p-4">
      <input type="hidden" name="week" value={weekStart} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fecha">
          <Input type="date" name="date" defaultValue={today} required />
        </Field>
        <Field label="Horas conectado" hint="Decimales: 7,5 son 7 h 30 min">
          <Input
            type="number"
            name="hours"
            step="any"
            min="0"
            max="24"
            inputMode="decimal"
            placeholder="8"
            required
          />
        </Field>
        <Field label="Km inicial" hint="Odómetro al arrancar">
          <Input
            type="number"
            name="kmStart"
            step="1"
            min="0"
            inputMode="numeric"
            required
          />
        </Field>
        <Field label="Km final" hint="Odómetro al terminar">
          <Input
            type="number"
            name="kmEnd"
            step="1"
            min="0"
            inputMode="numeric"
            required
          />
        </Field>
      </div>

      <fieldset className="mt-4 border-t border-line pt-3">
        <legend className="sr-only">Gasolina</legend>
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" name="refueled" className="size-4" />
          Tanqueé en este turno
        </label>
        <p className="mt-1 text-[10px] text-ink-soft">
          Si lo marcas, escribe el valor y los galones — con eso se mide el
          rendimiento real contra el odómetro.
        </p>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
          <Field label="Valor de la gasolina (COP)">
            <Input
              type="number"
              name="fuelCost"
              step="1"
              min="0"
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
          <Field label="Galones" hint="Los del recibo o la bomba">
            <Input
              type="number"
              name="gallons"
              step="any"
              min="0"
              max="100"
              inputMode="decimal"
              placeholder="0"
            />
          </Field>
        </div>
      </fieldset>

      <div className="mt-3">
        <Field label="Notas" hint="Opcional">
          <Textarea
            name="notes"
            rows={1}
            placeholder="Tráfico, zonas, clima…"
          />
        </Field>
      </div>

      <Button type="submit" className="mt-4">
        Guardar sesión
      </Button>
    </form>
  );
}
