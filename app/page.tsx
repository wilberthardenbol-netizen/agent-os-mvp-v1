/**
 * Dashboard — shows stats and a list of recent tasks.
 * This is a React Server Component (no "use client") so the data
 * is fetched on the server and rendered as HTML — fast and simple.
 */

import { db } from "@/lib/db";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { NewIdeaButtonWrapper } from "./NewIdeaButtonWrapper";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Activity, CheckCircle, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic"; // Always fetch fresh data on load

export default async function DashboardPage() {
  // Fetch all the numbers we need for the stats cards
  const [totalTasks, doneTasks, awaitingTasks, rejectedTasks, recentTasks] =
    await Promise.all([
      db.task.count(),
      db.task.count({ where: { status: "DONE" } }),
      db.task.count({ where: { status: "AWAITING_HUMAN" } }),
      db.task.count({ where: { status: "REJECTED" } }),
      db.task.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your AI Agent Operating System
            </p>
          </div>
          <NewIdeaButtonWrapper />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <StatCard
            label="Total Tasks"
            value={totalTasks}
            icon={<Activity className="h-4 w-4" />}
          />
          <StatCard
            label="Completed"
            value={doneTasks}
            icon={<CheckCircle className="h-4 w-4" />}
            colorClass="text-green-600"
          />
          <StatCard
            label="Awaiting Approval"
            value={awaitingTasks}
            icon={<Clock className="h-4 w-4" />}
            colorClass="text-amber-600"
          />
          <StatCard
            label="Rejected"
            value={rejectedTasks}
            icon={<XCircle className="h-4 w-4" />}
            colorClass="text-red-600"
          />
        </div>

        {/* Recent tasks */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Recent Tasks</h2>
          </div>

          {recentTasks.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No tasks yet. Click &quot;New Idea&quot; to get started.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Updated{" "}
                        {formatDistanceToNow(new Date(task.updatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <StatusBadge status={task.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
