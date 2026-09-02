# Worklog

Running history of this repo, newest first. Records what changed and why it mattered — the context `git log` alone does not carry.

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
