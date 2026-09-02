import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A connected shift. `date` is a calendar date, never a timestamp: a session
 * belongs to the day the driver worked, which must not shift with a timezone.
 *
 * Fuel is recorded only when the tank was actually filled, so `fuel_cost` and
 * `fuel_gallons_x100` are zero on most sessions. Gallons are stored in
 * hundredths to keep the arithmetic in integers.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    minutes: integer("minutes").notNull(),
    kmStart: integer("km_start").notNull(),
    kmEnd: integer("km_end").notNull(),
    /** Whether the driver filled the tank during this shift. */
    refueled: boolean("refueled").notNull().default(false),
    /** COP paid at the pump during this shift. */
    fuelCost: integer("fuel_cost").notNull().default(0),
    /** Gallons loaded, in hundredths of a gallon. */
    fuelGallonsX100: integer("fuel_gallons_x100").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_date_idx").on(table.date),
    check("sessions_km_order", sql`${table.kmEnd} >= ${table.kmStart}`),
    check("sessions_minutes_positive", sql`${table.minutes} >= 0`),
    check("sessions_fuel_cost_positive", sql`${table.fuelCost} >= 0`),
    check("sessions_fuel_gallons_positive", sql`${table.fuelGallonsX100} >= 0`),
    // A refuel carries both numbers; a shift without one carries neither.
    check(
      "sessions_refuel_consistent",
      sql`(${table.refueled} and ${table.fuelCost} > 0 and ${table.fuelGallonsX100} > 0)
          or (not ${table.refueled} and ${table.fuelCost} = 0 and ${table.fuelGallonsX100} = 0)`,
    ),
  ],
);

/** One paid trip inside a session. */
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    km: integer("km").notNull(),
    /** COP paid for the trip. */
    amount: integer("amount").notNull(),
    isAirport: boolean("is_airport").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("services_session_idx").on(table.sessionId),
    check("services_km_positive", sql`${table.km} >= 0`),
    check("services_amount_positive", sql`${table.amount} >= 0`),
  ],
);

/**
 * One platform pass payment. Paid roughly every three days on no fixed
 * weekday, so the cost is recorded as it happens rather than prorated: a week
 * costs whatever passes actually fell inside it.
 */
export const passPayments = pgTable(
  "pass_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pass_payments_date_idx").on(table.date),
    check("pass_payments_amount_positive", sql`${table.amount} > 0`),
  ],
);

/**
 * Single-row table holding the only thing the driver configures. Everything
 * else the app used to ask for is now measured from the sessions themselves.
 */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    /** Take-home target for one week, after fuel and passes. */
    netTargetWeekly: integer("net_target_weekly").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("settings_single_row", sql`${table.id} = 1`),
    check("settings_target_positive", sql`${table.netTargetWeekly} > 0`),
  ],
);
