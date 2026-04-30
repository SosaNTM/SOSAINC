import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/authContext";
import { addAuditEntry } from "@/lib/adminStore";
import { usePermission } from "@/lib/permissions";
import { usePortal } from "@/lib/portalContext";
import { getVaultItems, LOCKED_FOLDER_PASSWORD, type VaultItem, type VaultItemType } from "@/lib/vaultStore";
import { fetchVaultItems, createVaultItem } from "@/lib/services/vaultService";
import { VaultFilesTab } from "@/components/vault/VaultFilesTab";
import type { DbVaultItem } from "@/types/database";
import { STORAGE_VAULT_ITEMS, SESSION_VAULT_UNLOCKED } from "@/constants/storageKeys";
import { formatFileSize } from "@/lib/cloudStore";
import { Lock, Unlock, Eye, EyeOff, Copy, Check, Search, Plus, MoreVertical, X, Key, Globe, FileText, StickyNote, Shield, Trash2, ExternalLink, Dice5, AlertTriangle, Link as LinkIcon, Download, Loader2, FolderOpen } from "lucide-react";
import { ActionMenu, type ActionMenuEntry } from "@/components/ActionMenu";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Adapter: DbVaultItem → VaultItem (for display) ──────────────────────────
function dbToVaultItem(db: DbVaultItem): VaultItem {
  let parsed: Record<string, string> = {};
  try { parsed = JSON.parse(db.encrypted_data); } catch { /* malformed — use empty */ }
  return {
    id: db.id,
    type: db.type as VaultItemType,
    name: db.name,
    category: db.category ?? db.type,
    isLocked: db.is_locked,
    createdBy: db.created_by,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    lastAccessedAt: db.last_accessed_at ? new Date(db.last_accessed_at) : null,
    expiresAt: db.expires_at ? new Date(db.expires_at) : null,
    ...(db.type === "credential" && {
      credential: { username: parsed.username ?? "", password: parsed.password ?? "", url: parsed.url ?? "", notes: parsed.notes ?? "" },
    }),
    ...(db.type === "api_key" && {
      apiKey: { key: parsed.key ?? "", service: parsed.service ?? "", environment: parsed.environment ?? "Production", notes: parsed.notes ?? "" },
    }),
    ...(db.type === "note" && { note: { content: parsed.content ?? "" } }),
    ...(db.type === "document" && {
      document: { filename: parsed.filename ?? "", size: Number(parsed.size ?? 0), mimeType: parsed.mimeType ?? "", data: parsed.data },
    }),
  };
}

type Category = "all" | "credentials" | "api_keys" | "documents" | "files" | "locked";

const CATEGORY_TABS: { key: Category; label: string; icon?: React.ReactNode }[] = [
  { key: "all", label: "All" },
  { key: "credentials", label: "Credentials", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "api_keys", label: "API Keys", icon: <Key className="w-3.5 h-3.5" /> },
  { key: "documents", label: "Documents", icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "files", label: "Files", icon: <FolderOpen className="w-3.5 h-3.5" /> },
  { key: "locked", label: "🔐 Locked", icon: <Lock className="w-3.5 h-3.5" /> },
];

function typeIcon(type: VaultItemType) {
  switch (type) {
    case "credential": return <Globe className="w-4.5 h-4.5" style={{ color: "#3b82f6" }} />;
    case "api_key": return <Key className="w-4.5 h-4.5" style={{ color: "#f59e0b" }} />;
    case "document": return <FileText className="w-4.5 h-4.5" style={{ color: "#ef4444" }} />;
    case "note": return <StickyNote className="w-4.5 h-4.5" style={{ color: "#a855f7" }} />;
  }
}

/* ── Reusable VaultField Component ── */
function VaultField({ label, value, isMasked = false, onOpenUrl, onReveal }: {
  label: string;
  value: string;
  isMasked?: boolean;
  onOpenUrl?: () => void;
  onReveal?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();

  const reveal = () => {
    setRevealed(true);
    onReveal?.();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), 10000);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast({ title: "✓ Copied to clipboard", description: `${label} copied` });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const displayValue = isMasked && !revealed ? "••••••••••••" : value;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-quaternary)", marginBottom: 6 }}>
        {label}
      </div>
      <div className="flex items-center gap-2" style={{
        background: "rgba(0, 0, 0, 0.15)",
        border: "0.5px solid var(--glass-border-subtle, var(--glass-border))",
        borderRadius: 8,
        padding: "8px 10px 8px 14px",
      }}>
        <span style={{
          fontSize: 13, color: "var(--text-primary)",
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          letterSpacing: isMasked && !revealed ? "2px" : "0",
        }}>
          {displayValue}
        </span>
        <div className="flex gap-1 flex-shrink-0">
          {isMasked && (
            <button type="button" onClick={revealed ? () => setRevealed(false) : reveal} title={revealed ? "Hide" : "Reveal (10s)"}
              style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover, rgba(255,255,255,0.05))"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          )}
          <button type="button" onClick={copy} title="Copy"
            style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: copied ? "rgba(var(--accent-rgb, 110,231,183), 0.1)" : "transparent", color: copied ? "var(--accent-color)" : "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
            onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = "var(--surface-hover, rgba(255,255,255,0.05))"; e.currentTarget.style.color = "var(--text-secondary)"; }}}
            onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onOpenUrl && (
            <button type="button" onClick={onOpenUrl} title="Open in new tab"
              style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover, rgba(255,255,255,0.05))"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-quaternary)"; }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Vault Item Card ── */
function VaultCard({ item, onDelete, canManage }: { item: VaultItem; onDelete: (id: string) => void; canManage: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();

  function logReveal(field: string) {
    addAuditEntry({
      userId: user?.id ?? "unknown",
      action: `Revealed ${field} for "${item.name}"`,
      category: "vault",
      details: `${item.type} credential accessed`,
      icon: "🔑",
    });
  }

  const expiryWarning = item.expiresAt ? (() => {
    const days = differenceInDays(item.expiresAt!, new Date());
    if (days < 0) return { text: "Expired", color: "#ef4444" };
    if (days < 7) return { text: `Expires in ${days}d`, color: "#ef4444" };
    if (days < 30) return { text: `Expires in ${days}d`, color: "#f59e0b" };
    return { text: `Expires ${format(item.expiresAt!, "MMM d, yyyy")}`, color: "var(--text-quaternary)" };
  })() : null;

  const copyAll = () => {
    if (item.type === "credential" && item.credential) {
      const text = `Username: ${item.credential.username}\nPassword: ${item.credential.password}`;
      navigator.clipboard.writeText(text).then(() =>
        toast({ title: "✓ Copied to clipboard", description: "Username & password copied" })
      );
    }
  };

  const menuItems: ActionMenuEntry[] = [
    ...(item.type === "credential" ? [{ id: "copyall", icon: <Copy className="w-3.5 h-3.5" />, label: "Copy all", onClick: copyAll }] : []),
    { id: "details", icon: <Eye className="w-3.5 h-3.5" />, label: "View details", onClick: () => {} },
    ...(canManage ? [{ type: "divider" as const }, { id: "delete", icon: <Trash2 className="w-3.5 h-3.5" />, label: "Delete", onClick: () => onDelete(item.id), destructive: true }] : []),
  ];

  return (
    <div
      className="relative transition-all duration-200"
      style={{
        background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 12,
        padding: "18px 20px",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)"; e.currentTarget.style.borderColor = "var(--glass-border-hover, var(--glass-border))"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--glass-border)"; }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {typeIcon(item.type)}
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
        </div>
        <ActionMenu
          trigger={<MoreVertical className="w-4 h-4" />}
          items={menuItems}
        />
      </div>

      {/* Body — Credential */}
      {item.type === "credential" && item.credential && (
        <div>
          <VaultField label="Username / Email" value={item.credential.username} />
          <VaultField label="Password" value={item.credential.password} isMasked onReveal={() => logReveal("Password")} />
          {item.credential.url && (
            <VaultField label="URL" value={item.credential.url} onOpenUrl={() => window.open(item.credential!.url.startsWith("http") ? item.credential!.url : `https://${item.credential!.url}`, "_blank")} />
          )}
          {item.credential.notes && (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 600 }}>Notes: </span>
              {item.credential.notes}
            </p>
          )}
        </div>
      )}

      {/* Body — API Key */}
      {item.type === "api_key" && item.apiKey && (
        <div>
          <VaultField label="Key" value={item.apiKey.key} isMasked onReveal={() => logReveal("API Key")} />
          <div className="flex items-center gap-2 mt-1">
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{item.apiKey.service}</span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "var(--glass-bg)", color: "var(--text-quaternary)", border: "0.5px solid var(--glass-border)" }}>{item.apiKey.environment}</span>
          </div>
          {item.apiKey.notes && (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 600 }}>Notes: </span>
              {item.apiKey.notes}
            </p>
          )}
        </div>
      )}

      {/* Body — Document */}
      {item.type === "document" && item.document && (
        <div className="flex items-center justify-between mt-1">
          <div>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "monospace" }}>{item.document.filename}</span>
            <span style={{ fontSize: 11, color: "var(--text-quaternary)", marginLeft: 8 }}>{formatFileSize(item.document.size)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const doc = item.document!;
              if (!doc.data) { toast({ title: "No file data", description: "This item has no downloadable file.", variant: "destructive" }); return; }
              const byteChars = atob(doc.data);
              const bytes = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
              const blob = new Blob([bytes], { type: doc.mimeType || "application/octet-stream" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = doc.filename; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: "var(--glass-bg)", color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; }}>
            <Download className="w-3 h-3" /> Download
          </button>
        </div>
      )}

      {/* Body — Note */}
      {item.type === "note" && item.note && (
        <div>
          <VaultField label="Content" value={item.note.content} isMasked />
          <p className="flex items-center gap-1.5" style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 4 }}>
            <Shield className="w-3 h-3" /> Contains sensitive information
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "0.5px solid var(--glass-border)" }}>
        {item.lastAccessedAt && (
          <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Last used {formatDistanceToNow(item.lastAccessedAt, { addSuffix: true })}</span>
        )}
        {expiryWarning && (
          <span className="flex items-center gap-1" style={{ fontSize: 10, color: expiryWarning.color, fontWeight: 600 }}>
            {differenceInDays(item.expiresAt!, new Date()) < 30 && <AlertTriangle className="w-3 h-3" />}
            {expiryWarning.text}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Menu Item helper ── */
function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 w-full"
      style={{ padding: "7px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, background: "transparent", color: danger ? "#ef4444" : "var(--text-secondary)", textAlign: "left" }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--nav-hover-bg, rgba(255,255,255,0.05))"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
      {icon} {label}
    </button>
  );
}

/* ── Generate Random Password ── */
function generatePassword(length = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let pw = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

/* ── New Item Modal ── */
function NewItemModal({
  onClose, onAdd, userId, portalId,
}: {
  onClose: () => void;
  onAdd: (item: VaultItem) => void;
  userId: string;
  portalId: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<VaultItemType>("credential");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  // Credential
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  // API Key
  const [apiKeyVal, setApiKeyVal] = useState("");
  const [service, setService] = useState("");
  const [env, setEnv] = useState("Production");
  const [expiry, setExpiry] = useState("");
  // Note
  const [noteContent, setNoteContent] = useState("");
  // Document
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setDocError("File is too large (max 10 MB)");
      return;
    }
    setDocError("");
    setDocFile(file);
    // Auto-fill name from filename if empty
    if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, ""));
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const create = async () => {
    if (!name.trim()) { setNameError("Name is required"); return; }
    if (type === "document" && !docFile) { setDocError("Please select a file"); return; }
    setNameError("");
    setSaving(true);

    // Serialize type-specific fields into encrypted_data (plaintext JSON for mock auth)
    let payload: Record<string, string | number> = {};
    if (type === "credential") {
      payload = { username, password, url, notes };
    } else if (type === "api_key") {
      payload = { key: apiKeyVal, service, environment: env, notes };
    } else if (type === "note") {
      payload = { content: noteContent };
    } else if (type === "document" && docFile) {
      const base64 = await readFileAsBase64(docFile);
      payload = { filename: docFile.name, size: docFile.size, mimeType: docFile.type, data: base64 };
    }

    const category = type === "credential" ? "Credentials"
      : type === "api_key" ? "API Keys"
      : type === "document" ? "Documents"
      : "Notes";

    const result = await createVaultItem(
      {
        type,
        name: name.trim(),
        category,
        encrypted_data: JSON.stringify(payload),
        is_locked: isLocked,
        is_favorite: false,
        tags: null,
        user_id: userId,
        created_by: userId,
        expires_at: expiry || null,
      },
      portalId,
    );

    setSaving(false);

    if (!result) {
      // Fallback: add locally with a temp ID so the UI still responds
      const fallback: VaultItem = {
        id: `local_${Date.now()}`, type, name: name.trim(),
        category,
        isLocked, createdBy: userId, createdAt: new Date(), updatedAt: new Date(),
        lastAccessedAt: null, expiresAt: expiry ? new Date(expiry) : null,
        ...(type === "credential" && { credential: { username, password, url, notes } }),
        ...(type === "api_key" && { apiKey: { key: apiKeyVal, service, environment: env, notes } }),
        ...(type === "note" && { note: { content: noteContent } }),
        ...(type === "document" && docFile && { document: { filename: docFile.name, size: docFile.size, mimeType: docFile.type } }),
      };
      onAdd(fallback);
      toast({ title: "Saved locally", description: "Could not reach database — item saved offline." });
      onClose();
      return;
    }

    onAdd(dbToVaultItem(result));
    toast({ title: "✓ Item added to Vault" });
    onClose();
  };

  const types: { key: VaultItemType; label: string; icon: React.ReactNode }[] = [
    { key: "credential", label: "Credential", icon: <Globe className="w-3.5 h-3.5" /> },
    { key: "api_key", label: "API Key", icon: <Key className="w-3.5 h-3.5" /> },
    { key: "document", label: "Document", icon: <FileText className="w-3.5 h-3.5" /> },
    { key: "note", label: "Note", icon: <StickyNote className="w-3.5 h-3.5" /> },
  ];

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[480px] max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--modal-bg, #141414)", backdropFilter: "blur(40px)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 24, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>+ New Vault Item</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Type selector */}
          <div className="flex gap-1.5 flex-wrap">
            {types.map((t) => (
              <button type="button" key={t.key} onClick={() => setType(t.key)} className="flex items-center gap-1.5"
                style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: type === t.key ? "var(--accent-color-dim, rgba(110,231,183,0.15))" : "var(--glass-bg)", color: type === t.key ? "var(--accent-color)" : "var(--text-tertiary)", fontWeight: type === t.key ? 600 : 400, outline: type === t.key ? "1px solid var(--accent-color)" : "0.5px solid var(--glass-border)" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Name *</label>
            <input className="glass-input w-full" value={name}
              onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(""); }}
              placeholder="Item name" style={{ fontSize: 14, padding: "10px 14px", border: nameError ? "1px solid #ef4444" : undefined }} autoFocus />
            {nameError && <span style={{ fontSize: 11, color: "#ef4444" }}>{nameError}</span>}
          </div>

          {/* Dynamic fields */}
          {type === "credential" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>URL</label>
                <input className="glass-input w-full" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={{ fontSize: 13, padding: "8px 12px" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Username / Email</label>
                <input className="glass-input w-full" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" style={{ fontSize: 13, padding: "8px 12px" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Password</label>
                <div className="flex gap-2">
                  <input className="glass-input flex-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{ fontSize: 13, padding: "8px 12px" }} />
                  <button type="button" onClick={() => setPassword(generatePassword())} title="Generate random password"
                    className="glass-btn flex items-center gap-1" style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, flexShrink: 0 }}>
                    <Dice5 className="w-3.5 h-3.5" /> Generate
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Notes</label>
                <input className="glass-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" style={{ fontSize: 13, padding: "8px 12px" }} />
              </div>
            </>
          )}
          {type === "api_key" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>API Key value</label>
                <input className="glass-input w-full" value={apiKeyVal} onChange={(e) => setApiKeyVal(e.target.value)} placeholder="sk_live_..." style={{ fontSize: 13, padding: "8px 12px" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Service name</label>
                  <input className="glass-input w-full" value={service} onChange={(e) => setService(e.target.value)} placeholder="Stripe" style={{ fontSize: 13, padding: "8px 12px" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Environment</label>
                  <select className="glass-input w-full" value={env} onChange={(e) => setEnv(e.target.value)} style={{ fontSize: 13, padding: "8px 12px" }}>
                    <option>Production</option><option>Staging</option><option>Development</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Expiry date</label>
                <input type="date" className="glass-input w-full" value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ fontSize: 13, padding: "8px 12px" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Notes</label>
                <input className="glass-input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" style={{ fontSize: 13, padding: "8px 12px" }} />
              </div>
            </>
          )}
          {type === "note" && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Sensitive content</label>
              <textarea className="glass-input w-full" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Sensitive note content..." rows={5} style={{ fontSize: 13, padding: "10px 12px", resize: "vertical" }} />
            </div>
          )}
          {type === "document" && (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
              {!docFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--accent-color)" : "var(--glass-border)"}`,
                    borderRadius: 12, padding: "32px 16px", background: dragOver ? "var(--accent-color-dim, rgba(110,231,183,0.05))" : "var(--glass-bg)",
                    cursor: "pointer", textAlign: "center", transition: "all 0.15s ease",
                  }}>
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-quaternary)" }} />
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Click to browse or drag & drop</p>
                  <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 4 }}>Any file type · Max 10 MB</p>
                </div>
              ) : (
                <div className="flex items-center gap-3" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "12px 14px" }}>
                  <FileText className="w-8 h-8 flex-shrink-0" style={{ color: "#ef4444" }} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docFile.name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 2 }}>{formatFileSize(docFile.size)} · {docFile.type || "unknown type"}</p>
                  </div>
                  <button type="button" onClick={() => { setDocFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-quaternary)", flexShrink: 0 }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {docError && <span style={{ fontSize: 11, color: "#ef4444" }}>{docError}</span>}
            </div>
          )}

          {/* Locked toggle */}
          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} />
            <Lock className="w-3.5 h-3.5" /> Store in Locked Folder
          </label>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="glass-btn" style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8 }}>Cancel</button>
            <button type="button" onClick={create} disabled={saving} className="glass-btn-primary flex items-center gap-2" style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save to Vault"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ── Main Page ── */
const VaultPage = () => {
  const { user } = useAuth();
  const { portal } = usePortal();
  const canView = usePermission("vault:view");
  const canManage = usePermission("vault:manage");
  const { toast } = useToast();

  const portalId = portal?.id ?? "sosa";

  const [items, setItems] = useState<VaultItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VAULT_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved) as any[];
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          return parsed.map((v) => ({ ...v, createdAt: v.createdAt ? new Date(v.createdAt) : new Date(), expiresAt: v.expiresAt ? new Date(v.expiresAt) : null }));
        }
      }
    } catch { /* ignore */ }
    return [];
  });
  const [category, setCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VAULT_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !(Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id);
      }
    } catch { /* ignore */ }
    return true;
  });

  // Load items from service (Supabase + localStorage fallback), keyed to active portal
  useEffect(() => {
    if (items.length === 0) setIsLoading(true);
    fetchVaultItems(portalId)
      .then((dbItems) => {
        if (dbItems.length > 0) {
          setItems(dbItems.map(dbToVaultItem));
        } else {
          // Fall through to generic localStorage key for backward compatibility
          try {
            const saved = localStorage.getItem(STORAGE_VAULT_ITEMS);
            if (saved) {
              const parsed = JSON.parse(saved) as any[];
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
                setItems(parsed.map((v) => ({ ...v, createdAt: v.createdAt ? new Date(v.createdAt) : new Date(), expiresAt: v.expiresAt ? new Date(v.expiresAt) : null })));
                return;
              }
            }
          } catch { /* ignore */ }
          setItems([]);
        }
      })
      .finally(() => setIsLoading(false));
  }, [portalId]);

  // Locked folder state
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(SESSION_VAULT_UNLOCKED) === "true");
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [rememberSession, setRememberSession] = useState(false);
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetAutoLock = useCallback(() => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    autoLockTimerRef.current = setTimeout(() => {
      setIsUnlocked(false);
      sessionStorage.removeItem(SESSION_VAULT_UNLOCKED);
      toast({ title: "Vault Locked", description: "Locked folder auto-locked after 10 minutes of inactivity" });
    }, 10 * 60 * 1000);
  }, [toast]);

  useEffect(() => {
    if (isUnlocked) resetAutoLock();
    return () => { if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current); };
  }, [isUnlocked, resetAutoLock]);

  const unlock = () => {
    if (lockedUntil && new Date() < lockedUntil) {
      setLockError("Too many attempts. Try again later.");
      return;
    }
    if (lockPassword === LOCKED_FOLDER_PASSWORD) {
      setIsUnlocked(true);
      setLockError("");
      setFailedAttempts(0);
      setLockPassword("");
      if (rememberSession) sessionStorage.setItem(SESSION_VAULT_UNLOCKED, "true");
      resetAutoLock();
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        const until = new Date(Date.now() + 5 * 60 * 1000);
        setLockedUntil(until);
        setLockError("Too many attempts. Try again in 5 minutes.");
      } else {
        setLockError(`Wrong password. ${5 - attempts} attempts remaining.`);
      }
      setLockPassword("");
    }
  };

  const lockFolder = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(SESSION_VAULT_UNLOCKED);
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
  };

  const filtered = useMemo(() => {
    let list = items;
    if (category === "locked") return isUnlocked ? list.filter((i) => i.isLocked) : [];
    if (category === "credentials") list = list.filter((i) => i.type === "credential" && !i.isLocked);
    else if (category === "api_keys") list = list.filter((i) => i.type === "api_key" && !i.isLocked);
    else if (category === "documents") list = list.filter((i) => (i.type === "document") && !i.isLocked);
    else list = list.filter((i) => !i.isLocked);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.apiKey?.service?.toLowerCase().includes(q)));
    }
    return list;
  }, [items, category, searchQuery, isUnlocked]);

  const deleteItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const addItem = (item: VaultItem) => setItems((prev) => [item, ...prev]);

  // Keep legacy localStorage in sync for offline-only items
  useEffect(() => {
    const localOnly = items.filter((i) => i.id.startsWith("local_"));
    if (localOnly.length > 0) localStorage.setItem(STORAGE_VAULT_ITEMS, JSON.stringify(localOnly));
  }, [items]);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Shield className="w-12 h-12" style={{ color: "var(--text-quaternary)" }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Access Denied</h2>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Only Owner and Admin roles can access the Vault.</p>
      </div>
    );
  }

  const credentialItems = filtered.filter((i) => i.type === "credential");
  const apiKeyItems = filtered.filter((i) => i.type === "api_key");
  const docItems = filtered.filter((i) => i.type === "document" || i.type === "note");

  const renderSection = (title: string, sectionItems: VaultItem[]) => {
    if (sectionItems.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h3>
          <span style={{ fontSize: 11, color: "var(--text-quaternary)", padding: "2px 8px", borderRadius: 99, background: "var(--glass-bg)" }}>({sectionItems.length})</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {sectionItems.map((item) => <VaultCard key={item.id} item={item} onDelete={deleteItem} canManage={canManage} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header — outside error boundary so it always renders */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            <Lock className="w-5 h-5" /> Vault
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-quaternary)", marginTop: 2 }}>Secure storage for sensitive company data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-quaternary)" }} />
            <input className="glass-input" autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search vault..." style={{ fontSize: 12, padding: "6px 10px 6px 28px", borderRadius: 8, width: 180 }} />
          </div>
          <button type="button" onClick={() => setShowNewModal(true)} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
            <Plus className="w-4 h-4" /> New Item
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_TABS.map((tab) => (
          <button type="button" key={tab.key} onClick={() => setCategory(tab.key)} className="flex items-center gap-1.5"
            style={{
              fontSize: 12, padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer",
              background: category === tab.key ? "var(--accent-color-dim, rgba(110,231,183,0.15))" : "var(--glass-bg)",
              color: category === tab.key ? "var(--accent-color)" : "var(--text-tertiary)",
              fontWeight: category === tab.key ? 600 : 400,
              outline: category === tab.key ? "1px solid var(--accent-color)" : "0.5px solid var(--glass-border)",
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <ModuleErrorBoundary moduleName="Vault">

      {/* ── Files tab — rendered outside the items content panel ── */}
      {category === "files" && (
        <VaultFilesTab portalId={portalId} userId={user?.id ?? ""} />
      )}

      {/* Content (items — hidden when Files tab is active) */}
      {category !== "files" && (
      <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", minHeight: 400 }}>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        )}
        {!isLoading && <>
        {category !== "locked" && (
          <>
            {category === "all" ? (
              <>
                {renderSection("Credentials", credentialItems)}
                {renderSection("API Keys", apiKeyItems)}
                {renderSection("Documents & Notes", docItems)}
                {filtered.length === 0 && (
                  <EmptyState
                    icon={<Shield style={{ width: 48, height: 48 }} />}
                    title="VAULT IS EMPTY"
                    description={searchQuery ? "No items match your search." : "Securely store passwords, notes, and sensitive information."}
                    actionLabel="ADD ITEM"
                    onAction={() => setShowNewModal(true)}
                  />
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filtered.map((item) => <VaultCard key={item.id} item={item} onDelete={deleteItem} canManage={canManage} />)}
                {filtered.length === 0 && (
                  <div className="col-span-2">
                    <EmptyState
                      icon={<Shield style={{ width: 48, height: 48 }} />}
                      title="VAULT IS EMPTY"
                      description="No items in this category."
                      actionLabel="ADD ITEM"
                      onAction={() => setShowNewModal(true)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Locked folder teaser in "All" view */}
            {category === "all" && (
              <div className="mt-6" style={{ borderTop: "2px dashed var(--sosa-yellow)", paddingTop: 20 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4" style={{ color: "var(--sosa-yellow)" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)" }}>LOCKED FOLDER</span>
                  <span style={{ fontSize: 11, color: "var(--text-quaternary)", padding: "2px 8px", borderRadius: 99, background: "var(--glass-bg)" }}>
                    ({items.filter((i) => i.isLocked).length})
                  </span>
                </div>
                {!isUnlocked ? (
                  <LockedUI lockPassword={lockPassword} setLockPassword={setLockPassword} lockError={lockError} unlock={unlock} rememberSession={rememberSession} setRememberSession={setRememberSession} />
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--sosa-yellow)", fontWeight: 600 }}>
                        <Unlock className="w-3.5 h-3.5" /> Unlocked
                      </span>
                      <button type="button" onClick={lockFolder} className="glass-btn flex items-center gap-1" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6 }}>
                        <Lock className="w-3 h-3" /> Lock
                      </button>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {items.filter((i) => i.isLocked).map((item) => <VaultCard key={item.id} item={item} onDelete={deleteItem} canManage={canManage} />)}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 8 }}>Auto-locks in 10 minutes</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Locked tab */}
        {category === "locked" && (
          <>
            {!isUnlocked ? (
              <LockedUI lockPassword={lockPassword} setLockPassword={setLockPassword} lockError={lockError} unlock={unlock} rememberSession={rememberSession} setRememberSession={setRememberSession} />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    <Unlock className="w-4 h-4" style={{ color: "var(--sosa-yellow)" }} /> Locked Folder (Unlocked)
                  </span>
                  <button type="button" onClick={lockFolder} className="glass-btn flex items-center gap-1.5" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8 }}>
                    <Lock className="w-3.5 h-3.5" /> Lock
                  </button>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {items.filter((i) => i.isLocked).map((item) => <VaultCard key={item.id} item={item} onDelete={deleteItem} canManage={canManage} />)}
                </div>
                <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 12 }}>Auto-locks in 10 minutes of inactivity</p>
              </div>
            )}
          </>
        )}
        </>}
      </div>
      )} {/* end category !== "files" */}
    </ModuleErrorBoundary>
    {showNewModal && <NewItemModal onClose={() => setShowNewModal(false)} onAdd={addItem} userId={user?.id || ""} portalId={portalId} />}
  </div>
);
};

/* ── Locked UI ── */
function LockedUI({ lockPassword, setLockPassword, lockError, unlock, rememberSession, setRememberSession }: {
  lockPassword: string; setLockPassword: (v: string) => void; lockError: string; unlock: () => void; rememberSession: boolean; setRememberSession: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12"
      style={{ background: "var(--sosa-bg-2)", border: "2px dashed var(--sosa-yellow)", borderRadius: 0, padding: "40px 24px" }}>
      <Lock className="w-10 h-10" style={{ color: "var(--sosa-yellow)" }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Locked Folder</h3>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", maxWidth: 300 }}>
        This folder is protected by a password. Enter the password to view its contents.
      </p>
      <div className="flex gap-2 w-full max-w-[300px]">
        <input
          type="password"
          autoComplete="new-password"
          className="glass-input flex-1"
          value={lockPassword}
          onChange={(e) => setLockPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") unlock(); }}
          placeholder="Enter password"
          style={{ fontSize: 13, padding: "8px 12px", borderRadius: 0 }}
        />
        <button type="button" onClick={unlock} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, padding: "8px 14px", background: "var(--sosa-yellow)", color: "#000", border: "none", borderRadius: 0, cursor: "pointer", letterSpacing: "0.04em" }}>
          <Unlock className="w-3.5 h-3.5" /> Unlock
        </button>
      </div>
      {lockError && <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 500 }}>{lockError}</p>}
      <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: "var(--text-quaternary)" }}>
        <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)} />
        Remember for this session
      </label>
      <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Wrong password? Contact the Owner.</p>
    </div>
  );
}

export default VaultPage;
