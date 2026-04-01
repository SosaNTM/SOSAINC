import { getUserById } from "@/lib/authContext";
import {
  getFileTypeIcon, formatFileSize,
  daysUntilPermanentDelete, getCountdownSeverity,
} from "@/lib/cloudStore";
import {
  FolderIcon, Trash2, RotateCcw, Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TrashViewProps, CloudFile } from "./cloud.types";

/* ── Trash Item Card ── */
function TrashItemCard({
  file, isOwnerOrAdmin, onPreview, onRecover, onPermanentDelete,
}: {
  file: CloudFile;
  isOwnerOrAdmin: boolean;
  onPreview: (file: CloudFile) => void;
  onRecover: (file: CloudFile) => void;
  onPermanentDelete: (file: CloudFile) => void;
}) {
  const icon = getFileTypeIcon(file.type);
  const daysLeft = daysUntilPermanentDelete(file);
  const severity = getCountdownSeverity(daysLeft);
  const deletedByUser = file.deletedBy ? getUserById(file.deletedBy) : null;

  return (
    <div
      key={file.id}
      onClick={() => onPreview(file)}
      className="border border-border rounded-xl p-4 mb-2 cursor-pointer hover:border-primary/40 hover:bg-accent/30 hover:shadow-md transition-all duration-200 bg-card"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl">{icon.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
            <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
              <span>
                {formatFileSize(file.size)} • Deleted{" "}
                {file.deletedAt
                  ? formatDistanceToNow(file.deletedAt, { addSuffix: true })
                  : ""}{" "}
                {deletedByUser ? `by ${deletedByUser.displayName}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <FolderIcon className="w-3 h-3" /> Was in:{" "}
                {file.originalFolderPath || "Unknown"}
              </span>
              <span
                className={`flex items-center gap-1 font-medium ${
                  severity === "critical"
                    ? "text-destructive"
                    : severity === "warning"
                      ? "text-yellow-600 dark:text-yellow-500"
                      : "text-muted-foreground"
                }`}
              >
                <Clock className="w-3 h-3" />
                Auto-deletes in {daysLeft} days
                {severity === "warning" && " \u26a0\ufe0f"}
                {severity === "critical" && " \ud83d\udd34"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRecover(file);
          }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
        >
          <RotateCcw className="w-3 h-3" /> Recover
        </button>
        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPermanentDelete(file);
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
          >
            <Trash2 className="w-3 h-3" /> Delete Permanently
          </button>
        )}
      </div>
    </div>
  );
}

/* ── TrashView ── */
export default function TrashView({
  sortedFiles,
  isOwnerOrAdmin,
  setTrashPreviewFile,
  setConfirmPermDelete,
  handleRecover,
}: TrashViewProps) {
  return (
    <>
      {sortedFiles.map((file) => (
        <TrashItemCard
          key={file.id}
          file={file}
          isOwnerOrAdmin={isOwnerOrAdmin}
          onPreview={setTrashPreviewFile}
          onRecover={handleRecover}
          onPermanentDelete={setConfirmPermDelete}
        />
      ))}
    </>
  );
}
