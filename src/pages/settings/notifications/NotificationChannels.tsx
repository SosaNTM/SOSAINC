import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, Send, Monitor, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNotificationChannels } from "../../../hooks/settings";
import type { NotificationChannel } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  in_app:       { label: "In-App",        icon: Bell,    color: "#C6A961" },
  email:        { label: "Email",         icon: Mail,    color: "#60A5FA" },
  telegram:     { label: "Telegram Bot",  icon: Send,    color: "#26A5E4" },
  browser_push: { label: "Browser Push",  icon: Monitor, color: "#4ADE80" },
};

const DAY_LABELS = ["D", "L", "M", "M", "G", "V", "S"];
const DAY_FULL = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? GOLD : "#d1d5db", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
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

export default function NotificationChannels() {
  const { data: channels, loading, update } = useNotificationChannels();
  const [telegramInstructions, setTelegramInstructions] = useState(false);
  // Local optimistic UI state for config/quiet hours (not persisted in this demo)
  const [localConfig, setLocalConfig] = useState<Record<string, Record<string, string>>>({});
  const [localQuiet, setLocalQuiet] = useState<Record<string, { enabled: boolean; from: string; to: string; days: string[] }>>({});

  async function updateEnabled(ch: NotificationChannel, enabled: boolean) {
    const { error } = await update(ch.id, { is_enabled: enabled });
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
  }

  async function saveChannel(ch: NotificationChannel) {
    const cfg = localConfig[ch.id] ?? {};
    const q = localQuiet[ch.id];
    const patch: Partial<NotificationChannel> = {
      config: { ...(ch.config ?? {}), ...cfg } as Record<string, unknown>,
    };
    if (q) {
      patch.quiet_hours_from = q.enabled ? q.from : null;
      patch.quiet_hours_to = q.enabled ? q.to : null;
      patch.quiet_days = q.enabled ? q.days : [];
    }
    const { error } = await update(ch.id, patch);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    toast({ title: `Canale "${CHANNEL_META[ch.channel_type]?.label ?? ch.channel_type}" salvato` });
  }

  function getConfig(ch: NotificationChannel, key: string): string {
    return (localConfig[ch.id]?.[key] ?? (ch.config?.[key] as string | undefined) ?? "");
  }
  function setConfig(id: string, key: string, value: string) {
    setLocalConfig(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: value } }));
  }

  function getQuiet(ch: NotificationChannel) {
    const local = localQuiet[ch.id];
    if (local) return local;
    return {
      enabled: !!(ch.quiet_hours_from),
      from: ch.quiet_hours_from ?? "22:00",
      to: ch.quiet_hours_to ?? "08:00",
      days: ch.quiet_days ?? [],
    };
  }
  function setQuiet(id: string, patch: Partial<{ enabled: boolean; from: string; to: string; days: string[] }>) {
    setLocalQuiet(prev => {
      const curr = prev[id] ?? { enabled: false, from: "22:00", to: "08:00", days: [] };
      return { ...prev, [id]: { ...curr, ...patch } };
    });
  }
  function toggleDay(ch: NotificationChannel, dayStr: string) {
    const q = getQuiet(ch);
    const days = q.days.includes(dayStr) ? q.days.filter(d => d !== dayStr) : [...q.days, dayStr];
    setQuiet(ch.id, { days });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const channelList = channels ?? [];

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Canali Notifica
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Configura i canali attraverso cui ricevere le notifiche
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {channelList.map(ch => {
          const meta = CHANNEL_META[ch.channel_type] ?? { label: ch.channel_type, icon: Bell, color: GOLD };
          const IconComp = meta.icon;
          const quiet = getQuiet(ch);
          return (
            <div
              key={ch.id}
              style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: `${meta.color}22`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IconComp size={16} style={{ color: meta.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
                    {ch.is_enabled ? "Attivo" : "Disattivato"}
                  </div>
                </div>
                <Toggle checked={ch.is_enabled} onChange={v => updateEnabled(ch, v)} />
              </div>

              {/* Expanded config */}
              <AnimatePresence initial={false}>
                {ch.is_enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ padding: "0 20px 20px", borderTop: `0.5px solid ${BORDER}` }}>
                      {/* Channel-specific config */}
                      <div style={{ paddingTop: 16, marginBottom: 16 }}>
                        {ch.channel_type === "in_app" && (
                          <p style={{ fontSize: 12, color: TEXT_SECONDARY, margin: 0 }}>
                            Sempre disponibile — le notifiche in-app sono sempre attive quando sei loggato.
                          </p>
                        )}

                        {ch.channel_type === "email" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 }}>Indirizzo email</span>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                className="glass-input"
                                type="email"
                                value={getConfig(ch, "email")}
                                onChange={e => setConfig(ch.id, "email", e.target.value)}
                                placeholder="email@esempio.com"
                                style={{ flex: 1 }}
                              />
                              <button type="button" className="glass-btn" onClick={() => saveChannel(ch)} style={{ fontSize: 12, padding: "6px 14px" }}>
                                Salva
                              </button>
                            </div>
                          </div>
                        )}

                        {ch.channel_type === "telegram" && (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                                Stato: <span style={{ color: getConfig(ch, "status") === "connesso" ? "#4ADE80" : "#EF4444" }}>
                                  {getConfig(ch, "status") || "non connesso"}
                                </span>
                              </span>
                              <button type="button"
                                className="glass-btn"
                                onClick={() => setTelegramInstructions(v => !v)}
                                style={{ fontSize: 12, padding: "5px 12px" }}
                              >
                                {telegramInstructions ? "Nascondi" : "Configura Bot"}
                              </button>
                            </div>
                            <AnimatePresence>
                              {telegramInstructions && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
                                  style={{
                                    background: "rgba(38,165,228,0.06)", border: "0.5px solid rgba(38,165,228,0.2)",
                                    borderRadius: 8, padding: "12px 14px", fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.7,
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 6 }}>Istruzioni configurazione:</div>
                                  <div>1. Cerca <span style={{ color: "#26A5E4" }}>@iconoff_bot</span> su Telegram</div>
                                  <div>2. Invia <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 3 }}>/start</code></div>
                                  <div>3. Copia il token che ti viene inviato e incollalo qui sotto</div>
                                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                                    <input className="glass-input" placeholder="Incolla il token..." style={{ flex: 1, fontSize: 11 }}
                                      onChange={e => setConfig(ch.id, "token", e.target.value)} />
                                    <button type="button" className="glass-btn-primary" onClick={() => {
                                      setConfig(ch.id, "status", "connesso");
                                      saveChannel(ch);
                                      setTelegramInstructions(false);
                                      toast({ title: "Telegram configurato" });
                                    }} style={{ fontSize: 11, padding: "6px 12px" }}>
                                      Connetti
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {ch.channel_type === "browser_push" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                              Ricevi notifiche push anche quando il browser è in background.
                            </span>
                            <button type="button"
                              className="glass-btn"
                              onClick={() => toast({ title: "Permesso richiesto al browser" })}
                              style={{ fontSize: 12, padding: "5px 12px", flexShrink: 0 }}
                            >
                              Richiedi permesso
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div style={{ height: "0.5px", background: BORDER, margin: "0 0 14px" }} />

                      {/* Quiet Hours */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY }}>Orari Silenzio</div>
                            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>Non disturbare in questi orari</div>
                          </div>
                          <Toggle
                            checked={quiet.enabled}
                            onChange={v => setQuiet(ch.id, { enabled: v })}
                          />
                        </div>

                        <AnimatePresence initial={false}>
                          {quiet.enabled && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>Orario inizio</span>
                                  <input
                                    className="glass-input"
                                    type="time"
                                    value={quiet.from}
                                    onChange={e => setQuiet(ch.id, { from: e.target.value })}
                                    style={{ width: 110 }}
                                  />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>Orario fine</span>
                                  <input
                                    className="glass-input"
                                    type="time"
                                    value={quiet.to}
                                    onChange={e => setQuiet(ch.id, { to: e.target.value })}
                                    style={{ width: 110 }}
                                  />
                                </label>
                              </div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
                                {[1,2,3,4,5,6,0].map(day => {
                                  const dayStr = String(day);
                                  return (
                                    <button type="button"
                                      key={day}
                                      onClick={() => toggleDay(ch, dayStr)}
                                      title={DAY_FULL[day]}
                                      style={{
                                        width: 30, height: 28, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                                        fontWeight: 600,
                                        background: quiet.days.includes(dayStr) ? GOLD : "#f3f4f6",
                                        color: quiet.days.includes(dayStr) ? "#000" : TEXT_SECONDARY,
                                        transition: "background 0.15s, color 0.15s",
                                      }}
                                    >
                                      {DAY_LABELS[day]}
                                    </button>
                                  );
                                })}
                              </div>
                              <button type="button" className="glass-btn" onClick={() => saveChannel(ch)} style={{ fontSize: 12, padding: "5px 14px" }}>
                                Salva orari silenzio
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
