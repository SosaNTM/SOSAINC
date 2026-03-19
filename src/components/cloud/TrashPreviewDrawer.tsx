import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, RotateCcw, Trash2, Clock, FolderIcon, FileText, Download } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getUserById } from "@/lib/authContext";
import {
  type CloudFile,
  getFileTypeIcon, getFileTypeLabel, formatFileSize,
  daysUntilPermanentDelete, getCountdownSeverity,
} from "@/lib/cloudStore";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Mock XLSX preview data ── */
const MOCK_XLSX_ROWS = [
  ["Name", "Amount", "Date", "Status"],
  ["Acme Corp", "€2,400", "Feb 2025", "Paid"],
  ["Beta Inc", "€1,800", "Feb 2025", "Pending"],
  ["Gamma Ltd", "€3,200", "Jan 2025", "Paid"],
  ["Delta Co", "€950", "Jan 2025", "Overdue"],
];

interface TrashPreviewDrawerProps {
  file: CloudFile;
  files: CloudFile[];
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onNavigate: (file: CloudFile) => void;
  onRecover: (file: CloudFile) => void;
  onPermanentDelete: (file: CloudFile) => void;
}

export default function TrashPreviewDrawer({
  file, files, isOwnerOrAdmin,
  onClose, onNavigate, onRecover, onPermanentDelete,
}: TrashPreviewDrawerProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [pdfPage, setPdfPage] = useState(1);
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [file.id]);

  useEffect(() => {
    setPdfPage(1);
    setActiveSheet(0);
  }, [file.id]);

  const currentIndex = useMemo(() => files.findIndex((f) => f.id === file.id), [files, file.id]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(files[currentIndex - 1]);
  }, [currentIndex, files, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < files.length - 1) onNavigate(files[currentIndex + 1]);
  }, [currentIndex, files, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  const icon = getFileTypeIcon(file.type);
  const typeLabel = getFileTypeLabel(file.type);
  const daysLeft = daysUntilPermanentDelete(file);
  const severity = getCountdownSeverity(daysLeft);
  const deletedByUser = file.deletedBy ? getUserById(file.deletedBy) : null;
  const ownerUser = getUserById(file.ownerId);

  /* ── Preview renderers ── */
  const renderPreview = () => {
    if (loading) return <Skeleton className="w-full h-[280px] rounded-lg" />;

    switch (file.type) {
      case "pdf":
        return (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-full h-[280px] bg-muted/30 rounded-lg flex items-center justify-center border border-border">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <FileText className="w-14 h-14 text-destructive/60" />
                <span className="text-sm font-medium">PDF Preview</span>
                <span className="text-xs">{file.name}</span>
              </div>
            </div>
            {(file.pageCount || 1) > 1 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <button type="button" onClick={() => setPdfPage((p) => Math.max(1, p - 1))} disabled={pdfPage <= 1} className="p-1 rounded hover:bg-accent disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {pdfPage} of {file.pageCount}</span>
                <button type="button" onClick={() => setPdfPage((p) => Math.min(file.pageCount || 1, p + 1))} disabled={pdfPage >= (file.pageCount || 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );

      case "image":
        return (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="w-full h-[280px] rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted)/0.5) 100%)" }}>
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <span className="text-6xl">🖼️</span>
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            </div>
            {file.dimensions && (
              <span className="text-xs text-muted-foreground">{file.dimensions.width} × {file.dimensions.height} px</span>
            )}
          </div>
        );

      case "xlsx": {
        const sheets = file.sheetNames || ["Sheet1"];
        return (
          <div className="w-full flex flex-col rounded-lg overflow-hidden border border-border">
            <div className="flex gap-0.5 px-2 py-1.5 bg-muted/50">
              {sheets.map((name, i) => (
                <button type="button" key={name} onClick={() => setActiveSheet(i)} className={`px-3 py-1 rounded text-xs transition-colors ${activeSheet === i ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {name}
                </button>
              ))}
            </div>
            <div className="overflow-auto max-h-[220px]">
              <table className="w-full border-collapse text-xs font-mono">
                <thead>
                  <tr>
                    {MOCK_XLSX_ROWS[0].map((h, i) => (
                      <th key={i} className="sticky top-0 bg-muted/80 text-left p-1.5 px-2.5 text-muted-foreground font-semibold border-b border-border text-[11px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_XLSX_ROWS.slice(1).map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "" : "bg-muted/20"}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-1.5 px-2.5 border-b border-border/30 text-foreground text-[12px]">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case "docx":
        return (
          <div className="w-full h-[280px] bg-muted/30 rounded-lg flex items-center justify-center border border-border">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <span className="text-5xl">📝</span>
              <span className="text-sm font-medium">Document Preview</span>
              <span className="text-xs">{file.name}</span>
            </div>
          </div>
        );

      case "pptx":
        return (
          <div className="w-full h-[280px] bg-muted/30 rounded-lg flex items-center justify-center border border-border">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <span className="text-5xl">📑</span>
              <span className="text-sm font-medium">Presentation Preview</span>
              <span className="text-xs">{file.name}</span>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center gap-3 py-8 w-full">
            <span className="text-5xl">{icon.emoji}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">.{file.extension || file.name.split(".").pop()}</span>
            <p className="text-sm text-muted-foreground">Cannot preview this file type</p>
          </div>
        );
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
      <span className="text-xs text-muted-foreground font-medium min-w-[100px]">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">{value}</span>
    </div>
  );

  const drawerWidth = isMobile ? "100vw" : "480px";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[45] bg-black/30 animate-in fade-in-0 duration-200" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 z-[50] h-full flex flex-col bg-popover border-l border-border shadow-2xl animate-in slide-in-from-right duration-300"
        style={{ width: drawerWidth, maxWidth: "100vw" }}
      >
        {/* Nav arrows */}
        {files.length > 1 && !isMobile && (
          <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
            <button type="button" onClick={goPrev} disabled={currentIndex <= 0} className="p-1.5 rounded-lg bg-popover border border-border shadow-md hover:bg-accent disabled:opacity-30 transition-colors" aria-label="Previous file">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={goNext} disabled={currentIndex >= files.length - 1} className="p-1.5 rounded-lg bg-popover border border-border shadow-md hover:bg-accent disabled:opacity-30 transition-colors" aria-label="Next file">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-2xl shrink-0">{icon.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate max-w-[340px]">{file.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {typeLabel} · {formatFileSize(file.size)} · 🗑️ In Trash
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0" aria-label="Close preview">
            {isMobile ? <ChevronLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="px-5 py-4">
            <div className="rounded-xl bg-muted/20 border border-border/50 p-4 flex items-center justify-center min-h-[180px]">
              {renderPreview()}
            </div>
          </div>

          {/* Deletion countdown banner */}
          <div className="px-5 pb-3">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
              severity === "critical" ? "bg-destructive/10 text-destructive border border-destructive/20" :
              severity === "warning" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20" :
              "bg-muted/50 text-muted-foreground border border-border/50"
            }`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Auto-deletes in {daysLeft} days
              {severity === "warning" && " ⚠️"}
              {severity === "critical" && " 🔴"}
            </div>
          </div>

          {/* Info Panel */}
          <div className="px-5 py-4 border-t border-border">
            <div className="flex flex-col">
              <InfoRow label="Type" value={
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium">
                  {icon.emoji} {typeLabel}
                </span>
              } />
              <InfoRow label="Size" value={formatFileSize(file.size)} />
              {file.dimensions && <InfoRow label="Dimensions" value={`${file.dimensions.width} × ${file.dimensions.height} px`} />}
              {file.pageCount && <InfoRow label="Pages" value={String(file.pageCount)} />}
              {file.sheetNames && <InfoRow label="Sheets" value={file.sheetNames.join(", ")} />}
              <InfoRow label="Created" value={format(file.createdAt, "MMM d, yyyy")} />
              {ownerUser && (
                <InfoRow label="Owner" value={
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[8px] font-bold flex items-center justify-center shrink-0">
                      {ownerUser.displayName?.charAt(0) || "?"}
                    </span>
                    {ownerUser.displayName}
                  </span>
                } />
              )}
              <InfoRow label="Deleted" value={file.deletedAt ? formatDistanceToNow(file.deletedAt, { addSuffix: true }) : "Unknown"} />
              {deletedByUser && (
                <InfoRow label="Deleted by" value={
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-destructive/15 text-destructive text-[8px] font-bold flex items-center justify-center shrink-0">
                      {deletedByUser.displayName?.charAt(0) || "?"}
                    </span>
                    {deletedByUser.displayName}
                  </span>
                } />
              )}
              <InfoRow label="Original location" value={
                <span className="flex items-center gap-1">
                  <FolderIcon className="w-3 h-3 text-muted-foreground" />
                  {file.originalFolderPath || "Unknown"}
                </span>
              } />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
          <button type="button"
            onClick={() => onRecover(file)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore
          </button>
          {isOwnerOrAdmin && (
            <button type="button"
              onClick={() => onPermanentDelete(file)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
            </button>
          )}
        </div>
      </div>
    </>
  );
}
