import { useState } from "react";
import {
  Tags, Plus, Pencil, Trash2,
  ShoppingBag, Briefcase, Percent, Truck, Box, CreditCard,
  Home, Monitor, Megaphone, Users, Receipt, Scale,
  MoreHorizontal, TrendingUp, Package,
} from "lucide-react";
import { toast } from "sonner";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import type { FinanceCategory, CostClassification } from "@/types/finance";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsModal, SettingsDeleteConfirm, SettingsColorPicker,
  SettingsToggle,
} from "@/components/settings";

/* ── Icon map ────────────────────────────────────────────────────── */

const ICON_OPTIONS = [
  "ShoppingBag", "Briefcase", "Percent", "Truck", "Box", "CreditCard",
  "Home", "Monitor", "Megaphone", "Users", "Receipt", "Scale",
  "MoreHorizontal", "TrendingUp", "Package",
] as const;
type IconName = (typeof ICON_OPTIONS)[number];

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBag, Briefcase, Percent, Truck, Box, CreditCard,
  Home, Monitor, Megaphone, Users, Receipt, Scale,
  MoreHorizontal, TrendingUp, Package,
};

function resolveIcon(name: string): React.ElementType {
  return ICON_MAP[name] ?? Tags;
}

/* ── Classification config ───────────────────────────────────────── */

const TYPE_CONFIG: Record<CostClassification, { label: string; color: string; dotColor: string }> = {
  revenue: { label: "Ricavo",               color: "#22c55e", dotColor: "#22c55e" },
  cogs:    { label: "Costo del Venduto",     color: "#f97316", dotColor: "#f97316" },
  opex:    { label: "Spesa Operativa",       color: "#ef4444", dotColor: "#ef4444" },
  other:   { label: "Altro",                 color: "#8b8b8b", dotColor: "#8b8b8b" },
};

const SECTION_ORDER: CostClassification[] = ["revenue", "cogs", "opex", "other"];

const TYPE_SELECT_OPTIONS: { value: CostClassification; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "cogs",    label: "COGS" },
  { value: "opex",    label: "OPEX" },
  { value: "other",   label: "Altro" },
];

/* ── Form state ──────────────────────────────────────────────────── */

interface FormState {
  name: string;
  type: CostClassification;
  color: string;
  icon: string;
}

const emptyForm = (): FormState => ({
  name: "", type: "revenue", color: "#22c55e", icon: "ShoppingBag",
});

/* ── Component ───────────────────────────────────────────────────── */

export default function TransactionCategories() {
  const {
    categories, loading, grouped,
    createCategory, updateCategory, deleteCategory, toggleActive,
  } = useFinanceCategories();

  const [modalOpen, setModalOpen]          = useState(false);
  const [editingId, setEditingId]          = useState<string | null>(null);
  const [form, setForm]                    = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget]    = useState<FinanceCategory | null>(null);
  const [saving, setSaving]                = useState(false);
  const [deleting, setDeleting]            = useState(false);

  /* ── Handlers ────────────────────────────────────────────────── */

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(cat: FinanceCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      const { error } = (await updateCategory(editingId, {
        name: form.name,
        type: form.type,
        color: form.color,
        icon: form.icon,
      })) as { error?: string };
      if (error) toast.error(error);
      else toast.success("Categoria aggiornata");
    } else {
      const { error } = (await createCategory({
        name: form.name,
        type: form.type,
        color: form.color,
        icon: form.icon,
      })) as { error?: string };
      if (error) toast.error(error);
      else toast.success("Categoria creata");
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = (await deleteCategory(deleteTarget.id)) as { error?: string };
    if (error) toast.error(error);
    else toast.success("Categoria eliminata");
    setDeleting(false);
    setDeleteTarget(null);
  }

  /* ── Section renderer ────────────────────────────────────────── */

  function renderSection(type: CostClassification) {
    const items = (grouped as Record<string, FinanceCategory[]>)[type] ?? [];
    if (items.length === 0) return null;
    const cfg = TYPE_CONFIG[type];
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

    return (
      <div key={type} style={{ marginBottom: 24 }}>
        {/* Group header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 10, paddingLeft: 4,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: cfg.dotColor,
          }} />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}>
            {type.toUpperCase()}
          </span>
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sorted.map((cat) => {
            const Icon = resolveIcon(cat.icon);
            return (
              <div
                key={cat.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: "var(--radius-md)",
                  background: "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${cat.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon style={{ width: 16, height: 16, color: cat.color }} />
                </div>

                {/* Name */}
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: cat.is_active ? "var(--text-primary)" : "var(--text-tertiary)",
                  flex: 1, minWidth: 0,
                  opacity: cat.is_active ? 1 : 0.5,
                }}>
                  {cat.name}
                </span>

                {/* Type badge */}
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  padding: "2px 8px", borderRadius: 99,
                  background: `${cfg.color}18`,
                  color: cfg.color,
                  whiteSpace: "nowrap",
                }}>
                  {cfg.label}
                </span>

                {/* Toggle */}
                <SettingsToggle
                  checked={cat.is_active}
                  onChange={() => toggleActive(cat.id)}
                />

                {/* Edit */}
                <button
                  type="button"
                  title="Modifica"
                  onClick={() => openEdit(cat)}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: "none", background: "rgba(255,255,255,0.05)",
                    color: "var(--text-quaternary)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>

                {/* Delete (only non-default) */}
                {!cat.is_default && (
                  <button
                    type="button"
                    title="Elimina"
                    onClick={() => setDeleteTarget(cat)}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      border: "none", background: "rgba(255,90,90,0.08)",
                      color: "#FF5A5A", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Tags}
        title="Categorie Transazioni"
        description="Gestisci le categorie per classificare entrate e costi"
        action={{ label: "Nuova Categoria", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>Caricamento...</p>
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <Tags style={{ width: 32, height: 32, color: "var(--text-quaternary)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>
              Nessuna categoria. Creane una nuova.
            </p>
          </div>
        ) : (
          SECTION_ORDER.map(renderSection)
        )}
      </SettingsCard>

      {/* Add / Edit modal */}
      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Categoria" : "Nuova Categoria"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required>
          <input
            className="glass-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome categoria"
            style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
          />
        </SettingsFormField>

        <SettingsFormField label="Tipo">
          <select
            className="glass-input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CostClassification }))}
            style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
          >
            {TYPE_SELECT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </SettingsFormField>

        <SettingsFormField label="Colore">
          <SettingsColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Icona">
          <select
            className="glass-input"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", fontSize: 13 }}
          >
            {ICON_OPTIONS.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
        </SettingsFormField>
      </SettingsModal>

      {/* Delete confirmation */}
      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Categoria"
        message="Questa azione è irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
