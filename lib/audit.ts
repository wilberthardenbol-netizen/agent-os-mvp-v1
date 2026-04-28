/**
 * Audit log helpers — every significant action in the system writes here.
 * Think of this as your flight recorder. It's append-only; nothing deletes rows.
 */

import { db } from "./db";

type ActorType = "AGENT" | "HUMAN" | "SYSTEM";

/**
 * Write one entry to the AuditLog table.
 * Call this from the pipeline, API routes, and anywhere else something important happens.
 */
export async function logAudit({
  actorType,
  actorName,
  action,
  taskId,
  details,
}: {
  actorType: ActorType;
  actorName: string;
  action: string;
  taskId?: string;
  details: string;
}) {
  await db.auditLog.create({
    data: {
      actorType,
      actorName,
      action,
      taskId: taskId ?? null,
      details,
    },
  });
}
