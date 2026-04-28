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

type BillingCycle = "monthly" | "quarterly" | "semiannual" | "annual";

const CYCLE_LABELS: Record<string, string> = {
  monthly: "Mensile",
  quarterly: "Trimestrale",
  semiannual: "Semestrale",
  annual: "Annuale",
};

interface FormState {
  name: string;
  color: string;
  defaultCycle: BillingCycle;
}

const emptyForm = (): FormState => ({
  name: "", color: "#3b82f6", defaultCycle: "monthly",
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
    setForm({
      name: cat.name,
      color: cat.color,
      defaultCycle: cat.billing_cycle as BillingCycle,
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      color: form.color,
      billing_cycle: form.defaultCycle,
    };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast.error(error); }
      else { toast.success("Categoria aggiornata"); }
    } else {
      const { error } = await create({
        ...payload,
        icon: "RefreshCw",
        reminder_days: 3,
        is_active: true,
        sort_order: categories.length,
      });
      if (error) { toast.error(error); }
      else { toast.success("Categoria creata"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Categoria eliminata"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "name",
      label: "Nome",
      render: (item: SubscriptionCategory) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "color",
      label: "Colore",
      width: "80px",
      render: (item: SubscriptionCategory) => (
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: item.color,
        }} />
      ),
    },
    {
      key: "billing_cycle",
      label: "Ciclo Default",
      width: "140px",
      render: (item: SubscriptionCategory) => (
        <span style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 9999,
          background: "var(--accent-primary-soft)",
          color: "var(--accent-primary)", fontWeight: 500,
          fontFamily: "var(--font-body)",
        }}>
          {CYCLE_LABELS[item.billing_cycle] ?? item.billing_cycle}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 860 }}>
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

        <SettingsFormField label="Colore">
          <SettingsColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Ciclo Default">
          <select
            className="glass-input"
            value={form.defaultCycle}
            onChange={(e) => setForm((f) => ({ ...f, defaultCycle: e.target.value as BillingCycle }))}
          >
            <option value="monthly">Mensile</option>
            <option value="quarterly">Trimestrale</option>
            <option value="semiannual">Semestrale</option>
            <option value="annual">Annuale</option>
          </select>
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
