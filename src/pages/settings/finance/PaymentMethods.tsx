import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Building2, Wallet, Coins, Banknote, MoreHorizontal,
  Pencil, Trash2, Check, X, Plus, Star, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePaymentMethods } from "../../../hooks/settings";
import type { PaymentMethod } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

type DBPaymentType = 'card' | 'bank' | 'cash' | 'digital' | 'crypto';

const TYPE_CONFIG: Record<DBPaymentType, { label: string; icon: React.ElementType; color: string }> = {
  card:    { label: "Carta",            icon: CreditCard,     color: "#60A5FA" },
  bank:    { label: "Bonifico Bancario", icon: Building2,     color: "#C6A961" },
  cash:    { label: "Contanti",          icon: Banknote,      color: "#4ADE80" },
  digital: { label: "Pagamento Digitale", icon: Wallet,       color: "#3B82F6" },
  crypto:  { label: "Crypto",            icon: Coins,         color: "#F59E0B" },
};

type FormState = {
  name: string;
  type: DBPaymentType;
  last_four: string;
  is_default: boolean;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "", type: "card", last_four: "", is_default: false, is_active: true,
});

export default function PaymentMethods() {
  const { data: methods, loading, create, update, remove } = usePaymentMethods();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() { setEditingId(null); setForm(emptyForm()); setModalOpen(true); }

  function openEdit(m: PaymentMethod) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      type: m.type,
      last_four: m.last_four ?? "",
      is_default: m.is_default,
      is_active: m.is_active,
    });
    setModalOpen(true);
  }

  async function saveModal() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      // If setting as default, clear default on all others first
      if (form.is_default) {
        for (const m of methods) {
          if (m.id !== editingId && m.is_default) {
            await update(m.id, { is_default: false });
          }
        }
      }
      const { error } = await update(editingId, {
        name: form.name,
        type: form.type,
        last_four: form.last_four || null,
        is_default: form.is_default,
        is_active: form.is_active,
      });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Metodo aggiornato" }); }
    } else {
      // If setting as default, clear default on all others first
      if (form.is_default) {
        for (const m of methods) {
          if (m.is_default) {
            await update(m.id, { is_default: false });
          }
        }
      }
      const { error } = await create({
        name: form.name,
        type: form.type,
        last_four: form.last_four || null,
        is_default: form.is_default,
        is_active: form.is_active,
        last_used_at: null,
        sort_order: methods.length,
      });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Metodo aggiunto" }); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function deleteItem(id: string) {
    const { error } = await remove(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
    else { toast({ title: "Metodo eliminato" }); }
    setDeleteConfirm(null);
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Metodi di Pagamento
          </h2>
          <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
            Gestisci i metodi di pagamento disponibili
          </p>
        </div>
        <button type="button" className="glass-btn-primary" onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> Nuovo Metodo
        </button>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 10, color: TEXT_MUTED }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Caricamento...</span>
          </div>
        ) : methods.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT_MUTED }}>
            <CreditCard size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>Nessun metodo di pagamento. Aggiungine uno.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {methods.map((m, idx) => {
              const cfg = TYPE_CONFIG[m.type] ?? TYPE_CONFIG.card;
              const TypeIcon = cfg.icon;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: idx < methods.length - 1 ? `0.5px solid ${BORDER}` : "none",
                    opacity: m.is_active ? 1 : 0.45,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: `${cfg.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <TypeIcon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{m.name}</span>
                      {m.last_four && (
                        <span style={{ fontSize: 11, color: TEXT_MUTED }}>···{m.last_four}</span>
                      )}
                      <span style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 99,
                        background: `${cfg.color}18`, color: cfg.color, fontWeight: 500,
                      }}>
                        {cfg.label}
                      </span>
                      {m.is_default && (
                        <span style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 99,
                          background: `${GOLD}20`, color: GOLD, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 3,
                        }}>
                          <Star size={9} /> Default
                        </span>
                      )}
                    </div>
                    {m.last_used_at && (
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                        Ultimo utilizzo: {m.last_used_at}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {deleteConfirm === m.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Sei sicuro?</span>
                        <button type="button" onClick={() => deleteItem(m.id)} style={iconBtnStyle("#4ADE80")}><Check size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle("#EF4444")}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => openEdit(m)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                        <button type="button" onClick={() => setDeleteConfirm(m.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
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
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,11,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "100%" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {editingId ? "Modifica Metodo" : "Nuovo Metodo di Pagamento"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Visa Business" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Tipo</span>
                  <select className="glass-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DBPaymentType }))}>
                    {(Object.entries(TYPE_CONFIG) as [DBPaymentType, typeof TYPE_CONFIG[DBPaymentType]][]).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Ultime 4 cifre (opzionale)</span>
                  <input className="glass-input" value={form.last_four} onChange={e => setForm(f => ({ ...f, last_four: e.target.value }))}
                    placeholder="Es. 4242" maxLength={4} />
                </label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Metodo predefinito</span>
                  <ToggleSwitch checked={form.is_default} onChange={v => setForm(f => ({ ...f, is_default: v }))} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Attivo</span>
                  <ToggleSwitch checked={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setModalOpen(false)} disabled={saving}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveModal} disabled={!form.name.trim() || saving}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: "pointer",
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: checked ? GOLD : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block" }} />
    </button>
  );
}
