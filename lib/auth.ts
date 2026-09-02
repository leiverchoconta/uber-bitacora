/**
 * Single-driver access gate: one shared password, one signed cookie.
 *
 * Deliberately not a user system — there is one user. What it does not skip:
 * the cookie is HMAC-signed so it cannot be forged, it carries an issue time
 * so a leaked cookie expires, and both comparisons are constant-time.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "bitacora_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", requireEnv("AUTH_SECRET"))
    .update(payload)
    .digest("hex");
}

/** Constant-time compare that tolerates differing lengths. */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function checkPassword(candidate: string): boolean {
  return equals(candidate, requireEnv("APP_PASSWORD"));
}

function createToken(): string {
  const issuedAt = String(Math.floor(Date.now() / 1000));
  return `${issuedAt}.${sign(issuedAt)}`;
}

function isValidToken(token: string): boolean {
  const [issuedAt, mac] = token.split(".");
  if (!issuedAt || !mac || !equals(mac, sign(issuedAt))) return false;
  const age = Date.now() / 1000 - Number(issuedAt);
  return age >= 0 && age < MAX_AGE_SECONDS;
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return Boolean(token) && isValidToken(token as string);
}

/**
 * Guard for every page and every Server Action. Actions are reachable by
 * direct POST, so the check belongs here rather than in a proxy.
 */
export async function requireSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}
