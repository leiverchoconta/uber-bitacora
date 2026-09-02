@AGENTS.md

# uber-bitacora

Weekly logbook of connected Uber driving sessions. One driver, one password, public repo. See `README.md` for setup and `PRODUCT.md` / `UX.md` / `DESIGN.md` / `DECISIONS.md` for the project contracts — read those before changing behavior or visuals.

## Non-negotiables

- **`lib/metrics.ts` stays pure.** No React, no database, no `Date.now()` reached for directly — `weekReport` takes `now` as an argument so it stays testable. Any new derived figure goes here, with a test in `lib/metrics.test.ts`.
- **Dates are `YYYY-MM-DD` strings, and arithmetic goes through `lib/dates.ts`.** Never `new Date()` on a session date: the server runs in UTC and the driver's day is a Bogota day. A session's date column is `date`, never `timestamptz`.
- **Money is integer COP, time is integer minutes, gallons are integer hundredths.** No floats in stored values.
- **One setting exists: the weekly net target.** Anything else the app needs is measured from the sessions or recorded as an event. Do not add a settings field to avoid a calculation — that is the change this app deliberately walked back.
- **Fuel exists only where a refuel happened**, and the `refueled` flag must agree with `fuel_cost` and `fuel_gallons_x100` in both directions. A database check constraint enforces it; the action validates it first so the driver gets a sentence instead of a 500.
- **Every Server Action calls `requireSession()` first**, and validates its own input. Actions are reachable by direct POST, so the page's check is not enough.
- **No client components.** Mutations are `<form action={serverAction}>`; navigation is `<Link>` with `?week=` / `?month=`. If something seems to need `useState`, it probably needs a URL parameter.
- **Validation failures redirect with `?error=`**, they do not throw. Messages are in Spanish, name the field, and state the fix.

## Conventions

- UI copy is Spanish (es-CO), lowercase labels. Code, comments, commits, docs and PR replies are English.
- Colors are sRGB hex, defined once as Tailwind `@theme` tokens in `app/globals.css` and mirrored in `DESIGN.md` frontmatter — edit both together.
- `docs/prototype.html` is a frozen reference, excluded from Biome. Don't fix its lint; it records where the logic came from.

## Before calling work done

```bash
pnpm check && pnpm typecheck && pnpm test && pnpm build
```

Then update `docs/worklog.md` with what changed and why.
