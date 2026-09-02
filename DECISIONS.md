# Decisions

Living governance log for `uber-bitacora`. Holds what `PRODUCT.md`, `UX.md` and `DESIGN.md` don't: where the project hardcodes instead of reusing, what is still open, and which calls were made deliberately.

## Coverage gaps

- `lib/metrics.ts:DEFAULT_SETTINGS` — the app needs targets before the driver has saved any, and there is no seed migration — the Barranquilla figures from the prototype are hardcoded (net target $6.400.000, fare $2.000/km, fuel $324/km, gallon $15.650, fixed costs $404.000, 264 h) — would close with a seeded `settings` row created at first deploy. The production database is empty, so these defaults are what the app shows until the first save.
- `app/icon.svg` — a home-screen icon for the installed PWA — a hand-drawn 64px SVG monogram — would close with a real icon set (192/512 PNG) once the app has a visual identity worth exporting.
- No design token package exists for a repo of one, so `app/globals.css` `@theme` is the single source and `DESIGN.md` frontmatter mirrors it by hand. The two must be edited together.

## Open questions

- Does "pases" mean platform fees, tolls, or a vehicle rental installment? — Leiver — before the second month of real data, since the label and the proration rule depend on it. Currently modeled as a generic monthly fixed cost (`fixedCostsMonthly`) prorated per week.
- Should a wrong session be editable instead of delete-and-retype? — Leiver — when a typo actually costs more than 30 seconds to fix in practice.
- Does the login need rate limiting? — Leiver — before the URL is shared with anyone, or if the deployment is ever discovered. A single password with no attempt limit is acceptable only while the URL is effectively private.
- Should the app run on Bun in production (self-hosted on Fly.io) rather than Node on Vercel? — Leiver — if a Vercel constraint actually bites. Bun is the local runtime and test runner today.
- Is a dark theme worth it for night shifts? — Leiver — after a week of real night use. The palette is currently light-only.
- Should missing configuration be detected at server start (via `instrumentation.ts`) instead of on the first request that needs it? — Leiver — if a secret goes missing again. An empty `AUTH_SECRET` shipped unnoticed because the anonymous request path never reads it.
- Should a deleted session be recoverable? — Leiver — the first time one is deleted by accident. Delete cascades to services with no confirmation, which `UX.md` justifies; an undo would serve better than a dialog.

## Decisions log

- 2026-09-02 — Postgres is provisioned by the Neon marketplace integration rather than a hand-set `DATABASE_URL` — the integration owns the variable across all three environments, and a manual variable of the same name blocks the resource from connecting at all — supersedes the manual env var added during the first deploy attempt.
- 2026-09-02 — the database client is built on first query, not at module import — a runtime secret must never be a build-time requirement: the first production build failed because `/login`, which reads no data, transitively imported a client that threw without `DATABASE_URL`.
- 2026-09-02 — no client components anywhere: every mutation is a `<form>` posting to a Server Action that redirects with `?ok=`/`?error=` — gives progressive enhancement for free (the app works before hydration and with JS off, which matters on a phone with bad signal after a shift), and removes `useState`, `useActionState` and toast state from the codebase entirely — supersedes the prototype's client-side rendering in `docs/prototype.html`.
- 2026-09-02 — session dates are stored as Postgres `date` and "today" is resolved in `America/Bogota` via `Intl`, never from the server clock — a `timestamptz` would shift a Barranquilla shift into the previous or next day when rendered from a UTC server.
- 2026-09-02 — time is stored as whole minutes and money as integer COP — floats in money and duration arithmetic drift, and the app compares against targets on every render.
- 2026-09-02 — pace counts today as a day still available (`weekEnd - today + 1`) — the prototype's `round((end - today)/86400000)` returned 0 on the last day of the week, hiding the pace exactly when it mattered most — supersedes `docs/prototype.html` `render()`.
- 2026-09-02 — a week belongs to the month containing its middle day, and monthly targets divide by that month's actual week count (4 or 5) — carried over from the prototype deliberately: it is the only rule that counts a straddling week exactly once — locked in by `lib/metrics.test.ts`.
- 2026-09-02 — auth is one shared password plus an HMAC-signed 90-day cookie, checked inside every Server Action rather than in `proxy.ts` — there is one user, so a user table buys nothing; the check lives at the data boundary because Server Actions are reachable by direct POST, and Next.js's own docs warn against using Proxy as the authorization layer.
- 2026-09-02 — banners use a paper ground instead of a 10% tinted wash — the wash measured 4.08:1 for rust and 3.80:1 for moss, below the AA floor this project commits to — supersedes the first implementation of `components/ui.tsx` `Banner`.
- 2026-09-02 — the monthly chart is CSS flexbox bars, not a charting library — four or five bars with one target line do not justify ~90 kB of Recharts, and the prototype already proved the CSS version reads correctly.
- 2026-09-02 — Biome replaces ESLint and Prettier — one binary, one config, and no plugin resolution to maintain in a repo of one.
- 2026-09-02 — pnpm installs, Bun runs scripts and tests, Node runs production on Vercel — Bun's test runner needs no Vitest or Jest config, and Vercel's Node runtime needs no Dockerfile. The split is deliberate, not an accident of tooling.
