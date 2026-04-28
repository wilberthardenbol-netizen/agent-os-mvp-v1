/**
 * POST /api/auth/login
 * Body: { password: string }
 *
 * Compares the submitted password against APP_PASSWORD env var.
 * On match: generates a random session token, stores it in the DB,
 * and sets an httpOnly cookie.
 * On mismatch: returns 401.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken, SESSION_COOKIE } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { password } = body as { password?: string };

  const correctPassword = process.env.APP_PASSWORD;
  if (!correctPassword) {
    return NextResponse.json(
      { error: "APP_PASSWORD is not set in your .env file." },
      { status: 500 }
    );
  }

  if (!password || password !== correctPassword) {
    await logAudit({
      actorType: "HUMAN",
      actorName: "Unknown",
      action: "LOGIN_FAILED",
      details: "Incorrect password attempt.",
    });
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  // Generate a new session token and store it (replaces any previous token)
  const token = generateToken();
  await db.setting.upsert({
    where: { key: "session_token" },
    update: { value: token },
    create: { key: "session_token", value: token },
  });

  await logAudit({
    actorType: "HUMAN",
    actorName: "User",
    action: "LOGIN_SUCCESS",
    details: "User logged in successfully.",
  });

  // Build the response and attach the cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,   // Not accessible via JavaScript (XSS protection)
    sameSite: "lax",  // Sent on same-site navigations
    path: "/",
    // No maxAge — cookie expires when the browser tab closes
  });

  return response;
}
