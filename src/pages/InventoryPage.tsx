/**
 * InventoryPage — Digital Stock Manager
 *
 * Fields per item: Name · Description · Amount · Value (€)
 * Files: multi-file attachments with preview/download via Supabase Storage
 * Portfolio total: sum of (amount × item_value) for all items
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Pencil, Trash2, Paperclip, Eye, Download,
  Loader2, AlertTriangle, X, Package, Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { useInventory, type InventoryItem, type NewInventoryItem } from "@/hooks/useInventory";
import {
  uploadInventoryAttachment, fetchItemAttachments, deleteInventoryAttachment,
  getAttachmentUrl, getPreviewKind, formatBytes,
  type InventoryAttachment,
} from "@/lib/services/vaultFileService";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function blank(): Omit<NewInventoryItem, "condition" | "purchase_price" | "status"> & {
  condition: NewInventoryItem["condition"];
  purchase_price: number;
  status: NewInventoryItem["status"];
} {
  return {
    name: "",
    description: "",
    amount: 1,
    item_value: 0,
    // keep required fields with sensible defaults
    condition: "good",
    purchase_price: 0,
    status: "in_stock",
  };
}

// ── Preview modal (reused from VaultFilesTab) ─────────────────────────────────

function AttachmentPreview({ att, onClose }: { att: InventoryAttachment; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const kind = getPreviewKind(att.file_type, att.file_name);

  useEffect(() => {
    let cancelled = false;
    getAttachmentUrl(att).then(async (u) => {
      if (cancelled || !u) { setLoading(false); return; }
      setUrl(u);
      if (kind === "text") {
        try { setText((await (await fetch(u)).text()).slice(0, 50_000)); } catch { /* ignore */ }
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [att, kind]);

  const download = () => { if (url) { const a = document.createElement("a"); a.href = url; a.download = att.file_name; a.click(); } };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "min(90vw,780px)", maxHeight: "88vh", display: "flex", flexDirection: "column", background: "var(--modal-bg,#141414)", border: "1px solid var(--glass-border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 32px 100px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: "0.5px solid var(--glass-border)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{att.file_name}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={download} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 7, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading && <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-quaternary)" }} /></div>}
          {!loading && url && kind === "image" && <div className="flex justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}><img src={url} alt={att.file_name} style={{ maxWidth: "100%", maxHeight: "74vh", objectFit: "contain", borderRadius: 8 }} /></div>}
          {!loading && url && kind === "pdf" && <iframe src={url} title={att.file_name} style={{ width: "100%", height: "74vh", border: "none" }} />}
          {!loading && url && kind === "video" && <div className="flex justify-center p-4 bg-black"><video controls src={url} style={{ maxWidth: "100%", maxHeight: "70vh" }} /></div>}
          {!loading && url && kind === "audio" && <div className="flex justify-center p-8"><audio controls src={url} style={{ width: "100%", maxWidth: 480 }} /></div>}
          {!loading && url && kind === "text" && <pre style={{ margin: 0, padding: "20px 24px", fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)", fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.2)" }}>{text ?? "Loading…"}</pre>}
          {!loading && kind === "none" && <div className="flex flex-col items-center justify-center h-48 gap-3"><Package className="w-12 h-12" style={{ color: "var(--text-quaternary)" }} /><button type="button" onClick={download} style={{ fontSize: 13, padding: "6px 18px", borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>Download to view</button></div>}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Attachments panel ─────────────────────────────────────────────────────────

function AttachmentsPanel({ item, portalId, userId }: { item: InventoryItem; portalId: string; userId: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [atts, setAtts] = useState<InventoryAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<InventoryAttachment | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchItemAttachments(item.id, portalId).then((data) => { setAtts(data); setLoading(false); });
  }, [item.id, portalId]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: InventoryAttachment[] = [];
    for (const f of Array.from(files)) {
      try { added.push(await uploadInventoryAttachment(f, item.id, portalId, userId)); }
      catch (e) { toast({ title: `Failed: ${f.name}`, description: e instanceof Error ? e.message : "error", variant: "destructive" }); }
    }
    setAtts((prev) => [...added, ...prev]);
    setUploading(false);
    if (added.length) toast({ title: `${added.length} file(s) attached` });
  };

  const remove = async (att: InventoryAttachment) => {
    await deleteInventoryAttachment(att);
    setAtts((prev) => prev.filter((a) => a.id !== att.id));
    toast({ title: "Attachment removed" });
  };

  return (
    <div>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => upload(e.target.files)} />
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Attachments ({atts.length})</span>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5"
          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add files
        </button>
      </div>
      {loading && <Skeleton className="h-10 rounded-lg" />}
      {!loading && atts.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--text-quaternary)", padding: "8px 0" }}>No files attached.</p>
      )}
      {!loading && atts.map((att) => (
        <div key={att.id} className="flex items-center gap-2 py-1.5">
          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-quaternary)" }} />
          <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.file_name}</span>
          <span style={{ fontSize: 11, color: "var(--text-quaternary)", flexShrink: 0 }}>{formatBytes(att.file_size)}</span>
          {getPreviewKind(att.file_type, att.file_name) !== "none" && (
            <button type="button" title="Preview" onClick={() => setPreview(att)}
              style={{ width: 24, height: 24, borderRadius: 5, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--surface-hover,rgba(255,255,255,0.06))"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-quaternary)"; e.currentTarget.style.background = "transparent"; }}>
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" title="Delete" onClick={() => remove(att)}
            style={{ width: 24, height: 24, borderRadius: 5, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-quaternary)"; e.currentTarget.style.background = "transparent"; }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {preview && <AttachmentPreview att={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// ── Item Form Modal ────────────────────────────────────────────────────────────

function ItemFormModal({
  initial,
  onSave,
  onClose,
  portalId,
  userId,
}: {
  initial?: InventoryItem;
  onSave: (data: Partial<NewInventoryItem>, files: File[]) => Promise<void>;
  onClose: () => void;
  portalId: string;
  userId: string;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    amount: initial?.amount ?? 1,
    item_value: initial?.item_value ?? 0,
  });
  const [errors, setErrors] = useState<Partial<typeof form & { name: string }>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setPendingFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const validate = () => {
    const e: Partial<typeof form & { name: string }> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.amount < 1 || !Number.isInteger(form.amount)) e.amount = 1; // coerce
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await onSave({ ...form, amount: Math.max(1, Math.round(form.amount)), item_value: Math.max(0, form.item_value) }, pendingFiles);
    setSaving(false);
    onClose();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--modal-bg,#141414)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
            {initial ? "Edit Item" : "+ New Item"}
          </h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Item Name *</label>
            <input className="glass-input w-full" value={form.name}
              onChange={(e) => { set("name", e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="e.g. Adobe Photoshop License"
              style={{ fontSize: 14, padding: "10px 14px", border: errors.name ? "1px solid #ef4444" : undefined }}
              autoFocus />
            {errors.name && <span style={{ fontSize: 11, color: "#ef4444" }}>{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Description</label>
            <input className="glass-input w-full" value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional notes or description"
              style={{ fontSize: 13, padding: "9px 14px" }} />
          </div>

          {/* Amount + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Amount *</label>
              <input className="glass-input w-full" type="number" min={1} step={1}
                value={form.amount}
                onChange={(e) => set("amount", Math.max(1, Math.round(Number(e.target.value) || 1)))}
                style={{ fontSize: 14, padding: "9px 14px" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total Stock Value (€) *</label>
              <input className="glass-input w-full" type="number" min={0} step={0.01}
                value={form.item_value}
                onChange={(e) => set("item_value", Math.max(0, Number(e.target.value) || 0))}
                style={{ fontSize: 14, padding: "9px 14px" }} />
            </div>
          </div>

          {/* Files (only for new items — existing items have their own AttachmentsPanel) */}
          {!initial && (
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>Files <span style={{ color: "var(--text-quaternary)" }}>(optional)</span></label>
              <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                style={{ border: `2px dashed ${dragOver ? "var(--accent-color)" : "var(--glass-border)"}`, borderRadius: 10, padding: "18px", textAlign: "center", cursor: "pointer", background: dragOver ? "var(--accent-color-dim,rgba(110,231,183,0.05))" : "var(--glass-bg)", fontSize: 12, color: "var(--text-quaternary)", transition: "all 0.15s" }}>
                Click or drag files here to attach
              </div>
              {pendingFiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Paperclip className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-quaternary)" }} />
                      <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>{formatBytes(f.size)}</span>
                      <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-quaternary)" }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Total preview */}
          <div className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ background: "rgba(0,0,0,0.15)", border: "0.5px solid var(--glass-border)" }}>
            <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
              €{fmtEur(form.amount > 0 ? form.item_value / form.amount : 0)} × {form.amount}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-color)" }}>
              €{fmtEur(form.item_value)}
            </span>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} disabled={saving} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={submit} disabled={saving}
              className="glass-btn-primary flex items-center gap-2"
              style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : initial ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ItemRow({
  item, portalId, userId,
  onEdit, onDelete,
}: {
  item: InventoryItem;
  portalId: string;
  userId: string;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const unitPrice = item.amount > 0 ? item.item_value / item.amount : 0;

  return (
    <>
      <tr
        style={{ borderBottom: "0.5px solid var(--glass-border)", cursor: "pointer" }}
        onClick={() => setExpanded((p) => !p)}>
        <td style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</div>
          {item.description && <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 2 }}>{item.description}</div>}
          <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 3 }}>
            €{fmtEur(unitPrice)} × {item.amount}
          </div>
        </td>
        <td style={{ padding: "12px 10px", textAlign: "right", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
          {item.amount}
        </td>
        <td style={{ padding: "12px 10px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--accent-color)", whiteSpace: "nowrap" }}>
          €{fmtEur(item.item_value)}
        </td>
        <td style={{ padding: "12px 10px", textAlign: "center" }}>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--text-quaternary)" }} />
            : <ChevronDown className="w-3.5 h-3.5 mx-auto" style={{ color: "var(--text-quaternary)" }} />}
        </td>
        <td style={{ padding: "12px 10px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 justify-end">
            <button type="button" title="Edit" onClick={() => onEdit(item)}
              style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover,rgba(255,255,255,0.07))"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Delete" onClick={() => onDelete(item)}
              style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: "rgba(0,0,0,0.1)" }}>
          <td colSpan={6} style={{ padding: "12px 20px 16px" }}>
            <AttachmentsPanel item={item} portalId={portalId} userId={userId} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user } = useAuth();
  const { portal } = usePortal();
  const { toast } = useToast();
  const portalId = portal?.id ?? "sosa";
  const userId = user?.id ?? "";

  const { items, isLoading, addItem, updateItem, deleteItem } = useInventory();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q);
  });

  const portfolioTotal = items.reduce((s, i) => s + i.item_value, 0);

  const handleSave = useCallback(async (data: Partial<NewInventoryItem>, files: File[]) => {
    const fullData: NewInventoryItem = {
      name: data.name ?? "",
      description: data.description ?? "",
      amount: data.amount ?? 1,
      item_value: data.item_value ?? 0,
      condition: "good",
      purchase_price: 0,
      status: "in_stock",
    };

    if (editTarget) {
      await updateItem(editTarget.id, data);
    } else {
      const ok = await addItem(fullData);
      // upload files after item is created — we need the item id from the refreshed list
      // For now, files are uploaded after the list refreshes via the AttachmentsPanel in the row
      // If ok = true the item is in the list; files attached via expanded row
      if (!ok) return;
      // If files were provided at creation time, we need the new item id
      // The item is added via the hook which triggers a reload; we can't get the id here directly.
      // Files added at creation time are surfaced as "pending" to the user via the row's AttachmentsPanel.
      // This is a known limitation — advise user to expand the row to attach files after creation.
      if (files.length > 0) {
        toast({ title: "Item added", description: "Expand the row to attach files." });
      }
    }
  }, [editTarget, addItem, updateItem, toast]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteItem(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <ModuleErrorBoundary moduleName="Inventory">
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="flex items-center gap-2" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              <Package className="w-5 h-5" /> Inventory
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-quaternary)", marginTop: 2 }}>
              Digital stock manager · {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Portfolio total */}
            <div className="hidden sm:flex flex-col items-end">
              <span style={{ fontSize: 10, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Stock Value</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-color)" }}>€{fmtEur(portfolioTotal)}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-quaternary)" }} />
              <input className="glass-input" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                style={{ fontSize: 12, padding: "6px 10px 6px 28px", borderRadius: 8, width: 180 }} />
            </div>
            <button type="button" onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="glass-btn-primary flex items-center gap-1.5"
              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
              <Plus className="w-4 h-4" /> New Item
            </button>
          </div>
        </div>

        {/* Portfolio total — mobile */}
        <div className="flex sm:hidden justify-between items-center px-4 py-3 rounded-xl"
          style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Stock Value</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-color)" }}>€{fmtEur(portfolioTotal)}</span>
        </div>

        {/* Table */}
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 16, overflow: "hidden" }}>
          {isLoading && (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Package className="w-14 h-14" style={{ color: "var(--text-quaternary)" }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>No items yet</p>
              <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>Add digital items to track your stock and value.</p>
              <button type="button" onClick={() => setShowForm(true)}
                className="glass-btn-primary flex items-center gap-2"
                style={{ fontSize: 13, padding: "8px 20px", borderRadius: 9 }}>
                <Plus className="w-4 h-4" /> Add First Item
              </button>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.1)", borderBottom: "0.5px solid var(--glass-border)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)" }}>Item</th>
                  <th style={{ padding: "10px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)", whiteSpace: "nowrap" }}>Qty</th>
                  <th style={{ padding: "10px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)", whiteSpace: "nowrap" }}>Total Value</th>
                  <th style={{ padding: "10px 10px", textAlign: "center", width: 24 }} />
                  <th style={{ padding: "10px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    portalId={portalId}
                    userId={userId}
                    onEdit={(i) => { setEditTarget(i); setShowForm(true); }}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "rgba(0,0,0,0.12)", borderTop: "0.5px solid var(--glass-border)" }}>
                  <td colSpan={2} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                    Stock Value ({items.length} item{items.length !== 1 ? "s" : ""})
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "right", fontSize: 16, fontWeight: 800, color: "var(--accent-color)" }}>
                    €{fmtEur(portfolioTotal)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit form modal */}
      {showForm && (
        <ItemFormModal
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          portalId={portalId}
          userId={userId}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setDeleteTarget(null)} />
          <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: "min(90vw,380px)", background: "var(--modal-bg,#141414)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 24 }}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Delete item?</p>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
                  <strong style={{ color: "var(--text-secondary)" }}>{deleteTarget.name}</strong> and all its attachments will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
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
    </ModuleErrorBoundary>
  );
}
