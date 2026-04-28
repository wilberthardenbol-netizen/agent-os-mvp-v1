/**
 * Anthropic API client — thin wrapper that:
 * 1. Creates the client once with your API key
 * 2. Provides a helper to call the model and get back a text string
 * 3. Handles the JSON retry logic (if the model returns bad JSON, we
 *    ask it once more with a reminder to return only valid JSON)
 */

import Anthropic from "@anthropic-ai/sdk";

// The model name comes from your .env file; falls back to a sensible default
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

// Single shared client (API key read from ANTHROPIC_API_KEY env var automatically)
export const anthropic = new Anthropic();

/**
 * Call the model with a system prompt and a user message.
 * Returns the raw text of the assistant's reply.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  // The response content is an array; we want the first text block
  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Anthropic API");
  }
  return block.text;
}

/**
 * Call the model and parse the result as JSON.
 * If the first response isn't valid JSON, retries ONCE with a reminder.
 * Throws after the second failure so the caller can mark the run as failed.
 */
export async function callClaudeForJson<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const rawText = await callClaude(systemPrompt, userMessage);

  // Try to extract JSON — the model sometimes wraps it in ```json ... ```
  const cleaned = extractJson(rawText);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // First attempt failed — remind the model to return ONLY valid JSON
    const reminder =
      "\n\nYour last response was not valid JSON. Return ONLY a valid JSON object " +
      "matching the schema described above. No markdown, no explanation, no code fences.";

    const retryText = await callClaude(systemPrompt, userMessage + reminder);
    const retryCleaned = extractJson(retryText);

    // If it fails again, propagate the error so the pipeline marks the run as failed
    return JSON.parse(retryCleaned) as T;
  }
}

/**
 * Strip markdown code fences if the model wraps JSON in them.
 * e.g.  ```json\n{...}\n```  →  {...}
 */
function extractJson(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // If no fences, return as-is (trimmed)
  return text.trim();
}
