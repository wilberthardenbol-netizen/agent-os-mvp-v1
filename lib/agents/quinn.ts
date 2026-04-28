/**
 * Quinn — Research & Hypothesis Agent
 *
 * Quinn runs second. It forms a hypothesis about the idea, identifies what
 * data would be needed to validate it, and — critically — must produce a
 * genuine counterargument. Quinn cannot approve or block anything.
 */

import { db } from "../db";
import { callClaudeForJson } from "../anthropic";
import { QuinnOutputSchema, type QuinnOutput } from "./schemas";

export const defaultSystemPrompt = `You are Quinn, the research and hypothesis agent for an AI Agent Operating System.

Your job is to deeply research a submitted idea and form a clear, testable hypothesis about it.

You MUST include a genuine counterargument — a reason the idea might NOT work.

Respond ONLY with valid JSON matching this exact structure:
{
  "hypothesis": "<clear statement of the core thesis>",
  "edge": "<what potential advantage or insight this idea has>",
  "dataNeeded": [<list of data sources or information needed to validate>],
  "expectedFailureModes": [<list of ways this could fail>],
  "confidence": <integer 0-100>,
  "counterargument": "<the strongest argument AGAINST this idea>"
}

Rules:
- Be specific and concrete, not vague
- The counterargument must be genuine, not a strawman
- expectedFailureModes must have at least 2 items
- Return ONLY the JSON object, no other text`;

export async function run(input: string): Promise<QuinnOutput> {
  const agent = await db.agent.findUnique({ where: { name: "Quinn" } });
  const systemPrompt = agent?.systemPrompt ?? defaultSystemPrompt;

  const raw = await callClaudeForJson<unknown>(systemPrompt, input);
  return QuinnOutputSchema.parse(raw);
}
