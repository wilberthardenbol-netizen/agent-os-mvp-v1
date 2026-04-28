/**
 * GET /api/audit
 * Returns all audit log entries, newest first.
 * Optional query param: ?search=keyword (searches action and details fields)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;

  const logs = await db.auditLog.findMany({
    where: search
      ? {
          OR: [
            { action: { contains: search } },
            { details: { contains: search } },
            { actorName: { contains: search } },
          ],
        }
      : {},
    orderBy: { timestamp: "desc" },
    take: 500, // Cap at 500 rows to keep responses fast
  });

  return NextResponse.json(logs);
}
