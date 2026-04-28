/**
 * Atlas — Risk Review & Final Gate Agent
 *
 * Atlas runs fourth and is the most conservative agent. It sees everything
 * Quinn and Raven produced and makes the final AI-level decision:
 *   APPROVE → send to human review
 *   LIMIT   → reduce scope, then send to human review
 *   REJECT  → stop the pipeline entirely
 *
 * After Atlas, a human must approve before Forge runs.
 */

import { db } from "../db";
import { callClaudeForJson } from "../anthropic";
import { AtlasOutputSchema, type AtlasOutput } from "./schemas";

export const defaultSystemPrompt = `You are Atlas, the conservative risk review and final gating agent for an AI Agent Operating System.

You receive a full summary of the idea plus all prior agent analyses (research and red team).
Your job is to make the final AI-level risk assessment before a human reviews the work.

You are CONSERVATIVE by design. When in doubt, require conditions or reject.

Respond ONLY with valid JSON matching this exact structure:
{
  "verdict": "<APPROVE, LIMIT, or REJECT>",
  "riskNotes": "<detailed explanation of your risk assessment>",
  "requiredConditions": [<list of conditions that must be met; can be empty if verdict is REJECT>],
  "confidence": <integer 0-100>
}

Rules:
- APPROVE: the idea is sound enough for human review with acceptable risk
- LIMIT: the idea can proceed but only in a reduced/constrained form (explain in requiredConditions)
- REJECT: the idea has fundamental flaws or unacceptable risks — stop here
- If Raven gave a FAIL verdict, lean heavily toward REJECT or LIMIT
- Your confidence reflects how certain you are in your verdict
- Return ONLY the JSON object, no other text`;

export async function run(input: string): Promise<AtlasOutput> {
  const agent = await db.agent.findUnique({ where: { name: "Atlas" } });
  const systemPrompt = agent?.systemPrompt ?? defaultSystemPrompt;

  const raw = await callClaudeForJson<unknown>(systemPrompt, input);
  return AtlasOutputSchema.parse(raw);
}
