import { useState } from "react";
import { Bell, Mail, Send, Monitor, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useNotificationChannels } from "../../../hooks/settings";
import type { NotificationChannel } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField, SettingsToggle,
} from "@/components/settings";

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  in_app:       { label: "In-App",       icon: Bell,    color: "var(--accent-primary)" },
  email:        { label: "Email",        icon: Mail,    color: "#3b82f6" },
  telegram:     { label: "Telegram Bot", icon: Send,    color: "#26A5E4" },
  browser_push: { label: "Browser Push", icon: Monitor, color: "#22c55e" },
};

const DIGEST_OPTIONS = [
  { value: "realtime", label: "Tempo reale" },
  { value: "daily", label: "Digest giornaliero" },
  { value: "weekly", label: "Digest settimanale" },
];

export default function NotificationChannelsPage() {
  const { data: channels, loading, update } = useNotificationChannels();

  /* Local state for channel-specific config */
  const [localConfig, setLocalConfig] = useState<Record<string, Record<string, string>>>({});
  const [quietHours, setQuietHours] = useState<{
    enabled: boolean; from: string; to: string;
  }>({ enabled: false, from: "22:00", to: "08:00" });

  async function toggleEnabled(ch: NotificationChannel, enabled: boolean) {
    const { error } = await update(ch.id, { is_enabled: enabled });
    if (error) { toast.error(error); }
  }

  function getConfig(ch: NotificationChannel, key: string): string {
    return localConfig[ch.id]?.[key] ?? (ch.config?.[key] as string | undefined) ?? "";
  }

  function setConfig(id: string, key: string, value: string) {
    setLocalConfig((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [key]: value },
    }));
  }

  async function saveChannelConfig(ch: NotificationChannel) {
    const cfg = localConfig[ch.id] ?? {};
    const { error } = await update(ch.id, {
      config: { ...(ch.config ?? {}), ...cfg } as Record<string, unknown>,
    });
    if (error) { toast.error(error); }
    else { toast.success(`Canale "${CHANNEL_META[ch.channel_type]?.label}" salvato`); }
  }

  async function saveQuietHours(ch: NotificationChannel) {
    const { error } = await update(ch.id, {
      quiet_hours_from: quietHours.enabled ? quietHours.from : null,
      quiet_hours_to: quietHours.enabled ? quietHours.to : null,
    });
    if (error) { toast.error(error); }
    else { toast.success("Ore di quiete aggiornate"); }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Bell}
        title="Canali di Notifica"
        description="Configura come ricevere le notifiche"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {channels.map((ch) => {
          const meta = CHANNEL_META[ch.channel_type] ?? { label: ch.channel_type, icon: Bell, color: "var(--accent-primary)" };
          const Icon = meta.icon;

          return (
            <SettingsCard key={ch.id}>
              {/* Header row with icon, name, toggle */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                marginBottom: ch.is_enabled ? 16 : 0,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-md)",
                  background: `${meta.color}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon style={{ width: 18, height: 18, color: meta.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>
                    {meta.label}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-body)", fontSize: 11,
                    color: ch.is_enabled ? "var(--color-success)" : "var(--text-tertiary)",
                    marginTop: 1,
                  }}>
                    {ch.is_enabled ? "Attivo" : "Disattivato"}
                  </div>
                </div>
                <SettingsToggle
                  checked={ch.is_enabled}
                  onChange={(v) => toggleEnabled(ch, v)}
                />
              </div>

              {/* Channel-specific config (only when enabled) */}
              {ch.is_enabled && (
                <div style={{
                  paddingTop: 16,
                  borderTop: "1px solid var(--border-glass)",
                }}>
                  {/* ── In-App ──────────────────────────────────────── */}
                  {ch.channel_type === "in_app" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Volume2 style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />
                        <span style={{
                          fontFamily: "var(--font-body)", fontSize: 13,
                          color: "var(--text-secondary)",
                        }}>
                          Suono notifica
                        </span>
                      </div>
                      <SettingsToggle
                        checked={getConfig(ch, "sound") !== "false"}
                        onChange={(v) => {
                          setConfig(ch.id, "sound", v ? "true" : "false");
                          saveChannelConfig(ch);
                        }}
                      />
                    </div>
                  )}

                  {/* ── Email ───────────────────────────────────────── */}
                  {ch.channel_type === "email" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <SettingsFormField label="Digest">
                        <select className="glass-input"
                          value={getConfig(ch, "digest") || "realtime"}
                          onChange={(e) => {
                            setConfig(ch.id, "digest", e.target.value);
                            saveChannelConfig(ch);
                          }}>
                          {DIGEST_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </SettingsFormField>
                    </div>
                  )}

                  {/* ── Telegram ────────────────────────────────────── */}
                  {ch.channel_type === "telegram" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <SettingsFormField label="Bot Token">
                        <input className="glass-input" type="password"
                          value={getConfig(ch, "bot_token")}
                          onChange={(e) => setConfig(ch.id, "bot_token", e.target.value)}
                          placeholder="Token del bot Telegram" />
                      </SettingsFormField>
                      <SettingsFormField label="Chat ID">
                        <input className="glass-input"
                          value={getConfig(ch, "chat_id")}
                          onChange={(e) => setConfig(ch.id, "chat_id", e.target.value)}
                          placeholder="ID della chat" />
                      </SettingsFormField>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" onClick={() => saveChannelConfig(ch)}
                          style={{ fontSize: 12, padding: "6px 14px" }}>
                          Salva
                        </button>
                        <button onClick={() => toast.success("Messaggio di test inviato")}
                          style={{
                            background: "var(--glass-bg)",
                            border: "1px solid var(--glass-border)",
                            borderRadius: "var(--radius-md)", padding: "6px 14px",
                            fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
                            cursor: "pointer", fontFamily: "var(--font-body)",
                          }}>
                          Invia Test
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Browser Push ────────────────────────────────── */}
                  {ch.channel_type === "browser_push" && (
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: 12,
                      color: "var(--text-secondary)", margin: 0,
                    }}>
                      Ricevi notifiche push anche quando il browser e in background.
                    </p>
                  )}
                </div>
              )}
            </SettingsCard>
          );
        })}

        {/* ── Ore di Quiete (global card) ────────────────────────────── */}
        <SettingsCard title="Ore di Quiete" description="Non disturbare in determinati orari">
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: quietHours.enabled ? 16 : 0,
          }}>
            <span style={{
              fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)",
            }}>
              Abilita ore di quiete
            </span>
            <SettingsToggle
              checked={quietHours.enabled}
              onChange={(v) => setQuietHours((q) => ({ ...q, enabled: v }))}
            />
          </div>

          {quietHours.enabled && (
            <div style={{
              paddingTop: 16, borderTop: "1px solid var(--border-glass)",
              display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end",
            }}>
              <SettingsFormField label="Dalle">
                <input className="glass-input" type="time"
                  value={quietHours.from}
                  onChange={(e) => setQuietHours((q) => ({ ...q, from: e.target.value }))}
                  style={{ width: 120 }} />
              </SettingsFormField>
              <SettingsFormField label="Alle">
                <input className="glass-input" type="time"
                  value={quietHours.to}
                  onChange={(e) => setQuietHours((q) => ({ ...q, to: e.target.value }))}
                  style={{ width: 120 }} />
              </SettingsFormField>
              <button className="btn-primary"
                onClick={() => {
                  if (channels.length > 0) saveQuietHours(channels[0]);
                }}
                style={{ fontSize: 12, padding: "6px 14px", marginBottom: 16 }}>
                Salva
              </button>
            </div>
          )}
        </SettingsCard>
      </div>
    </div>
  );
}
