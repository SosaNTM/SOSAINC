import { useState } from "react";
import { MOCK_PROFILE_TASKS, type ProfileTask } from "@/lib/profileData";
import { getUserById } from "@/lib/authContext";
import { format } from "date-fns";

const priorityConfig = {
  high: { color: "#ef4444", label: "High", emoji: "🔴" },
  medium: { color: "#f59e0b", label: "Med", emoji: "🟡" },
  low: { color: "#22c55e", label: "Low", emoji: "🟢" },
};

const statusOptions = ["todo", "in_progress", "done"] as const;
const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

function TaskCard({ task }: { task: ProfileTask }) {
  const [status, setStatus] = useState(task.status);
  const p = priorityConfig[task.priority];
  const other = task.assigneeId !== task.creatorId
    ? getUserById(task.creatorId)?.displayName || "Unknown"
    : getUserById(task.assigneeId)?.displayName || "Unknown";

  return (
    <div
      style={{
        background: "var(--glass-bg)",
        border: "0.5px solid var(--glass-border)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ fontSize: 12 }}>{p.emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginLeft: 4 }}>{task.title}</span>
      </div>
      <div className="flex items-center gap-3" style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
        <span>📅 {format(task.dueDate, "MMM dd")}</span>
        <span>•</span>
        <span>From: {other}</span>
      </div>
      <div className="mt-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="glass-input"
          style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6 }}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ProfileTasksTab({ userId }: { userId: string }) {
  const [filter, setFilter] = useState<string>("all");

  const assignedToMe = MOCK_PROFILE_TASKS.filter((t) => t.assigneeId === userId);
  const createdByMe = MOCK_PROFILE_TASKS.filter((t) => t.creatorId === userId && t.assigneeId !== userId);

  const filterTasks = (tasks: ProfileTask[]) => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          Assigned to me ({assignedToMe.length})
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="glass-input"
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, width: "auto" }}
        >
          <option value="all">All</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div className="flex flex-col gap-3">
        {filterTasks(assignedToMe).map((t) => <TaskCard key={t.id} task={t} />)}
        {filterTasks(assignedToMe).length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-quaternary)", textAlign: "center", padding: 20 }}>No tasks</p>
        )}
      </div>

      {createdByMe.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 8 }}>
            Created by me ({createdByMe.length})
          </h3>
          <div className="flex flex-col gap-3">
            {filterTasks(createdByMe).map((t) => <TaskCard key={t.id} task={t} />)}
          </div>
        </>
      )}
    </div>
  );
}
