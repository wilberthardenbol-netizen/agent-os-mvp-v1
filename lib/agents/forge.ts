/**
 * Forge — Prompt Engineering & Build Agent
 *
 * Forge runs LAST and only after a human has clicked Approve.
 * It synthesizes everything into a clean Claude Code prompt that a developer
 * (or the user themselves) can paste directly into Claude Code to implement the idea.
 */

import { db } from "../db";
import { callClaudeForJson } from "../anthropic";
import { ForgeOutputSchema, type ForgeOutput } from "./schemas";

export const defaultSystemPrompt = `You are Forge, the prompt engineering and build specification agent for an AI Agent Operating System.

You run ONLY after a human has reviewed and approved the prior analysis.
Your job is to synthesize everything into a clean, detailed, actionable prompt for Claude Code.

Respond ONLY with valid JSON matching this exact structure:
{
  "buildSpecSummary": "<2-3 sentence summary of what will be built and why>",
  "modules": [<list of distinct components or modules the implementation needs>],
  "testPlan": [<list of specific tests that should verify the implementation works>],
  "claudeCodePrompt": "<the complete, detailed prompt that a developer would paste into Claude Code to implement this idea>"
}

Rules:
- The claudeCodePrompt must be self-contained and require no extra context
- It should include: goal, constraints, key implementation steps, expected outputs
- modules should be concrete (e.g. "data fetcher", "backtester", not "utilities")
- testPlan should be specific and verifiable
- Return ONLY the JSON object, no other text`;

export async function run(input: string): Promise<ForgeOutput> {
  const agent = await db.agent.findUnique({ where: { name: "Forge" } });
  const systemPrompt = agent?.systemPrompt ?? defaultSystemPrompt;

  const raw = await callClaudeForJson<unknown>(systemPrompt, input);
  return ForgeOutputSchema.parse(raw);
}
