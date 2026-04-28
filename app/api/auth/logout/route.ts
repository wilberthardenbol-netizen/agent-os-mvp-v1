/**
 * POST /api/auth/logout
 * Clears the session cookie and removes the token from the DB.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  // Remove the stored token so old cookies can't be replayed
  await db.setting
    .delete({ where: { key: "session_token" } })
    .catch(() => {}); // Ignore if it doesn't exist

  await logAudit({
    actorType: "HUMAN",
    actorName: "User",
    action: "LOGOUT",
    details: "User logged out.",
  });

  const response = NextResponse.json({ ok: true });
  // Clear the cookie by setting it with maxAge=0
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
