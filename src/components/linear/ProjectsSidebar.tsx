import { useState } from "react";
import { getUserById } from "@/lib/authContext";
import type { Project, Issue } from "@/lib/linearStore";
import { PROJECT_STATUSES } from "@/lib/linearStore";
import { ChevronDown, ChevronRight, Plus, Inbox, User, Archive, LayoutList, FolderKanban } from "lucide-react";

export type SidebarView = "all" | "my_issues" | "backlog" | string; // string = projectId

interface ProjectsSidebarProps {
  projects: Project[];
  issues: Issue[];
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  onNewProject: () => void;
  currentUserId: string;
}

export function ProjectsSidebar({ projects, issues, currentView, onViewChange, onNewProject, currentUserId }: ProjectsSidebarProps) {
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const myCount = issues.filter(i => i.assigneeId === currentUserId && i.status !== "done" && i.status !== "cancelled").length;
  const backlogCount = issues.filter(i => i.status === "backlog").length;

  const viewItems = [
    { key: "all" as const, label: "All Issues", icon: <LayoutList className="w-3.5 h-3.5" />, count: issues.filter(i => i.parentId === null).length },
    { key: "my_issues" as const, label: "My Issues", icon: <User className="w-3.5 h-3.5" />, count: myCount },
    { key: "backlog" as const, label: "Backlog", icon: <Archive className="w-3.5 h-3.5" />, count: backlogCount },
  ];

  return (
    <div
      className="flex flex-col h-full shrink-0 overflow-y-auto"
      style={{
        width: 220,
        borderRight: "0.5px solid var(--glass-border)",
        background: "var(--glass-bg-subtle)",
        padding: "12px 0",
      }}
    >
      {/* Views */}
      <div className="px-3 mb-4">
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 8px", marginBottom: 4, display: "block" }}>
          Views
        </span>
        {viewItems.map(v => (
          <button type="button"
            key={v.key}
            onClick={() => onViewChange(v.key)}
            className="flex items-center gap-2 w-full text-left transition-colors"
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: currentView === v.key ? "var(--nav-item-active-bg)" : "transparent",
              color: currentView === v.key ? "var(--text-primary)" : "var(--text-tertiary)",
              fontSize: 13,
              fontWeight: currentView === v.key ? 600 : 400,
            }}
          >
            {v.icon}
            <span className="flex-1">{v.label}</span>
            <span style={{ fontSize: 11, color: "var(--text-quaternary)", fontFamily: "monospace" }}>{v.count}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--glass-border)", margin: "0 12px 8px" }} />

      {/* Projects */}
      <div className="px-3">
        <button type="button"
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="flex items-center gap-1 w-full text-left mb-1"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "var(--text-quaternary)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}
        >
          {projectsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Projects
        </button>

        {projectsExpanded && (
          <div className="flex flex-col gap-0.5">
            {projects.map(p => {
              const projectIssues = issues.filter(i => i.projectId === p.id && i.parentId === null);
              const doneCount = projectIssues.filter(i => i.status === "done").length;
              const pct = projectIssues.length > 0 ? Math.round((doneCount / projectIssues.length) * 100) : 0;
              const lead = getUserById(p.leadId);
              const ps = PROJECT_STATUSES.find(s => s.key === p.status);

              return (
                <button type="button"
                  key={p.id}
                  onClick={() => onViewChange(p.id)}
                  className="flex flex-col gap-1 w-full text-left transition-colors"
                  style={{
                    padding: "8px 8px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: currentView === p.id ? "var(--nav-item-active-bg)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span style={{ fontSize: 14 }}>{p.emoji}</span>
                    <span className="flex-1 truncate" style={{
                      fontSize: 13,
                      fontWeight: currentView === p.id ? 600 : 400,
                      color: currentView === p.id ? "var(--text-primary)" : "var(--text-secondary)",
                    }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-quaternary)", fontFamily: "monospace" }}>{projectIssues.length}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 w-full">
                    <div style={{ flex: 1, height: 2, borderRadius: 1, background: "var(--glass-border)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 1, background: p.color, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 9, color: "var(--text-quaternary)" }}>{pct}%</span>
                  </div>
                </button>
              );
            })}

            {/* New Project */}
            <button type="button"
              onClick={onNewProject}
              className="flex items-center gap-2 w-full text-left transition-colors"
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: "var(--text-quaternary)",
                fontSize: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-quaternary)"; e.currentTarget.style.background = "transparent"; }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
