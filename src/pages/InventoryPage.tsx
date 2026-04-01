import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Package, Pencil, Trash2, ExternalLink } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInventory,
  type InventoryItem,
  type NewInventoryItem,
  type InventoryCondition,
  type InventoryStatus,
  type InventoryPlatform,
} from "@/hooks/useInventory";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONDITIONS: { value: InventoryCondition; label: string }[] = [
  { value: "new",       label: "New" },
  { value: "excellent", label: "Excellent" },
  { value: "good",      label: "Good" },
  { value: "fair",      label: "Fair" },
  { value: "poor",      label: "Poor" },
];

const PLATFORMS: { value: InventoryPlatform; label: string }[] = [
  { value: "vestiaire", label: "Vestiaire" },
  { value: "depop",     label: "Depop" },
  { value: "vinted",    label: "Vinted" },
  { value: "wallapop",  label: "Wallapop" },
  { value: "ebay",      label: "eBay" },
  { value: "shopify",   label: "Shopify" },
  { value: "other",     label: "Other" },
];

const STATUS_CONFIG: Record<InventoryStatus, { label: string; bg: string; color: string }> = {
  in_stock: { label: "In Stock",  bg: "rgba(34,197,94,0.2)",   color: "#22c55e" },
  listed:   { label: "Listed",    bg: "rgba(232,255,0,0.2)",   color: "#e8ff00" },
  sold:     { label: "Sold",      bg: "rgba(99,102,241,0.2)",  color: "#818cf8" },
  shipped:  { label: "Shipped",   bg: "rgba(59,130,246,0.2)",  color: "#60a5fa" },
  returned: { label: "Returned",  bg: "rgba(239,68,68,0.2)",   color: "#f87171" },
};

const CONDITION_CONFIG: Record<InventoryCondition, { label: string; color: string }> = {
  new:       { label: "New",       color: "#22c55e" },
  excellent: { label: "Excellent", color: "#4ade80" },
  good:      { label: "Good",      color: "#e8ff00" },
  fair:      { label: "Fair",      color: "#fb923c" },
  poor:      { label: "Poor",      color: "#f87171" },
};

const ALL_STATUSES: InventoryStatus[] = ["in_stock", "listed", "sold", "shipped", "returned"];

type StatusFilter = "all" | InventoryStatus;
type PlatformFilter = "all" | InventoryPlatform;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Blank form ─────────────────────────────────────────────────────────────────

function blankForm(): NewInventoryItem {
  return {
    name: "",
    brand: "",
    category: "",
    size: "",
    condition: "good",
    purchase_price: 0,
    listing_price: undefined,
    sale_price: undefined,
    sku: "",
    status: "in_stock",
    platform: undefined,
    platform_url: "",
    platform_listing_id: "",
    purchase_date: "",
    sale_date: "",
    notes: "",
    image_url: "",
  };
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InventoryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
      background: cfg.bg, color: cfg.color, letterSpacing: "0.04em", textTransform: "uppercase",
      fontFamily: "'Space Mono', monospace",
    }}>
      {cfg.label}
    </span>
  );
}

// ── Condition Badge ───────────────────────────────────────────────────────────

function ConditionBadge({ condition }: { condition: InventoryCondition }) {
  const cfg = CONDITION_CONFIG[condition];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
      background: `${cfg.color}18`, color: cfg.color, letterSpacing: "0.03em",
      textTransform: "capitalize",
    }}>
      {cfg.label}
    </span>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const profit = item.status === "sold" && item.sale_price != null
    ? item.sale_price - item.purchase_price
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "var(--glass-bg)",
        border: "0.5px solid var(--glass-border)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(232,255,0,0.25)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)"; }}
    >
      {/* Image placeholder */}
      <div style={{
        width: "100%", aspectRatio: "4/3", borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px dashed rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Package style={{ width: 32, height: 32, color: "rgba(255,255,255,0.12)" }} />
        )}
      </div>

      {/* Name + brand */}
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
          {item.name}
        </p>
        {item.brand && (
          <p style={{ fontSize: 11, color: "var(--text-quaternary)", margin: "2px 0 0", letterSpacing: "0.03em" }}>
            {item.brand}
            {item.size ? ` · ${item.size}` : ""}
          </p>
        )}
      </div>

      {/* Badges row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <StatusBadge status={item.status} />
        <ConditionBadge condition={item.condition} />
        {item.sku && (
          <span style={{ fontSize: 9, color: "var(--text-quaternary)", padding: "2px 6px", borderRadius: 99, background: "rgba(255,255,255,0.05)", fontFamily: "'Space Mono', monospace" }}>
            {item.sku}
          </span>
        )}
      </div>

      {/* Prices */}
      <div style={{ display: "flex", gap: 12 }}>
        <div>
          <p style={{ fontSize: 9, color: "var(--text-quaternary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cost</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "1px 0 0" }}>
            €{fmtEur(item.purchase_price)}
          </p>
        </div>
        {item.listing_price != null && (
          <div>
            <p style={{ fontSize: 9, color: "var(--text-quaternary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Listed</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#e8ff00", margin: "1px 0 0" }}>
              €{fmtEur(item.listing_price)}
            </p>
          </div>
        )}
        {profit !== null && (
          <div>
            <p style={{ fontSize: 9, color: "var(--text-quaternary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Profit</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: profit >= 0 ? "#4ade80" : "#f87171", margin: "1px 0 0" }}>
              {profit >= 0 ? "+" : ""}€{fmtEur(profit)}
            </p>
          </div>
        )}
      </div>

      {/* Platform + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {item.platform && (
            <span style={{ fontSize: 10, color: "var(--text-quaternary)", textTransform: "capitalize" }}>
              {item.platform}
            </span>
          )}
          {item.platform_url && (
            <a href={item.platform_url} target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--text-quaternary)", display: "flex" }}
              onClick={(e) => e.stopPropagation()}>
              <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => onEdit(item)}
            title="Edit"
            style={{
              width: 28, height: 28, borderRadius: 8, border: "0.5px solid var(--glass-border)",
              background: "var(--glass-bg-subtle)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-quaternary)",
            }}
          >
            <Pencil style={{ width: 12, height: 12 }} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            title="Delete"
            style={{
              width: 28, height: 28, borderRadius: 8, border: "0.5px solid rgba(255,90,90,0.2)",
              background: "rgba(255,90,90,0.06)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FF5A5A",
            }}
          >
            <Trash2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

interface ItemModalProps {
  open: boolean;
  editItem: InventoryItem | null;
  onClose: () => void;
  onSave: (data: NewInventoryItem) => Promise<boolean>;
  onUpdate: (id: string, changes: Partial<NewInventoryItem>) => Promise<boolean>;
}

function ItemModal({ open, editItem, onClose, onSave, onUpdate }: ItemModalProps) {
  const [form, setForm] = useState<NewInventoryItem>(blankForm());

  // Populate form when editing
  useMemo(() => {
    if (editItem) {
      setForm({
        name: editItem.name,
        brand: editItem.brand ?? "",
        category: editItem.category ?? "",
        size: editItem.size ?? "",
        condition: editItem.condition,
        purchase_price: editItem.purchase_price,
        listing_price: editItem.listing_price,
        sale_price: editItem.sale_price,
        sku: editItem.sku ?? "",
        status: editItem.status,
        platform: editItem.platform,
        platform_url: editItem.platform_url ?? "",
        platform_listing_id: editItem.platform_listing_id ?? "",
        purchase_date: editItem.purchase_date ?? "",
        sale_date: editItem.sale_date ?? "",
        notes: editItem.notes ?? "",
        image_url: editItem.image_url ?? "",
      });
    } else {
      setForm(blankForm());
    }
  }, [editItem, open]);

  if (!open) return null;

  function set<K extends keyof NewInventoryItem>(key: K, value: NewInventoryItem[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean: NewInventoryItem = {
      ...form,
      purchase_price: Number(form.purchase_price) || 0,
      listing_price: form.listing_price != null && form.listing_price !== ("" as unknown) ? Number(form.listing_price) : undefined,
      sale_price: form.sale_price != null && form.sale_price !== ("" as unknown) ? Number(form.sale_price) : undefined,
      brand: form.brand || undefined,
      category: form.category || undefined,
      size: form.size || undefined,
      sku: form.sku || undefined,
      platform_url: form.platform_url || undefined,
      platform_listing_id: form.platform_listing_id || undefined,
      purchase_date: form.purchase_date || undefined,
      sale_date: form.sale_date || undefined,
      notes: form.notes || undefined,
      image_url: form.image_url || undefined,
    };

    let ok = false;
    if (editItem) {
      ok = await onUpdate(editItem.id, clean);
    } else {
      ok = await onSave(clean);
    }
    if (ok) onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 12,
    background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.12)",
    color: "var(--text-primary)", outline: "none", fontFamily: "'Space Mono', monospace",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
    color: "var(--text-quaternary)", marginBottom: 4, display: "block",
  };
  const rowStyle: React.CSSProperties = {
    display: "grid", gap: 12,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "#0d0d0d", border: "0.5px solid rgba(232,255,0,0.2)",
          borderRadius: 16, padding: "24px", width: "100%", maxWidth: 520,
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#e8ff00", margin: 0, letterSpacing: 1 }}>
            {editItem ? "EDIT ITEM" : "ADD ITEM"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-quaternary)", fontSize: 20 }}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              style={inputStyle} required value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Item name"
            />
          </div>

          {/* Brand + Category */}
          <div style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Brand</label>
              <input style={inputStyle} value={form.brand ?? ""} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Nike" />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <input style={inputStyle} value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Sneakers" />
            </div>
          </div>

          {/* Size + Condition */}
          <div style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Size</label>
              <input style={inputStyle} value={form.size ?? ""} onChange={(e) => set("size", e.target.value)} placeholder="e.g. 42" />
            </div>
            <div>
              <label style={labelStyle}>Condition</label>
              <select style={inputStyle} value={form.condition} onChange={(e) => set("condition", e.target.value as InventoryCondition)}>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* SKU */}
          <div>
            <label style={labelStyle}>SKU</label>
            <input style={inputStyle} value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} placeholder="Stock keeping unit" />
          </div>

          {/* Prices */}
          <div style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Purchase Price (€)</label>
              <input
                type="number" min="0" step="0.01" style={inputStyle}
                value={form.purchase_price ?? ""}
                onChange={(e) => set("purchase_price", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label style={labelStyle}>Listing Price (€)</label>
              <input
                type="number" min="0" step="0.01" style={inputStyle}
                value={form.listing_price ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("listing_price", v === "" ? undefined : parseFloat(v));
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Sale Price (€)</label>
              <input
                type="number" min="0" step="0.01" style={inputStyle}
                value={form.sale_price ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("sale_price", v === "" ? undefined : parseFloat(v));
                }}
              />
            </div>
          </div>

          {/* Status + Platform */}
          <div style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value as InventoryStatus)}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Platform</label>
              <select style={inputStyle} value={form.platform ?? ""} onChange={(e) => set("platform", (e.target.value || undefined) as InventoryPlatform | undefined)}>
                <option value="">None</option>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Platform URL */}
          <div>
            <label style={labelStyle}>Platform URL</label>
            <input style={inputStyle} value={form.platform_url ?? ""} onChange={(e) => set("platform_url", e.target.value)} placeholder="https://..." />
          </div>

          {/* Purchase date + Sale date */}
          <div style={{ ...rowStyle, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label style={labelStyle}>Purchase Date</label>
              <input type="date" style={inputStyle} value={form.purchase_date ?? ""} onChange={(e) => set("purchase_date", e.target.value || undefined)} />
            </div>
            <div>
              <label style={labelStyle}>Sale Date</label>
              <input type="date" style={inputStyle} value={form.sale_date ?? ""} onChange={(e) => set("sale_date", e.target.value || undefined)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "0.5px solid rgba(255,255,255,0.15)", color: "var(--text-secondary)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 24px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: "#e8ff00", border: "none", color: "#000",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {editItem ? "SAVE CHANGES" : "ADD ITEM"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
      borderRadius: 14, padding: "14px 18px",
    }}>
      <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, color: color ?? "var(--text-primary)", letterSpacing: "-0.5px", marginTop: 4 }}>
        {value}
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { items, isLoading, totalItems, totalValue, totalProfit, addItem, updateItem, deleteItem } = useInventory();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Counts per status
  const statusCounts = useMemo(() => {
    const counts: Record<InventoryStatus, number> = { in_stock: 0, listed: 0, sold: 0, shipped: 0, returned: 0 };
    items.forEach((item) => { counts[item.status] = (counts[item.status] ?? 0) + 1; });
    return counts;
  }, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${item.name} ${item.brand ?? ""} ${item.sku ?? ""} ${item.category ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, platformFilter, search]);

  function openAdd() {
    setEditItem(null);
    setModalOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditItem(item);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditItem(null);
  }

  const filterBtnStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: active ? 700 : 500,
    cursor: "pointer", whiteSpace: "nowrap" as const,
    background: active ? (color ?? "#e8ff00") : "var(--glass-bg)",
    border: `0.5px solid ${active ? (color ?? "#e8ff00") : "var(--glass-border)"}`,
    color: active ? (color ? "#fff" : "#000") : "var(--text-secondary)",
    transition: "all 0.15s",
    fontFamily: "'Space Mono', monospace",
  });

  return (
    <ModuleErrorBoundary moduleName="Inventory">
      <div className="space-y-5">
        <LiquidGlassFilter />

        {/* ── Header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "#e8ff00", margin: 0, letterSpacing: 2, lineHeight: 1 }}>
              INVENTORY
            </h1>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "var(--text-quaternary)", margin: "4px 0 0" }}>
              Track your products, listings and sales
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{
              height: 38, padding: "0 20px", borderRadius: 10,
              background: "#e8ff00", border: "none", color: "#000",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            ADD ITEM
          </button>
        </motion.div>

        {/* ── Stats ───────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-6 gap-3"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <StatCard label="Total Items" value={String(totalItems)} />
          <StatCard label="In Stock"    value={String(statusCounts.in_stock)} color="#22c55e" />
          <StatCard label="Listed"      value={String(statusCounts.listed)}   color="#e8ff00" />
          <StatCard label="Sold"        value={String(statusCounts.sold)}     color="#818cf8" />
          <StatCard label="Value (€)"   value={`€${fmtEur(totalValue)}`}      color="var(--text-primary)" />
          <StatCard label="Profit (€)"  value={`${totalProfit >= 0 ? "+" : ""}€${fmtEur(totalProfit)}`} color={totalProfit >= 0 ? "#4ade80" : "#f87171"} />
        </motion.div>

        {/* ── Filters + Grid ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <LiquidGlassCard accentColor="#e8ff00" hover={false}>
            {/* Filters bar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" }}>
              {/* Status filter */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button style={filterBtnStyle(statusFilter === "all")} onClick={() => setStatusFilter("all")}>All</button>
                {ALL_STATUSES.map((s) => (
                  <button key={s} style={filterBtnStyle(statusFilter === s, STATUS_CONFIG[s].color)} onClick={() => setStatusFilter(s)}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>

              {/* Platform filter */}
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
                className="glass-input"
                style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, minWidth: 110, fontFamily: "'Space Mono', monospace" }}
              >
                <option value="all">All Platforms</option>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>

              {/* Search */}
              <div className="relative" style={{ marginLeft: "auto" }}>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-quaternary)" }} />
                <input
                  className="glass-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, brand, SKU..."
                  style={{ fontSize: 12, padding: "6px 10px 6px 28px", borderRadius: 8, width: 200 }}
                />
              </div>
            </div>

            {/* Result count */}
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 16 }}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              {(statusFilter !== "all" || platformFilter !== "all" || search) ? " (filtered)" : ""}
            </p>

            {/* Grid */}
            {isLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="rounded-xl" style={{ height: 280 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Package style={{ width: 48, height: 48 }} />}
                title={items.length === 0 ? "NO INVENTORY" : "NO RESULTS"}
                description={
                  items.length === 0
                    ? "Start tracking your products and listings."
                    : "No items match your current filters."
                }
                actionLabel={items.length === 0 ? "ADD FIRST ITEM" : undefined}
                onAction={items.length === 0 ? openAdd : undefined}
              />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                <AnimatePresence mode="popLayout">
                  {filtered.map((item) => (
                    <ItemCard key={item.id} item={item} onEdit={openEdit} onDelete={setDeleteId} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </LiquidGlassCard>
        </motion.div>

        {/* ── Add / Edit Modal ─────────────────────────────────────── */}
        <AnimatePresence>
          {modalOpen && (
            <ItemModal
              open={modalOpen}
              editItem={editItem}
              onClose={handleCloseModal}
              onSave={addItem}
              onUpdate={updateItem}
            />
          )}
        </AnimatePresence>

        {/* ── Delete Confirmation ──────────────────────────────────── */}
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(o) => { if (!o) setDeleteId(null); }}
          title="DELETE ITEM"
          description="This action cannot be undone. The item will be permanently removed from your inventory."
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            if (deleteId) deleteItem(deleteId);
            setDeleteId(null);
          }}
        />
      </div>
    </ModuleErrorBoundary>
  );
}
