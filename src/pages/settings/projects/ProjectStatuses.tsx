import { useState } from "react";
import { Columns3, Plus } from "lucide-react";
import { toast } from "sonner";
import { useProjectStatuses } from "../../../hooks/settings";
import type { ProjectStatus } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsColorPicker, SettingsToggle,
} from "@/components/settings";

interface FormState {
  name: string;
  color: string;
  isDefault: boolean;
  isFinal: boolean;
}

const emptyForm = (): FormState => ({
  name: "", color: "#3b82f6", isDefault: false, isFinal: false,
});

export default function ProjectStatuses() {
  const { data: statuses, loading, create, update, remove } = useProjectStatuses();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ProjectStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  const sorted = [...statuses].sort((a, b) => a.sort_order - b.sort_order);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(item: ProjectStatus) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      color: item.color,
      isDefault: item.is_default,
      isFinal: item.is_final,
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await update(editingId, {
        name: form.name,
        color: form.color,
        is_default: form.isDefault,
        is_final: form.isFinal,
      });
      if (error) { toast.error(error); }
      else { toast.success("Stato aggiornato"); }
    } else {
      const { error } = await create({
        name: form.name,
        color: form.color,
        icon: "Circle",
        is_default: form.isDefault,
        is_final: form.isFinal,
        sort_order: statuses.length + 1,
      });
      if (error) { toast.error(error); }
      else { toast.success("Stato creato"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Stato eliminato"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "color",
      label: "Colore",
      width: "60px",
      render: (item: ProjectStatus) => (
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: item.color,
        }} />
      ),
    },
    {
      key: "name",
      label: "Nome",
      render: (item: ProjectStatus) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "badges",
      label: "Tipo",
      render: (item: ProjectStatus) => (
        <div style={{ display: "flex", gap: 6 }}>
          {item.is_default && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--accent-primary)",
              background: "var(--accent-primary-soft)", borderRadius: 4,
              padding: "2px 8px",
            }}>
              Predefinito
            </span>
          )}
          {item.is_final && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: "var(--color-success)",
              background: "rgba(34,197,94,0.1)", borderRadius: 4,
              padding: "2px 8px",
            }}>
              Finale
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: "100%" }}>
      <SettingsPageHeader
        icon={Columns3}
        title="Stati Progetto"
        description="Definisci il workflow delle attivita"
        action={{ label: "Aggiungi Stato", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<ProjectStatus>
          columns={columns}
          data={sorted}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuno stato configurato."
          emptyIcon={Columns3}
          loading={loading}
          onAdd={openCreate}
        />
      </SettingsCard>

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Stato" : "Nuovo Stato"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input
            className="glass-input"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome stato"
          />
        </SettingsFormField>

        <SettingsFormField label="Colore">
          <SettingsColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Predefinito">
          <SettingsToggle
            checked={form.isDefault}
            onChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
            label="Imposta come stato predefinito"
          />
        </SettingsFormField>

        <SettingsFormField label="Finale">
          <SettingsToggle
            checked={form.isFinal}
            onChange={(v) => setForm((f) => ({ ...f, isFinal: v }))}
            label="Gli stati finali indicano completamento"
          />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Stato"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
