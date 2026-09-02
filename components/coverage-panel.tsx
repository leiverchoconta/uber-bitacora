import { dayMonth, money } from "@/lib/format";
import type { Coverage } from "@/lib/metrics";
import type { StoredPassPayment } from "@/lib/queries";

/**
 * Headroom left under the capped pass. This is the figure that says when to
 * buy the next one — the ordinary three-day pass has no ceiling, so this
 * panel only exists once a capped pass has been recorded.
 */
export function CoveragePanel({
  coverage,
}: {
  coverage: Coverage<StoredPassPayment>;
}) {
  const low = coverage.usedPct >= 80;
  // Floor it: rounding 99,6% up to "100% usado" would contradict the headline
  // still offering money to bill. 100% is reserved for an exhausted ceiling.
  const usedLabel = coverage.exhausted
    ? "100%"
    : `${Math.floor(coverage.usedPct)}%`;

  return (
    <div className="mt-5 rounded-sm border border-line bg-paper px-4 py-4">
      <p className="text-[11px] text-ink-soft">
        cobertura del pase del {dayMonth(coverage.pass.date)}
      </p>
      <p
        className={`mt-1 font-display text-lg ${
          coverage.exhausted || low ? "text-rust" : "text-teal"
        }`}
      >
        {coverage.exhausted
          ? "Tope agotado"
          : `Te quedan ${money(coverage.remaining)} por facturar`}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-sm bg-line">
        <div
          className={`h-full ${low ? "bg-rust" : "bg-gold"}`}
          style={{ width: `${coverage.usedPct}%` }}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        Facturaste {money(coverage.used)} de un tope de {money(coverage.cap)} —{" "}
        {usedLabel} usado. Pagaste {money(coverage.pass.amount)} por ese pase.
      </p>
      <p className="mt-1.5 text-[10px] text-ink-soft">
        El tope se consume con lo facturado bruto, contando desde el día del
        pase. Los pases de 3 días no tienen tope y no aparecen acá.
      </p>
    </div>
  );
}
