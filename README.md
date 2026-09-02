# Bitácora de ruta

Weekly logbook for connected Uber driving sessions. Records each shift — hours, odometer, fuel, and the trips it produced — and derives what the platform's own app does not report: net income after fuel and fixed costs, the share of kilometers driven empty, the real cost per kilometer, and the pace needed to close the monthly target.

Single driver, single password. The interface is in Spanish (es-CO); the code and docs are in English.

## Stack

| Layer | Choice |
|---|---|
| Package manager | pnpm |
| Runtime & tests | Bun (`bun test`) |
| Framework | Next.js 16 (App Router, Server Actions) |
| Database | Postgres (Neon) via Drizzle ORM |
| Styling | Tailwind CSS v4 (`@theme` tokens in `app/globals.css`) |
| Lint & format | Biome |
| Hosting | Vercel |

No client components: every mutation is a plain `<form>` posting to a Server Action, so the app works before hydration and with JavaScript disabled.

## Layout

```
app/
  page.tsx           week dashboard — stats, pace, chart, log, settings
  actions.ts         Server Actions: the only write path, and where input is validated
  login/page.tsx     password gate
  manifest.ts        home-screen install metadata
components/          presentational only, no data access
lib/
  metrics.ts         all business logic, pure functions over plain data
  metrics.test.ts    the project's test suite
  dates.ts           YYYY-MM-DD arithmetic, timezone-safe
  format.ts          es-CO display formatting
  auth.ts            password check and signed session cookie
  queries.ts         database reads
  db/schema.ts       three tables: sessions, services, settings
docs/
  worklog.md         running history
  prototype.html     the original single-file prototype, kept as reference
```

Business logic lives in `lib/metrics.ts` and touches neither React nor the database, which is why it is the part with tests.

## Local setup

```bash
pnpm install
cp .env.example .env.local     # then fill in the three values
pnpm db:push                   # create the tables
pnpm dev
```

`.env.local` needs:

- `DATABASE_URL` — Neon connection string.
- `APP_PASSWORD` — the password that opens the app.
- `AUTH_SECRET` — cookie signing key, `openssl rand -hex 32`.

All three are required at build time as well as at runtime.

## Commands

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm test         # bun test
pnpm typecheck    # tsc --noEmit
pnpm check        # biome check --write
pnpm db:push      # push the schema to the database
pnpm db:studio    # browse the data
```

## Deploy

Vercel, personal scope — team `team_cGYqhg1A7bl3QaJvjeeW8pAQ`.

```bash
vercel login
vercel link --scope team_cGYqhg1A7bl3QaJvjeeW8pAQ
vercel env add DATABASE_URL production   # repeat for APP_PASSWORD, AUTH_SECRET
vercel --prod
```

Add a Neon Postgres database from the Vercel dashboard's Storage tab to get `DATABASE_URL` provisioned automatically, then run `pnpm db:push` against it once.

## Project contracts

`PRODUCT.md` (strategy) · `UX.md` (behavior) · `DESIGN.md` (visuals) · `DECISIONS.md` (open questions and deliberate calls).
