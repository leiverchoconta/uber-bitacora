/**
 * Read side of the database. One driver, a few hundred rows a year — so the
 * queries stay flat and the math happens in `metrics.ts`, not in SQL.
 */

import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { passPayments, services, sessions, settings } from "./db/schema";
import {
  DEFAULT_SETTINGS,
  type PassPayment,
  type Service,
  type Session,
  type Settings,
} from "./metrics";

export type StoredService = Service & { id: string };

/** Structurally a `Session`, so it feeds `metrics.ts` unchanged. */
export type StoredSession = Omit<Session, "services"> & {
  id: string;
  notes: string | null;
  services: StoredService[];
};

export type StoredPassPayment = PassPayment & { id: string };

/** `saved` is false when the driver has not stored a target yet. */
export async function getSettings(): Promise<{
  settings: Settings;
  saved: boolean;
}> {
  const [row] = await getDb().select().from(settings).where(eq(settings.id, 1));
  if (!row) return { settings: DEFAULT_SETTINGS, saved: false };
  return { settings: { netTargetWeekly: row.netTargetWeekly }, saved: true };
}

export async function getSessions(): Promise<StoredSession[]> {
  const [sessionRows, serviceRows] = await Promise.all([
    getDb().select().from(sessions).orderBy(desc(sessions.date)),
    getDb().select().from(services).orderBy(asc(services.createdAt)),
  ]);

  const bySession = new Map<string, StoredService[]>();
  for (const row of serviceRows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push({
      id: row.id,
      km: row.km,
      amount: row.amount,
      isAirport: row.isAirport,
    });
    bySession.set(row.sessionId, list);
  }

  return sessionRows.map((row) => ({
    id: row.id,
    date: row.date,
    minutes: row.minutes,
    kmStart: row.kmStart,
    kmEnd: row.kmEnd,
    refueled: row.refueled,
    fuelCost: row.fuelCost,
    fuelGallonsX100: row.fuelGallonsX100,
    notes: row.notes,
    services: bySession.get(row.id) ?? [],
  }));
}

export async function getPassPayments(): Promise<StoredPassPayment[]> {
  // Total ordering: `coverage()` takes the first capped pass it finds, so two
  // passes on the same day must resolve the same way on every render.
  const rows = await getDb()
    .select()
    .from(passPayments)
    .orderBy(desc(passPayments.date), desc(passPayments.createdAt));
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    earningsCap: row.earningsCap,
  }));
}
