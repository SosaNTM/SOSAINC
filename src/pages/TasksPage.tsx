import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth, ALL_USERS, getUserById } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { STORAGE_TASKS, STORAGE_PROJECTS } from "@/constants/storageKeys";
import {
  getInitialIssues, getInitialProjects, ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_LABELS, ESTIMATE_OPTIONS,
  generateIssueId,
  type Issue, type IssueStatus, type IssuePriority, type Project, type ProjectStatus,
} from "@/lib/linearStore";
import {
  loadTasksFromSupabase, loadProjectsFromSupabase,
  upsertTask, deleteTask, upsertProject,
} from "@/lib/taskSync";
import { addAuditEntry } from "@/lib/adminStore";
import { ProjectsSidebar, type SidebarView } from "@/components/linear/ProjectsSidebar";
import { IssueRow } from "@/components/linear/IssueRow";
import { BoardView } from "@/components/linear/BoardView";
import { IssueDetailPanel } from "@/components/linear/IssueDetailPanel";
import { NewIssueModal } from "@/components/linear/NewIssueModal";
import { NewProjectModal } from "@/components/linear/NewProjectModal";
import { StatusIcon } from "@/components/linear/StatusIcon";
import { Plus, LayoutGrid, List, Filter, ChevronDown, ChevronRight, SlidersHorizontal, Search, CheckSquare } from "lucide-react";

const TasksPage = () => {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";
  const [issues, setIssues] = useState<Issue[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
        }));
      }
    } catch {}
    return getInitialIssues();
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getInitialProjects();
  });
  const [syncReady, setSyncReady] = useState(false);

  // Persist tasks & projects to localStorage on change; broadcast so ProfileTasksCard updates live
  useEffect(() => {
    localStorage.setItem(STORAGE_TASKS, JSON.stringify(issues));
    window.dispatchEvent(new CustomEvent("SOSA INC:tasks-changed"));
  }, [issues]);
  useEffect(() => { localStorage.setItem(STORAGE_PROJECTS, JSON.stringify(projects)); }, [projects]);

  // Load live data from Supabase on mount — replaces static seed
  useEffect(() => {
    Promise.all([loadTasksFromSupabase(portalId), loadProjectsFromSupabase(portalId)]).then(([sbTasks, sbProjects]) => {
      if (sbTasks.length > 0) setIssues(sbTasks);
      if (sbProjects.length > 0) setProjects(sbProjects);
      setSyncReady(true);
    });
  }, [portalId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sidebarView, setSidebarView] = useState<SidebarView>("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [groupBy, setGroupBy] = useState<"status" | "priority" | "assignee" | "project">("status");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueBreadcrumb, setIssueBreadcrumb] = useState<{ id: string; title: string }[]>([]);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [filterLabel, setFilterLabel] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDisplayOpts, setShowDisplayOpts] = useState(false);
  const [display, setDisplay] = useState({ id: true, assignee: true, labels: true, dueDate: true, estimate: true });
  const [inlineStatus, setInlineStatus] = useState<IssueStatus | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Keyboard shortcut: C to create
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLSelectElement)) {
        setShowNewIssue(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Filter issues
  let filtered = issues.filter(i => i.parentId === null); // Only top-level
  if (sidebarView === "my_issues") filtered = filtered.filter(i => i.assigneeId === user?.id);
  else if (sidebarView === "backlog") filtered = filtered.filter(i => i.status === "backlog");
  else if (sidebarView !== "all") filtered = filtered.filter(i => i.projectId === sidebarView);
  if (filterPriority) filtered = filtered.filter(i => i.priority === filterPriority);
  if (filterAssignee) filtered = filtered.filter(i => i.assigneeId === filterAssignee);
  if (filterLabel) filtered = filtered.filter(i => i.labels.includes(filterLabel));
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  }

  const updateIssue = useCallback((id: string, updates: Partial<Issue>) => {
    setIssues(prev => {
      const original = prev.find(i => i.id === id);
      const next = prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date() } : i);
      const updated = next.find(i => i.id === id);
      if (updated && syncReady) upsertTask(updated, user?.id ?? "", portalId);

      // Audit meaningful field changes
      if (original && updated) {
        const uid = user?.id ?? "unknown";
        if (updates.status && updates.status !== original.status) {
          const label = ISSUE_STATUSES.find(s => s.key === updates.status)?.label || updates.status;
          addAuditEntry({ userId: uid, action: `Changed status of "${original.title}" to ${label}`, category: "tasks", details: `Issue ${original.id}`, icon: updates.status === "done" ? "✅" : "🔄" });
        }
        if (updates.priority && updates.priority !== original.priority) {
          addAuditEntry({ userId: uid, action: `Changed priority of "${original.title}" to ${updates.priority}`, category: "tasks", details: `Issue ${original.id}`, icon: "🚩" });
        }
        if ("assigneeId" in updates && updates.assigneeId !== original.assigneeId) {
          const assigneeName = ALL_USERS.find(u => u.id === updates.assigneeId)?.displayName || "Unassigned";
          addAuditEntry({ userId: uid, action: `Assigned "${original.title}" to ${assigneeName}`, category: "tasks", details: `Issue ${original.id}`, icon: "👤" });
        }
        if (updates.title && updates.title !== original.title) {
          addAuditEntry({ userId: uid, action: `Renamed issue to "${updates.title}"`, category: "tasks", details: `Was: "${original.title}" — ${original.id}`, icon: "✏️" });
        }
        if (updates.dueDate !== undefined && String(updates.dueDate) !== String(original.dueDate)) {
          const dateStr = updates.dueDate ? new Date(updates.dueDate).toLocaleDateString() : "removed";
          addAuditEntry({ userId: uid, action: `Set due date of "${original.title}" to ${dateStr}`, category: "tasks", details: `Issue ${original.id}`, icon: "📅" });
        }
        if (updates.labels && JSON.stringify(updates.labels) !== JSON.stringify(original.labels)) {
          addAuditEntry({ userId: uid, action: `Updated labels on "${original.title}"`, category: "tasks", details: `Labels: ${updates.labels.join(", ") || "none"}`, icon: "🏷️" });
        }
      }
      return next;
    });
  }, [syncReady, user, issues]);

  const deleteIssue = useCallback((id: string) => {
    setIssues(prev => {
      const issue = prev.find(i => i.id === id);
      let updated = prev;
      if (issue?.parentId) {
        updated = updated.map(i => i.id === issue.parentId ? { ...i, subIssueIds: i.subIssueIds.filter(s => s !== id) } : i);
      }
      const toRemove = new Set<string>();
      const collect = (iid: string) => { toRemove.add(iid); updated.filter(i => i.parentId === iid).forEach(i => collect(i.id)); };
      collect(id);
      if (syncReady) toRemove.forEach(rid => deleteTask(rid));
      if (issue) addAuditEntry({ userId: user?.id ?? "unknown", action: `Deleted issue "${issue.title}"`, category: "tasks", details: `Issue ${issue.id} and ${toRemove.size - 1} sub-issue(s) removed`, icon: "🗑️" });
      return updated.filter(i => !toRemove.has(i.id));
    });
    setSelectedIssueId(null);
  }, [syncReady, user]);

  const createIssue = useCallback((data: Omit<Issue, "id" | "createdAt" | "updatedAt" | "comments" | "subIssueIds">) => {
    const prefix = data.projectId ? projects.find(p => p.id === data.projectId)?.name.substring(0, 3).toUpperCase() || "ISS" : "ISS";
    const id = generateIssueId(prefix);
    const newIssue: Issue = { ...data, id, subIssueIds: [], comments: [], createdAt: new Date(), updatedAt: new Date() };
    setIssues(prev => {
      let updated = [newIssue, ...prev];
      if (data.parentId) {
        updated = updated.map(i => i.id === data.parentId ? { ...i, subIssueIds: [...i.subIssueIds, id] } : i);
      }
      return updated;
    });
    if (syncReady) upsertTask(newIssue, user?.id ?? "", portalId);
    const projectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name : null;
    addAuditEntry({ userId: user?.id ?? "unknown", action: `Created issue "${data.title}"`, category: "tasks", details: `${id}${projectName ? ` in ${projectName}` : ""}${data.parentId ? " (sub-issue)" : ""}`, icon: "✅" });
  }, [projects, syncReady, user]);

  const createSubIssue = useCallback((parentId: string, title: string) => {
    const parent = issues.find(i => i.id === parentId);
    if (!parent) return;
    createIssue({
      title, description: "", status: "todo", priority: "none",
      assigneeId: parent.assigneeId, creatorId: user?.id || "",
      labels: [], projectId: parent.projectId, milestoneId: parent.milestoneId,
      dueDate: null, estimate: null, parentId,
    });
  }, [issues, user, createIssue]);

  const createProject = useCallback((data: Omit<Project, "id" | "milestones">) => {
    const id = `prj_${Date.now().toString(36)}`;
    const newProject: Project = { ...data, id, milestones: [] };
    setProjects(prev => [...prev, newProject]);
    if (syncReady) upsertProject(newProject, user?.id ?? "", portalId);
    addAuditEntry({ userId: user?.id ?? "unknown", action: `Created project "${data.name}"`, category: "tasks", details: `Project ${id}`, icon: "📋" });
  }, [syncReady, user]);

  const handleInlineCreate = (status: IssueStatus) => {
    if (!inlineTitle.trim()) { setInlineStatus(null); return; }
    createIssue({
      title: inlineTitle.trim(), description: "", status, priority: "none",
      assigneeId: null, creatorId: user?.id || "", labels: [],
      projectId: sidebarView !== "all" && sidebarView !== "my_issues" && sidebarView !== "backlog" ? sidebarView : null,
      milestoneId: null, dueDate: null, estimate: null, parentId: null,
    });
    setInlineTitle("");
    setInlineStatus(null);
  };

  const handleSelectIssue = (id: string) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;

    if (issue.parentId) {
      // Build breadcrumb chain
      const chain: { id: string; title: string }[] = [];
      let current = issues.find(i => i.id === issue.parentId);
      while (current) {
        chain.unshift({ id: current.id, title: current.title });
        current = current.parentId ? issues.find(i => i.id === current!.parentId) : undefined;
      }
      setIssueBreadcrumb(chain);
    } else {
      setIssueBreadcrumb([]);
    }
    setSelectedIssueId(id);
  };

  const selectedIssue = issues.find(i => i.id === selectedIssueId);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Group issues
  const getGroups = (): { key: string; label: string; icon?: React.ReactNode; issues: Issue[] }[] => {
    if (groupBy === "status") {
      return ISSUE_STATUSES.map(s => ({
        key: s.key, label: s.label, icon: <StatusIcon status={s.key} size={14} />,
        issues: filtered.filter(i => i.status === s.key),
      }));
    }
    if (groupBy === "priority") {
      return ISSUE_PRIORITIES.map(p => ({
        key: p.key, label: p.label,
        issues: filtered.filter(i => i.priority === p.key),
      }));
    }
    if (groupBy === "assignee") {
      const groups = ALL_USERS.map(u => ({
        key: u.id, label: u.displayName,
        issues: filtered.filter(i => i.assigneeId === u.id),
      }));
      groups.push({ key: "unassigned", label: "Unassigned", issues: filtered.filter(i => !i.assigneeId) });
      return groups;
    }
    if (groupBy === "project") {
      const groups = projects.map(p => ({
        key: p.id, label: `${p.emoji} ${p.name}`,
        issues: filtered.filter(i => i.projectId === p.id),
      }));
      groups.push({ key: "none", label: "No Project", issues: filtered.filter(i => !i.projectId) });
      return groups;
    }
    return [{ key: "all", label: "All Issues", issues: filtered }];
  };

  const groups = getGroups();

  const defaultProjectId = sidebarView !== "all" && sidebarView !== "my_issues" && sidebarView !== "backlog" ? sidebarView : null;

  return (
    <div className="flex h-full" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Sidebar — inline on lg+, drawer overlay on mobile */}
      {showSidebar && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowSidebar(false)}
          />
          {/* Sidebar panel — offset below the app header (56px) on mobile */}
          <div className="fixed top-14 bottom-0 left-0 z-50 lg:relative lg:top-auto lg:bottom-auto lg:z-auto" style={{ overflowY: "auto" }}>
            <ProjectsSidebar
              projects={projects}
              issues={issues}
              currentView={sidebarView}
              onViewChange={(v) => { setSidebarView(v); setShowSidebar(false); }}
              onNewProject={() => { setShowNewProject(true); setShowSidebar(false); }}
              currentUserId={user?.id || ""}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0" style={{ borderBottom: "0.5px solid var(--glass-border)" }}>
          {/* Main row */}
          <div className="flex items-center gap-2 p-3">
            {/* Toggle sidebar */}
            <button type="button" onClick={() => setShowSidebar(!showSidebar)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-quaternary)", padding: 4, minWidth: 28, minHeight: 28 }}>
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Search — full width on mobile */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, padding: "6px 8px" }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-quaternary)" }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                style={{ fontSize: 12, background: "transparent", border: "none", outline: "none", color: "var(--text-secondary)", width: "100%", minWidth: 0 }}
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Filter toggle (mobile) / filter controls label (desktop) */}
              <button type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 6, background: showFilters ? "var(--nav-item-active-bg)" : "var(--glass-bg)", border: `0.5px solid ${showFilters ? "var(--accent-color)" : "var(--glass-border)"}`, color: showFilters ? "var(--accent-color)" : "var(--text-tertiary)", cursor: "pointer" }}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>

              {/* View toggle */}
              <div className="flex" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 6, overflow: "hidden" }}>
                <button type="button" onClick={() => setViewMode("list")} style={{ padding: "5px 8px", border: "none", cursor: "pointer", background: viewMode === "list" ? "var(--nav-item-active-bg)" : "transparent", color: viewMode === "list" ? "var(--text-primary)" : "var(--text-quaternary)" }}>
                  <List className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setViewMode("board")} style={{ padding: "5px 8px", border: "none", cursor: "pointer", background: viewMode === "board" ? "var(--nav-item-active-bg)" : "transparent", color: viewMode === "board" ? "var(--text-primary)" : "var(--text-quaternary)" }}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* New issue button */}
              <button type="button" onClick={() => setShowNewIssue(true)} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "5px 10px", borderRadius: 6 }}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Issue</span>
              </button>
            </div>
          </div>

          {/* Filter row — always visible on lg+, toggleable on mobile */}
          <div className={`px-3 pb-3 flex flex-wrap items-center gap-2 ${showFilters ? "flex" : "hidden lg:flex"}`}>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ fontSize: 11, padding: "5px 7px", borderRadius: 6, background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
              <option value="">Priority</option>
              {ISSUE_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            {/* TODO: Fetch team members from Supabase portal_members table instead of hardcoded ALL_USERS */}
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{ fontSize: 11, padding: "5px 7px", borderRadius: 6, background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
              <option value="">Assignee</option>
              {ALL_USERS.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
            <select value={filterLabel} onChange={e => setFilterLabel(e.target.value)} style={{ fontSize: 11, padding: "5px 7px", borderRadius: 6, background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
              <option value="">Label</option>
              {ISSUE_LABELS.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>

            {viewMode === "list" && (
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} style={{ fontSize: 11, padding: "5px 7px", borderRadius: 6, background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
                <option value="status">Group: Status</option>
                <option value="priority">Group: Priority</option>
                <option value="assignee">Group: Assignee</option>
                <option value="project">Group: Project</option>
              </select>
            )}

            <div className="relative ml-auto">
              <button type="button" onClick={() => setShowDisplayOpts(!showDisplayOpts)} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 6, background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
                Display
              </button>
              {showDisplayOpts && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDisplayOpts(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 flex flex-col gap-1" style={{ background: "#0d1117", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: 8, minWidth: 140, boxShadow: "var(--glass-shadow-lg)" }}>
                    {(["id", "assignee", "labels", "dueDate", "estimate"] as const).map(k => (
                      <label key={k} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: "var(--text-secondary)", padding: "4px 0" }}>
                        <input type="checkbox" checked={display[k]} onChange={() => setDisplay(p => ({ ...p, [k]: !p[k] }))} />
                        {k === "dueDate" ? "Due Date" : k.charAt(0).toUpperCase() + k.slice(1)}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-3">
          {issues.length === 0 && !syncReady && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", color: "var(--text-quaternary)" }}>
              <CheckSquare style={{ width: 48, height: 48, opacity: 0.2, marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>No tasks yet</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Press <kbd>C</kbd> to create your first task</p>
            </div>
          )}
          {viewMode === "board" ? (
            <BoardView
              issues={filtered}
              onSelectIssue={handleSelectIssue}
              onUpdateStatus={(id, status) => updateIssue(id, { status })}
            />
          ) : (
            <div className="flex flex-col">
              {groups.map(group => {
                if (group.issues.length === 0 && groupBy !== "status") return null;
                const collapsed = collapsedGroups.has(group.key);

                return (
                  <div key={group.key}>
                    {/* Group header */}
                    <button type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="flex items-center gap-2 w-full text-left"
                      style={{ padding: "8px 12px", border: "none", cursor: "pointer", background: "transparent" }}
                    >
                      {collapsed ? <ChevronRight className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} /> : <ChevronDown className="w-3 h-3" style={{ color: "var(--text-quaternary)" }} />}
                      {group.icon}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{group.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>{group.issues.length}</span>
                    </button>

                    {!collapsed && (
                      <div style={{ borderBottom: "0.5px solid var(--glass-border-subtle)" }}>
                        {group.issues.map(issue => (
                          <IssueRow
                            key={issue.id}
                            issue={issue}
                            onClick={() => handleSelectIssue(issue.id)}
                            showId={display.id}
                            showAssignee={display.assignee}
                            showLabels={display.labels}
                            showDueDate={display.dueDate}
                            showEstimate={display.estimate}
                          />
                        ))}

                        {/* Inline add */}
                        {groupBy === "status" && (
                          inlineStatus === group.key ? (
                            <div className="flex items-center gap-2" style={{ padding: "6px 12px" }}>
                              <StatusIcon status={group.key as IssueStatus} size={14} />
                              <input
                                value={inlineTitle}
                                onChange={e => setInlineTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") handleInlineCreate(group.key as IssueStatus);
                                  if (e.key === "Escape") { setInlineStatus(null); setInlineTitle(""); }
                                }}
                                onBlur={() => { if (!inlineTitle.trim()) { setInlineStatus(null); setInlineTitle(""); } }}
                                placeholder="Issue title..."
                                autoFocus
                                className="flex-1"
                                style={{ fontSize: 13, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", padding: 0 }}
                              />
                            </div>
                          ) : (
                            <button type="button"
                              onClick={() => setInlineStatus(group.key as IssueStatus)}
                              className="flex items-center gap-2 w-full text-left transition-colors"
                              style={{ padding: "6px 12px", border: "none", cursor: "pointer", background: "transparent", color: "var(--text-quaternary)", fontSize: 12 }}
                              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-quaternary)"; }}
                            >
                              <Plus className="w-3 h-3" /> Add issue
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--text-quaternary)" }}>
              <p style={{ fontSize: 14 }}>No issues found</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Press <kbd style={{ padding: "1px 4px", borderRadius: 4, background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", fontSize: 11 }}>C</kbd> to create one</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedIssue && (
        <>
          <div className="fixed inset-0 z-[60] sm:hidden" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setSelectedIssueId(null)} />
          <IssueDetailPanel
            issue={selectedIssue}
            allIssues={issues}
            projects={projects}
            onUpdate={updateIssue}
            onDelete={deleteIssue}
            onClose={() => setSelectedIssueId(null)}
            onSelectIssue={handleSelectIssue}
            onCreateSubIssue={createSubIssue}
            breadcrumb={issueBreadcrumb}
          />
        </>
      )}

      {/* Modals */}
      {showNewIssue && (
        <NewIssueModal
          onClose={() => setShowNewIssue(false)}
          onCreate={createIssue}
          projects={projects}
          creatorId={user?.id || ""}
          defaultProjectId={defaultProjectId}
        />
      )}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={createProject}
        />
      )}
    </div>
  );
};

export default TasksPage;
