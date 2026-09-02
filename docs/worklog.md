# Worklog

Running history of this repo, newest first. Records what changed and why it mattered — the context `git log` alone does not carry.

## 2026-09-02 — Capped passes and remaining coverage

**Code review of PR #2, and a defect it exposed across the whole app**

The review flagged `step="1000"` on the new earnings-cap field. Extending the check to every numeric input showed the problem was systemic and had shipped in PR #1: `step` defines which values are **valid** (`min + n × step`), not how far the spinner moves. So the browser refused to submit:

| field | min / step | blocked |
|---|---|---|
| pass amount | 1 / 1000 | $85.500, $40.000 — every real value |
| earnings cap | 0 / 1000 | $841.900 |
| service amount | 0 / 500 | any fare not divisible by 500 |
| fuel cost | 0 / 1000 | any refuel not divisible by 1000 |
| weekly goal | 1 / 50000 | $1.600.000 |

Recording a pass, a service, a refuel, or saving the goal were all impossible through a browser. Every end-to-end test had used a direct POST, which skips HTML validation entirely — the tests were exercising a path no user takes. Whole-number fields are now `step="1"` and decimals `step="any"`.

Second finding, equally real: the cap was parsed with `scaled()`, which treats `.` as a decimal point. A cap typed the way the app itself prints it — `$ 841.900` — became **842 pesos**, and drove the entire coverage panel. The same bug had just been introduced on `fuelCost` while fixing PR #1's blank-field problem. Money now goes through the digit-stripping `integer()`, with `optionalInteger()` for blank-means-zero, and `scaled()` is documented as hours-and-gallons only. Verified by posting "85.500" / "841.900" and reading back 85500 / 841900.

Three smaller ones fixed: two capped passes on the same day resolved by whatever order Postgres returned, so `getPassPayments` now orders by date **and** `createdAt`; the coverage panel rendered its present-tense figure inside historical weeks, where the pace panel is already hidden; and rounding could print "100% usado" beside a headline still offering money to bill, so the percentage floors and 100% is reserved for an exhausted ceiling.


A pass bought by mistake turned out to be a different product: $85.500 that unlocks billing up to $841.900, where the ordinary three-day pass is a flat cost with no ceiling at all.

Recording the payment itself needed no code — `pass_payments` already takes any amount on any date. What was missing was the ceiling, and it is not special to this one payment: it is the fact that distinguishes the two kinds of pass. `earnings_cap` is now a nullable column, null meaning the ordinary pass, which meant a non-destructive `db:push` for once.

**What the ceiling buys**

A coverage panel: the ceiling minus everything billed since the day the pass was paid. That figure is what says when the next pass is needed — not a three-day count. Rust at 80% used, "Tope agotado" at 100%, and remaining never goes negative.

**Assumptions stated rather than guessed**

The ceiling is consumed by **gross** billing, since that is what the platform limits — fuel and passes do not enter it. And a capped pass **does not expire** in this model; it lasts until the ceiling is used up. Neither rule was confirmed, so both are written into `UX.md` as behavioral constraints and into `DECISIONS.md` as open questions. Also deliberately not modeled: that a capped pass might exempt the driver from three-day passes while it has headroom. Plausible, unconfirmed, and guessing would distort the weekly net — so both kinds still add up as cost, which is what was actually paid.

**Verification**

Six new tests: no coverage without a capped pass (an ordinary pass never produces one), ceiling minus gross billing from the pass date inclusive, gross rather than take-home consuming it, an exhausted ceiling reporting zero instead of a negative, the most recent capped pass winning over both an older capped one and a newer uncapped one, and a capped pass still costing its week.

End-to-end against Neon: a ceiling below the amount paid refused in the action and by the `pass_payments_cap_above_amount` check, an ordinary pass saved with no ceiling, and a capped pass of $85.500/$841.900 producing exactly $529.500 remaining at 37% used after billing $312.400. Test data removed afterward.

## 2026-09-02 — One goal, measured assumptions

Reworked the settings model at the driver's request: the app now asks for a single number and derives everything else from what actually happened.

**Removed as settings** — expected fare per km, estimated fuel cost per km, gallon price, monthly fixed costs, monthly hours target, and the week start day. Six fields became zero.

**What replaced each one**

- The goal is now **weekly and used whole**. Monthly targets had to be divided by a month's week count, so every figure on screen depended on a calendar rule that has nothing to do with driving.
- **Passes are recorded as payments**, each with the date it was actually paid. They are paid about every three days on no fixed weekday, so prorating a monthly figure across weeks was always wrong; a week now costs whatever passes fell inside it.
- **Fuel is recorded at the pump**, in pesos and gallons, behind a "tanqueé en este turno" checkbox. Gallons are what fuel economy needs, and taking them from the receipt removed the stored gallon price entirely. Economy is now odometer km ÷ real gallons.
- **The km target is derived from the measured margin** — take-home per km across all history — instead of from two typed estimates. It sharpens with every week of data, and shows a dash until there is any.
- **The hours target became an observation**: average connected hours per week, over the weeks actually worked.

**Two costs of the change, accepted deliberately**

Per-session net is now lumpy: the shift that filled the tank looks worse than the ones that spent it. The session card says so in place, and the weekly figure — which is what the goal measures — is exact.

The refuel checkbox is enforced by validation rather than by hiding fields, because there is no client JavaScript to hide them with. Ticking it with a zero, or filling the fuel fields without ticking it, are both refused. That is what makes the checkbox mean something instead of being decoration.

**Verification**

21 tests in `lib/metrics.test.ts`, rewritten for the new model — the weekly target used whole, passes counted by real date on any weekday, economy from real gallons, a km target that stays `null` when the measured margin is absent or negative, and the average-hours observation counting only weeks worked.

Then end-to-end against Neon: all three refuel validations refused as intended, and every figure the page rendered checked against arithmetic done by hand — 4% of goal, 400 km, 74% empty, $2.476 per productive km, 53,3 km/gal, $300/km, 16 h weekly average, and 4.400 km remaining derived from a measured $350/km margin. Test data removed afterward.

Schema applied by dropping and recreating the tables, which was safe only because all four were verified empty first. `drizzle-kit push` cannot resolve a column rename without an interactive prompt.

**Code review of PR #1, and what it caught**

One blocking bug: an untouched fuel field posts an empty string, and `integer()` rejects that. Since most shifts have no refuel, *every ordinary save was refused* with "Valor de la gasolina: escribe un número." The end-to-end test had passed `fuelCost=0` explicitly, which is not what the form sends — the test was verifying a request no browser makes. Fixed by reading the field with the helper that already treats an omitted value as zero, and re-tested with the exact payload the form produces.

Three more that were real:

- With sessions logged but no refuel yet, the measured margin equalled revenue ÷ km, because fuel cost was zero. The app presented that as "tu margen medido" and derived a km target from it — optimistic by the entire cost of fuel, and contradicting what `UX.md` promised. Both fuel figures are now `null` until a refuel exists.
- The month chart rendered any week at or below zero as a dash. That was right when fixed costs were monthly, but now that passes are charged to the week they fell in, a negative week is ordinary — a week off with one pass paid looked identical to a week never worked. A week with any record now shows its real figure, in rust when negative.
- The pass form defaulted to today even when reviewing a past week, so a forgotten pass would save into the current week and vanish from the list on screen. It now defaults to the displayed week.

Plus three small ones: an omitted field could bypass a `min > 0` requirement inside the validation helper, a variable named `hours` held minutes, and `daysSinceLastPass` was dead code — deleted rather than left waiting for a feature that was cut.

**Two findings answered with words instead of code.** The km-remaining figure is short by the passes not yet paid this week; closing that gap requires projecting the three-day cycle, which this design rejects on purpose, so the caption now states the omission. And `drizzle-kit push` cannot repeat this migration on a table with rows — recorded as an open question rather than pre-building migration infrastructure.

The settings panel also now says when the target on screen is the default rather than one the driver saved.

## 2026-09-02 — Deployed to production on Neon

Live at https://uber-bitacora.vercel.app, backed by a Neon Postgres provisioned through the Vercel marketplace integration.

**One real defect found and fixed**

The first production build failed: `/login` does not read the database, but it imports the login action, which imported the client module, which threw at module scope when `DATABASE_URL` was absent. A runtime secret had become a build-time requirement. The client is now built on first query — a build no longer depends on runtime secrets, and a page that needs no database renders without one. Verified by building with no env file present at all.

**End-to-end verification against real Postgres**

The schema was checked in the database rather than assumed: `sessions.date` is a `date` column, and all five check constraints plus the cascade are in place. Then every write path was exercised through the rendered forms:

- Rejected: odometer running backwards, and a fare per km below the fuel cost per km.
- Accepted: a session, two services (one airport), and a settings change.
- Every figure the page rendered was compared against the arithmetic done by hand and matched exactly — including the derived monthly km target of 1.015 km/week and the gallon count recomputed from the new gallon price.
- The cascade delete was confirmed the hard way, by probing an unlabelled action id that turned out to be `deleteSession`: it removed the session and its services in one shot. This is the behavior `UX.md` specifies, and a reminder of why an undo would be worth more than a confirmation dialog.

Test data was removed afterward; the database is empty.

**A production incident, caused by a gap in how it was verified**

Every page returned 500 for anyone holding a session cookie — including `/login`, so there was no way back in through the UI. The stored `AUTH_SECRET` was empty or otherwise unusable, and `requireEnv` treats an empty string as absent.

What hid it: `hasSession()` short-circuits when no cookie is present, so the signing path is never reached by an anonymous request. The production checks run at deploy time were all anonymous, and the authenticated flow had been exercised only against the local server. The whole class of failure sat in the one combination never tested: production plus a cookie.

Fixed by replacing `AUTH_SECRET` in both `production` and `preview`. Verified afterward across three cookie states — absent, malformed, and unsigned — all of which now resolve to `307 → /login` rather than a crash. A cookie that cannot be verified is correctly treated as no session.

The lesson is about verification, not code: an auth gate has to be probed **with** a credential present, because the anonymous path deliberately avoids the expensive work. `curl` with a junk cookie would have caught this in one request.

**Notes for next time**

- `APP_PASSWORD` and `AUTH_SECRET` are stored as sensitive env vars: Vercel returns them through neither the API nor `env pull`. They live in a password manager or nowhere.
- Do not set `DATABASE_URL` by hand — connecting the Neon resource fails while a manual variable of that name exists.
- An env var change needs an explicit redeploy to take effect, and `vercel redeploy` was not enough here — a fresh `vercel deploy --prod` was needed.
- Check an env var's value actually landed, not just that the key is listed. A sensitive variable cannot be read back, so the only proof is the behavior of the code that consumes it.

## 2026-09-02 — Project scaffolded from the single-file prototype

Turned `docs/prototype.html` — a working single-file prototype backed by a host-provided `window.storage` — into a deployable Next.js 16 app with a real database, so the logbook can be filled from the phone right after a shift instead of only from the machine that happened to hold the browser storage.

**What landed**

- Next.js 16 (App Router) on pnpm + Bun, with Drizzle over Neon Postgres, Tailwind v4 and Biome.
- Three tables (`sessions`, `services`, `settings`) with check constraints doing the work conventions would otherwise be trusted with: odometer ordering, non-negative amounts, and a single settings row.
- All business logic extracted from the prototype's render loop into `lib/metrics.ts` as pure functions, plus `lib/dates.ts` for timezone-safe `YYYY-MM-DD` arithmetic. 13 tests in `lib/metrics.test.ts` cover the two rules that fail silently: week-to-month assignment by middle day, and the weekly split of monthly targets.
- Redesigned UI keeping the prototype's editorial paper identity, rebuilt mobile-first with no client components at all.
- Password gate: HMAC-signed 90-day cookie, verified inside every Server Action rather than in a proxy.
- The four design contract docs (`PRODUCT.md`, `UX.md`, `DESIGN.md`, `DECISIONS.md`) written against what the app actually ships.

**Two bugs fixed on the way over**

- The prototype's pace calculation returned "0 days remaining" on the last day of the week, hiding the daily target exactly when it mattered. Now today counts as a day still available.
- The result banner's 10% tinted wash measured 4.08:1 (rust) and 3.80:1 (moss) — below the AA floor this project commits to. Both variants moved to a paper ground, which measures 5.06:1 and 4.67:1.

**Why it mattered**: the prototype's data lived in one browser's storage with no way to reach it from the car, and its logic was tangled into a 700-line render function where a wrong week boundary was undetectable. The logic is now isolated and tested, and the data is somewhere a phone can reach.
