/**
 * Read side of the database. One driver, a few hundred rows a year — so the
 * queries stay flat and the math happens in `metrics.ts`, not in SQL.
 */

import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { services, sessions, settings } from "./db/schema";
import {
  DEFAULT_SETTINGS,
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

export async function getSettings(): Promise<Settings> {
  const [row] = await getDb().select().from(settings).where(eq(settings.id, 1));
  if (!row) return DEFAULT_SETTINGS;

  return {
    netTargetMonthly: row.netTargetMonthly,
    farePerKmTarget: row.farePerKmTarget,
    fuelCostPerKmEstimate: row.fuelCostPerKmEstimate,
    gallonPrice: row.gallonPrice,
    fixedCostsMonthly: row.fixedCostsMonthly,
    hoursTargetMonthly: row.hoursTargetMonthly,
    weekStartsOn: row.weekStartsOn,
  };
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
    fuelCost: row.fuelCost,
    notes: row.notes,
    services: bySession.get(row.id) ?? [],
  }));
}
