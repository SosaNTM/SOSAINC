import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useSocialConnections } from "../../../hooks/settings";
import type { SocialConnection } from "../../../types/settings";
import { useAuth } from "@/lib/authContext";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsModal, SettingsDeleteConfirm,
} from "@/components/settings";

type Platform = "instagram" | "x" | "linkedin" | "tiktok" | "youtube" | "facebook";

const PLATFORM_META: Record<Platform, { label: string; color: string; letter: string }> = {
  instagram: { label: "Instagram",   color: "#E1306C", letter: "I" },
  x:         { label: "X (Twitter)", color: "#1DA1F2", letter: "X" },
  linkedin:  { label: "LinkedIn",    color: "#0A66C2", letter: "L" },
  tiktok:    { label: "TikTok",      color: "#010101", letter: "T" },
  youtube:   { label: "YouTube",     color: "#FF0000", letter: "Y" },
  facebook:  { label: "Facebook",    color: "#1877F2", letter: "F" },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

interface ConnectForm { handle: string; name: string; }
const emptyConnectForm = (): ConnectForm => ({ handle: "", name: "" });

export default function SocialAccountsSettings() {
  const { data: connections, loading, create, remove } = useSocialConnections();
  const { user } = useAuth();

  const [connectPlatform, setConnectPlatform] = useState<Platform | null>(null);
  const [connectForm, setConnectForm] = useState<ConnectForm>(emptyConnectForm());
  const [connectErrors, setConnectErrors] = useState<Record<string, string>>({});
  const [connectSaving, setConnectSaving] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<SocialConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Build a map: platform → active connection (if any)
  const connectionMap = new Map<string, SocialConnection>();
  for (const c of connections) {
    if (c.is_active) connectionMap.set(c.platform, c);
  }

  function openConnect(platform: Platform) {
    setConnectPlatform(platform);
    setConnectForm(emptyConnectForm());
    setConnectErrors({});
  }

  async function handleConnect() {
    const errs: Record<string, string> = {};
    if (!connectForm.handle.trim()) errs.handle = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setConnectErrors(errs); return; }
    if (!connectPlatform || !user?.id) return;

    setConnectSaving(true);
    const { error } = await create({
      user_id: user.id,
      platform: connectPlatform,
      account_handle: connectForm.handle.trim(),
      account_name: connectForm.name.trim() || null,
      is_active: true,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: new Date().toISOString(),
    });
    setConnectSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`${PLATFORM_META[connectPlatform].label} collegato`);
      setConnectPlatform(null);
    }
  }

  async function handleDisconnect() {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    const { error } = await remove(disconnectTarget.id);
    setDisconnecting(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Account disconnesso");
      setDisconnectTarget(null);
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Share2}
        title="Account Social"
        description="Gestisci gli account social collegati al portale"
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 16,
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}>
        {ALL_PLATFORMS.map((platform) => {
          const meta = PLATFORM_META[platform];
          const conn = connectionMap.get(platform);
          const isConnected = !!conn;

          return (
            <SettingsCard key={platform}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: meta.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
                  fontFamily: "var(--font-display)",
                }}>
                  {meta.letter}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {meta.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conn ? (conn.account_handle ?? conn.account_name ?? "Connesso") : "Non collegato"}
                  </div>
                </div>
              </div>

              {/* Status dot */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isConnected ? "var(--color-success)" : "var(--text-tertiary)",
                }} />
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500,
                  color: isConnected ? "var(--color-success)" : "var(--text-tertiary)",
                }}>
                  {isConnected ? "Connesso" : "Non collegato"}
                </span>
              </div>

              {/* Action button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {isConnected ? (
                  <button
                    onClick={() => setDisconnectTarget(conn)}
                    style={{
                      background: "none",
                      border: "1px solid var(--color-error)",
                      borderRadius: "var(--radius-md)",
                      padding: "6px 14px",
                      fontSize: 12, fontWeight: 500,
                      color: "var(--color-error)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    Disconnetti
                  </button>
                ) : (
                  <button
                    onClick={() => openConnect(platform)}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "6px 14px" }}
                  >
                    Connetti
                  </button>
                )}
              </div>
            </SettingsCard>
          );
        })}
      </div>

      {/* Connect modal */}
      <SettingsModal
        open={connectPlatform !== null}
        onClose={() => setConnectPlatform(null)}
        title={connectPlatform ? `Collega ${PLATFORM_META[connectPlatform].label}` : ""}
        description="Inserisci le credenziali dell'account da collegare"
        onSubmit={handleConnect}
        submitLabel="Collega"
        isLoading={connectSaving}
      >
        <SettingsFormField label="Handle / Username" required error={connectErrors.handle}>
          <input
            className="glass-input"
            value={connectForm.handle}
            onChange={(e) => {
              setConnectForm((f) => ({ ...f, handle: e.target.value }));
              setConnectErrors((e2) => ({ ...e2, handle: "" }));
            }}
            placeholder="@username"
          />
        </SettingsFormField>
        <SettingsFormField label="Nome Visualizzato" description="Opzionale">
          <input
            className="glass-input"
            value={connectForm.name}
            onChange={(e) => setConnectForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome pagina o profilo"
          />
        </SettingsFormField>
      </SettingsModal>

      {/* Disconnect confirm */}
      <SettingsDeleteConfirm
        open={disconnectTarget !== null}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleDisconnect}
        title="Disconnetti Account"
        message="Vuoi disconnettere l'account"
        itemName={disconnectTarget?.account_handle ?? disconnectTarget?.platform ?? undefined}
        isLoading={disconnecting}
      />
    </div>
  );
}
