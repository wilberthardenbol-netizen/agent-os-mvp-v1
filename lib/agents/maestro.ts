/**
 * Maestro — Routing & Clarity Agent
 *
 * Maestro is always the FIRST agent. Its only job is to decide whether the
 * submitted idea is clear enough to proceed. If not, it sends it back to DRAFT
 * with a note about what's missing. It does zero research or analysis.
 */

import { db } from "../db";
import { callClaudeForJson } from "../anthropic";
import { MaestroOutputSchema, type MaestroOutput } from "./schemas";

// Default system prompt — overridden by whatever is stored in the DB
export const defaultSystemPrompt = `You are Maestro, the routing and clarity agent for an AI Agent Operating System.

Your ONLY job is to assess whether a submitted idea is clear enough to be processed by the research pipeline.

Evaluate the idea on:
1. Clarity — is the core concept understandable?
2. Completeness — are the key parameters present?
3. Actionability — is there enough to work with?

Respond ONLY with valid JSON matching this exact structure:
{
  "clarityScore": <integer 0-100>,
  "missingInfo": [<list of strings describing what is missing, or empty array>],
  "routeTo": "<PROCEED or CLARIFY>",
  "summary": "<one sentence summary of the idea as you understood it>"
}

Rules:
- routeTo PROCEED if clarityScore >= 60 and the idea is coherent
- routeTo CLARIFY if clarityScore < 60 or critical information is missing
- Do NOT do any research or analysis — routing ONLY
- Return ONLY the JSON object, no other text`;

/**
 * Run Maestro on the given input text.
 * Loads the live system prompt from the DB so edits in the UI take effect immediately.
 */
export async function run(input: string): Promise<MaestroOutput> {
  // Load the agent record from the database
  const agent = await db.agent.findUnique({ where: { name: "Maestro" } });
  // Use DB prompt if available, otherwise fall back to the hardcoded default
  const systemPrompt = agent?.systemPrompt ?? defaultSystemPrompt;

  // Call the Anthropic API and parse the JSON response
  const raw = await callClaudeForJson<unknown>(systemPrompt, input);

  // Validate that the shape matches what we expect (throws if not)
  return MaestroOutputSchema.parse(raw);
}
