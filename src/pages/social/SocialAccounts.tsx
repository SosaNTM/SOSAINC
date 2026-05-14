import { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { formatSocialNumber, PLATFORM_CONFIG, type SocialPlatform } from "@/lib/socialStore";
import { ConnectPlatformModal, type PlatformDef } from "@/components/social/ConnectPlatformModal";
import { usePortalDB } from "@/lib/portalContextDB";
import { usePortalData } from "@/hooks/usePortalData";
import { useAuth } from "@/lib/authContext";
import { getProfile, updateProfile, type Profile } from "@/lib/profileStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialConnection {
  id: string;
  portal_id: string;
  user_id: string;
  connected_by: string | null;
  platform: string;
  account_handle: string;
  account_name: string;
  account_avatar_url: string | null;
  is_active: boolean;
  connected_at: string;
  last_synced_at: string | null;
  token_expires_at: string | null;
}

// ── Platform definitions ───────────────────────────────────────────────────────

const ALL_PLATFORMS: PlatformDef[] = [
  { id: "instagram", name: "Instagram",   emoji: "📸", color: "#E1306C", description: "Photos, Reels & Stories" },
  { id: "linkedin",  name: "LinkedIn",    emoji: "🔵", color: "#0A66C2", description: "Professional network" },
  { id: "twitter",   name: "Twitter / X", emoji: "🐦", color: "#1DA1F2", description: "Posts & threads" },
  { id: "youtube",   name: "YouTube",     emoji: "🔴", color: "#FF0000", description: "Videos & subscribers" },
  { id: "tiktok",    name: "TikTok",      emoji: "🎵", color: "#FE2C55", description: "Short-form video" },
  { id: "facebook",  name: "Facebook",    emoji: "📘", color: "#1877F2", description: "Pages & groups" },
  { id: "threads",   name: "Threads",     emoji: "🧵", color: "#aaaaaa", description: "Text conversations" },
  { id: "pinterest", name: "Pinterest",   emoji: "📌", color: "#E60023", description: "Visual discovery" },
];

const PLATFORM_MAP = Object.fromEntries(ALL_PLATFORMS.map((p) => [p.id, p]));

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "adesso";
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  return `${Math.floor(h / 24)}g fa`;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// ── Disconnect confirmation dialog ────────────────────────────────────────────

function DisconnectDialog({
  platform, handle, onConfirm, onCancel,
}: {
  platform: PlatformDef; handle: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: "100%", maxWidth: 400, background: "var(--sosa-bg-3)", border: "1px solid var(--sosa-border)", borderRadius: 0, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: "#ef4444", flexShrink: 0 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Disconnetti {platform.name}?</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6, marginBottom: 24 }}>
          <strong style={{ color: "var(--text-secondary)" }}>{handle || platform.name}</strong> verrà scollegato.
          I dati storici verranno preservati.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: "10px 0", background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Annulla
          </button>
          <button type="button" onClick={onConfirm}
            style={{ flex: 1, padding: "10px 0", background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Disconnetti
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Connected platform card ───────────────────────────────────────────────────

function ConnectedCard({
  p, conn, syncing, onSync, onRemove, onToggle,
}: {
  p: PlatformDef;
  conn: SocialConnection;
  syncing: boolean;
  onSync: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const expired = isExpired(conn.token_expires_at);
  const handle = conn.account_handle || conn.account_name || p.name;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: `linear-gradient(135deg, ${p.color}12, rgba(10,13,20,0) 65%)`,
        backgroundColor: "var(--sosa-bg-2)",
        border: `1px solid ${hovered ? p.color + "45" : p.color + "22"}`,
        padding: "18px 18px 16px",
        cursor: "default",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Ambient orb */}
      <div style={{
        position: "absolute", top: -24, right: -24, width: 90, height: 90,
        background: p.color, borderRadius: "50%", filter: "blur(40px)",
        opacity: hovered ? 0.22 : 0.13, transition: "opacity 0.2s", pointerEvents: "none",
      }} />

      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 12, bottom: 12,
        width: 3, background: expired ? "#f59e0b" : conn.is_active ? p.color : "var(--sosa-border)", opacity: 0.8,
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, background: `${p.color}18`, border: `1px solid ${p.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <img src={PLATFORM_CONFIG[p.id as SocialPlatform]?.logo ?? ""} alt={p.name} width={22} height={22} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {expired ? (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>SCADUTO</span>
          ) : !conn.is_active ? (
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "rgba(255,255,255,0.04)", color: "var(--text-quaternary)", border: "1px solid var(--sosa-border)" }}>INATTIVO</span>
          ) : (
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
          )}
        </div>
      </div>

      {/* Info row */}
      <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 12 }}>
        {conn.last_synced_at ? `Sincronizzato ${timeSince(conn.last_synced_at)}` : "Mai sincronizzato"}
        {conn.connected_at && (
          <span style={{ marginLeft: 8 }}>
            · Collegato {new Date(conn.connected_at).toLocaleDateString("it-IT", { month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 6, opacity: hovered ? 1 : 0.4, transition: "opacity 0.18s" }} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onSync} disabled={syncing}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-tertiary)", fontSize: 10, fontWeight: 600,
            cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          <RefreshCw style={{ width: 9, height: 9 }} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sync…" : "Sync"}
        </button>
        <button type="button" onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            color: "var(--text-quaternary)", fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <WifiOff style={{ width: 9, height: 9 }} />
          {conn.is_active ? "Disattiva" : "Attiva"}
        </button>
        <button type="button" onClick={onRemove}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.14)",
            color: "rgba(239,68,68,0.6)", fontSize: 10, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Trash2 style={{ width: 9, height: 9 }} /> Rimuovi
        </button>
      </div>
    </div>
  );
}

// ── Not-connected card ────────────────────────────────────────────────────────

function AvailableCard({ p, onConnect }: { p: PlatformDef; onConnect: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onConnect}
      style={{
        background: hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        border: `1px dashed ${hovered ? p.color + "50" : "rgba(255,255,255,0.09)"}`,
        padding: "18px 18px 16px", cursor: "pointer", overflow: "hidden",
        transition: "background 0.2s, border-color 0.2s",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8, textAlign: "center", minHeight: 160,
      }}
    >
      <div style={{
        width: 44, height: 44, background: `${p.color}12`, border: `1px solid ${p.color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0.7, transition: "opacity 0.2s",
      }}>
        <img src={PLATFORM_CONFIG[p.id as SocialPlatform]?.logo ?? ""} alt={p.name} width={24} height={24} style={{ objectFit: "contain" }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: hovered ? "var(--text-primary)" : "var(--text-tertiary)" }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 2, lineHeight: 1.4 }}>{p.description}</div>
      </div>
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onConnect(); }}
        style={{
          marginTop: 4, padding: "7px 18px",
          background: hovered ? `${p.color}28` : `${p.color}14`,
          border: `1px solid ${hovered ? p.color + "45" : p.color + "28"}`,
          color: p.color, fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
        }}
      >
        + Collega
      </button>
    </div>
  );
}

// ── Telegram card ─────────────────────────────────────────────────────────────

function TelegramSVG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#26A6E6" />
      <path d="M5.5 11.8l2.9 1.1 1.1 3.6c.07.23.36.3.54.14l1.62-1.32 3.18 2.34c.32.24.78.07.88-.32l2.26-9.2c.12-.47-.35-.88-.8-.7L5.5 10.8c-.46.18-.46.83 0 1z" fill="white" />
      <path d="M9.5 14.5l-.3 2.1 1.1-1.1" fill="#26A6E6" />
    </svg>
  );
}

function TelegramCard({ profile, onDisconnect }: { profile: Profile; onDisconnect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const botUsername = (import.meta as { env?: { VITE_TELEGRAM_BOT_USERNAME?: string } }).env?.VITE_TELEGRAM_BOT_USERNAME ?? "SOSA_INC_bot";
  const connected = !!profile.telegram_chat_id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: connected ? "linear-gradient(135deg, #26A6E612, rgba(10,13,20,0) 65%)" : hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        backgroundColor: "var(--sosa-bg-2)",
        border: connected ? `1px solid ${hovered ? "#26A6E645" : "#26A6E622"}` : `1px dashed ${hovered ? "#26A6E650" : "rgba(255,255,255,0.09)"}`,
        padding: "18px 18px 16px", cursor: connected ? "default" : "pointer", overflow: "hidden",
        transition: "border-color 0.2s",
        display: "flex", flexDirection: "column", alignItems: connected ? "flex-start" : "center",
        justifyContent: "center", gap: 8, textAlign: connected ? "left" : "center", minHeight: 160,
      }}
    >
      {connected && (
        <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, background: "#26A6E6", opacity: 0.8 }} />
      )}
      <div style={{
        width: connected ? 40 : 44, height: connected ? 40 : 44,
        background: "#26A6E618", border: "1px solid #26A6E630",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <TelegramSVG size={connected ? 22 : 24} />
      </div>

      {connected ? (
        <>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              Telegram
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "rgba(34,197,94,0.14)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.22)" }}>CONNESSO</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 1 }}>Chat ID {profile.telegram_chat_id}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Notifiche task · Briefing giornaliero</div>
          <button type="button" onClick={onDisconnect}
            style={{ marginTop: 6, padding: "5px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.14)", color: "rgba(239,68,68,0.65)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Scollega
          </button>
        </>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: hovered ? "var(--text-primary)" : "var(--text-tertiary)" }}>Telegram</div>
            <div style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 2, lineHeight: 1.4 }}>Notifiche task e briefing mattutino</div>
          </div>
          <a
            href={`https://t.me/${botUsername}?start=${profile.id}`}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 4, padding: "7px 18px",
              background: hovered ? "#26A6E628" : "#26A6E614",
              border: `1px solid ${hovered ? "#26A6E645" : "#26A6E628"}`,
              color: "#26A6E6", fontSize: 11, fontWeight: 700,
              textDecoration: "none", display: "inline-block",
            }}
          >
            + Collega
          </a>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SocialAccounts() {
  const { user } = useAuth();
  const { currentPortalId, isAdmin, isOwner } = usePortalDB();
  const canManage = isAdmin || isOwner;

  const { data: connections, loading, refetch, update, remove } = usePortalData<SocialConnection>("social_connections", {
    orderBy: "connected_at",
    ascending: false,
  });

  const [profile, setProfile] = useState<Profile | null>(
    () => user ? getProfile(user.id, user.email, user.name) : null
  );

  useEffect(() => {
    const handler = () => {
      if (user) setProfile(getProfile(user.id, user.email, user.name));
    };
    window.addEventListener("profile-changed", handler);
    return () => window.removeEventListener("profile-changed", handler);
  }, [user]);

  function handleTgDisconnect() {
    if (!user || !profile) return;
    const updated = updateProfile(user.id, { telegram_chat_id: null, telegram_notifications_enabled: false });
    setProfile(updated);
    toast.success("Telegram disconnesso");
  }

  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformDef | null>(null);
  const [pendingRemove, setPendingRemove] = useState<SocialConnection | null>(null);

  // Which platforms are connected — derived from DB, not React state
  const connectedPlatformIds = new Set(connections.map((c) => c.platform));
  const connectedConnections = connections.filter((c) => connectedPlatformIds.has(c.platform));
  const availablePlatforms = ALL_PLATFORMS.filter((p) => !connectedPlatformIds.has(p.id));

  async function handleRemoveConfirm() {
    if (!pendingRemove) return;
    const { error } = await remove(pendingRemove.id);
    if (error) {
      toast.error(`Errore: ${error}`);
    } else {
      const p = PLATFORM_MAP[pendingRemove.platform];
      toast.success(`${p?.name ?? pendingRemove.platform} disconnesso`);
    }
    setPendingRemove(null);
  }

  async function handleToggle(conn: SocialConnection) {
    const { error } = await update(conn.id, { is_active: !conn.is_active } as Partial<SocialConnection>);
    if (error) toast.error(`Errore: ${error}`);
    else toast.success(conn.is_active ? "Account disattivato" : "Account attivato");
  }

  async function handleSync(conn: SocialConnection, e: React.MouseEvent) {
    e.stopPropagation();
    if (syncingIds.has(conn.id)) return;
    setSyncingIds((prev) => new Set([...prev, conn.id]));
    // Real sync would call a dedicated edge function; for now just update timestamp
    await new Promise((r) => setTimeout(r, 1500));
    await update(conn.id, { last_synced_at: new Date().toISOString() } as Partial<SocialConnection>);
    setSyncingIds((prev) => { const s = new Set(prev); s.delete(conn.id); return s; });
    toast.success("Sincronizzazione completata");
  }

  function handleConnected(_platformId: string) {
    // Refresh from DB — the edge function wrote the row via service role
    void refetch();
  }

  if (!currentPortalId) return null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Account Social</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>
          Collega i tuoi profili per iniziare a tracciare · Sincronizzazione automatica ogni 6 ore
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 36 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 160, background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      )}

      {/* Connected */}
      {!loading && connectedConnections.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.3px", color: "var(--text-quaternary)", marginBottom: 14 }}>
            Collegati ({connectedConnections.length})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {connectedConnections.map((conn) => {
              const p = PLATFORM_MAP[conn.platform];
              if (!p) return null;
              return (
                <ConnectedCard
                  key={conn.id}
                  p={p}
                  conn={conn}
                  syncing={syncingIds.has(conn.id)}
                  onSync={(e) => void handleSync(conn, e)}
                  onRemove={() => canManage && setPendingRemove(conn)}
                  onToggle={() => canManage && void handleToggle(conn)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available */}
      {!loading && availablePlatforms.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.3px", color: "var(--text-quaternary)", marginBottom: 14 }}>
            Collega altro ({availablePlatforms.length})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {availablePlatforms.map((p) => (
              <AvailableCard
                key={p.id}
                p={p}
                onConnect={() => canManage ? setConnectingPlatform(p) : toast.error("Solo owner/admin possono collegare account")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Telegram */}
      {profile && (
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.3px", color: "var(--text-quaternary)", marginBottom: 14 }}>
            Notifiche & Bot
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            <TelegramCard profile={profile} onDisconnect={handleTgDisconnect} />
          </div>
        </div>
      )}

      {/* Modals */}
      {connectingPlatform && currentPortalId && (
        <ConnectPlatformModal
          platform={connectingPlatform}
          portalId={currentPortalId}
          onClose={() => setConnectingPlatform(null)}
          onConnected={handleConnected}
        />
      )}
      {pendingRemove && (
        <DisconnectDialog
          platform={PLATFORM_MAP[pendingRemove.platform] ?? ALL_PLATFORMS[0]}
          handle={pendingRemove.account_handle || pendingRemove.account_name}
          onConfirm={() => void handleRemoveConfirm()}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </div>
  );
}
