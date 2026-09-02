# Worklog

Running history of this repo, newest first. Records what changed and why it mattered — the context `git log` alone does not carry.

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
