import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Shield, Users, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRoles, useRolePermissions } from "../../../hooks/settings";
import type { Role, RolePermission } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";
const COLOR_PRESETS = ["#4ADE80","#C6A961","#60A5FA","#A78BFA","#F59E0B","#EF4444","#EC4899","#14B8A6","#94A3B8","#FB923C","#84CC16","#F43F5E"];

const MODULES = ["Finance", "Progetti", "Social", "Team", "Settings"] as const;
type Module = typeof MODULES[number];

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function iconBtnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.3 : 1, transition: "background 0.15s", padding: 0,
  };
}

export default function RolesPermissions() {
  const { data: roles, loading: rolesLoading, create: createRole, update: updateRole, remove: removeRole } = useRoles();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: permissions, loading: permsLoading, create: createPerm, update: updatePerm } = useRolePermissions(selectedId ?? undefined);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#4ADE80" });
  const [roleSaving, setRoleSaving] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const roleList = roles ?? [];
  const effectiveSelectedId = selectedId ?? roleList[0]?.id ?? null;
  const selectedRole = roleList.find(r => r.id === effectiveSelectedId) ?? null;
  const isOwner = selectedRole?.is_system ?? false;

  function getPermRow(module: string): RolePermission | undefined {
    return (permissions ?? []).find(p => p.module === module);
  }

  function getPermValue(module: string, field: keyof Pick<RolePermission, "can_view" | "can_create" | "can_edit" | "can_delete" | "can_export">): boolean {
    return getPermRow(module)?.[field] ?? false;
  }

  async function toggleCell(module: string, field: keyof Pick<RolePermission, "can_view" | "can_create" | "can_edit" | "can_delete" | "can_export">) {
    if (!effectiveSelectedId || isOwner) return;
    const row = getPermRow(module);
    const newVal = !getPermValue(module, field);
    if (row) {
      await updatePerm(row.id, { [field]: newVal });
    } else {
      await createPerm({
        role_id: effectiveSelectedId,
        module,
        can_view: field === "can_view" ? newVal : false,
        can_create: field === "can_create" ? newVal : false,
        can_edit: field === "can_edit" ? newVal : false,
        can_delete: field === "can_delete" ? newVal : false,
        can_export: field === "can_export" ? newVal : false,
      });
    }
  }

  async function toggleModuleAll(module: string) {
    if (!effectiveSelectedId || isOwner) return;
    const allOn = (["can_view","can_create","can_edit","can_delete","can_export"] as const).every(f => getPermValue(module, f));
    const row = getPermRow(module);
    const patch = { can_view: !allOn, can_create: !allOn, can_edit: !allOn, can_delete: !allOn, can_export: !allOn };
    if (row) {
      await updatePerm(row.id, patch);
    } else {
      await createPerm({ role_id: effectiveSelectedId, module, ...patch });
    }
  }

  async function savePermissions() {
    setPermSaving(true);
    // Permissions are saved per-cell; this is a "confirm" toast
    setPermSaving(false);
    toast({ title: "Permessi salvati" });
  }

  function openCreate() {
    setEditRoleId(null);
    setForm({ name: "", description: "", color: "#4ADE80" });
    setModalOpen(true);
  }

  function openEditRole(role: Role) {
    setEditRoleId(role.id);
    setForm({ name: role.name, description: role.description ?? "", color: role.color });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setRoleSaving(true);
    try {
      if (editRoleId !== null) {
        const { error } = await updateRole(editRoleId, { name: form.name, description: form.description || null, color: form.color });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Ruolo aggiornato" });
      } else {
        const { error } = await createRole({ name: form.name, description: form.description || null, color: form.color, is_system: false, sort_order: roleList.length });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Ruolo creato" });
      }
      setModalOpen(false);
    } finally {
      setRoleSaving(false);
    }
  }

  async function deleteRole(id: string) {
    const { error } = await removeRole(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    if (effectiveSelectedId === id) setSelectedId(roleList.find(r => r.id !== id)?.id ?? null);
    setDeleteConfirm(null);
    toast({ title: "Ruolo eliminato" });
  }

  const ACTIONS: Array<{ key: keyof Pick<RolePermission,"can_view","can_create","can_edit","can_delete","can_export">; label: string }> = [
    { key: "can_view",   label: "Visualizza" },
    { key: "can_create", label: "Crea" },
    { key: "can_edit",   label: "Modifica" },
    { key: "can_delete", label: "Elimina" },
    { key: "can_export", label: "Esporta" },
  ];

  if (rolesLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Ruoli &amp; Permessi
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Gestisci i ruoli del team e i relativi permessi per modulo
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuovo Ruolo
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Left: roles list */}
        <div style={{ width: 240, flexShrink: 0, background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
          <AnimatePresence initial={false}>
            {roleList.map(role => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                onClick={() => setSelectedId(role.id)}
                style={{
                  padding: "10px 10px", borderRadius: 8, cursor: "pointer",
                  background: effectiveSelectedId === role.id ? `${role.color}18` : "transparent",
                  border: `0.5px solid ${effectiveSelectedId === role.id ? role.color + "44" : "transparent"}`,
                  marginBottom: 4, transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: role.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, flex: 1 }}>{role.name}</span>
                  {role.is_system && (
                    <span style={{
                      fontSize: 10, background: "#f3f4f6", borderRadius: 4,
                      padding: "1px 5px", color: TEXT_SECONDARY,
                    }}>
                      <Users size={9} />
                    </span>
                  )}
                </div>
                {role.description && (
                  <div style={{ fontSize: 11, color: TEXT_MUTED, paddingLeft: 18, lineHeight: 1.4 }}>{role.description}</div>
                )}
                <div style={{ display: "flex", gap: 4, paddingLeft: 18, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => openEditRole(role)} style={iconBtnStyle(GOLD)}>
                    <Pencil size={11} />
                  </button>
                  {!role.is_system && (
                    deleteConfirm === role.id ? (
                      <>
                        <span style={{ fontSize: 10, color: TEXT_SECONDARY, alignSelf: "center", marginRight: 2 }}>Elimina?</span>
                        <button type="button" onClick={() => deleteRole(role.id)} style={{ ...iconBtnStyle("#EF4444"), width: 22, height: 22 }}><Check size={10} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={{ ...iconBtnStyle(TEXT_MUTED), width: 22, height: 22 }}><X size={10} /></button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirm(role.id)} style={iconBtnStyle("#EF4444")}>
                        <Trash2 size={11} />
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Right: permissions matrix */}
        <div style={{ flex: 1, background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
          {selectedRole ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={15} style={{ color: selectedRole.color }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
                    Permessi — {selectedRole.name}
                  </h3>
                </div>
              </div>

              {permsLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                  <Loader2 size={20} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
                </div>
              ) : isOwner ? (
                <div style={{
                  padding: "14px 16px", borderRadius: 8,
                  background: `${GOLD}12`, border: `0.5px solid ${GOLD}44`,
                  fontSize: 13, color: TEXT_SECONDARY, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Shield size={14} style={{ color: GOLD, flexShrink: 0 }} />
                  Il ruolo sistema non può essere modificato — ha accesso completo a tutto il sistema.
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "6px 10px 10px 0", color: TEXT_MUTED, fontWeight: 600, fontSize: 11 }}>Modulo</th>
                          {ACTIONS.map(a => (
                            <th key={a.key} style={{ textAlign: "center", padding: "6px 8px 10px", color: TEXT_SECONDARY, fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" }}>{a.label}</th>
                          ))}
                          <th style={{ textAlign: "center", padding: "6px 8px 10px", color: TEXT_MUTED, fontWeight: 500, fontSize: 10, whiteSpace: "nowrap" }}>Completo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map(module => {
                          const allOn = ACTIONS.every(a => getPermValue(module, a.key));
                          return (
                            <tr key={module} style={{ borderTop: `0.5px solid ${BORDER}` }}>
                              <td style={{ padding: "10px 10px 10px 0", color: TEXT_PRIMARY, fontWeight: 500, fontSize: 12, whiteSpace: "nowrap" }}>{module}</td>
                              {ACTIONS.map(action => (
                                <td key={action.key} style={{ textAlign: "center", padding: "10px 8px" }}>
                                  <input
                                    type="checkbox"
                                    checked={getPermValue(module, action.key)}
                                    onChange={() => toggleCell(module, action.key)}
                                    style={{ width: 14, height: 14, cursor: "pointer", accentColor: GOLD }}
                                  />
                                </td>
                              ))}
                              <td style={{ textAlign: "center", padding: "10px 8px" }}>
                                <button type="button"
                                  onClick={() => toggleModuleAll(module)}
                                  style={{
                                    width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer",
                                    background: allOn ? GOLD : "#d1d5db",
                                    position: "relative", transition: "background 0.2s",
                                  }}
                                >
                                  <span style={{
                                    position: "absolute", top: 2,
                                    left: allOn ? 16 : 2,
                                    width: 14, height: 14, borderRadius: "50%", background: "white",
                                    transition: "left 0.2s", display: "block",
                                  }} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                    <button type="button" className="glass-btn-primary" onClick={savePermissions} disabled={permSaving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {permSaving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                      Salva Permessi
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED, fontSize: 13 }}>
              Seleziona un ruolo per visualizzare i permessi.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editRoleId ? "Modifica Ruolo" : "Nuovo Ruolo"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome ruolo" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Descrizione</span>
                  <input className="glass-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrizione breve" />
                </label>
                <div style={labelStyle}>
                  <span style={labelText}>Colore</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {COLOR_PRESETS.map(c => (
                      <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: form.color === c ? "2px solid white" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                    ))}
                  </div>
                </div>
                {!editRoleId && (
                  <p style={{ fontSize: 11, color: TEXT_MUTED, margin: 0, fontStyle: "italic" }}>
                    Il nuovo ruolo inizierà senza permessi. Potrai configurarli dalla matrice permessi.
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setModalOpen(false)}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveModal} disabled={!form.name.trim() || roleSaving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {roleSaving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
