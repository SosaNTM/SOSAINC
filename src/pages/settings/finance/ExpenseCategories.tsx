import { useState } from "react";
import {
  TrendingDown, ShoppingBag, Briefcase, Percent, RotateCcw, TrendingUp,
  MoreHorizontal, DollarSign, Gift, Star, Zap, Package, Award, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useExpenseCategories } from "../../../hooks/settings";
import type { ExpenseCategory } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsColorPicker,
} from "@/components/settings";

const ICON_OPTIONS = [
  "ShoppingBag", "Briefcase", "Percent", "RotateCcw", "TrendingUp", "MoreHorizontal",
  "DollarSign", "Gift", "Star", "Zap", "Package", "Award",
] as const;
type IconName = typeof ICON_OPTIONS[number];

const ICON_MAP: Record<IconName, React.ElementType> = {
  ShoppingBag, Briefcase, Percent, RotateCcw, TrendingUp, MoreHorizontal,
  DollarSign, Gift, Star, Zap, Package, Award,
};

interface FormState {
  name: string;
  icon: string;
  color: string;
  description: string;
  monthlyBudget: number;
  alertThreshold: number;
}

const emptyForm = (): FormState => ({
  name: "", icon: "Package", color: "#f59e0b", description: "",
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
      icon: cat.icon,
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
      name: form.name,
      icon: form.icon,
      color: form.color,
      description: form.description,
      monthly_budget: form.monthlyBudget,
      alert_threshold: form.alertThreshold,
    };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast.error(error); }
      else { toast.success("Categoria aggiornata"); }
    } else {
      const { error } = await create({
        ...payload,
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
      key: "color",
      label: "Colore",
      width: "60px",
      render: (item: ExpenseCategory) => (
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: item.color,
        }} />
      ),
    },
    {
      key: "icon",
      label: "Icona",
      width: "60px",
      render: (item: ExpenseCategory) => {
        const Icon = (ICON_MAP[item.icon as IconName] ?? MoreHorizontal) as React.ElementType;
        return <Icon style={{ width: 16, height: 16, color: item.color }} />;
      },
    },
    {
      key: "name",
      label: "Nome",
      render: (item: ExpenseCategory) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
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
    <div style={{ maxWidth: 860 }}>
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
          <select
            className="glass-input"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          >
            {ICON_OPTIONS.map((ic) => (
              <option key={ic} value={ic}>{ic}</option>
            ))}
          </select>
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
