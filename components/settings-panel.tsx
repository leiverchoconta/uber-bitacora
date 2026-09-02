import { logout, saveSettings } from "@/app/actions";
import { Button, Field, Input, Select } from "@/components/ui";
import { money, number, WEEKDAYS } from "@/lib/format";
import { monthlyKmTarget, type Settings } from "@/lib/metrics";

export function SettingsPanel({
  settings,
  weekStart,
}: {
  settings: Settings;
  weekStart: string;
}) {
  return (
    <details className="border border-line bg-paper px-4 py-3.5">
      <summary className="cursor-pointer text-sm text-teal-soft">
        ⚙ Ajustes y metas
      </summary>

      <form action={saveSettings} className="mt-3">
        <input type="hidden" name="week" value={weekStart} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Meta neta mensual (COP)">
            <Input
              type="number"
              name="netTargetMonthly"
              min="1"
              step="100000"
              inputMode="numeric"
              defaultValue={settings.netTargetMonthly}
              required
            />
          </Field>
          <Field label="Tarifa promedio esperada (COP/km)">
            <Input
              type="number"
              name="farePerKmTarget"
              min="1"
              step="50"
              inputMode="numeric"
              defaultValue={settings.farePerKmTarget}
              required
            />
          </Field>
          <Field
            label="Gasolina estimada (COP/km)"
            hint="Solo para calcular la meta de km"
          >
            <Input
              type="number"
              name="fuelCostPerKmEstimate"
              min="1"
              step="10"
              inputMode="numeric"
              defaultValue={settings.fuelCostPerKmEstimate}
              required
            />
          </Field>
          <Field label="Precio del galón (COP)">
            <Input
              type="number"
              name="gallonPrice"
              min="1"
              step="50"
              inputMode="numeric"
              defaultValue={settings.gallonPrice}
              required
            />
          </Field>
          <Field label="Pases y costos fijos al mes (COP)">
            <Input
              type="number"
              name="fixedCostsMonthly"
              min="0"
              step="10000"
              inputMode="numeric"
              defaultValue={settings.fixedCostsMonthly}
              required
            />
          </Field>
          <Field label="Meta de horas conectado al mes">
            <Input
              type="number"
              name="hoursTargetMonthly"
              min="1"
              max="744"
              step="1"
              inputMode="numeric"
              defaultValue={settings.hoursTargetMonthly}
              required
            />
          </Field>
          <Field label="La semana empieza el">
            <Select name="weekStartsOn" defaultValue={settings.weekStartsOn}>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <p className="mt-3 text-[11px] text-ink-soft">
          Con estos números la meta es{" "}
          <strong>{number(monthlyKmTarget(settings))} km al mes</strong> para
          netear {money(settings.netTargetMonthly)} después de gasolina y pases.
        </p>

        <Button type="submit" className="mt-3">
          Guardar ajustes
        </Button>
      </form>

      <form action={logout} className="mt-4 border-t border-line pt-3">
        <Button tone="link" type="submit">
          cerrar sesión
        </Button>
      </form>
    </details>
  );
}
