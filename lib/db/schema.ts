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
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    minutes: integer("minutes").notNull(),
    kmStart: integer("km_start").notNull(),
    kmEnd: integer("km_end").notNull(),
    /** COP spent on fuel during the shift. */
    fuelCost: integer("fuel_cost").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sessions_date_idx").on(table.date),
    check("sessions_km_order", sql`${table.kmEnd} >= ${table.kmStart}`),
    check("sessions_minutes_positive", sql`${table.minutes} >= 0`),
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

/** Single-row table: this is a one-driver app, so there is one config. */
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    netTargetMonthly: integer("net_target_monthly").notNull(),
    farePerKmTarget: integer("fare_per_km_target").notNull(),
    fuelCostPerKmEstimate: integer("fuel_cost_per_km_estimate").notNull(),
    gallonPrice: integer("gallon_price").notNull(),
    fixedCostsMonthly: integer("fixed_costs_monthly").notNull(),
    hoursTargetMonthly: integer("hours_target_monthly").notNull(),
    weekStartsOn: integer("week_starts_on").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("settings_single_row", sql`${table.id} = 1`),
    check(
      "settings_week_starts_on_range",
      sql`${table.weekStartsOn} between 0 and 6`,
    ),
  ],
);
