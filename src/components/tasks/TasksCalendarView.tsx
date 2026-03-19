import { useState, useCallback, useRef, useEffect } from "react";
import { type Task } from "@/lib/tasksStore";
import { getUserById } from "@/lib/authContext";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, isWeekend, isWithinInterval
} from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

// ── Status colors ──
const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
  backlog: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  todo: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af" },
  in_progress: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  done: { bg: "rgba(16,185,129,0.12)", text: "#34d399" },
};

const PRIORITY_BORDER: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
};

const LEGEND = [
  { label: "To Do", color: "#9ca3af" },
  { label: "In Progress", color: "#60a5fa" },
  { label: "Done", color: "#34d399" },
  { label: "Urgent", color: "#ef4444" },
];

interface Props {
  tasks: Task[];
  onSelectTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onCreateTask: (data: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "attachments" | "completedAt">) => void;
  currentUserId: string;
}

// ── Overflow Popover ──
function DayPopover({ day, tasks, onSelect, onClose }: { day: Date; tasks: Task[]; onSelect: (id: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-[60] animate-scale-in"
      style={{
        top: "100%", left: 0, marginTop: 4,
        width: 240, backgroundColor: "#0d1117",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12, padding: 12,
        boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>{format(day, "MMMM d")}</span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 0 }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map((t) => {
          const sc = STATUS_CHIP[t.status] || STATUS_CHIP.todo;
          const border = PRIORITY_BORDER[t.priority];
          return (
            <div
              key={t.id}
              onClick={(e) => { e.stopPropagation(); onSelect(t.id); }}
              className="cursor-pointer transition-all"
              style={{
                padding: "4px 8px", borderRadius: 6,
                background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 500,
                borderLeft: border ? `3px solid ${border}` : undefined,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
            >
              {t.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Task Chip ──
function TaskChip({ task, onSelect, onDragStart }: { task: Task; onSelect: (id: string) => void; onDragStart: (id: string) => void }) {
  const sc = STATUS_CHIP[task.status] || STATUS_CHIP.todo;
  const border = PRIORITY_BORDER[task.priority];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(task.id); }}
      className="cursor-pointer transition-all"
      style={{
        padding: "3px 8px", borderRadius: 6,
        background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 500,
        borderLeft: border ? `3px solid ${border}` : undefined,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        transition: "transform 0.15s, box-shadow 0.15s, filter 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; e.currentTarget.style.filter = "brightness(1.15)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.filter = "none"; }}
    >
      {task.title}
    </div>
  );
}

// ── Main Calendar ──
export function TasksCalendarView({ tasks, onSelectTask, onUpdateTask, onCreateTask, currentUserId }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 2, 1)); // March 2025
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [popoverDay, setPopoverDay] = useState<string | null>(null);
  const [quickCreateDay, setQuickCreateDay] = useState<string | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = useState("");
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (quickCreateDay && quickInputRef.current) quickInputRef.current.focus(); }, [quickCreateDay]);

  // Grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Navigate
  const goNext = () => { setSlideDir("left"); setCurrentMonth((m) => addMonths(m, 1)); };
  const goPrev = () => { setSlideDir("right"); setCurrentMonth((m) => subMonths(m, 1)); };
  const goToday = () => { setSlideDir(null); setCurrentMonth(new Date()); };

  // Tasks for a day
  const tasksForDay = useCallback((day: Date) => {
    return tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, day));
  }, [tasks]);

  // Drop handler
  const handleDrop = (day: Date) => {
    if (!dragId) return;
    onUpdateTask(dragId, { dueDate: day });
    toast.success(`Task moved to ${format(day, "MMM d")}`);
    setDragId(null);
    setDragOverDay(null);
  };

  // Quick create
  const handleQuickCreate = () => {
    if (!quickCreateTitle.trim() || !quickCreateDay) return;
    onCreateTask({
      title: quickCreateTitle.trim(),
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: null,
      creatorId: currentUserId,
      watcherIds: [],
      labels: [],
      dueDate: new Date(quickCreateDay),
    });
    setQuickCreateTitle("");
    setQuickCreateDay(null);
  };

  const MAX_CHIPS = 3;

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={goPrev} className="glass-btn" style={{ padding: "6px 8px", borderRadius: 8 }}>
            <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", minWidth: 160, textAlign: "center" }}>
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button type="button" onClick={goNext} className="glass-btn" style={{ padding: "6px 8px", borderRadius: 8 }}>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </button>
          <button type="button" onClick={goToday} className="glass-btn" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, color: "var(--text-secondary)" }}>
            Today
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "0.5px solid var(--glass-border)" }}>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7">
          {weekDays.map((d, i) => (
            <div
              key={d}
              style={{
                padding: "8px 0", textAlign: "center",
                fontSize: 11, fontWeight: 600, color: "var(--text-quaternary)",
                textTransform: "uppercase", letterSpacing: "0.5px",
                background: "var(--glass-bg)",
                borderBottom: "0.5px solid var(--glass-border)",
                borderRight: i < 6 ? "0.5px solid rgba(255,255,255,0.04)" : undefined,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const weekend = isWeekend(day);
            const dayTasks = tasksForDay(day);
            const isDragOver = dragOverDay === dayKey;
            const visibleTasks = dayTasks.slice(0, MAX_CHIPS);
            const overflowCount = dayTasks.length - MAX_CHIPS;
            const showPopover = popoverDay === dayKey;
            const showQuickCreate = quickCreateDay === dayKey;

            return (
              <div
                key={dayKey}
                className="relative transition-colors"
                style={{
                  minHeight: 110, padding: "6px 8px",
                  borderRight: (idx % 7) < 6 ? "0.5px solid rgba(255,255,255,0.04)" : undefined,
                  borderBottom: idx < days.length - 7 ? "0.5px solid rgba(255,255,255,0.04)" : undefined,
                  opacity: inMonth ? 1 : 0.3,
                  background: isDragOver
                    ? "rgba(var(--accent-rgb, 110,231,183), 0.08)"
                    : today
                      ? "rgba(var(--accent-rgb, 110,231,183), 0.05)"
                      : weekend
                        ? "rgba(255,255,255,0.01)"
                        : "transparent",
                  outline: isDragOver ? "2px dashed var(--accent-color)" : "none",
                  outlineOffset: -2,
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverDay(dayKey); }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(day); }}
                onDoubleClick={() => {
                  if (inMonth) {
                    setQuickCreateDay(dayKey);
                    setQuickCreateTitle("");
                  }
                }}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    style={{
                      fontSize: 13, fontWeight: today ? 700 : 500,
                      color: today ? "white" : inMonth ? "var(--text-secondary)" : "var(--text-quaternary)",
                      ...(today ? {
                        background: "var(--accent-color)", borderRadius: "50%",
                        width: 26, height: 26, display: "flex", alignItems: "center",
                        justifyContent: "center", lineHeight: 1,
                      } : {}),
                    }}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Task Chips */}
                <div className="flex flex-col gap-1">
                  {visibleTasks.map((t) => (
                    <TaskChip key={t.id} task={t} onSelect={onSelectTask} onDragStart={setDragId} />
                  ))}
                  {overflowCount > 0 && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setPopoverDay(showPopover ? null : dayKey); }}
                      style={{
                        fontSize: 10, fontWeight: 600, color: "var(--accent-color)",
                        background: "none", border: "none", cursor: "pointer",
                        padding: "2px 4px", textAlign: "left",
                      }}
                    >
                      +{overflowCount} more
                    </button>
                  )}
                </div>

                {/* Quick Create Input */}
                {showQuickCreate && (
                  <div style={{ marginTop: 4 }}>
                    <input
                      ref={quickInputRef}
                      value={quickCreateTitle}
                      onChange={(e) => setQuickCreateTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickCreate();
                        if (e.key === "Escape") setQuickCreateDay(null);
                      }}
                      onBlur={() => { if (!quickCreateTitle.trim()) setQuickCreateDay(null); }}
                      placeholder="New task..."
                      style={{
                        width: "100%", fontSize: 11, padding: "4px 6px",
                        borderRadius: 6, border: "1px solid var(--accent-color)",
                        background: "rgba(0,0,0,0.3)", color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {/* Popover */}
                {showPopover && (
                  <DayPopover
                    day={day}
                    tasks={dayTasks}
                    onSelect={onSelectTask}
                    onClose={() => setPopoverDay(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 py-2">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
