import { useState } from "react";
import { Shield, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRoles, useRolePermissions } from "../../../hooks/settings";
import type { Role, RolePermission } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsModal, SettingsDeleteConfirm, SettingsColorPicker, SettingsToggle,
} from "@/components/settings";

const MODULES = [
  "Finanza", "Progetti", "Social", "Team", "Vault", "Cloud", "Attivita", "Note",
] as const;

const PERMISSION_FIELDS = [
  { key: "can_view" as const, label: "Vedi" },
  { key: "can_create" as const, label: "Crea" },
  { key: "can_edit" as const, label: "Modif." },
  { key: "can_delete" as const, label: "Elim." },
  { key: "can_export" as const, label: "Exp." },
];

type PermField = "can_view" | "can_create" | "can_edit" | "can_delete" | "can_export";

interface RoleForm {
  name: string;
  description: string;
  color: string;
}
const emptyForm = (): RoleForm => ({ name: "", description: "", color: "#3b82f6" });

export default function RolesPermissionsPage() {
  const { data: roles, loading: rolesLoading, create: createRole, update: updateRole, remove: removeRole } = useRoles();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveId = selectedId ?? roles[0]?.id ?? null;
  const selectedRole = roles.find((r) => r.id === effectiveId) ?? null;
  const isOwner = selectedRole?.is_system ?? false;

  const { data: permissions, create: createPerm, update: updatePerm } = useRolePermissions(effectiveId ?? undefined);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  /* ── Role CRUD ───────────────────────────────────────────────────── */
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditingId(role.id);
    setForm({ name: role.name, description: role.description ?? "", color: role.color });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await updateRole(editingId, {
        name: form.name, description: form.description || null, color: form.color,
      });
      if (error) { toast.error(error); } else { toast.success("Ruolo aggiornato"); }
    } else {
      const { error } = await createRole({
        name: form.name, description: form.description || null,
        color: form.color, is_system: false, sort_order: roles.length,
      });
      if (error) { toast.error(error); } else { toast.success("Ruolo creato"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await removeRole(deleteTarget.id);
    if (error) { toast.error(error); }
    else {
      toast.success("Ruolo eliminato");
      if (effectiveId === deleteTarget.id) {
        setSelectedId(roles.find((r) => r.id !== deleteTarget.id)?.id ?? null);
      }
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  /* ── Permission helpers ──────────────────────────────────────────── */
  function getPermRow(module: string): RolePermission | undefined {
    return permissions.find((p) => p.module === module);
  }

  function getPermValue(module: string, field: PermField): boolean {
    return getPermRow(module)?.[field] ?? false;
  }

  async function toggleCell(module: string, field: PermField) {
    if (!effectiveId || isOwner) return;
    const row = getPermRow(module);
    const newVal = !getPermValue(module, field);
    if (row) {
      await updatePerm(row.id, { [field]: newVal });
    } else {
      await createPerm({
        role_id: effectiveId,
        module,
        can_view: field === "can_view" ? newVal : false,
        can_create: field === "can_create" ? newVal : false,
        can_edit: field === "can_edit" ? newVal : false,
        can_delete: field === "can_delete" ? newVal : false,
        can_export: field === "can_export" ? newVal : false,
      });
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Shield}
        title="Ruoli e Permessi"
        description="Gestisci i livelli di accesso del team"
      />

      {/* ── Role pills ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8,
        marginBottom: 20, alignItems: "center",
      }}>
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedId(role.id)}
            style={{
              padding: "6px 16px", borderRadius: "var(--radius-md)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-body)",
              background: effectiveId === role.id ? `${role.color}20` : "var(--glass-bg)",
              border: `1px solid ${effectiveId === role.id ? role.color : "var(--glass-border)"}`,
              color: effectiveId === role.id ? role.color : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            <span style={{
              display: "inline-block", width: 8, height: 8,
              borderRadius: "50%", background: role.color, marginRight: 8,
            }} />
            {role.name}
          </button>
        ))}

        <button
          onClick={openCreate}
          className="btn-primary"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, padding: "6px 14px",
          }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          Nuovo Ruolo
        </button>
      </div>

      {/* ── Permission matrix ──────────────────────────────────────── */}
      {selectedRole && (
        <SettingsCard
          title={`Permessi — ${selectedRole.name}`}
          description={isOwner ? "Il ruolo Owner ha accesso completo e non puo essere modificato." : "Clicca sui toggle per modificare i permessi"}
        >
          {isOwner ? (
            <div style={{
              padding: "14px 16px", borderRadius: "var(--radius-md)",
              background: "var(--accent-primary-soft)",
              border: "1px solid var(--border-glass)",
              fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Shield style={{ width: 16, height: 16, color: "var(--accent-primary)", flexShrink: 0 }} />
              Il ruolo sistema ha accesso completo a tutte le aree.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{
                      textAlign: "left", padding: "8px 10px 10px 0",
                      fontFamily: "var(--font-mono)", fontSize: 10,
                      fontWeight: 500, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "var(--text-tertiary)",
                    }}>
                      Modulo
                    </th>
                    {PERMISSION_FIELDS.map((p) => (
                      <th key={p.key} style={{
                        textAlign: "center", padding: "8px 6px 10px",
                        fontFamily: "var(--font-mono)", fontSize: 10,
                        fontWeight: 500, textTransform: "uppercase",
                        letterSpacing: "0.06em", color: "var(--text-tertiary)",
                        whiteSpace: "nowrap",
                      }}>
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((module) => (
                    <tr key={module} style={{
                      borderTop: "1px solid var(--border-glass)",
                    }}>
                      <td style={{
                        padding: "10px 10px 10px 0",
                        fontFamily: "var(--font-body)", fontSize: 13,
                        fontWeight: 500, color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                      }}>
                        {module}
                      </td>
                      {PERMISSION_FIELDS.map((pf) => (
                        <td key={pf.key} style={{ textAlign: "center", padding: "10px 6px" }}>
                          <SettingsToggle
                            checked={isOwner ? true : getPermValue(module, pf.key)}
                            onChange={() => toggleCell(module, pf.key)}
                            disabled={isOwner}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit/Delete for selected role */}
          {!isOwner && selectedRole && (
            <div style={{
              display: "flex", gap: 8, marginTop: 16, paddingTop: 16,
              borderTop: "1px solid var(--border-glass)",
            }}>
              <button
                onClick={() => openEdit(selectedRole)}
                style={{
                  background: "none", border: "1px solid var(--border-glass)",
                  borderRadius: "var(--radius-md)", padding: "6px 14px",
                  fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}
              >
                Modifica Ruolo
              </button>
              <button
                onClick={() => setDeleteTarget(selectedRole)}
                style={{
                  background: "none", border: "1px solid var(--color-error)",
                  borderRadius: "var(--radius-md)", padding: "6px 14px",
                  fontSize: 12, fontWeight: 500, color: "var(--color-error)",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}
              >
                Elimina Ruolo
              </button>
            </div>
          )}
        </SettingsCard>
      )}

      {/* ── Role Modal ──────────────────────────────────────────────── */}
      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Ruolo" : "Nuovo Ruolo"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input className="glass-input" value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome ruolo" />
        </SettingsFormField>

        <SettingsFormField label="Descrizione">
          <input className="glass-input" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descrizione breve" />
        </SettingsFormField>

        <SettingsFormField label="Colore">
          <SettingsColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </SettingsFormField>

        {!editingId && (
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 11,
            color: "var(--text-tertiary)", fontStyle: "italic", margin: 0,
          }}>
            Il nuovo ruolo iniziera senza permessi. Potrai configurarli dalla matrice.
          </p>
        )}
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Ruolo"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
