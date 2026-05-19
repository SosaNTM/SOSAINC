import { useState } from "react";
import { TrendingDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { useExpenseCategories } from "../../../hooks/settings";
import type { ExpenseCategory } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsColorPicker,
} from "@/components/settings";

const ICON_OPTIONS = [
  "🛍️","🍔","🚗","🏠","💊","✈️","🎓","💡","🔑","🎯",
  "🎬","🎵","🏋️","☁️","🤖","💼","🚀","📱","📺","🎮",
  "⚡","🔥","💎","🌟","🎁","🏆","📊","🔔","🛡️","🌐",
  "📋","💰","📈","🧠","🎧","📦","🎨","🔒","🏅","💳",
];

interface FormState {
  name: string;
  icon: string;
  color: string;
  description: string;
  monthlyBudget: number;
  alertThreshold: number;
}

const emptyForm = (): FormState => ({
  name: "", icon: "🛍️", color: "#f59e0b", description: "",
  monthlyBudget: 0, alertThreshold: 80,
});

function formatEuro(value: number | null): string {
  if (value == null || value === 0) return "—";
  return `€${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExpenseCategoriesPage() {
  const { data: categories, loading, create, update, remove } = useExpenseCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
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

  function openEdit(cat: ExpenseCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      icon: cat.icon || "🛍️",
      color: cat.color,
      description: cat.description ?? "",
      monthlyBudget: cat.monthly_budget ?? 0,
      alertThreshold: cat.alert_threshold ?? 80,
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
      name: form.name, icon: form.icon, color: form.color,
      description: form.description,
      monthly_budget: form.monthlyBudget,
      alert_threshold: form.alertThreshold,
    };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) toast.error(error);
      else toast.success("Categoria aggiornata");
    } else {
      const { error } = await create({ ...payload, is_active: true, sort_order: categories.length });
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
      key: "color",
      label: "Colore",
      width: "60px",
      render: (item: ExpenseCategory) => (
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.color }} />
      ),
    },
    {
      key: "name",
      label: "Nome",
      render: (item: ExpenseCategory) => (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{item.icon || "🛍️"}</span>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
        </span>
      ),
    },
    {
      key: "monthly_budget",
      label: "Budget Mensile",
      width: "130px",
      render: (item: ExpenseCategory) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
          {formatEuro(item.monthly_budget)}
        </span>
      ),
    },
    {
      key: "alert_threshold",
      label: "Soglia Avviso",
      width: "100px",
      render: (item: ExpenseCategory) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
          {item.alert_threshold != null ? `${item.alert_threshold}%` : "—"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "100%" }}>
      <SettingsPageHeader
        icon={TrendingDown}
        title="Categorie Uscite"
        description="Gestisci le categorie di spesa con budget mensili"
        action={{ label: "Aggiungi Categoria", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<ExpenseCategory>
          columns={columns}
          data={sorted}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuna categoria. Creane una nuova."
          emptyIcon={TrendingDown}
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
                onMouseEnter={(e) => { if (form.icon !== em) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { if (form.icon !== em) e.currentTarget.style.background = "transparent"; }}
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

        <SettingsFormField label="Budget Mensile">
          <input
            className="glass-input"
            type="number"
            min={0}
            value={form.monthlyBudget || ""}
            onChange={(e) => setForm((f) => ({ ...f, monthlyBudget: Number(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </SettingsFormField>

        <SettingsFormField label="Soglia Avviso (%)" description="Percentuale del budget alla quale ricevere un avviso">
          <input
            className="glass-input"
            type="number"
            min={0}
            max={100}
            value={form.alertThreshold}
            onChange={(e) => setForm((f) => ({ ...f, alertThreshold: Number(e.target.value) }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Descrizione">
          <textarea
            className="glass-input"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrizione opzionale"
            rows={2}
            style={{ resize: "vertical" }}
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
