# UX

Behavioral contract for `uber-bitacora`. Sits between `PRODUCT.md` (who and why) and `DESIGN.md` (how it looks).

## Navigation model

**Single page, two axes of time.** Everything lives at `/`: the week's state, the entry form, the session log, the monthly chart, and the settings drawer. There are no tabs and no sub-pages.

Movement is time travel, expressed in the URL:

- `?week=YYYY-MM-DD` — the week being reviewed. Arrows step ±7 days; forward is disabled on the current week.
- `?month=YYYY-MM` — the month shown in the chart, independent of the week. Arrows step ±1 month; forward is disabled on the current month.

`/login` is the only other route, and it is a dead end by design: no navigation, exited only by authenticating. Back behavior is the browser's own — every state is a real URL, so back returns to the previous week or month, and a bookmarked week reopens exactly as it was. Settings are a native `<details>` drawer in place, not a route, so opening them never costs the current week.

## Information architecture

Four entities:

```
settings (single row)     sessions ──< services     pass_payments
```

- **session** — one connected shift on a calendar date: minutes connected, odometer start and end, whether the tank was filled, and what that fill cost in pesos and gallons.
- **service** — one paid trip inside a session: kilometers, amount, airport flag.
- **pass_payment** — one platform pass, recorded on the day it was actually paid. Not attached to a session or a week. Two kinds: the ordinary three-day pass, which is only a cost, and a capped pass, which also unlocks billing up to a ceiling (`earnings_cap`).
- **settings** — one row holding one number: the weekly take-home target.

Derived aggregates are never stored. Totals, net income, empty-kilometer share, fuel economy and pace are all computed from the rows on every render (`lib/metrics.ts`), so correcting a session immediately corrects every number that depends on it.

**The week is the unit of everything.** The target is weekly and is used whole — never divided, never prorated. A month exists only as a chart of its weeks, where a week belongs to the month containing its middle day so a straddling week is counted once.

**Assumptions are measured, not configured.** The driver types in one number. Expected fare per km, fuel cost per km, gallon price, monthly fees and an hours target were all removed as settings: each is now either measured from the sessions or recorded as it happens. A figure with no history behind it shows a dash instead of a default.

## Core flows

**Log a shift** — park the car → open the app (already authenticated) → the week's state is on screen → fill date, hours, odometer start/end → tick *tanqueé en este turno* only if the tank was filled, and then its cost and gallons → *Guardar sesión* → lands on the week the session belongs to, with the session card at the top of the log and a prompt to add its trips. If validation fails (odometer running backwards, more than 2.000 km in one shift, fuel figures disagreeing with the refuel checkbox), the page returns with the reason stated and nothing saved.

**Record a pass** — the passes section of the week → date (defaults to the week on screen) and amount, plus the earnings ceiling if the pass carries one → *Registrar pase* → the week's net drops by that amount immediately. Passes are paid roughly every three days on no fixed weekday, so they are recorded as they happen rather than prorated.

**Watch the ceiling** — once a capped pass exists, a panel states how much is left to bill under it: the ceiling minus everything billed since the day it was paid. That figure, not a three-day count, is what says when the next pass is needed. It turns rust at 80% and reads "Tope agotado" at 100%.

**Add the trips** — on the session card → type kilometers and amount, tick *aeropuerto* if it applies → *Agregar* → the trip appears in the card's list and every derived figure on the page updates. Repeat per trip; the row stays open for the next one. A trip is removed with *borrar* on its row.

**Check the week** — open the app → the header states the percentage of the weekly net target already reached, and the pace panel states what is missing and per remaining day. Today counts as a day still available.

**Review a past week or month** — arrows in the header (weeks) or above the chart (months) → the whole page recomputes for that period. Past weeks show no pace panel: there is nothing left to plan.

**Set the goal** — settings drawer → one field, the weekly take-home target → *Guardar meta*. Nothing else is configurable. The kilometres needed to reach it are derived from the driver's own measured margin per kilometre, so the goal sharpens as history accumulates instead of resting on a typed assumption.

**Correct a mistake** — session card → *eliminar sesión* → the session and its trips are gone (cascade). There is no edit: a wrong session is deleted and retyped, which is faster on a phone than an edit form.

## Interaction principles

1. **Every mutation is a form post that redirects.** Result messages arrive as `?ok=` or `?error=` on the page, never as a toast that can be missed or a modal that must be dismissed. Reloading the page never re-submits.
2. **No JavaScript required for any core flow.** Logging a shift, adding a trip, changing settings, and time travel all work with scripting disabled. Nothing is a client component.
3. **Validation states the field and the fix in Spanish**, at the top of the page, and preserves the week the driver was viewing.
4. **Destructive actions are immediate and single-tap, without confirmation** — a deliberate call: this is one person's own data, entries are cheap to retype, and a confirmation dialog on every trip deletion would cost more than the occasional mistake. Revisit if the log ever gets shared.
5. **The current period is the default.** Opening the app with no parameters lands on this week and this month, computed in `America/Bogota` — never on the server's timezone or the last week visited.

## States

**Week with no sessions** — the log shows a dashed frame reading *"Sin sesiones esta semana."* The stat tiles show zeros with their targets still visible, so the week reads as "nothing yet", not "broken". First-run (no data at all) is the same view; the settings drawer carries defaults so targets are never blank.

**Session with no trips** — the card states *"Sin servicios registrados aún."* and the net shows negative by the fuel already spent, which is the truth.

**Week with no passes recorded** — the passes section says so plainly, and the header states "(sin pases registrados esta semana)" next to the net, so a suspiciously healthy week is never mistaken for a real one.

**No refuel recorded yet** — the fuel economy panel is hidden entirely, and the km-remaining figure reads "sin margen medido aún" rather than guessing. A single refuel is enough to make both appear, and the caption says the number sharpens with more.

**Loading** — none by design. Both routes are server-rendered on demand and the queries are two flat selects over a single driver's rows. No skeletons, no spinners, no optimistic UI.

**Fuel panel before any fuel spending** — hidden entirely rather than shown with an empty value: there is nothing measured to compare against.

**Error** — validation failures return to the page with a rust banner naming the field and the fix. Unexpected failures (database unreachable) surface as the framework's error page; there is no retry UI, because the fix is always "try again in a moment".

**Not authenticated** — every page and every Server Action redirects to `/login`. The check happens in the action itself, not only in the page, because actions are reachable by direct POST. There is no partially-visible state: without the cookie, nothing renders.

**Wrong password** — `/login` returns with *"Clave incorrecta."* and no detail about why. No lockout, no rate limiting yet (see `DECISIONS.md`).

## Edge cases

- **Week straddling two months** — assigned by its middle day; counted in exactly one month's chart and one month's target.
- **Session dated in a different week than the one on screen** — after saving, the app jumps to the week that session belongs to rather than leaving it invisible.
- **Odometer end below start** — rejected with a message; a shift cannot consume negative distance.
- **More than 2.000 km in one shift** — rejected as an odometer typo, not stored as a record week.
- **Trips totalling more kilometers than the odometer** — allowed, and it shows as a negative empty-kilometer share. The odometer is the value most likely mistyped, and the app surfaces the contradiction rather than hiding it.
- **Refuel checkbox disagreeing with the fuel figures** — rejected both ways: ticked with a zero cost or zero gallons, and unticked with either one filled in. Without JavaScript the fields cannot be hidden, so validation is what gives the checkbox meaning.
- **A measured margin at or below zero** — no kilometre target is shown. A driver losing money per kilometre cannot be told how far to drive to reach a positive goal.
- **A week with a refuel and one without** — the refuel week looks worse and the other looks inflated. The session card says so in place; the weekly figure is the one that balances.
- **An earnings ceiling at or below what the pass cost** — rejected as a typo, in the action and again by a database check.
- **A ceiling already exceeded** — remaining reads $0, never a negative, and the panel says "Tope agotado".
- **Several capped passes over time** — the most recent one is the active one, and only billing from its date onward counts against it.
- **Timezone** — a session's date is a calendar date, stored as `date`, never a timestamp. "Today" is resolved in `America/Bogota` regardless of where the server runs.
- **Month with five weeks** — targets divide by five that month, not by a hardcoded four.
- **Thousands of rows** — not a case worth designing for: one driver generates a few hundred sessions a year, and the whole set is aggregated in memory. If it ever matters, aggregation moves into SQL.
- **Lost connection mid-submit** — the form post fails and nothing is written; the driver resubmits. There is no offline queue.

## Behavioral constraints

- **Exactly one settings row exists.** Enforced by a database check constraint (`id = 1`), not by convention. Saving settings upserts that row.
- **A trip cannot exist without its session.** Deleting a session cascades to its trips.
- **An earnings ceiling is consumed by gross billing, not by take-home.** It is a limit on what the platform lets the driver bill, so fuel and passes do not enter the calculation.
- **A capped pass has no expiry in the model** — it lasts until its ceiling is used up. If the real product expires by date, this model overstates coverage.
- **Passes cost whatever actually fell inside the period.** A week charges the passes paid between its Monday and Sunday; a month charges every pass inside it. Nothing is prorated or projected from the three-day cadence.
- **Fuel is only recorded at a refuel.** A shift with no fill-up carries no fuel cost, which makes per-session net lumpy by design and per-week net exact.
- **The kilometre target is derived from measurement, never typed.** It follows from the weekly target, the passes already paid, and the measured take-home per kilometre across all history.
- **Weeks run Monday to Sunday, and that is not configurable.** One driver, one convention.
- **A session's date must be a real `YYYY-MM-DD`.** Anything else is rejected before it reaches the database.
- **The session cookie expires after 90 days**, signed with `AUTH_SECRET`. An expired or tampered cookie is treated as absent.
