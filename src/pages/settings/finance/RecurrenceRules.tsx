import { useState } from "react";
import { Repeat, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRecurrenceRules, useIncomeCategories, useExpenseCategories } from "../../../hooks/settings";
import type { RecurrenceRule } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsToggle,
} from "@/components/settings";

type Direction = "entrata" | "uscita";
type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "annual";

const FREQ_LABELS: Record<Frequency, string> = {
  daily: "Giornaliera",
  weekly: "Settimanale",
  biweekly: "Bisettimanale",
  monthly: "Mensile",
  quarterly: "Trimestrale",
  annual: "Annuale",
};

interface FormState {
  name: string;
  amount: number;
  frequency: Frequency;
  category: string;
  type: Direction;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  name: "", amount: 0, frequency: "monthly", category: "",
  type: "uscita", startDate: "", endDate: "", isActive: true,
});

function formatEuro(value: number | null): string {
  if (value == null || value === 0) return "—";
  return `€${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RecurrenceRulesPage() {
  const { data: rules, loading, create, update, remove } = useRecurrenceRules();
  const { data: incomeCategories } = useIncomeCategories();
  const { data: expenseCategories } = useExpenseCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<RecurrenceRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  const allCategories = form.type === "entrata" ? incomeCategories : expenseCategories;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(r: RecurrenceRule) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      amount: r.amount ?? 0,
      frequency: r.frequency,
      category: r.category_id ?? "",
      type: r.direction,
      startDate: r.next_run_at ?? "",
      endDate: "",
      isActive: r.is_active,
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
      amount: form.amount,
      frequency: form.frequency,
      category_id: form.category || null,
      direction: form.type,
      next_run_at: form.startDate || null,
      is_active: form.isActive,
    };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast.error(error); }
      else { toast.success("Regola aggiornata"); }
    } else {
      const { error } = await create(payload);
      if (error) { toast.error(error); }
      else { toast.success("Regola creata"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Regola eliminata"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function handleToggleActive(r: RecurrenceRule) {
    const { error } = await update(r.id, { is_active: !r.is_active });
    if (error) { toast.error(error); }
  }

  // Build a lookup for category names
  const categoryMap = new Map<string, string>();
  for (const c of incomeCategories) { categoryMap.set(c.id, c.name); }
  for (const c of expenseCategories) { categoryMap.set(c.id, c.name); }

  const columns = [
    {
      key: "name",
      label: "Nome",
      render: (item: RecurrenceRule) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "amount",
      label: "Importo",
      width: "120px",
      render: (item: RecurrenceRule) => (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13,
          color: item.direction === "entrata" ? "var(--color-success)" : "var(--text-primary)",
          fontWeight: 600,
        }}>
          {item.direction === "entrata" ? "+" : "-"}{formatEuro(item.amount)}
        </span>
      ),
    },
    {
      key: "frequency",
      label: "Frequenza",
      width: "130px",
      render: (item: RecurrenceRule) => (
        <span style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 9999,
          background: "var(--accent-primary-soft)",
          color: "var(--accent-primary)", fontWeight: 500,
        }}>
          {FREQ_LABELS[item.frequency] ?? item.frequency}
        </span>
      ),
    },
    {
      key: "category_id",
      label: "Categoria",
      width: "140px",
      render: (item: RecurrenceRule) => (
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {item.category_id ? (categoryMap.get(item.category_id) ?? "—") : "—"}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Stato",
      width: "80px",
      render: (item: RecurrenceRule) => (
        <SettingsToggle
          checked={item.is_active}
          onChange={() => handleToggleActive(item)}
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "100%" }}>
      <SettingsPageHeader
        icon={Repeat}
        title="Regole di Ricorrenza"
        description="Automatizza transazioni ripetitive"
        action={{ label: "Aggiungi Regola", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<RecurrenceRule>
          columns={columns}
          data={rules}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuna regola. Creane una nuova."
          emptyIcon={Repeat}
          loading={loading}
          onAdd={openCreate}
        />
      </SettingsCard>

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Regola" : "Nuova Regola Ricorrente"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input
            className="glass-input"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Es. Affitto Ufficio"
          />
        </SettingsFormField>

        {/* Segmented type control */}
        <SettingsFormField label="Tipo">
          <div style={{ display: "flex", gap: 0, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-glass)" }}>
            {(["entrata", "uscita"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: d, category: "" }))}
                style={{
                  flex: 1, padding: "8px 16px", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  background: form.type === d ? "var(--accent-primary)" : "var(--glass-bg)",
                  color: form.type === d ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {d === "entrata" ? "Entrata" : "Uscita"}
              </button>
            ))}
          </div>
        </SettingsFormField>

        <SettingsFormField label="Importo">
          <input
            className="glass-input"
            type="number"
            min={0}
            value={form.amount || ""}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </SettingsFormField>

        <SettingsFormField label="Frequenza">
          <select
            className="glass-input"
            value={form.frequency}
            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as Frequency }))}
          >
            {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </SettingsFormField>

        <SettingsFormField label="Categoria">
          <select
            className="glass-input"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Nessuna categoria</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </SettingsFormField>

        <SettingsFormField label="Data Inizio">
          <input
            className="glass-input"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Data Fine (opzionale)">
          <input
            className="glass-input"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Stato">
          <SettingsToggle
            checked={form.isActive}
            onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            label="Attiva"
          />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Regola"
        message="Questa azione è irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
