/**
 * Zod schemas for each agent's output.
 *
 * Zod lets us both validate the shape of the JSON AND get TypeScript types
 * for free — one source of truth for "what does this agent return."
 */

import { z } from "zod";

// ── Maestro ──────────────────────────────────────────────────────────────────
export const MaestroOutputSchema = z.object({
  clarityScore: z.number().min(0).max(100),
  missingInfo: z.array(z.string()),
  routeTo: z.enum(["PROCEED", "CLARIFY"]),
  summary: z.string(),
});
export type MaestroOutput = z.infer<typeof MaestroOutputSchema>;

// ── Quinn ─────────────────────────────────────────────────────────────────────
export const QuinnOutputSchema = z.object({
  hypothesis: z.string(),
  edge: z.string(),
  dataNeeded: z.array(z.string()),
  expectedFailureModes: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  counterargument: z.string(),
});
export type QuinnOutput = z.infer<typeof QuinnOutputSchema>;

// ── Raven ─────────────────────────────────────────────────────────────────────
export const RavenOutputSchema = z.object({
  failureHypotheses: z.array(z.string()).min(3),
  hiddenAssumptions: z.array(z.string()),
  regimeSensitivities: z.array(z.string()),
  verdict: z.enum(["PASS", "FAIL", "CONDITIONAL"]),
  conditions: z.array(z.string()),
});
export type RavenOutput = z.infer<typeof RavenOutputSchema>;

// ── Atlas ─────────────────────────────────────────────────────────────────────
export const AtlasOutputSchema = z.object({
  verdict: z.enum(["APPROVE", "LIMIT", "REJECT"]),
  riskNotes: z.string(),
  requiredConditions: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});
export type AtlasOutput = z.infer<typeof AtlasOutputSchema>;

// ── Forge ─────────────────────────────────────────────────────────────────────
export const ForgeOutputSchema = z.object({
  buildSpecSummary: z.string(),
  modules: z.array(z.string()),
  testPlan: z.array(z.string()),
  claudeCodePrompt: z.string(),
});
export type ForgeOutput = z.infer<typeof ForgeOutputSchema>;
