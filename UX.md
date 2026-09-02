# UX

Behavioral contract for `uber-bitacora`. Sits between `PRODUCT.md` (who and why) and `DESIGN.md` (how it looks).

## Navigation model

**Single page, two axes of time.** Everything lives at `/`: the week's state, the entry form, the session log, the monthly chart, and the settings drawer. There are no tabs and no sub-pages.

Movement is time travel, expressed in the URL:

- `?week=YYYY-MM-DD` — the week being reviewed. Arrows step ±7 days; forward is disabled on the current week.
- `?month=YYYY-MM` — the month shown in the chart, independent of the week. Arrows step ±1 month; forward is disabled on the current month.

`/login` is the only other route, and it is a dead end by design: no navigation, exited only by authenticating. Back behavior is the browser's own — every state is a real URL, so back returns to the previous week or month, and a bookmarked week reopens exactly as it was. Settings are a native `<details>` drawer in place, not a route, so opening them never costs the current week.

## Information architecture

Three entities:

```
settings (single row)      sessions ──< services
```

- **session** — one connected shift on a calendar date: minutes connected, odometer start and end, fuel spending, notes.
- **service** — one paid trip inside a session: kilometers, amount, airport flag.
- **settings** — the driver's targets and assumptions. Exactly one row exists; there is one driver.

Derived aggregates are never stored. Week and month totals, net income, empty-kilometer share and pace are all computed from the rows on every render (`lib/metrics.ts`), so correcting a session immediately corrects every number that depends on it.

**Weeks are the unit of work; months are the unit of the target.** A week belongs to the month containing its middle day, so a week straddling two months is counted once. Monthly targets are divided by however many weeks that month owns — four or five, never a fixed number.

## Core flows

**Log a shift** — park the car → open the app (already authenticated) → the week's state is on screen → fill date, hours, odometer start/end, fuel → *Guardar sesión* → lands on the week the session belongs to, with the session card at the top of the log and a prompt to add its trips. If validation fails (odometer running backwards, more than 2.000 km in one shift), the page returns with the reason stated and nothing saved.

**Add the trips** — on the session card → type kilometers and amount, tick *aeropuerto* if it applies → *Agregar* → the trip appears in the card's list and every derived figure on the page updates. Repeat per trip; the row stays open for the next one. A trip is removed with *borrar* on its row.

**Check the week** — open the app → the header states the percentage of the weekly net target already reached, and the pace panel states what is missing and per remaining day. Today counts as a day still available.

**Review a past week or month** — arrows in the header (weeks) or above the chart (months) → the whole page recomputes for that period. Past weeks show no pace panel: there is nothing left to plan.

**Recalibrate the fuel estimate** — the measured panel compares real cost per kilometer against the planning estimate → when they diverge by more than $15/km, a button offers the measured value → one tap rewrites the setting, and the kilometer target changes with it. Refused if the measured cost exceeds the expected fare per kilometer, which would make the target meaningless.

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
- **Fare per km set below fuel cost per km** — rejected in settings: it would make the kilometer target negative or infinite.
- **Timezone** — a session's date is a calendar date, stored as `date`, never a timestamp. "Today" is resolved in `America/Bogota` regardless of where the server runs.
- **Month with five weeks** — targets divide by five that month, not by a hardcoded four.
- **Thousands of rows** — not a case worth designing for: one driver generates a few hundred sessions a year, and the whole set is aggregated in memory. If it ever matters, aggregation moves into SQL.
- **Lost connection mid-submit** — the form post fails and nothing is written; the driver resubmits. There is no offline queue.

## Behavioral constraints

- **Exactly one settings row exists.** Enforced by a database check constraint (`id = 1`), not by convention. Saving settings upserts that row.
- **A trip cannot exist without its session.** Deleting a session cascades to its trips.
- **Fixed costs ("pases") are monthly, and prorated per week** — the week's share is charged against the week's net, while the chart charges the full month once. Both views state which one they are showing.
- **The kilometer target is derived, never typed.** It follows from net target, fixed costs, expected fare per km and estimated fuel cost per km. Changing any of the four moves it.
- **A session's date must be a real `YYYY-MM-DD`.** Anything else is rejected before it reaches the database.
- **The session cookie expires after 90 days**, signed with `AUTH_SECRET`. An expired or tampered cookie is treated as absent.
