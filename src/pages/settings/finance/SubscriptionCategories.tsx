import { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionCategories } from "../../../hooks/settings";
import type { SubscriptionCategory } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsColorPicker,
} from "@/components/settings";

const ICON_OPTIONS = [
  "🎬","🎵","☁️","🎨","🤖","🏋️","🔒","🦜","✨","📰",
  "📺","🎮","🛍️","📱","💼","🏠","🚀","💊","📚","🌐",
  "🍔","🚗","✈️","🎓","💡","🔑","🎯","💰","🧠","🎧",
  "📋","⚡","🔥","💎","🌟","🎁","🏆","📊","🔔","🛡️",
];

interface FormState {
  name: string;
  icon: string;
  color: string;
}

const emptyForm = (): FormState => ({
  name: "", icon: "📋", color: "#3b82f6",
});

export default function SubscriptionCategoriesPage() {
  const { data: categories, loading, create, update, remove } = useSubscriptionCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(cat: SubscriptionCategory) {
    setEditingId(cat.id);
    setForm({ name: cat.name, icon: cat.icon || "📋", color: cat.color });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const payload = { name: form.name.trim(), icon: form.icon, color: form.color };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) toast.error(error);
      else toast.success("Categoria aggiornata");
    } else {
      const { error } = await create({
        ...payload,
        billing_cycle: "monthly",
        reminder_days: 3,
        is_active: true,
        sort_order: categories.length,
      });
      if (error) toast.error(error);
      else toast.success("Categoria creata");
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) toast.error(error);
    else toast.success("Categoria eliminata");
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "name",
      label: "Nome",
      render: (item: SubscriptionCategory) => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{item.icon || "📋"}</span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
        </span>
      ),
    },
    {
      key: "color",
      label: "Colore",
      width: "80px",
      render: (item: SubscriptionCategory) => (
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.color }} />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "100%" }}>
      <SettingsPageHeader
        icon={RefreshCw}
        title="Categorie Abbonamenti"
        description="Organizza le tue sottoscrizioni ricorrenti"
        action={{ label: "Aggiungi Categoria", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<SubscriptionCategory>
          columns={columns}
          data={sorted}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuna categoria. Creane una nuova."
          emptyIcon={RefreshCw}
          loading={loading}
          onAdd={openCreate}
        />
      </SettingsCard>

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Categoria" : "Nuova Categoria"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input
            className="glass-input"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome categoria"
          />
        </SettingsFormField>

        <SettingsFormField label="Icona">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gap: 6,
            padding: "10px",
            background: "var(--glass-bg, rgba(255,255,255,0.03))",
            border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
            borderRadius: 10,
          }}>
            {ICON_OPTIONS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon: em }))}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: form.icon === em
                    ? "2px solid var(--accent-primary, #3b82f6)"
                    : "2px solid transparent",
                  background: form.icon === em
                    ? "var(--accent-primary-soft, rgba(59,130,246,0.15))"
                    : "transparent",
                  cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.1s, border-color 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (form.icon !== em) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (form.icon !== em) e.currentTarget.style.background = "transparent";
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </SettingsFormField>

        <SettingsFormField label="Colore">
          <SettingsColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </SettingsFormField>
      </SettingsModal>

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
