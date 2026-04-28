/**
 * Auth helpers — single-password authentication stored as a cookie.
 * No external auth library; just a random token compared against the DB.
 */

import { db } from "./db";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "agent-os-session";

/**
 * Generate a random 64-character hex token.
 * Used as the session identifier stored in both the cookie and the DB.
 */
export function generateToken(): string {
  // crypto.randomBytes is available in Node.js without any import
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate a session token against what's stored in the Settings table.
 * Returns true if valid, false otherwise.
 */
export async function validateSession(token: string): Promise<boolean> {
  if (!token) return false;
  const setting = await db.setting.findUnique({
    where: { key: "session_token" },
  });
  return setting?.value === token;
}

/**
 * Get the session token from the current request's cookies.
 * Returns null if no cookie is present.
 */
export function getSessionToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Check if the current request has a valid session.
 * Use this at the top of API route handlers.
 */
export async function requireAuth(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return false;
  return validateSession(token);
}
