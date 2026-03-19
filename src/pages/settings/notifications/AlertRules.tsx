import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Bell, Mail, Send, Monitor, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAlertRules } from "../../../hooks/settings";
import type { AlertRule } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

type Priority = "info" | "warning" | "critical";

const TRIGGER_OPTIONS = [
  "Scadenza abbonamento","Budget categoria","Assegnazione task","Scadenza task",
  "Commento task","Pubblicazione social","Errore social","Pagamento ricevuto","Obiettivo raggiunto",
];

const CHANNEL_OPTIONS = [
  { id: "in_app", label: "In-App", icon: Bell },
  { id: "email", label: "Email", icon: Mail },
  { id: "telegram", label: "Telegram", icon: Send },
  { id: "browser_push", label: "Browser Push", icon: Monitor },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  info:     { label: "Info",     color: "#60A5FA", bg: "rgba(96,165,250,0.10)"  },
  warning:  { label: "Warning",  color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  critical: { label: "Critical", color: "#EF4444", bg: "rgba(239,68,68,0.10)"   },
};

type FormState = {
  name: string;
  trigger_type: string;
  conditions: Record<string, unknown>;
  channels: string[];
  priority: Priority;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "", trigger_type: TRIGGER_OPTIONS[0], conditions: {}, channels: ["in_app"], priority: "info", is_active: true,
});

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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
      background: checked ? GOLD : "#d1d5db", position: "relative",
      transition: "background 0.2s", flexShrink: 0,
    }}>
      <span style={{
        position: "absolute", top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: "50%", background: "white",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );
}

export default function AlertRules() {
  const { data: rules, loading, create, update, remove } = useAlertRules();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      conditions: rule.conditions ?? {},
      channels: [...rule.channels],
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId !== null) {
        const { error } = await update(editingId, {
          name: form.name, trigger_type: form.trigger_type, conditions: form.conditions,
          channels: form.channels, priority: form.priority, is_active: form.is_active,
        });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Regola aggiornata" });
      } else {
        const { error } = await create({
          name: form.name, trigger_type: form.trigger_type, conditions: form.conditions,
          channels: form.channels, priority: form.priority, is_active: form.is_active,         });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Regola creata" });
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id: string) {
    const { error } = await remove(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    setDeleteConfirm(null);
    toast({ title: "Regola eliminata" });
  }

  async function toggleActive(rule: AlertRule) {
    const { error } = await update(rule.id, { is_active: !rule.is_active });
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
  }

  function toggleChannel(ch: string) {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch],
    }));
  }

  const condition = (rule: AlertRule) => (rule.conditions?.description as string) ?? "";

  if (loading) {
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
            Regole Alert
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Configura le regole per ricevere notifiche automatiche sugli eventi
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuova Regola
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        {(rules ?? []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED }}>
            <AlertCircle size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nessuna regola. Creane una nuova.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {(rules ?? []).map((rule, idx) => {
              const pc = PRIORITY_CONFIG[rule.priority];
              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 0",
                    borderBottom: idx < (rules ?? []).length - 1 ? `0.5px solid ${BORDER}` : "none",
                    opacity: rule.is_active ? 1 : 0.5,
                  }}
                >
                  {/* Name + trigger */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>{rule.name}</span>
                      <span style={{
                        fontSize: 10, color: TEXT_SECONDARY, background: "#f3f4f6",
                        borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap",
                      }}>
                        {rule.trigger_type}
                      </span>
                    </div>
                    {condition(rule) && <div style={{ fontSize: 11, color: TEXT_MUTED }}>{condition(rule)}</div>}
                  </div>

                  {/* Priority badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: pc.color, background: pc.bg,
                    borderRadius: 5, padding: "2px 7px", flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    {pc.label}
                  </span>

                  {/* Channel icons */}
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    {CHANNEL_OPTIONS.map(ch => {
                      const active = rule.channels.includes(ch.id);
                      return (
                        <div key={ch.id} title={ch.label} style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: active ? `${GOLD}30` : "#f9fafb",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <ch.icon size={9} style={{ color: active ? GOLD : TEXT_MUTED }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Toggle */}
                  <Toggle checked={rule.is_active} onChange={() => toggleActive(rule)} />

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {deleteConfirm === rule.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, alignSelf: "center", marginRight: 2 }}>Elimina?</span>
                        <button type="button" onClick={() => deleteRule(rule.id)} style={{ ...iconBtnStyle("#EF4444"), width: 24, height: 24 }}><Check size={11} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={{ ...iconBtnStyle(TEXT_MUTED), width: 24, height: 24 }}><X size={11} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => openEdit(rule)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(rule.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
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
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw", maxHeight: "90vh", overflowY: "auto" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Regola" : "Nuova Regola"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome regola" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Evento trigger</span>
                  <select className="glass-input" value={form.trigger_type} onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}>
                    {TRIGGER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Condizione</span>
                  <input className="glass-input" value={(form.conditions?.description as string) ?? ""} onChange={e => setForm(f => ({ ...f, conditions: { ...f.conditions, description: e.target.value } }))} placeholder="es. 7 giorni prima" />
                </label>
                <div style={labelStyle}>
                  <span style={labelText}>Canali</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {CHANNEL_OPTIONS.map(ch => {
                      const active = form.channels.includes(ch.id);
                      return (
                        <button type="button"
                          key={ch.id}
                          onClick={() => toggleChannel(ch.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                            borderRadius: 6, border: `0.5px solid ${active ? GOLD + "88" : BORDER}`,
                            background: active ? `${GOLD}18` : "#f9fafb",
                            color: active ? GOLD : TEXT_SECONDARY, cursor: "pointer", fontSize: 12,
                          }}
                        >
                          <ch.icon size={12} /> {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={labelStyle}>
                  <span style={labelText}>Priorità</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["info","warning","critical"] as Priority[]).map(p => {
                      const pc = PRIORITY_CONFIG[p];
                      return (
                        <button type="button"
                          key={p}
                          onClick={() => setForm(f => ({ ...f, priority: p }))}
                          style={{
                            flex: 1, padding: "6px", borderRadius: 7, border: `0.5px solid ${form.priority === p ? pc.color + "88" : BORDER}`,
                            background: form.priority === p ? pc.bg : "#f9fafb",
                            color: form.priority === p ? pc.color : TEXT_SECONDARY,
                            cursor: "pointer", fontSize: 12, fontWeight: form.priority === p ? 600 : 400,
                            transition: "all 0.15s",
                          }}
                        >
                          {pc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setModalOpen(false)}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveModal} disabled={!form.name.trim() || saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
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
