import { addSession } from "@/app/actions";
import { Button, Field, Input, Textarea } from "@/components/ui";

/**
 * Plain form posting to a Server Action: no client JavaScript, so it works
 * on a phone with a bad connection and submits before hydration.
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
            step="0.25"
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
        <Field label="Gasto en gasolina (COP)">
          <Input
            type="number"
            name="fuelCost"
            step="1000"
            min="0"
            inputMode="numeric"
            defaultValue={0}
            required
          />
        </Field>
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
