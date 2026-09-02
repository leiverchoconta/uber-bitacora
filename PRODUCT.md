# Product

Strategic contract for `uber-bitacora`. Pairs with `UX.md` (behavior), `DESIGN.md` (visuals) and `DECISIONS.md` (gaps and open calls).

## Register

`product`

## Users

One person: the owner of this repo, a driver working the Uber platform in Barranquilla. He uses it twice a day at most — once from the phone right after parking the car, tired, with one hand free, to type what the shift produced; and once a week, sitting down, to see whether the month is on track.

The job to be done: **know if today's driving paid for itself, and how much is missing to close the week.** The platform's own app reports gross earnings; it says nothing about fuel, empty kilometers, or the fixed costs that decide whether a shift was actually worth driving.

## Product Purpose

A weekly logbook of connected sessions. Each session records hours, odometer start and end, whether the tank was filled and what that cost, and the trips it produced. Platform passes are recorded as they are paid. From that, the app derives what the platform hides: net income after fuel and passes, the share of kilometers driven with no passenger, real fuel economy against the odometer, and the pace needed to close the week.

The driver configures exactly one number — the weekly take-home target. Everything else the app once asked him to estimate is now measured from what actually happened.

Success is a single sentence being true: *the driver knows, before starting the car, how many kilometers today has to produce.*

## Non-goals

- **Not an accounting or tax tool.** No invoices, no ledgers, no reports for third parties. It is a personal logbook, not bookkeeping.
- **Not a fleet or multi-driver product.** One driver, one password, one set of settings. No accounts, roles, or sharing.
- **Not a trip tracker.** It does not follow the car, read GPS, or connect to the Uber API. Data is typed in after the fact, on purpose.
- **Not a route optimizer.** It reports what happened; it does not tell the driver where to position himself. That would drift into a dispatch tool.

## Brand Personality

**Field notebook, kept honestly.** Three words: measured, warm, unflinching.

The register is editorial print — a paper logbook a professional actually keeps, not a fintech dashboard. Numbers are the content; there is no chrome around them. Warm paper ground, serif headlines, monospaced figures so columns of pesos line up. Reference feel: a Field Notes notebook, the results pages of a printed almanac, Monocle's data spreads.

Tone in Spanish, neutral and direct: *"Faltan $1.240.000 en 3 días"*, never *"¡Sigue así, vas muy bien!"*. The app does not congratulate and does not scold; it states.

## Anti-references

- **Gamified gig-driver apps** — streak badges, confetti, "¡Vas por buen camino!" encouragement. The number is the feedback.
- **SaaS analytics dashboards** — dark navy cards on grey, six chart types on one screen, gradient KPI tiles.
- **Crypto/fintech neon** — glowing accents, black backgrounds, animated counters.
- **Generic Material or Bootstrap defaults** — the app must not look like an admin panel someone scaffolded.

## Design Principles

1. **The number is the interface.** Every screen element either shows a figure or explains how it was derived. No decoration that carries no data.
2. **Answer before asking.** The first thing on screen is the state of the week, not a form. Input comes after the answer.
3. **Say the uncomfortable number.** Negative nets, 40% empty kilometers, and a fuel estimate that no longer matches reality are shown plainly, in a warning color, with the correction one tap away.
4. **Fast on a phone, in the dark, with one hand.** Native inputs, real submit buttons, nothing that requires precision aiming or JavaScript to have loaded.
5. **Nothing is estimated that can be measured.** The app asks for one goal and derives the rest from the driver's own history. A figure with no history behind it shows a dash — never a plausible default that would be mistaken for knowledge.

## Accessibility & Inclusion

Commits to **WCAG 2.2 AA** for the surfaces it ships:

- All text and figure colors are measured against their actual ground, not assumed: ink on paper is 16.2:1, ink-soft 6.9:1, teal 10.8:1, rust 5.1:1 and moss 4.7:1 — every one above the 4.5:1 floor. Tinted washes behind colored text are not used, because they drop rust and moss below it.
- Color is never the only signal: a missed target reads as a rust figure **and** a stated shortfall in words; a reached target reads as moss **and** "Meta de la semana cumplida".
- Every form control has a visible persistent label, not a placeholder. Placeholders only carry examples.
- Fully keyboard operable, and fully operable with JavaScript disabled — forms post to Server Actions, navigation is real links.
- Font size on inputs stays at `1rem` minimum so iOS Safari does not zoom on focus, which would break one-handed use.
- Touch targets are at least 32px on the smallest controls (week arrows) and 44px on primary actions.
