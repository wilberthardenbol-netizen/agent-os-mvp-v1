/**
 * Permission level definitions.
 *
 * These are informational — they describe what each level means in plain
 * English and are displayed in the UI. The pipeline enforces them structurally
 * (e.g., Forge only runs after human approval) rather than through runtime
 * permission checks.
 */

export const PERMISSION_LEVELS = {
  GENERATE: {
    label: "Generate",
    description: "Can produce output but cannot make binding decisions.",
    color: "blue",
  },
  RECOMMEND: {
    label: "Recommend",
    description: "Can recommend a course of action but cannot approve or block.",
    color: "purple",
  },
  BLOCK: {
    label: "Block",
    description:
      "Can block the pipeline from proceeding. Final AI-level gate before human review.",
    color: "red",
  },
} as const;

export type PermissionLevel = keyof typeof PERMISSION_LEVELS;

export function getPermissionInfo(level: string) {
  return (
    PERMISSION_LEVELS[level as PermissionLevel] ?? {
      label: level,
      description: "Unknown permission level.",
      color: "gray",
    }
  );
}
