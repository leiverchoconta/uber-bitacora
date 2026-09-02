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
import { getDb } from "@/lib/db";
import { passPayments, services, sessions, settings } from "@/lib/db/schema";
import { WEEK_STARTS_ON } from "@/lib/metrics";

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

/** Reads a decimal field and returns it scaled to an integer. */
function scaled(
  form: FormData,
  field: string,
  label: string,
  factor: number,
  { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
): number {
  const raw = text(form, field, 20).replace(",", ".");
  if (raw === "") {
    // An omitted field is zero only when zero is actually allowed.
    if (min > 0) throw new InvalidInput(`${label}: escribe un número.`);
    return 0;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new InvalidInput(`${label}: debe estar entre ${min} y ${max}.`);
  }
  return Math.round(value * factor);
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

    // Holds minutes, not hours: the field is decimal hours, scaled on read.
    const minutes = scaled(form, "hours", "Horas conectado", 60, {
      min: 0.25,
      max: 24,
    });

    // The refuel checkbox drives validation: with it, both numbers are
    // required; without it, neither is accepted. Otherwise the flag would be
    // decoration and the fuel figures could silently disagree with it.
    const refueled = form.get("refueled") === "on";
    const fuelCost = scaled(form, "fuelCost", "Valor de la gasolina", 1, {
      max: 5_000_000,
    });
    const fuelGallonsX100 = scaled(form, "gallons", "Galones", 100, {
      max: 100,
    });

    if (refueled && (fuelCost === 0 || fuelGallonsX100 === 0)) {
      throw new InvalidInput(
        "Marcaste que tanqueaste: escribe el valor y los galones.",
      );
    }
    if (!refueled && (fuelCost > 0 || fuelGallonsX100 > 0)) {
      throw new InvalidInput(
        "Escribiste gasolina pero no marcaste que tanqueaste.",
      );
    }

    await getDb()
      .insert(sessions)
      .values({
        date,
        minutes,
        kmStart,
        kmEnd,
        refueled,
        fuelCost,
        fuelGallonsX100,
        notes: text(form, "notes", 500) || null,
      });

    // Jump to the week the session belongs to, which may not be the one shown.
    form.set("week", startOfWeek(date, WEEK_STARTS_ON));
  });
}

export async function deleteSession(form: FormData): Promise<void> {
  await guard(form, "Sesión eliminada", async () => {
    const id = uuid(form, "sessionId");
    await getDb().delete(sessions).where(eq(sessions.id, id));
  });
}

export async function addService(form: FormData): Promise<void> {
  await guard(form, "Servicio agregado", async () => {
    const sessionId = uuid(form, "sessionId");
    const [session] = await getDb()
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    if (!session) throw new InvalidInput("Esa sesión ya no existe.");

    await getDb()
      .insert(services)
      .values({
        sessionId,
        km: integer(form, "km", "Km del servicio", { max: 2_000 }),
        amount: integer(form, "amount", "Valor del servicio", {
          max: 5_000_000,
        }),
        isAirport: form.get("isAirport") === "on",
      });
  });
}

export async function deleteService(form: FormData): Promise<void> {
  await guard(form, "Servicio eliminado", async () => {
    const id = uuid(form, "serviceId");
    await getDb().delete(services).where(eq(services.id, id));
  });
}

export async function addPassPayment(form: FormData): Promise<void> {
  await guard(form, "Pase registrado", async () => {
    const amount = integer(form, "amount", "Valor del pase", {
      min: 1,
      max: 5_000_000,
    });

    // The ordinary 3-day pass has no ceiling; a capped pass unlocks billing up
    // to one. An empty field means the ordinary kind.
    const cap = scaled(form, "earningsCap", "Tope de ganancias", 1, {
      max: 50_000_000,
    });
    if (cap > 0 && cap <= amount) {
      throw new InvalidInput(
        "El tope debe ser mayor al valor que pagaste por el pase.",
      );
    }

    await getDb()
      .insert(passPayments)
      .values({
        date: isoDate(form, "date", "Fecha del pase"),
        amount,
        earningsCap: cap > 0 ? cap : null,
      });
  });
}

export async function deletePassPayment(form: FormData): Promise<void> {
  await guard(form, "Pase eliminado", async () => {
    const id = uuid(form, "passId");
    await getDb().delete(passPayments).where(eq(passPayments.id, id));
  });
}

export async function saveSettings(form: FormData): Promise<void> {
  await guard(form, "Meta guardada", async () => {
    const values = {
      id: 1,
      netTargetWeekly: integer(form, "netTargetWeekly", "Meta neta semanal", {
        min: 1,
      }),
      updatedAt: new Date(),
    };
    await getDb()
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({ target: settings.id, set: values });
  });
}
