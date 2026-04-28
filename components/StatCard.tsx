/**
 * StatCard — simple metric card for the Dashboard.
 * Shows a label, a large number, and an optional icon.
 */

type Props = {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  colorClass?: string; // Tailwind text color class
};

export function StatCard({ label, value, icon, colorClass = "text-gray-900" }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className={`mt-2 text-3xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
