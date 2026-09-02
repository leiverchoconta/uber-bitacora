import { logout, saveSettings } from "@/app/actions";
import { Button, Field, Input } from "@/components/ui";
import { money } from "@/lib/format";
import type { Settings } from "@/lib/metrics";

/**
 * The only thing the driver configures. Everything the app used to ask for —
 * expected fare, estimated fuel, gallon price, monthly fees, hours target —
 * is now measured from the sessions instead of typed in.
 */
export function SettingsPanel({
  settings,
  saved,
  weekStart,
}: {
  settings: Settings;
  /** Whether the driver has actually saved a target, or is seeing the default. */
  saved: boolean;
  weekStart: string;
}) {
  return (
    <details className="border border-line bg-paper px-4 py-3.5">
      <summary className="cursor-pointer text-sm text-teal-soft">
        ⚙ Meta semanal
      </summary>

      <form action={saveSettings} className="mt-3">
        <input type="hidden" name="week" value={weekStart} />
        <Field
          label="Meta neta semanal (COP)"
          hint="Lo que quieres que te quede en la semana, después de gasolina y pases"
        >
          <Input
            type="number"
            name="netTargetWeekly"
            min="1"
            step="1"
            inputMode="numeric"
            defaultValue={settings.netTargetWeekly}
            required
          />
        </Field>
        <p className="mt-2 text-[11px] text-ink-soft">
          {saved
            ? `Tu meta es ${money(settings.netTargetWeekly)} por semana.`
            : `Aún no has guardado una meta: ${money(
                settings.netTargetWeekly,
              )} es el valor por defecto.`}{" "}
          Los km que hacen falta para llegar los calcula la app con tu margen
          medido, no con un estimado.
        </p>
        <Button type="submit" className="mt-3">
          Guardar meta
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
