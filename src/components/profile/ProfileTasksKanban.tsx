import { useState } from "react";
import { LayoutGrid, List, GripVertical, MessageSquare, Calendar } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";

export interface ProfileTask {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "urgent" | "high" | "medium" | "low";
  dueDate: Date;
  assignedBy: string;
  tags: string[];
  comments: number;
}

const STATUS_COLUMNS = [
  { key: "todo" as const, label: "To Do", color: "#6b7280" },
  { key: "in_progress" as const, label: "In Progress", color: "#3b82f6" },
  { key: "done" as const, label: "Done", color: "#10b981" },
];

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: "rgba(239,68,68,0.15)", text: "#f87171", label: "Urgent" },
  high: { bg: "rgba(249,115,22,0.15)", text: "#fb923c", label: "High" },
  medium: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Medium" },
  low: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af", label: "Low" },
};

interface ProfileTasksKanbanProps {
  tasks: ProfileTask[];
  canManage: boolean;
}

export function ProfileTasksKanban({ tasks, canManage }: ProfileTasksKanbanProps) {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [taskList, setTaskList] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDrop = (status: ProfileTask["status"]) => {
    if (!dragId) return;
    setTaskList((prev) =>
      prev.map((t) => (t.id === dragId ? { ...t, status } : t))
    );
    setDragId(null);
    toast.success(`Task moved to ${STATUS_COLUMNS.find((c) => c.key === status)?.label}`);
  };

  return (
    <div
      className="rounded-[var(--radius-xl)] p-5"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Assigned Tasks</h2>
        <div className="glass-segment">
          {([
            { key: "kanban" as const, icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { key: "list" as const, icon: <List className="w-3.5 h-3.5" /> },
          ]).map((opt) => (
            <button type="button"
              key={opt.key}
              onClick={() => setView(opt.key)}
              className="glass-segment-item"
              data-active={view === opt.key}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-3 gap-3">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = taskList.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="rounded-[var(--radius-lg)] p-3 min-h-[180px]"
                style={{ background: "var(--glass-bg-subtle)", border: "1px solid var(--glass-border-subtle)" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>{col.label}</span>
                  <span
                    className="ml-auto flex items-center justify-center text-[11px] font-bold"
                    style={{ width: 22, height: 22, borderRadius: 6, background: "var(--glass-bg-active)", color: "var(--text-secondary)" }}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onDragStart={() => setDragId(task.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1">
          {taskList.map((task) => (
            <TaskListRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onDragStart }: { task: ProfileTask; onDragStart: () => void }) {
  const isOverdue = isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== "done";
  const priority = PRIORITY_STYLES[task.priority];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-[var(--radius-md)] p-3 cursor-grab active:cursor-grabbing transition-all group hover:-translate-y-0.5"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-foreground leading-tight">{task.title}</p>
        <GripVertical className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: priority.bg, color: priority.text }}
        >
          {priority.label}
        </span>
        <span
          className="text-[10px] flex items-center gap-0.5"
          style={{ color: isOverdue ? "#f87171" : "#9ca3af" }}
        >
          <Calendar className="w-2.5 h-2.5" />
          {format(task.dueDate, "MMM d")}
        </span>
        {task.comments > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MessageSquare className="w-2.5 h-2.5" /> {task.comments}
          </span>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex gap-1 mt-2">
          {task.tags.map((tag) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded text-muted-foreground" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskListRow({ task }: { task: ProfileTask }) {
  const isOverdue = isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== "done";
  const priority = PRIORITY_STYLES[task.priority];
  const statusCol = STATUS_COLUMNS.find((c) => c.key === task.status);

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/5 transition-colors"
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusCol?.color }} />
      <p className="text-sm font-medium text-foreground flex-1 truncate">{task.title}</p>
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
        style={{ backgroundColor: priority.bg, color: priority.text }}
      >
        {priority.label}
      </span>
      <span
        className="text-[11px] shrink-0"
        style={{ color: isOverdue ? "#f87171" : "#9ca3af" }}
      >
        {format(task.dueDate, "MMM d")}
      </span>
      <span className="text-[11px] text-muted-foreground shrink-0">{task.assignedBy}</span>
    </div>
  );
}
