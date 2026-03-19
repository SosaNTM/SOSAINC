import { useState, useMemo, useCallback } from "react";
import {
  type CloudFile, type CloudFolder, type PermissionLevel,
  getFileTypeIcon, formatFileSize, getFolderPath, getUserPermission,
  TOTAL_STORAGE_GB,
} from "@/lib/cloudStore";
import { getUserById } from "@/lib/authContext";
import { ActionMenu, type ActionMenuEntry } from "@/components/ActionMenu";
import { formatDistanceToNow, format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  Download, Pencil, Move, Trash2, Link2, FolderIcon, MoreVertical,
  Upload, X, Search, ChevronDown, HardDrive, Eye,
} from "lucide-react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts";

/* ── Types ── */
type FileCategory = "all" | "video" | "image" | "pdf" | "spreadsheet" | "document" | "other";
type ViewFilter = "all" | "files" | "folders";
type SortOption = "size_desc" | "size_asc" | "name_asc" | "name_desc" | "date";

interface StorageOverviewProps {
  files: CloudFile[];
  folders: CloudFolder[];
  userId: string;
  userRole: string;
  getPerm: (folderId: string) => PermissionLevel | null;
  onNavigateFolder: (id: string | null) => void;
  onPreviewFile: (file: CloudFile) => void;
  onMoveToTrash: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onMoveFile: (file: CloudFile) => void;
}

/* ── Helpers ── */
const FILE_TYPE_MAP: Record<string, { category: FileCategory; label: string; color: string; icon: string }> = {
  video: { category: "video", label: "Videos", color: "#8b5cf6", icon: "🎬" },
  image: { category: "image", label: "Images", color: "#ec4899", icon: "🖼️" },
  pdf: { category: "pdf", label: "PDFs", color: "#ef4444", icon: "📄" },
  xlsx: { category: "spreadsheet", label: "Spreadsheets", color: "#22c55e", icon: "📊" },
  docx: { category: "document", label: "Documents", color: "#3b82f6", icon: "📝" },
  pptx: { category: "other", label: "Other", color: "#6b7280", icon: "📦" },
  zip: { category: "other", label: "Other", color: "#6b7280", icon: "📦" },
  other: { category: "other", label: "Other", color: "#6b7280", icon: "📦" },
};

function getFileCategory(type: CloudFile["type"]): FileCategory {
  return FILE_TYPE_MAP[type]?.category || "other";
}

function getCategoryColor(cat: FileCategory): string {
  const map: Record<FileCategory, string> = {
    all: "#6b7280", video: "#8b5cf6", image: "#ec4899", pdf: "#ef4444",
    spreadsheet: "#22c55e", document: "#3b82f6", other: "#6b7280",
  };
  return map[cat];
}

function formatExactBytes(bytes: number): string {
  return bytes.toLocaleString() + " bytes";
}

/* ── Component ── */
export default function StorageOverview({
  files, folders, userId, userRole, getPerm,
  onNavigateFolder, onPreviewFile, onMoveToTrash, onRenameFile, onMoveFile,
}: StorageOverviewProps) {
  const isMobile = useIsMobile();
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [typeFilter, setTypeFilter] = useState<FileCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("size_desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [folderDrillDown, setFolderDrillDown] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  // All active (non-deleted) files
  const activeFiles = useMemo(() => files.filter((f) => !f.isDeleted), [files]);

  // Total bytes
  const totalUsed = useMemo(() => activeFiles.reduce((s, f) => s + f.size, 0), [activeFiles]);
  const totalQuota = TOTAL_STORAGE_GB * 1024 * 1024 * 1024;
  const usedPercent = (totalUsed / totalQuota) * 100;

  // By type analytics
  const byType = useMemo(() => {
    const map: Record<string, { size: number; count: number }> = {};
    activeFiles.forEach((f) => {
      const cat = getFileCategory(f.type);
      if (!map[cat]) map[cat] = { size: 0, count: 0 };
      map[cat].size += f.size;
      map[cat].count++;
    });
    const total = Object.values(map).reduce((s, v) => s + v.size, 0) || 1;
    return Object.entries(map)
      .map(([type, data]) => ({
        type: type as FileCategory,
        ...data,
        percentage: Math.round((data.size / total) * 100),
      }))
      .sort((a, b) => b.size - a.size);
  }, [activeFiles]);

  // By folder analytics
  const byFolder = useMemo(() => {
    const map: Record<string, { name: string; size: number }> = {};
    activeFiles.forEach((f) => {
      const folder = folders.find((fo) => fo.id === f.folderId);
      // Get root folder
      let rootId = f.folderId;
      let cur: string | null = f.folderId;
      while (cur) {
        const fo = folders.find((x) => x.id === cur);
        if (!fo) break;
        if (!fo.parentId) { rootId = fo.id; break; }
        cur = fo.parentId;
      }
      const rootFolder = folders.find((fo) => fo.id === rootId);
      if (!rootFolder) return;
      if (!map[rootId]) map[rootId] = { name: rootFolder.name, size: 0 };
      map[rootId].size += f.size;
    });
    const total = Object.values(map).reduce((s, v) => s + v.size, 0) || 1;
    return Object.entries(map)
      .map(([id, data]) => ({
        folderId: id,
        folderName: data.name,
        size: data.size,
        percentage: Math.round((data.size / total) * 100),
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 6);
  }, [activeFiles, folders]);

  // Filtered + sorted items list
  const filteredItems = useMemo(() => {
    let items = [...activeFiles];

    // Folder drill-down
    if (folderDrillDown) {
      const allIds = new Set<string>();
      const collect = (id: string) => {
        allIds.add(id);
        folders.filter((f) => f.parentId === id && !f.isDeleted).forEach((f) => collect(f.id));
      };
      collect(folderDrillDown);
      items = items.filter((f) => allIds.has(f.folderId));
    }

    // Type filter from dropdown
    if (typeFilter !== "all") {
      items = items.filter((f) => getFileCategory(f.type) === typeFilter);
    }

    // Type filter from donut chart click
    if (activeType) {
      items = items.filter((f) => getFileCategory(f.type) === activeType);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f) => f.name.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case "size_desc": items.sort((a, b) => b.size - a.size); break;
      case "size_asc": items.sort((a, b) => a.size - b.size); break;
      case "name_asc": items.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name_desc": items.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "date": items.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()); break;
    }

    return items;
  }, [activeFiles, folderDrillDown, typeFilter, activeType, searchQuery, sortBy, folders]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === visibleItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleItems.map((f) => f.id)));
    }
  }, [selectedIds.size, visibleItems]);

  const selectedFiles = useMemo(() => activeFiles.filter((f) => selectedIds.has(f.id)), [activeFiles, selectedIds]);
  const selectedTotalSize = selectedFiles.reduce((s, f) => s + f.size, 0);

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => onMoveToTrash(id));
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
    toast.success(`${selectedIds.size} items moved to Trash`);
  };

  // Progress bar color
  const barColor = usedPercent > 85 ? "bg-red-500" : usedPercent > 70 ? "bg-amber-500" : "bg-emerald-500";

  // Row menu
  const getRowMenuItems = (file: CloudFile): ActionMenuEntry[] => {
    const perm = getPerm(file.folderId);
    const canW = perm === "write" || perm === "admin";
    return [
      { id: "download", icon: <Download className="w-3.5 h-3.5" />, label: "Download", onClick: () => toast.info("Download started") },
      { id: "view-folder", icon: <FolderIcon className="w-3.5 h-3.5" />, label: "View in folder", onClick: () => onNavigateFolder(file.folderId) },
      { id: "rename", icon: <Pencil className="w-3.5 h-3.5" />, label: "Rename", onClick: () => {
        const newName = prompt("New name:", file.name);
        if (newName?.trim()) onRenameFile(file.id, newName.trim());
      }, show: canW },
      { id: "move", icon: <Move className="w-3.5 h-3.5" />, label: "Move", onClick: () => onMoveFile(file), show: canW },
      { id: "link", icon: <Link2 className="w-3.5 h-3.5" />, label: "Copy link", onClick: () => { navigator.clipboard.writeText(`cloud://files/${file.id}`); toast.success("Link copied"); } },
      { type: "divider" },
      { id: "trash", icon: <Trash2 className="w-3.5 h-3.5" />, label: "Move to Trash", onClick: () => onMoveToTrash(file.id), destructive: true, show: canW },
    ];
  };

  // Donut chart data
  const donutData = byType.map((t) => ({
    name: t.type,
    label: FILE_TYPE_MAP[t.type]?.label || t.type,
    value: t.size,
    color: getCategoryColor(t.type),
    icon: FILE_TYPE_MAP[t.type]?.icon || "📦",
    count: t.count,
    percentage: t.percentage,
  }));

  // Click effect state
  const [clickEffect, setClickEffect] = useState<{ active: boolean; color: string; index: number } | null>(null);
  const [centerBounce, setCenterBounce] = useState(false);

  const handleSliceClick = useCallback((index: number) => {
    const type = donutData[index];
    if (!type) return;
    setActiveType((prev) => (prev === type.name ? null : type.name));
    setClickEffect({ active: true, color: type.color, index });
    setCenterBounce(true);
    setTimeout(() => setClickEffect(null), 600);
    setTimeout(() => setCenterBounce(false), 400);
  }, [donutData]);

  // Custom active shape renderer for donut hover/click expand
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    const entryName = donutData[props.index]?.name;
    const isHighlighted = hoveredType === entryName || activeType === entryName;
    const isDimmed = (hoveredType && hoveredType !== entryName) || (activeType && activeType !== entryName);
    const isJustClicked = clickEffect?.active && clickEffect.index === props.index;

    let radius = outerRadius;
    if (isJustClicked) {
      radius = outerRadius + 14;
    } else if (isHighlighted) {
      radius = outerRadius + 8;
    }

    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={radius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={isDimmed ? 0.35 : 1}
        stroke={activeType === entryName ? "hsl(var(--foreground))" : "transparent"}
        strokeWidth={activeType === entryName ? 2 : 0}
        style={{ transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)", cursor: "pointer", filter: activeType === entryName ? `drop-shadow(0 0 8px ${fill})` : "none" }}
      />
    );
  };

  // Hovered type data for center text
  const hoveredTypeData = hoveredType ? donutData.find((d) => d.name === hoveredType) : null;

  const drillDownFolder = folderDrillDown ? folders.find((f) => f.id === folderDrillDown) : null;
  const drillDownSize = folderDrillDown ? byFolder.find((f) => f.folderId === folderDrillDown)?.size || 0 : 0;
  const activeTypeData = activeType ? donutData.find((d) => d.name === activeType) : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── HEADER ── */}
      <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Storage Overview</h2>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            {formatFileSize(totalUsed)} / {TOTAL_STORAGE_GB} GB
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">{usedPercent.toFixed(1)}% used</p>
      </div>

      {/* ── ANALYTICS CARDS ── */}
      <div className={`grid gap-4 p-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {/* Usage by File Type - Donut */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Usage by File Type</h3>
          <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%" style={{ outline: "none" }}>
                <PieChart style={{ outline: "none" }}>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    dataKey="value"
                    strokeWidth={0}
                    paddingAngle={2}
                    activeIndex={donutData.map((_, i) => i)}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setHoveredType(donutData[index].name)}
                    onMouseLeave={() => setHoveredType(null)}
                    onClick={(_, index) => handleSliceClick(index)}
                    style={{ cursor: "pointer", outline: "none" }}
                    tabIndex={-1}
                    isAnimationActive={true}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Click effects overlay */}
              {clickEffect?.active && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Ripple ring */}
                  <div
                    className="absolute rounded-full border-2 animate-[ripple-ring_0.5s_ease-out_forwards]"
                    style={{ borderColor: clickEffect.color }}
                  />
                  {/* Glow flash */}
                  <div
                    className="absolute w-24 h-24 rounded-full animate-[glow-flash_0.4s_ease-out_forwards]"
                    style={{ background: `radial-gradient(circle, ${clickEffect.color}40 0%, transparent 70%)` }}
                  />
                </div>
              )}
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`text-center transition-all duration-200 ${centerBounce ? "animate-[center-bounce_0.35s_cubic-bezier(0.34,1.56,0.64,1)]" : ""}`}>
                  <div className="text-base font-bold text-foreground">
                    {hoveredTypeData ? formatFileSize(hoveredTypeData.value) : activeTypeData ? formatFileSize(activeTypeData.value) : formatFileSize(totalUsed)}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {hoveredTypeData ? hoveredTypeData.label : activeTypeData ? activeTypeData.label : "Total"}
                  </div>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="w-full flex flex-col gap-0.5">
              {donutData.map((t) => {
                const isDimmed =
                  (hoveredType && hoveredType !== t.name && !activeType) ||
                  (activeType && activeType !== t.name);
                return (
                  <div
                    key={t.name}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200 ${
                      activeType === t.name ? "bg-accent/10" : ""
                    } ${isDimmed ? "opacity-40" : "opacity-100"}`}
                    onMouseEnter={() => setHoveredType(t.name)}
                    onMouseLeave={() => setHoveredType(null)}
                    onClick={() => {
                      const idx = donutData.findIndex((d) => d.name === t.name);
                      if (idx >= 0) handleSliceClick(idx);
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="flex-1 text-[13px] text-muted-foreground">{t.icon} {t.label}</span>
                    <span className="text-[13px] font-semibold text-foreground tabular-nums">{formatFileSize(t.value)}</span>
                    <span className="text-[13px] text-muted-foreground/60 w-9 text-right tabular-nums">{t.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Folders by Size */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Top Folders by Size</h3>
          <div className="flex flex-col gap-1">
            {byFolder.map((f) => {
              const isActive = folderDrillDown === f.folderId;
              const isDimmed = hoveredFolder && hoveredFolder !== f.folderId && !folderDrillDown;
              return (
                <button type="button"
                  key={f.folderId}
                  onClick={() => setFolderDrillDown(folderDrillDown === f.folderId ? null : f.folderId)}
                  onMouseEnter={() => setHoveredFolder(f.folderId)}
                  onMouseLeave={() => setHoveredFolder(null)}
                  className={`p-2 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                    isActive ? "bg-primary/10 border-l-[3px] border-primary pl-3" : "hover:bg-muted/50"
                  } ${isDimmed ? "opacity-40" : "opacity-100"}`}
                >
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <span className="flex items-center gap-1.5">
                      <FolderIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-foreground font-medium">{f.folderName}</span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">{formatFileSize(f.size)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-400 ${isActive ? "bg-primary" : "bg-primary/70"}`}
                      style={{ width: `${f.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">{f.percentage}%</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DRILL-DOWN FILTER BADGES ── */}
      {(folderDrillDown || activeType) && (
        <div className="px-6 pb-2 flex items-center gap-2 flex-wrap">
          {folderDrillDown && drillDownFolder && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium animate-fade-in">
              <FolderIcon className="w-3 h-3" />
              {drillDownFolder.name} ({formatFileSize(drillDownSize)})
              <button type="button" onClick={() => setFolderDrillDown(null)} className="ml-1 hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeType && activeTypeData && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground font-medium animate-fade-in border border-accent/20">
              {activeTypeData.icon} {activeTypeData.label} ({formatFileSize(activeTypeData.value)} · {activeTypeData.count} files)
              <button type="button" onClick={() => setActiveType(null)} className="ml-1 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── LARGEST ITEMS HEADER ── */}
      <div className="px-6 pt-2 pb-1">
        <h3 className="text-sm font-bold text-foreground">Largest Items</h3>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="flex items-center gap-3 px-6 py-3 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-lg bg-muted p-0.5">
          {(["all", "files", "folders"] as ViewFilter[]).map((v) => (
            <button type="button"
              key={v}
              onClick={() => setViewFilter(v)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors capitalize ${
                viewFilter === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Type dropdown */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FileCategory)}
            className="text-[12px] pl-2 pr-6 py-1.5 rounded-lg border border-input bg-background appearance-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="video">Videos</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="document">Documents</option>
            <option value="other">Other</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[120px] max-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full text-[12px] pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Sort */}
        <div className="relative ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-[12px] pl-2 pr-6 py-1.5 rounded-lg border border-input bg-background appearance-none cursor-pointer"
          >
            <option value="size_desc">Size ↓</option>
            <option value="size_asc">Size ↑</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="date">Last modified</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <div className="flex-1 px-6 overflow-x-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <FolderIcon className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {activeFiles.length === 0 ? "No files in your Cloud yet" : "No files match your filters"}
            </p>
            {activeFiles.length === 0 && (
              <button type="button"
                onClick={() => toast.info("Upload feature")}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Files
              </button>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[700px] text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 p-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === visibleItems.length && visibleItems.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="w-10 p-2.5" />
                <th className="p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="w-[100px] p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Size</th>
                <th className="w-[140px] p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="w-[110px] p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modified</th>
                <th className="w-[90px] p-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                <th className="w-10 p-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((file) => {
                const icon = getFileTypeIcon(file.type);
                const owner = getUserById(file.ownerId);
                const folderPath = getFolderPath(file.folderId, folders);
                const isSelected = selectedIds.has(file.id);

                return (
                  <tr
                    key={file.id}
                    onClick={() => onPreviewFile(file)}
                    className={`border-b border-border/50 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(file.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2.5">
                      <span className="text-lg">{icon.emoji}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-medium text-foreground truncate block max-w-[250px]">{file.name}</span>
                    </td>
                    <td className="p-2.5" title={formatExactBytes(file.size)}>
                      <span className="font-semibold tabular-nums">{formatFileSize(file.size)}</span>
                    </td>
                    <td className="p-2.5">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); onNavigateFolder(file.folderId); }}
                        className="text-[12px] text-muted-foreground hover:text-primary hover:underline truncate block max-w-[130px]"
                      >
                        {folderPath}
                      </button>
                    </td>
                    <td className="p-2.5 text-muted-foreground text-[12px]" title={format(file.modifiedAt, "PPpp")}>
                      {formatDistanceToNow(file.modifiedAt, { addSuffix: true })}
                    </td>
                    <td className="p-2.5 text-muted-foreground text-[12px]">
                      {owner?.displayName || "—"}
                    </td>
                    <td className="p-2.5" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        trigger={<MoreVertical className="w-4 h-4" />}
                        items={getRowMenuItems(file)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Show more */}
        {visibleCount < filteredItems.length && (
          <div className="flex justify-center py-4">
            <button type="button"
              onClick={() => setVisibleCount((v) => v + 20)}
              className="text-xs px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
            >
              Show more ({filteredItems.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* ── BULK ACTION BAR ── */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between z-10 shrink-0">
          <span className="text-sm text-foreground font-medium">
            ☑ {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected ({formatFileSize(selectedTotalSize)})
          </span>
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => { toast.info("Download started"); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed z-[90] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[460px] max-h-[90vh] overflow-y-auto bg-popover border border-border rounded-2xl p-6 shadow-2xl">
            <h2 className="text-base font-bold text-foreground mb-3">
              Delete {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}?
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              The following items will be moved to Trash (recoverable for 60 days):
            </p>
            <div className="flex flex-col gap-2 mb-3 max-h-[200px] overflow-y-auto">
              {selectedFiles.map((f) => {
                const icon = getFileTypeIcon(f.type);
                return (
                  <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="text-lg">{icon.emoji}</span>
                    <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatFileSize(f.size)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Total: <strong className="text-foreground">{formatFileSize(selectedTotalSize)}</strong> will be freed
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button type="button"
                onClick={handleBulkDelete}
                className="text-sm px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Move to Trash
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
