import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Download, Pencil, Move, Trash2, ExternalLink, ChevronLeft, ChevronRight, FolderIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { getUserById } from "@/lib/authContext";
import {
  type CloudFile, type CloudFolder, type PermissionLevel,
  getFileTypeIcon, getFileTypeLabel, formatFileSize, getFolderPath,
} from "@/lib/cloudStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Mock XLSX data for preview ── */
const MOCK_XLSX_DATA: Record<string, Record<string, string[][]>> = {
  default: {
    Sheet1: [
      ["Name", "Amount", "Date", "Status"],
      ["Acme Corp", "€2,400", "Feb 2025", "Paid"],
      ["Beta Inc", "€1,800", "Feb 2025", "Pending"],
      ["Gamma Ltd", "€3,200", "Jan 2025", "Paid"],
      ["Delta Co", "€950", "Jan 2025", "Overdue"],
      ["Epsilon SA", "€4,100", "Dec 2024", "Paid"],
      ["Zeta AG", "€2,750", "Dec 2024", "Paid"],
      ["Eta LLC", "€1,600", "Nov 2024", "Paid"],
      ["Theta GmbH", "€5,300", "Nov 2024", "Pending"],
    ],
  },
};

interface FilePreviewDrawerProps {
  file: CloudFile;
  files: CloudFile[];
  folders: CloudFolder[];
  permission: PermissionLevel | null;
  onClose: () => void;
  onNavigate: (file: CloudFile) => void;
  onRename: (fileId: string, newName: string) => void;
  onMoveToTrash: (fileId: string) => void;
  onMoveFile: (file: CloudFile) => void;
  onNavigateFolder: (folderId: string) => void;
  onUpdateDescription: (fileId: string, desc: string) => void;
}

export default function FilePreviewDrawer({
  file, files, folders, permission,
  onClose, onNavigate, onRename, onMoveToTrash, onMoveFile, onNavigateFolder, onUpdateDescription,
}: FilePreviewDrawerProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(file.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(file.description || "");
  const [activeSheet, setActiveSheet] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);

  const canWrite = permission === "write" || permission === "admin";

  // Simulate loading
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [file.id]);

  // Reset edit states on file change
  useEffect(() => {
    setEditingTitle(false);
    setTitleValue(file.name);
    setEditingDesc(false);
    setDescValue(file.description || "");
    setActiveSheet(0);
    setPdfPage(1);
  }, [file.id, file.name, file.description]);

  // Keyboard navigation
  const currentIndex = useMemo(() => files.findIndex((f) => f.id === file.id), [files, file.id]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(files[currentIndex - 1]);
  }, [currentIndex, files, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < files.length - 1) onNavigate(files[currentIndex + 1]);
  }, [currentIndex, files, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingTitle || editingDesc) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext, editingTitle, editingDesc]);

  const icon = getFileTypeIcon(file.type);
  const typeLabel = getFileTypeLabel(file.type);
  const folderPath = file.folderId !== "trash" ? getFolderPath(file.folderId, folders) : file.originalFolderPath || "Unknown";
  const uploadedByUser = getUserById(file.uploadedBy || file.ownerId);
  const modifiedByUser = file.lastModifiedBy ? getUserById(file.lastModifiedBy) : null;

  const saveTitle = () => {
    if (titleValue.trim() && titleValue.trim() !== file.name) {
      onRename(file.id, titleValue.trim());
    }
    setEditingTitle(false);
  };

  const saveDesc = () => {
    onUpdateDescription(file.id, descValue);
    setEditingDesc(false);
  };

  /* ── Preview renderers ── */
  const renderPreview = () => {
    if (loading) {
      return <Skeleton className="w-full h-[300px] rounded-lg" />;
    }

    switch (file.type) {
      case "pdf":
        return (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-full h-[320px] bg-muted/30 rounded-lg flex items-center justify-center border border-border">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <FileText className="w-16 h-16 text-destructive/60" />
                <span className="text-sm font-medium">PDF Preview</span>
                <span className="text-xs">{file.name}</span>
              </div>
            </div>
            {(file.pageCount || 1) > 1 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <button type="button"
                  onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                  disabled={pdfPage <= 1}
                  className="p-1 rounded hover:bg-accent disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {pdfPage} of {file.pageCount}</span>
                <button type="button"
                  onClick={() => setPdfPage((p) => Math.min(file.pageCount || 1, p + 1))}
                  disabled={pdfPage >= (file.pageCount || 1)}
                  className="p-1 rounded hover:bg-accent disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );

      case "image":
        return (
          <div className="flex flex-col items-center gap-2 w-full">
            <div
              className="w-full h-[320px] rounded-lg overflow-hidden flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.5) 100%)` }}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <span className="text-6xl">🖼️</span>
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            </div>
            {file.dimensions && (
              <span className="text-xs text-muted-foreground">
                {file.dimensions.width} × {file.dimensions.height} px
              </span>
            )}
          </div>
        );

      case "xlsx": {
        const sheets = file.sheetNames || ["Sheet1"];
        const data = MOCK_XLSX_DATA.default.Sheet1;
        return (
          <div className="w-full flex flex-col rounded-lg overflow-hidden border border-border">
            {/* Sheet tabs */}
            <div className="flex gap-0.5 px-2 py-1.5 bg-muted/50">
              {sheets.map((name, i) => (
                <button type="button"
                  key={name}
                  onClick={() => setActiveSheet(i)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    activeSheet === i
                      ? "bg-background text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            {/* Table */}
            <div className="overflow-auto max-h-[280px]">
              <table className="w-full border-collapse text-xs font-mono">
                <thead>
                  <tr>
                    {(data[0] || []).map((h, i) => (
                      <th
                        key={i}
                        className="sticky top-0 bg-muted/80 text-left p-1.5 px-2.5 text-muted-foreground font-semibold border-b border-border text-[11px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(1).map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-1.5 px-2.5 border-b border-border/30 text-foreground text-[12px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 text-[10px] text-muted-foreground">
              <span>Rows 1-{data.length - 1}</span>
              <button type="button"
                onClick={() => { toast.info("Download started"); }}
                className="text-primary hover:underline"
              >
                Open Full ↗️
              </button>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
            <span className="text-6xl">{icon.emoji}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">.{file.extension || file.name.split(".").pop()}</span>
            <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
            <button type="button"
              onClick={() => toast.info("Download started")}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-1"
            >
              <Download className="w-3.5 h-3.5" /> Download to view
            </button>
          </div>
        );
    }
  };

  /* ── Info Row ── */
  const InfoRow = ({ label, value, clickable, onClick }: { label: string; value: React.ReactNode; clickable?: boolean; onClick?: () => void }) => (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
      <span className="text-xs text-muted-foreground font-medium min-w-[100px]">{label}</span>
      {clickable ? (
        <button type="button" onClick={onClick} className="text-xs text-primary font-medium text-right hover:underline flex items-center gap-1">
          {value}
        </button>
      ) : (
        <span className="text-xs text-foreground font-medium text-right">{value}</span>
      )}
    </div>
  );

  const drawerWidth = isMobile ? "100vw" : "480px";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[45] bg-black/30 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-[50] h-full flex flex-col bg-popover border-l border-border shadow-2xl animate-in slide-in-from-right duration-300"
        style={{ width: drawerWidth, maxWidth: "100vw" }}
      >
        {/* Navigation arrows (prev/next) */}
        {files.length > 1 && !isMobile && (
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
            <button type="button"
              onClick={goPrev}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg bg-popover border border-border shadow-md hover:bg-accent disabled:opacity-30 transition-colors"
              aria-label="Previous file"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button"
              onClick={goNext}
              disabled={currentIndex >= files.length - 1}
              className="p-1.5 rounded-lg bg-popover border border-border shadow-md hover:bg-accent disabled:opacity-30 transition-colors"
              aria-label="Next file"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ZONE 1: Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-2xl shrink-0">{icon.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-[340px]">{file.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {typeLabel} · {formatFileSize(file.size)} · {folderPath}
              </p>
            </div>
          </div>
          <button type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Close preview"
          >
            {isMobile ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* ZONE 2: Preview */}
          <div className="px-5 py-4">
            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 flex items-center justify-center min-h-[180px]">
              {renderPreview()}
            </div>
          </div>

          {/* ZONE 3: Info Panel */}
          <div className="px-5 py-4 border-t border-border">
            {/* Editable Title */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Title</span>
                {canWrite && !editingTitle && (
                  <button type="button" onClick={() => setEditingTitle(true)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              {editingTitle ? (
                <input
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleValue(file.name); } }}
                  onBlur={saveTitle}
                  className="w-full text-sm p-1.5 rounded-lg border border-input bg-background"
                />
              ) : (
                <p className="text-sm text-foreground font-medium">{file.name}</p>
              )}
            </div>

            {/* Editable Description */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                {canWrite && !editingDesc && (
                  <button type="button" onClick={() => setEditingDesc(true)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div>
                  <textarea
                    autoFocus
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => { if (e.key === "Escape") { setEditingDesc(false); setDescValue(file.description || ""); } }}
                    className="w-full text-xs p-2 rounded-lg border border-input bg-background min-h-[60px] resize-none"
                    placeholder="Add a description..."
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{descValue.length}/500</span>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => { setEditingDesc(false); setDescValue(file.description || ""); }} className="text-[11px] px-2 py-0.5 rounded border border-border hover:bg-accent">Cancel</button>
                      <button type="button" onClick={saveDesc} className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {file.description || (canWrite ? "Click edit to add a description..." : "No description")}
                </p>
              )}
            </div>

            {/* Metadata rows */}
            <div className="flex flex-col">
              <InfoRow label="Type" value={typeLabel} />
              <InfoRow label="Size" value={formatFileSize(file.size)} />
              {file.dimensions && (
                <InfoRow label="Dimensions" value={`${file.dimensions.width} × ${file.dimensions.height} px`} />
              )}
              {file.pageCount && <InfoRow label="Pages" value={String(file.pageCount)} />}
              {file.sheetNames && <InfoRow label="Sheets" value={file.sheetNames.join(", ")} />}
              <InfoRow label="Uploaded" value={format(file.createdAt, "MMM d, yyyy")} />
              <InfoRow
                label="Uploaded by"
                value={
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center shrink-0">
                      {uploadedByUser?.displayName?.charAt(0) || "?"}
                    </span>
                    {uploadedByUser?.displayName || "Unknown"}
                  </span>
                }
              />
              <InfoRow label="Modified" value={format(file.modifiedAt, "MMM d, yyyy")} />
              {modifiedByUser && (
                <InfoRow
                  label="Modified by"
                  value={
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center shrink-0">
                        {modifiedByUser.displayName.charAt(0)}
                      </span>
                      {modifiedByUser.displayName}
                    </span>
                  }
                />
              )}
              <InfoRow
                label="Location"
                value={
                  <span className="flex items-center gap-1">
                    <FolderIcon className="w-3 h-3 text-primary" />
                    {folderPath}
                  </span>
                }
                clickable={file.folderId !== "trash"}
                onClick={() => { onNavigateFolder(file.folderId); onClose(); }}
              />
            </div>
          </div>
        </div>

        {/* ZONE 4: Actions Bar */}
        {!file.isDeleted && (
          <div className="px-5 py-4 border-t border-border shrink-0 flex flex-wrap gap-2">
            {permission && (
              <button type="button"
                onClick={() => toast.info("Download started")}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-accent transition-colors text-foreground"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
            {canWrite && (
              <button type="button"
                onClick={() => setEditingTitle(true)}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-accent transition-colors text-foreground"
              >
                <Pencil className="w-3.5 h-3.5" /> Rename
              </button>
            )}
            {canWrite && (
              <button type="button"
                onClick={() => onMoveFile(file)}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-accent transition-colors text-foreground"
              >
                <Move className="w-3.5 h-3.5" /> Move
              </button>
            )}
            {canWrite && (
              <button type="button"
                onClick={() => { onMoveToTrash(file.id); onClose(); }}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-destructive/10 transition-colors text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" /> Trash
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
