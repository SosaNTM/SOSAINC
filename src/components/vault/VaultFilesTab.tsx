/**
 * VaultFilesTab — full file-management section inside the Vault page.
 *
 * Features:
 *  • Drag-and-drop / click upload (any file, 50 MB max)
 *  • File list: icon, name, size, date, uploader, actions
 *  • Preview modal: image / PDF / video / audio / text-as-code / unsupported
 *  • Download via signed URL  (or local data-URL for offline files)
 *  • Delete with confirmation
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Upload, FileText, Image as ImageIcon, Film, Music, File as FileIcon,
  Download, Trash2, Eye, X, Loader2, AlertTriangle, Code,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchVaultFiles, uploadVaultFile, getFileUrl, deleteVaultFile,
  getPreviewKind, formatBytes,
  type VaultFile, type PreviewKind,
} from "@/lib/services/vaultFileService";

// ── Icon per file type ─────────────────────────────────────────────────────────

function FileTypeIcon({ kind, mimeType }: { kind: PreviewKind; mimeType: string | null }) {
  const cls = "w-5 h-5 flex-shrink-0";
  if (kind === "image") return <ImageIcon className={cls} style={{ color: "#a78bfa" }} />;
  if (kind === "pdf")   return <FileText  className={cls} style={{ color: "#ef4444" }} />;
  if (kind === "video") return <Film      className={cls} style={{ color: "#3b82f6" }} />;
  if (kind === "audio") return <Music     className={cls} style={{ color: "#f59e0b" }} />;
  if (kind === "text")  return <Code      className={cls} style={{ color: "#22c55e" }} />;
  return <FileIcon className={cls} style={{ color: "var(--text-quaternary)" }} />;
}

// ── Preview Modal ──────────────────────────────────────────────────────────────

function PreviewModal({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const kind: PreviewKind = getPreviewKind(file.file_type, file.file_name);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(false); setTextContent(null);

    getFileUrl(file).then(async (signedUrl) => {
      if (cancelled) return;
      if (!signedUrl) { setErr(true); setLoading(false); return; }
      setUrl(signedUrl);

      if (kind === "text") {
        try {
          const resp = await fetch(signedUrl);
          const text = await resp.text();
          if (!cancelled) setTextContent(text.slice(0, 50_000));
        } catch { /* show download fallback */ }
      }

      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [file, kind]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = file.file_name; a.click();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div
        className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: kind === "text" || kind === "pdf" ? "min(90vw, 860px)" : "min(90vw, 680px)",
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          background: "var(--modal-bg, #141414)", border: "1px solid var(--glass-border)",
          borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 100px rgba(0,0,0,0.7)",
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "0.5px solid var(--glass-border)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeIcon kind={kind} mimeType={file.file_type} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.file_name}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-quaternary)", flexShrink: 0 }}>
              {formatBytes(file.file_size)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button type="button" onClick={download}
              className="flex items-center gap-1.5"
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button type="button" onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-quaternary)" }} />
            </div>
          )}
          {!loading && err && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <AlertTriangle className="w-10 h-10" style={{ color: "#f59e0b" }} />
              <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Could not load preview.</p>
              <button type="button" onClick={download}
                style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>
                Download to view
              </button>
            </div>
          )}
          {!loading && !err && url && (
            <>
              {kind === "image" && (
                <div className="flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <img src={url} alt={file.file_name} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8 }} />
                </div>
              )}
              {kind === "pdf" && (
                <iframe src={url} title={file.file_name} style={{ width: "100%", height: "75vh", border: "none" }} />
              )}
              {kind === "video" && (
                <div className="flex items-center justify-center p-4" style={{ background: "black" }}>
                  <video controls src={url} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8 }} />
                </div>
              )}
              {kind === "audio" && (
                <div className="flex items-center justify-center p-8">
                  <audio controls src={url} style={{ width: "100%", maxWidth: 480 }} />
                </div>
              )}
              {kind === "text" && (
                <pre style={{
                  margin: 0, padding: "20px 24px", fontSize: 12, lineHeight: 1.6,
                  color: "var(--text-secondary)", fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace",
                  overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: "rgba(0,0,0,0.2)",
                }}>
                  {textContent ?? "Loading text…"}
                </pre>
              )}
              {kind === "none" && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <FileIcon className="w-16 h-16" style={{ color: "var(--text-quaternary)" }} />
                  <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No preview available for this file type.</p>
                  <button type="button" onClick={download}
                    className="flex items-center gap-2"
                    style={{ fontSize: 13, padding: "8px 20px", borderRadius: 9, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>
                    <Download className="w-4 h-4" /> Download to view
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── File Row ───────────────────────────────────────────────────────────────────

function FileRow({
  file,
  onPreview,
  onDelete,
}: {
  file: VaultFile;
  onPreview: (f: VaultFile) => void;
  onDelete: (f: VaultFile) => void;
}) {
  const kind = getPreviewKind(file.file_type, file.file_name);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    const url = await getFileUrl(file);
    if (url) {
      const a = document.createElement("a");
      a.href = url; a.download = file.file_name; a.click();
    }
    setDownloading(false);
  };

  return (
    <div
      className="flex items-center gap-3 group"
      style={{
        padding: "10px 14px", borderRadius: 10,
        borderBottom: "0.5px solid var(--glass-border)",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-hover, rgba(255,255,255,0.03))"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>

      <FileTypeIcon kind={kind} mimeType={file.file_type} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.file_name}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 1 }}>
          {formatBytes(file.file_size)}
          {file.file_type && <> · <span style={{ fontFamily: "monospace" }}>{file.file_type}</span></>}
          {" · "}{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {kind !== "none" && (
          <button type="button" title="Preview" onClick={() => onPreview(file)}
            style={{ width: 30, height: 30, borderRadius: 7, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover, rgba(255,255,255,0.07))"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button type="button" title="Download" onClick={download} disabled={downloading}
          style={{ width: 30, height: 30, borderRadius: 7, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover, rgba(255,255,255,0.07))"; e.currentTarget.style.color = "var(--accent-color)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
        <button type="button" title="Delete" onClick={() => onDelete(file)}
          style={{ width: 30, height: 30, borderRadius: 7, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function VaultFilesTab({
  portalId,
  userId,
}: {
  portalId: string;
  userId: string;
}) {
  const { toast } = useToast();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VaultFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchVaultFiles(portalId);
    setFiles(data);
    setLoading(false);
  }, [portalId]);

  useEffect(() => { load(); }, [load]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const added: VaultFile[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const result = await uploadVaultFile(file, portalId, userId);
        added.push(result);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
    }

    setFiles((prev) => [...added, ...prev]);
    setUploading(false);

    if (added.length > 0) {
      const local = added.some((f) => f.id.startsWith("local_"));
      toast({
        title: local ? `${added.length} file(s) saved locally` : `${added.length} file(s) uploaded`,
        description: local ? "Supabase Storage unreachable — stored offline." : undefined,
      });
    }
    if (errors.length > 0) {
      toast({ title: "Some uploads failed", description: errors.join(" · "), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteVaultFile(confirmDelete);
    setFiles((prev) => prev.filter((f) => f.id !== confirmDelete.id));
    toast({ title: "File deleted" });
    setDeleting(false);
    setConfirmDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload zone */}
      <div
        ref={dropRef}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragOver ? "var(--accent-color)" : "var(--glass-border)"}`,
          borderRadius: 14,
          padding: "28px 20px",
          textAlign: "center",
          cursor: uploading ? "wait" : "pointer",
          background: dragOver ? "var(--accent-color-dim, rgba(110,231,183,0.05))" : "var(--glass-bg)",
          transition: "all 0.15s ease",
        }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-color)" }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8" style={{ color: dragOver ? "var(--accent-color)" : "var(--text-quaternary)" }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
              Click to browse or drag & drop files
            </p>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>
              Any file type · Multiple files supported · 50 MB per file
            </p>
          </div>
        )}
      </div>

      {/* File list */}
      <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 14, overflow: "hidden" }}>
        {loading && (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        )}
        {!loading && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileIcon className="w-12 h-12" style={{ color: "var(--text-quaternary)" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>No files yet</p>
            <p style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Upload files above to store them securely in the Vault.</p>
          </div>
        )}
        {!loading && files.length > 0 && (
          <div>
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: "0.5px solid var(--glass-border)", background: "rgba(0,0,0,0.1)" }}>
              <div style={{ width: 20 }} />
              <span style={{ flex: 1, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)" }}>File</span>
              <span style={{ width: 90, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)", textAlign: "right" }}>Actions</span>
            </div>
            {files.map((f) => (
              <FileRow key={f.id} file={f} onPreview={setPreviewFile} onDelete={setConfirmDelete} />
            ))}
            <div className="px-4 py-2" style={{ background: "rgba(0,0,0,0.1)", borderTop: "0.5px solid var(--glass-border)" }}>
              <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>
                {files.length} file{files.length !== 1 ? "s" : ""} ·{" "}
                {formatBytes(files.reduce((s, f) => s + (f.file_size ?? 0), 0))} total
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

      {/* Delete confirmation */}
      {confirmDelete && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setConfirmDelete(null)} />
          <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: "min(90vw, 400px)", background: "var(--modal-bg, #141414)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Delete file?</p>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
                  <strong style={{ color: "var(--text-secondary)" }}>{confirmDelete.file_name}</strong> will be permanently deleted from storage.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={deleting}
                style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: deleting ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
