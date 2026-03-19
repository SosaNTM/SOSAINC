import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Upload, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSocialPublishingRules, useHashtagSets } from "../../../hooks/settings";
import type { HashtagSet } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];

const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS.map(d => [d, { enabled: true, times: ["09:00","18:00"] }])
);

type HashtagForm = { name: string; tagsText: string };
const emptyHashtagForm = (): HashtagForm => ({ name: "", tagsText: "" });

export default function PublishingRules() {
  const { data: rules, loading: rulesLoading, upsert } = useSocialPublishingRules();
  const { data: hashtagSets, loading: hashtagsLoading, create: createH, update: updateH, remove: removeH } = useHashtagSets();

  const [schedule, setSchedule] = useState<Record<string, { enabled: boolean; times: string[] }>>(DEFAULT_SCHEDULE);
  const [requireApproval, setRequireApproval] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [saving, setSaving] = useState(false);

  const [hModalOpen, setHModalOpen] = useState(false);
  const [hEditingId, setHEditingId] = useState<string | null>(null);
  const [hForm, setHForm] = useState<HashtagForm>(emptyHashtagForm());
  const [hDeleteConfirm, setHDeleteConfirm] = useState<string | null>(null);
  const [hSaving, setHSaving] = useState(false);

  // Load saved data into local state on mount
  useEffect(() => {
    if (rules) {
      if (rules.schedule && Object.keys(rules.schedule).length > 0) setSchedule(rules.schedule);
      setRequireApproval(rules.require_approval ?? false);
      setWatermark(rules.watermark_enabled ?? false);
      setWatermarkText(rules.watermark_text ?? "");
    }
  }, [rules]);

  function updateTime(day: string, timeIdx: number, value: string) {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], times: prev[day].times.map((t, ti) => ti === timeIdx ? value : t) },
    }));
  }

  function addTime(day: string) {
    setSchedule(prev => {
      const d = prev[day];
      if (d.times.length >= 3) return prev;
      return { ...prev, [day]: { ...d, times: [...d.times, "12:00"] } };
    });
  }

  function removeTime(day: string, timeIdx: number) {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], times: prev[day].times.filter((_, ti) => ti !== timeIdx) },
    }));
  }

  async function saveAll() {
    setSaving(true);
    const { error } = await upsert({
      schedule,
      require_approval: requireApproval,
      watermark_enabled: watermark,
      watermark_text: watermarkText || null,
      auto_hashtags: rules?.auto_hashtags ?? false,
    });
    setSaving(false);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    toast({ title: "Impostazioni salvate", description: "Le regole di pubblicazione sono state aggiornate." });
  }

  function openCreateH() { setHEditingId(null); setHForm(emptyHashtagForm()); setHModalOpen(true); }
  function openEditH(h: HashtagSet) {
    setHEditingId(h.id);
    setHForm({ name: h.name, tagsText: h.hashtags.join(", ") });
    setHModalOpen(true);
  }
  async function saveHModal() {
    if (!hForm.name.trim()) return;
    const hashtags = hForm.tagsText
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.startsWith("#") ? t : `#${t}`);
    setHSaving(true);
    try {
      if (hEditingId !== null) {
        const { error } = await updateH(hEditingId, { name: hForm.name, hashtags });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Set hashtag aggiornato" });
      } else {
        const { error } = await createH({ name: hForm.name, hashtags, platforms: [], is_active: true,  });
        if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
        toast({ title: "Set hashtag creato" });
      }
      setHModalOpen(false);
    } finally {
      setHSaving(false);
    }
  }
  async function deleteH(id: string) {
    const { error } = await removeH(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    setHDeleteConfirm(null);
    toast({ title: "Set eliminato" });
  }

  if (rulesLoading || hashtagsLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Regole Pubblicazione
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Configura orari, limiti e preferenze per la pubblicazione automatica
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Orari preferiti */}
        <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginTop: 0, marginBottom: 14 }}>
            Orari preferiti
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DAYS.map(day => {
              const d = schedule[day] ?? { enabled: true, times: [] };
              return (
                <div key={day} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_SECONDARY, width: 90, flexShrink: 0 }}>{day}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {d.times.map((t, ti) => (
                      <div key={ti} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="time"
                          className="glass-input"
                          value={t}
                          onChange={e => updateTime(day, ti, e.target.value)}
                          style={{ width: 110 }}
                        />
                        {d.times.length > 1 && (
                          <button type="button" onClick={() => removeTime(day, ti)} style={smallIconBtn("#EF4444")}>
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    {d.times.length < 3 && (
                      <button type="button"
                        onClick={() => addTime(day)}
                        style={{
                          fontSize: 10, color: GOLD, background: "transparent",
                          border: `0.5px dashed rgba(198,169,97,0.3)`, borderRadius: 4,
                          padding: "3px 8px", cursor: "pointer",
                        }}
                      >
                        + Aggiungi orario
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approvazione richiesta */}
        <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>Approvazione richiesta</div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 3 }}>
                Richiedi approvazione manuale prima della pubblicazione
              </div>
            </div>
            <ToggleSwitch checked={requireApproval} onChange={setRequireApproval} />
          </div>
        </div>

        {/* Watermark */}
        <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: watermark ? 14 : 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>Watermark automatico</div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 3 }}>
                Applica automaticamente un watermark ai contenuti pubblicati
              </div>
            </div>
            <ToggleSwitch checked={watermark} onChange={setWatermark} />
          </div>
          <AnimatePresence>
            {watermark && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, paddingTop: 12,
                  borderTop: `0.5px solid ${BORDER}`, flexWrap: "wrap",
                }}>
                  <button type="button" className="glass-btn" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <Upload size={12} /> Carica watermark
                  </button>
                  <input
                    className="glass-input"
                    value={watermarkText}
                    onChange={e => setWatermarkText(e.target.value)}
                    placeholder="Testo watermark (opzionale)"
                    style={{ flex: 1, minWidth: 160 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hashtag sets */}
        <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
              Hashtag set salvati
            </h3>
            <button type="button" className="glass-btn-primary" onClick={openCreateH} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <Plus size={12} /> Nuovo set
            </button>
          </div>
          {(hashtagSets ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: TEXT_MUTED, margin: 0 }}>Nessun set. Creane uno.</p>
          ) : (
            <AnimatePresence initial={false}>
              {(hashtagSets ?? []).map((h, idx) => (
                <motion.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: idx < (hashtagSets ?? []).length - 1 ? `0.5px solid ${BORDER}` : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY, marginBottom: 4 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.hashtags.join("  ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {hDeleteConfirm === h.id ? (
                      <>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Elimina?</span>
                        <button type="button" onClick={() => deleteH(h.id)} style={iconBtnStyle("#EF4444")}><Check size={13} /></button>
                        <button type="button" onClick={() => setHDeleteConfirm(null)} style={iconBtnStyle(TEXT_MUTED)}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => openEditH(h)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                        <button type="button" onClick={() => setHDeleteConfirm(h.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="glass-btn-primary" onClick={saveAll} disabled={saving} style={{ padding: "9px 22px", display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Salva Impostazioni
          </button>
        </div>
      </div>

      {/* Hashtag Modal */}
      <AnimatePresence>
        {hModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setHModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "90vw" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {hEditingId ? "Modifica Set Hashtag" : "Nuovo Set Hashtag"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome set</span>
                  <input className="glass-input" value={hForm.name} onChange={e => setHForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Brand Core" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Hashtag (uno per riga o separati da virgola)</span>
                  <textarea
                    className="glass-input"
                    value={hForm.tagsText}
                    onChange={e => setHForm(f => ({ ...f, tagsText: e.target.value }))}
                    placeholder="#iconoff, #design, #studio"
                    rows={4}
                    style={{ resize: "vertical" }}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setHModalOpen(false)}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveHModal} disabled={!hForm.name.trim() || hSaving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {hSaving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
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

function smallIconBtn(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 20, height: 20, borderRadius: 4, border: "none",
    background: "transparent", color, cursor: "pointer",
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: "#374151", fontWeight: 500 };

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? GOLD : "#d1d5db", position: "relative", transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: "50%", background: "white",
        transition: "left 0.2s", display: "block",
      }} />
    </button>
  );
}
