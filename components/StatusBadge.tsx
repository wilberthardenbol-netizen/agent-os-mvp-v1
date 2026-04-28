/**
 * StatusBadge — colored pill that shows a task's current status.
 * Color mapping:
 *   gray   → DRAFT
 *   blue   → in-progress (ROUTING, RESEARCHING, RED_TEAMING, RISK_REVIEW, BUILDING_PROMPT)
 *   amber  → AWAITING_HUMAN
 *   green  → DONE
 *   red    → REJECTED
 */

type Props = { status: string };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ROUTING: "bg-blue-100 text-blue-700",
  RESEARCHING: "bg-blue-100 text-blue-700",
  RED_TEAMING: "bg-blue-100 text-blue-700",
  RISK_REVIEW: "bg-blue-100 text-blue-700",
  BUILDING_PROMPT: "bg-blue-100 text-blue-700",
  AWAITING_HUMAN: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ROUTING: "Routing",
  RESEARCHING: "Researching",
  RED_TEAMING: "Red Teaming",
  RISK_REVIEW: "Risk Review",
  BUILDING_PROMPT: "Building Prompt",
  AWAITING_HUMAN: "Awaiting Approval",
  DONE: "Done",
  REJECTED: "Rejected",
};

export function StatusBadge({ status }: Props) {
  const styles = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}
