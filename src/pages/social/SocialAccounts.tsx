import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, AlertTriangle, Trash2 } from "lucide-react";
import { mockSocialAccounts, formatSocialNumber, PLATFORM_CONFIG, type SocialPlatform } from "@/lib/socialStore";
import { toast } from "@/hooks/use-toast";
import { ConnectPlatformModal, type PlatformDef } from "@/components/social/ConnectPlatformModal";
import { useAuth } from "@/lib/authContext";
import { getProfile, updateProfile, type Profile } from "@/lib/profileStore";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MOCK_BY_PLATFORM = Object.fromEntries(mockSocialAccounts.map((a) => [a.platform, a]));

// ── Disconnect confirmation dialog ────────────────────────────────────────────

function DisconnectDialog({
  platform,
  handle,
  onConfirm,
  onCancel,
}: {
  platform: PlatformDef;
  handle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: "100%", maxWidth: 400, background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: "#ef4444", flexShrink: 0 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Disconnect {platform.name}?</p>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
          <strong style={{ color: "rgba(255,255,255,0.65)" }}>{handle}</strong> will be disconnected.
          Historical data will be preserved but new data will stop syncing.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Connected platform card ───────────────────────────────────────────────────

function ConnectedCard({
  p,
  handle,
  followers,
  posts,
  engRate,
  synced,
  syncing,
  failed,
  onSync,
  onRemove,
  onClick,
}: {
  p: PlatformDef;
  handle: string;
  followers: number;
  posts: number;
  engRate: number;
  synced: string;
  syncing: boolean;
  failed: boolean;
  onSync: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: `linear-gradient(135deg, ${p.color}12, rgba(10,13,20,0) 65%)`,
        backgroundColor: "rgba(10,13,20,0.95)",
        border: `1px solid ${hovered ? p.color + "45" : p.color + "22"}`,
        borderRadius: 16,
        padding: "18px 18px 16px",
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.15s, box-shadow 0.2s",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? `0 8px 28px ${p.color}18` : `0 2px 12px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Ambient orb */}
      <div style={{
        position: "absolute", top: -24, right: -24,
        width: 90, height: 90,
        background: p.color,
        borderRadius: "50%",
        filter: "blur(40px)",
        opacity: hovered ? 0.22 : 0.13,
        transition: "opacity 0.2s",
        pointerEvents: "none",
      }} />

      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 12, bottom: 12,
        width: 3, borderRadius: "0 3px 3px 0",
        background: p.color,
        opacity: 0.7,
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${p.color}18`, border: `1px solid ${p.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <img
            src={PLATFORM_CONFIG[p.id as SocialPlatform]?.logo ?? ""}
            alt={p.name} width={22} height={22}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{p.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</div>
        </div>
        {/* Glowing status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 6px #10b981, 0 0 12px #10b98155",
          }} />
        </div>
      </div>

      {/* Micro-stats */}
      <div style={{ display: "flex", gap: 6, marginBottom: 13 }}>
        {[
          { label: "Followers", value: formatSocialNumber(followers) },
          { label: "Eng. Rate", value: `${engRate}%` },
          { label: "Posts", value: formatSocialNumber(posts) },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8, padding: "7px 4px", textAlign: "center",
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.88)", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.4px", marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Footer: sync status + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: failed ? "#f59e0b" : "rgba(255,255,255,0.25)" }}>
          {failed ? (
            <>⚠ Sync failed — <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onSync(e); }}>Retry</span></>
          ) : synced ? `Synced ${timeSince(synced)}` : "Not synced"}
        </span>

        <div
          style={{ display: "flex", gap: 5, opacity: hovered ? 1 : 0, transition: "opacity 0.18s" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button"
            onClick={onSync}
            disabled={syncing}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 7,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 600,
              cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw style={{ width: 9, height: 9 }} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <button type="button"
            onClick={onRemove}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 7,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.14)",
              color: "rgba(239,68,68,0.6)", fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Trash2 style={{ width: 9, height: 9 }} /> Remove
          </button>
        </div>
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
        position: "relative",
        background: hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        border: `1px dashed ${hovered ? p.color + "50" : "rgba(255,255,255,0.09)"}`,
        borderRadius: 16, padding: "18px 18px 16px",
        cursor: "pointer", overflow: "hidden",
        transition: "background 0.2s, border-color 0.2s",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 8, textAlign: "center", minHeight: 168,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 13,
        background: `${p.color}12`, border: `1px solid ${p.color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : 0.7, transition: "opacity 0.2s",
      }}>
        <img
          src={PLATFORM_CONFIG[p.id as SocialPlatform]?.logo ?? ""}
          alt={p.name} width={24} height={24}
          style={{ objectFit: "contain" }}
        />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: hovered ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)" }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2, lineHeight: 1.4 }}>{p.description}</div>
      </div>
      <button type="button"
        onClick={(e) => { e.stopPropagation(); onConnect(); }}
        style={{
          marginTop: 4, padding: "7px 18px", borderRadius: 9,
          background: hovered ? `${p.color}28` : `${p.color}14`,
          border: `1px solid ${hovered ? p.color + "45" : p.color + "28"}`,
          color: p.color, fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s, border-color 0.15s",
        }}
      >
        + Connect
      </button>
    </div>
  );
}

// ── Telegram icon ─────────────────────────────────────────────────────────────

function TelegramSVG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#26A6E6" />
      <path d="M5.5 11.8l2.9 1.1 1.1 3.6c.07.23.36.3.54.14l1.62-1.32 3.18 2.34c.32.24.78.07.88-.32l2.26-9.2c.12-.47-.35-.88-.8-.7L5.5 10.8c-.46.18-.46.83 0 1z" fill="white" />
      <path d="M9.5 14.5l-.3 2.1 1.1-1.1" fill="#26A6E6" />
    </svg>
  );
}

// ── Telegram card ─────────────────────────────────────────────────────────────

function TelegramCard({ profile, onDisconnect }: { profile: Profile; onDisconnect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const botUsername = (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || "SOSA INC_bot";
  const connected = !!profile.telegram_chat_id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: connected
          ? `linear-gradient(135deg, #26A6E612, rgba(10,13,20,0) 65%)`
          : hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        backgroundColor: "rgba(10,13,20,0.95)",
        border: connected
          ? `1px solid ${hovered ? "#26A6E645" : "#26A6E622"}`
          : `1px dashed ${hovered ? "#26A6E650" : "rgba(255,255,255,0.09)"}`,
        borderRadius: 16, padding: "18px 18px 16px",
        cursor: connected ? "default" : "pointer", overflow: "hidden",
        transition: "border-color 0.2s, transform 0.15s, box-shadow 0.2s",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 8px 28px rgba(38,166,230,0.12)" : "0 2px 12px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column", alignItems: connected ? "flex-start" : "center",
        justifyContent: "center", gap: 8, textAlign: connected ? "left" : "center",
        minHeight: 168,
      }}
    >
      {/* Ambient orb */}
      {connected && (
        <div style={{
          position: "absolute", top: -24, right: -24,
          width: 90, height: 90, background: "#26A6E6",
          borderRadius: "50%", filter: "blur(40px)",
          opacity: hovered ? 0.22 : 0.13, transition: "opacity 0.2s", pointerEvents: "none",
        }} />
      )}
      {/* Left accent bar */}
      {connected && (
        <div style={{
          position: "absolute", left: 0, top: 12, bottom: 12,
          width: 3, borderRadius: "0 3px 3px 0", background: "#26A6E6", opacity: 0.7,
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: connected ? 40 : 44, height: connected ? 40 : 44,
        borderRadius: connected ? 12 : 13,
        background: "#26A6E618", border: "1px solid #26A6E630",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hovered ? 1 : (connected ? 1 : 0.7), transition: "opacity 0.2s", flexShrink: 0,
      }}>
        <TelegramSVG size={connected ? 22 : 24} />
      </div>

      {connected ? (
        /* ── Connected state ── */
        <>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: 6 }}>
              Telegram
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
                padding: "2px 6px", borderRadius: 5,
                background: "rgba(34,197,94,0.14)", color: "#22c55e",
                border: "1px solid rgba(34,197,94,0.22)",
              }}>CONNESSO</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
              Chat ID {profile.telegram_chat_id}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            Notifiche task · Briefing giornaliero
          </div>
          <button type="button"
            onClick={onDisconnect}
            style={{
              marginTop: 6, padding: "5px 14px", borderRadius: 8,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.14)",
              color: "rgba(239,68,68,0.65)", fontSize: 10, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Scollega
          </button>
        </>
      ) : (
        /* ── Not connected state ── */
        <>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: hovered ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)" }}>Telegram</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2, lineHeight: 1.4 }}>Notifiche task e briefing mattutino</div>
          </div>
          <a
            href={`https://t.me/${botUsername}?start=${profile.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 4, padding: "7px 18px", borderRadius: 9,
              background: hovered ? "#26A6E628" : "#26A6E614",
              border: `1px solid ${hovered ? "#26A6E645" : "#26A6E628"}`,
              color: "#26A6E6", fontSize: 11, fontWeight: 700,
              textDecoration: "none", display: "inline-block",
              transition: "background 0.15s, border-color 0.15s",
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
  const navigate = useNavigate();
  const { user } = useAuth();

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
    toast({ title: "Telegram disconnesso", description: "Puoi ricollegarlo dal profilo." });
  }

  const [connectedIds, setConnectedIds] = useState<Set<string>>(
    () => new Set(mockSocialAccounts.map((a) => a.platform))
  );
  const [syncTimes, setSyncTimes] = useState<Record<string, string>>(
    () => Object.fromEntries(mockSocialAccounts.map((a) => [a.platform, a.lastSyncedAt]))
  );
  const [followerCounts, setFollowerCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(mockSocialAccounts.map((a) => [a.platform, a.followersCount]))
  );
  const [engRates] = useState<Record<string, number>>(
    () => Object.fromEntries(mockSocialAccounts.map((a) => [a.platform, a.engagementRate ?? 0]))
  );
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [failedSyncIds, setFailedSyncIds] = useState<Set<string>>(new Set());
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformDef | null>(null);
  const [pendingRemove, setPendingRemove] = useState<PlatformDef | null>(null);

  const connected = ALL_PLATFORMS.filter((p) => connectedIds.has(p.id));
  const available = ALL_PLATFORMS.filter((p) => !connectedIds.has(p.id));

  function handleConnected(platformId: string) {
    setConnectedIds((prev) => new Set([...prev, platformId]));
    setSyncTimes((prev) => ({ ...prev, [platformId]: new Date().toISOString() }));
    if (!followerCounts[platformId]) {
      setFollowerCounts((prev) => ({ ...prev, [platformId]: Math.floor(Math.random() * 5000) + 500 }));
    }
    const p = ALL_PLATFORMS.find((x) => x.id === platformId);
    toast({ title: `${p?.emoji} ${p?.name} connected!`, description: "Syncing your data…" });
  }

  async function handleSync(platformId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (syncingIds.has(platformId)) return;
    setSyncingIds((prev) => new Set([...prev, platformId]));
    setFailedSyncIds((prev) => { const s = new Set(prev); s.delete(platformId); return s; });
    await new Promise((r) => setTimeout(r, 2000));
    setSyncingIds((prev) => { const s = new Set(prev); s.delete(platformId); return s; });
    setSyncTimes((prev) => ({ ...prev, [platformId]: new Date().toISOString() }));
    const p = ALL_PLATFORMS.find((x) => x.id === platformId);
    toast({ title: "Synced", description: `${p?.name} data updated.` });
  }

  function handleRemoveConfirm() {
    if (!pendingRemove) return;
    setConnectedIds((prev) => { const s = new Set(prev); s.delete(pendingRemove.id); return s; });
    toast({ title: `${pendingRemove.name} disconnected`, description: "Historical data preserved." });
    setPendingRemove(null);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Accounts</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>
          Connect your social profiles to start tracking · Auto-syncs every 6 hours
        </p>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.3px", color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>
            Connected ({connected.length})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {connected.map((p) => {
              const mock = MOCK_BY_PLATFORM[p.id];
              const handle = mock?.accountName ?? `@${p.id}_account`;
              const followers = followerCounts[p.id] ?? 0;
              const posts = mock?.postsCount ?? 0;
              const engRate = Number((engRates[p.id] ?? 0).toFixed(1));
              const synced = syncTimes[p.id];

              return (
                <ConnectedCard
                  key={p.id}
                  p={p}
                  handle={handle}
                  followers={followers}
                  posts={posts}
                  engRate={engRate}
                  synced={synced}
                  syncing={syncingIds.has(p.id)}
                  failed={failedSyncIds.has(p.id)}
                  onSync={(e) => handleSync(p.id, e)}
                  onRemove={() => setPendingRemove(p)}
                  onClick={() => navigate(`/social/analytics?platform=${p.id}`)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available */}
      {available.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.3px", color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>
            Connect More ({available.length})
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {available.map((p) => (
              <AvailableCard key={p.id} p={p} onConnect={() => setConnectingPlatform(p)} />
            ))}
          </div>
        </div>
      )}

      {/* Telegram */}
      {profile && (
        <div style={{ marginTop: 36 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.3px", color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>
            Notifiche & Bot
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            <TelegramCard profile={profile} onDisconnect={handleTgDisconnect} />
          </div>
        </div>
      )}

      {/* Modals */}
      {connectingPlatform && (
        <ConnectPlatformModal
          platform={connectingPlatform}
          onClose={() => setConnectingPlatform(null)}
          onConnected={handleConnected}
        />
      )}
      {pendingRemove && (
        <DisconnectDialog
          platform={pendingRemove}
          handle={MOCK_BY_PLATFORM[pendingRemove.id]?.accountName ?? `@${pendingRemove.id}_account`}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </div>
  );
}
