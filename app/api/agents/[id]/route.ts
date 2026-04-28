/**
 * PATCH /api/agents/[id]
 * Body: { systemPrompt?: string, permissionLevel?: string }
 *
 * Lets the user edit an agent's system prompt or permission level from the UI.
 * Logs the change to the audit log.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { systemPrompt, permissionLevel } = body as {
    systemPrompt?: string;
    permissionLevel?: string;
  };

  const agent = await db.agent.findUnique({ where: { id: params.id } });
  if (!agent) {
    return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  }

  const updates: { systemPrompt?: string; permissionLevel?: string } = {};

  if (systemPrompt !== undefined) {
    updates.systemPrompt = systemPrompt;
    await logAudit({
      actorType: "HUMAN",
      actorName: "User",
      action: "AGENT_PROMPT_EDITED",
      details: `Edited system prompt of agent "${agent.name}".`,
    });
  }

  if (permissionLevel !== undefined) {
    updates.permissionLevel = permissionLevel;
    await logAudit({
      actorType: "HUMAN",
      actorName: "User",
      action: "AGENT_PERMISSION_CHANGED",
      details: `Changed permission level of "${agent.name}" from ${agent.permissionLevel} to ${permissionLevel}.`,
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await db.agent.update({
    where: { id: params.id },
    data: updates,
  });

  return NextResponse.json(updated);
}
