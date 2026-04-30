import { useState } from "react";
import { Network, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { useDepartments } from "../../../hooks/settings";
import type { Department } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsModal, SettingsDeleteConfirm,
} from "@/components/settings";

interface FormState {
  name: string;
  head: string;
  memberCount: number;
  description: string;
}

const emptyForm = (): FormState => ({
  name: "", head: "", memberCount: 0, description: "",
});

export default function DepartmentsPage() {
  const { data: departments, loading, create, update, remove } = useDepartments();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(dept: Department) {
    setEditingId(dept.id);
    setForm({
      name: dept.name,
      head: dept.head_user_id ?? "",
      memberCount: dept.member_count,
      description: dept.description ?? "",
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
        head_user_id: form.head || null,
        member_count: form.memberCount,
        description: form.description || null,
      });
      if (error) { toast.error(error); }
      else { toast.success("Dipartimento aggiornato"); }
    } else {
      const { error } = await create({
        name: form.name,
        color: "#3b82f6",
        head_user_id: form.head || null,
        member_count: form.memberCount,
        description: form.description || null,
        sort_order: departments.length + 1,
      });
      if (error) { toast.error(error); }
      else { toast.success("Dipartimento creato"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Dipartimento eliminato"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div style={{ maxWidth: "100%" }}>
      <SettingsPageHeader
        icon={Network}
        title="Dipartimenti"
        description="Organizza il team in dipartimenti"
        action={{ label: "Aggiungi Dipartimento", icon: Plus, onClick: openCreate }}
      />

      {departments.length === 0 ? (
        <SettingsCard>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "48px 0", gap: 8,
          }}>
            <Network style={{ width: 40, height: 40, color: "var(--text-tertiary)", strokeWidth: 1.2 }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)" }}>
              Nessun dipartimento. Creane uno nuovo.
            </p>
          </div>
        </SettingsCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {departments.map((dept) => (
            <SettingsCard key={dept.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>
                    {dept.name}
                  </span>
                  {dept.head_user_id && (
                    <div style={{
                      fontFamily: "var(--font-body)", fontSize: 11,
                      color: "var(--text-tertiary)", marginTop: 2,
                    }}>
                      Responsabile: {dept.head_user_id}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => openEdit(dept)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--accent-primary)", fontSize: 12, fontWeight: 500,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => setDeleteTarget(dept)}
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

              {dept.description && (
                <p style={{
                  fontFamily: "var(--font-body)", fontSize: 12,
                  color: "var(--text-secondary)", lineHeight: 1.5,
                  marginBottom: 10,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                } as React.CSSProperties}>
                  {dept.description}
                </p>
              )}

              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-body)", fontSize: 11,
                color: "var(--text-tertiary)", marginTop: 8,
                paddingTop: 8, borderTop: "1px solid var(--border-glass)",
              }}>
                <Users style={{ width: 13, height: 13 }} />
                <span>{dept.member_count} membri</span>
              </div>
            </SettingsCard>
          ))}
        </div>
      )}

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Dipartimento" : "Nuovo Dipartimento"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input className="glass-input" value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome dipartimento" />
        </SettingsFormField>

        <SettingsFormField label="Responsabile">
          <input className="glass-input" value={form.head}
            onChange={(e) => setForm((f) => ({ ...f, head: e.target.value }))}
            placeholder="Nome del responsabile" />
        </SettingsFormField>

        <SettingsFormField label="Numero membri">
          <input className="glass-input" type="number" min={0}
            value={form.memberCount}
            onChange={(e) => setForm((f) => ({ ...f, memberCount: Number(e.target.value) }))} />
        </SettingsFormField>

        <SettingsFormField label="Descrizione">
          <textarea className="glass-input" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrizione del dipartimento" rows={3} style={{ resize: "vertical" }} />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Dipartimento"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
