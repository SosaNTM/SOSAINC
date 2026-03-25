import { useState } from "react";
import { FileStack, Plus, Clock, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTaskTemplates } from "../../../hooks/settings";
import type { TaskTemplate } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsModal, SettingsDeleteConfirm,
} from "@/components/settings";

interface ChecklistItem { id: string; text: string; done: boolean; }

interface FormState {
  name: string;
  description: string;
  priority_id: string | null;
  estimatedHours: number;
  checklist: ChecklistItem[];
}

let _tmpId = 0;
const newId = () => `tmp-${++_tmpId}`;

const emptyForm = (): FormState => ({
  name: "", description: "", priority_id: null, estimatedHours: 2, checklist: [],
});

export default function TaskTemplatesPage() {
  const { data: templates, loading, create, update, remove } = useTaskTemplates();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(t: TaskTemplate) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description ?? "",
      priority_id: t.priority_id,
      estimatedHours: t.estimated_h ?? 2,
      checklist: t.checklist.map((c) => ({ ...c })),
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      priority_id: form.priority_id,
      estimated_h: form.estimatedHours || null,
      checklist: form.checklist,
      tags: [] as string[],
    };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast.error(error); } else { toast.success("Template aggiornato"); }
    } else {
      const { error } = await create(payload);
      if (error) { toast.error(error); } else { toast.success("Template creato"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); } else { toast.success("Template eliminato"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  function addChecklistItem() {
    setForm((f) => ({
      ...f,
      checklist: [...f.checklist, { id: newId(), text: "", done: false }],
    }));
  }

  function updateChecklistItem(id: string, text: string) {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.map((c) => (c.id === id ? { ...c, text } : c)),
    }));
  }

  function removeChecklistItem(id: string) {
    setForm((f) => ({
      ...f,
      checklist: f.checklist.filter((c) => c.id !== id),
    }));
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={FileStack}
        title="Template Attivita"
        description="Crea modelli riutilizzabili"
        action={{ label: "Aggiungi Template", icon: Plus, onClick: openCreate }}
      />

      {templates.length === 0 ? (
        <SettingsCard>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 0", gap: 8,
          }}>
            <FileStack style={{ width: 40, height: 40, color: "var(--text-tertiary)", strokeWidth: 1.2 }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)" }}>
              Nessun template. Creane uno nuovo.
            </p>
          </div>
        </SettingsCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
          {templates.map((t) => (
            <SettingsCard key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600,
                  color: "var(--text-primary)",
                }}>
                  {t.name}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => openEdit(t)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--accent-primary)", fontSize: 12, fontWeight: 500,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--color-error)", fontSize: 12, fontWeight: 500,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Elimina
                  </button>
                </div>
              </div>

              {t.description && (
                <p style={{
                  fontFamily: "var(--font-body)", fontSize: 12,
                  color: "var(--text-secondary)", lineHeight: 1.5,
                  marginBottom: 10,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                } as React.CSSProperties}>
                  {t.description}
                </p>
              )}

              {t.priority_id && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: "var(--accent-primary)",
                  background: "var(--accent-primary-soft)", borderRadius: 4,
                  padding: "2px 8px", marginBottom: 8, display: "inline-block",
                }}>
                  {t.priority_id}
                </span>
              )}

              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-tertiary)",
                }}>
                  <ListChecks style={{ width: 13, height: 13 }} />
                  <span>{t.checklist.length} voci</span>
                </div>
                {t.estimated_h != null && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-tertiary)",
                  }}>
                    <Clock style={{ width: 13, height: 13 }} />
                    <span>~{t.estimated_h} ore</span>
                  </div>
                )}
              </div>
            </SettingsCard>
          ))}
        </div>
      )}

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Template" : "Nuovo Template"}
        onSubmit={handleSubmit}
        isLoading={saving}
        size="lg"
      >
        <SettingsFormField label="Nome" required>
          <input className="glass-input" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome template" />
        </SettingsFormField>

        <SettingsFormField label="Descrizione">
          <textarea className="glass-input" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrizione opzionale" rows={2} style={{ resize: "vertical" }} />
        </SettingsFormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <SettingsFormField label="Priorita predefinita">
            <input className="glass-input" value={form.priority_id ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, priority_id: e.target.value || null }))}
              placeholder="ID priorita" />
          </SettingsFormField>
          <SettingsFormField label="Ore stimate">
            <input className="glass-input" type="number" min={0} step={0.5}
              value={form.estimatedHours}
              onChange={(e) => setForm((f) => ({ ...f, estimatedHours: Number(e.target.value) }))} />
          </SettingsFormField>
        </div>

        <SettingsFormField label="Checklist">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.checklist.map((item) => (
              <div key={item.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input className="glass-input" value={item.text}
                  onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                  placeholder="Voce checklist..." style={{ flex: 1 }} />
                <button onClick={() => removeChecklistItem(item.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--color-error)", padding: 4,
                  }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ))}
            <button onClick={addChecklistItem}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "var(--accent-primary)",
                background: "transparent",
                border: "1px dashed var(--border-glass)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px", cursor: "pointer", width: "fit-content",
                fontFamily: "var(--font-body)",
              }}>
              <Plus style={{ width: 12, height: 12 }} /> Aggiungi voce
            </button>
          </div>
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Template"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
