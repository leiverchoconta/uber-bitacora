"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  checkPassword,
  endSession,
  requireSession,
  startSession,
} from "@/lib/auth";
import { startOfWeek } from "@/lib/dates";
import { db } from "@/lib/db";
import { services, sessions, settings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/metrics";
import { getSettings } from "@/lib/queries";

/**
 * Validation lives here because Server Actions are a trust boundary: they are
 * reachable by direct POST, not only through the rendered form.
 *
 * Failures come back as a `?error=` on the page (post/redirect/get) instead of
 * a thrown error, so the forms need no client-side JavaScript at all.
 */

class InvalidInput extends Error {}

function text(form: FormData, field: string, maxLength = 500): string {
  const value = form.get(field);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function integer(
  form: FormData,
  field: string,
  label: string,
  { min = 0, max = 100_000_000 } = {},
): number {
  const raw = text(form, field, 20).replace(/[^\d-]/g, "");
  const value = Number(raw);
  if (raw === "" || !Number.isFinite(value)) {
    throw new InvalidInput(`${label}: escribe un número.`);
  }
  const rounded = Math.round(value);
  if (rounded < min || rounded > max) {
    throw new InvalidInput(`${label}: debe estar entre ${min} y ${max}.`);
  }
  return rounded;
}

function decimal(
  form: FormData,
  field: string,
  label: string,
  { min = 0, max = 24 } = {},
): number {
  const raw = text(form, field, 20).replace(",", ".");
  const value = Number(raw);
  if (raw === "" || !Number.isFinite(value) || value < min || value > max) {
    throw new InvalidInput(`${label}: debe estar entre ${min} y ${max}.`);
  }
  return value;
}

function isoDate(form: FormData, field: string, label: string): string {
  const value = text(form, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InvalidInput(`${label}: fecha inválida.`);
  }
  return value;
}

function uuid(form: FormData, field: string): string {
  const value = text(form, field, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new InvalidInput("Registro no encontrado.");
  }
  return value;
}

/** Where to land after the action, keeping the week the user was looking at. */
function backTo(
  form: FormData,
  params: { error?: string; ok?: string } = {},
): string {
  const query = new URLSearchParams();
  const week = text(form, "week", 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(week)) query.set("week", week);
  if (params.error) query.set("error", params.error);
  if (params.ok) query.set("ok", params.ok);
  const suffix = query.toString();
  return suffix ? `/?${suffix}` : "/";
}

/**
 * Runs a mutation and turns an `InvalidInput` into a redirect carrying the
 * message. A mutation may rewrite the form's `week` field to change where the
 * redirect lands.
 */
async function guard(
  form: FormData,
  ok: string,
  mutate: () => Promise<void>,
): Promise<never> {
  await requireSession();
  let destination: string;
  try {
    await mutate();
    destination = backTo(form, { ok });
  } catch (error) {
    if (!(error instanceof InvalidInput)) throw error;
    destination = backTo(form, { error: error.message });
  }
  revalidatePath("/");
  redirect(destination);
}

export async function login(form: FormData): Promise<void> {
  const password = text(form, "password", 200);
  if (!password || !checkPassword(password)) {
    redirect("/login?error=1");
  }
  await startSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function addSession(form: FormData): Promise<void> {
  await guard(form, "Sesión guardada — agrega los servicios", async () => {
    const date = isoDate(form, "date", "Fecha");
    const kmStart = integer(form, "kmStart", "Km inicial", { max: 9_999_999 });
    const kmEnd = integer(form, "kmEnd", "Km final", { max: 9_999_999 });
    if (kmEnd < kmStart) {
      throw new InvalidInput("El km final no puede ser menor al inicial.");
    }
    if (kmEnd - kmStart > 2_000) {
      throw new InvalidInput(
        "Más de 2.000 km en una sesión: revisa el odómetro.",
      );
    }

    const hours = decimal(form, "hours", "Horas conectado", { max: 24 });
    const fuelCost = integer(form, "fuelCost", "Gasto en gasolina", {
      max: 5_000_000,
    });

    await db.insert(sessions).values({
      date,
      minutes: Math.round(hours * 60),
      kmStart,
      kmEnd,
      fuelCost,
      notes: text(form, "notes", 500) || null,
    });

    // Jump to the week the session belongs to, which may not be the one on screen.
    const { weekStartsOn } = await getSettings();
    form.set("week", startOfWeek(date, weekStartsOn));
  });
}

export async function deleteSession(form: FormData): Promise<void> {
  await guard(form, "Sesión eliminada", async () => {
    const id = uuid(form, "sessionId");
    await db.delete(sessions).where(eq(sessions.id, id));
  });
}

export async function addService(form: FormData): Promise<void> {
  await guard(form, "Servicio agregado", async () => {
    const sessionId = uuid(form, "sessionId");
    const [session] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    if (!session) throw new InvalidInput("Esa sesión ya no existe.");

    await db.insert(services).values({
      sessionId,
      km: integer(form, "km", "Km del servicio", { max: 2_000 }),
      amount: integer(form, "amount", "Valor del servicio", { max: 5_000_000 }),
      isAirport: form.get("isAirport") === "on",
    });
  });
}

export async function deleteService(form: FormData): Promise<void> {
  await guard(form, "Servicio eliminado", async () => {
    const id = uuid(form, "serviceId");
    await db.delete(services).where(eq(services.id, id));
  });
}

export async function saveSettings(form: FormData): Promise<void> {
  await guard(form, "Ajustes guardados", async () => {
    const values = {
      id: 1,
      netTargetMonthly: integer(form, "netTargetMonthly", "Meta neta mensual", {
        min: 1,
      }),
      farePerKmTarget: integer(form, "farePerKmTarget", "Tarifa promedio", {
        min: 1,
        max: 100_000,
      }),
      fuelCostPerKmEstimate: integer(
        form,
        "fuelCostPerKmEstimate",
        "Costo estimado de gasolina por km",
        { min: 1, max: 100_000 },
      ),
      gallonPrice: integer(form, "gallonPrice", "Precio del galón", {
        min: 1,
        max: 1_000_000,
      }),
      fixedCostsMonthly: integer(form, "fixedCostsMonthly", "Costo de pases"),
      hoursTargetMonthly: integer(form, "hoursTargetMonthly", "Meta de horas", {
        min: 1,
        max: 744,
      }),
      weekStartsOn: integer(form, "weekStartsOn", "Inicio de semana", {
        max: 6,
      }),
      updatedAt: new Date(),
    };

    if (values.farePerKmTarget <= values.fuelCostPerKmEstimate) {
      throw new InvalidInput(
        "La tarifa por km debe superar el costo de gasolina por km.",
      );
    }

    await db
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({ target: settings.id, set: values });
  });
}

/** Adopts the measured fuel cost per km as the planning estimate. */
export async function syncFuelEstimate(form: FormData): Promise<void> {
  await guard(form, "Meta actualizada con el dato real", async () => {
    const measured = integer(
      form,
      "fuelCostPerKmEstimate",
      "Costo real por km",
      {
        min: 1,
        max: 100_000,
      },
    );
    const current = await getSettings();
    if (measured >= current.farePerKmTarget) {
      throw new InvalidInput(
        "Ese costo por km supera tu tarifa promedio: ajusta la tarifa primero.",
      );
    }

    const values = {
      ...DEFAULT_SETTINGS,
      ...current,
      id: 1,
      fuelCostPerKmEstimate: measured,
      updatedAt: new Date(),
    };
    await db
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({ target: settings.id, set: values });
  });
}
