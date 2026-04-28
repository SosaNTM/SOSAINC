import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Plus, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { SocialConnection, SocialPlatformDB } from "@/types/database";
import { ConnectAccountModal } from "./ConnectAccountModal";

// ── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS: Array<{
  id: SocialPlatformDB;
  label: string;
  icon: string;
  color: string;
  gradient: string;
}> = [
  { id: "instagram", label: "Instagram", icon: "📸", color: "#E1306C", gradient: "radial-gradient(ellipse at top left, rgba(225,48,108,0.18) 0%, transparent 70%)" },
  { id: "linkedin", label: "LinkedIn", icon: "🔵", color: "#0A66C2", gradient: "radial-gradient(ellipse at top left, rgba(10,102,194,0.18) 0%, transparent 70%)" },
  { id: "twitter", label: "Twitter / X", icon: "🐦", color: "#1DA1F2", gradient: "radial-gradient(ellipse at top left, rgba(29,161,242,0.18) 0%, transparent 70%)" },
  { id: "facebook", label: "Facebook", icon: "📘", color: "#1877F2", gradient: "radial-gradient(ellipse at top left, rgba(24,119,242,0.18) 0%, transparent 70%)" },
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "#FE2C55", gradient: "radial-gradient(ellipse at top left, rgba(254,44,85,0.18) 0%, transparent 70%)" },
  { id: "youtube", label: "YouTube", icon: "🔴", color: "#FF0000", gradient: "radial-gradient(ellipse at top left, rgba(255,0,0,0.18) 0%, transparent 70%)" },
];

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: 20, minHeight: 170 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)" }} className="animate-pulse" />
        <div style={{ width: 80, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} className="animate-pulse" />
      </div>
      <div style={{ width: "60%", height: 12, borderRadius: 6, background: "rgba(255,255,255,0.04)", marginBottom: 8 }} className="animate-pulse" />
      <div style={{ width: "40%", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.03)", marginBottom: 20 }} className="animate-pulse" />
      <div style={{ width: 90, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)" }} className="animate-pulse" />
    </div>
  );
}

// ── Disconnect confirmation dialog ───────────────────────────────────────────

function DisconnectDialog({ connection, onConfirm, onCancel }: { connection: SocialConnection; onConfirm: () => void; onCancel: () => void }) {
  const p = PLATFORMS.find((x) => x.id === connection.platform)!;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: "100%", maxWidth: 360, background: "rgba(8,12,24,0.95)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AlertCircle style={{ width: 18, height: 18, color: "#ef4444" }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Disconnect {p.label}?</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 20 }}>
          <strong style={{ color: "var(--text-secondary)" }}>{connection.account_handle}</strong> will be removed. Analytics history will be preserved.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: "9px 0", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, padding: "9px 0", borderRadius: 9, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface SocialConnectionsProps {
  onConnectionsChange?: (connections: SocialConnection[]) => void;
}

export function SocialConnections({ onConnectionsChange }: SocialConnectionsProps) {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectPlatform, setConnectPlatform] = useState<SocialPlatformDB | null>(null);
  const [pendingDisconnect, setPendingDisconnect] = useState<SocialConnection | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  function updateConnections(next: SocialConnection[]) {
    setConnections(next);
    onConnectionsChange?.(next);
  }

  const fetchConnections = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthed(!!user);
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("social_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });

    if (error) {
      toast({ title: "Failed to load connections", description: error.message });
    } else {
      updateConnections(data ?? []);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  async function handleDisconnect(conn: SocialConnection) {
    // Optimistic UI — remove immediately
    updateConnections(connections.filter((c) => c.id !== conn.id));
    setPendingDisconnect(null);

    const { error } = await supabase.from("social_connections").delete().eq("id", conn.id);
    if (error) {
      // Roll back
      updateConnections([conn, ...connections]);
      toast({ title: "Failed to disconnect", description: error.message });
    } else {
      const p = PLATFORMS.find((x) => x.id === conn.platform);
      toast({ title: `${p?.label ?? conn.platform} disconnected`, description: `${conn.account_handle} removed.` });
    }
  }

  const connectedByPlatform = Object.fromEntries(
    connections.map((c) => [c.platform, c])
  ) as Partial<Record<SocialPlatformDB, SocialConnection>>;

  if (!isAuthed && !loading) {
    return (
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "28px 24px", marginBottom: 32, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Sign in to manage your connected social accounts.</p>
      </div>
    );
  }

  return (
    <>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-quaternary)" }}>Connected Accounts</h2>
        <p style={{ fontSize: 12, color: "var(--text-quaternary)", marginTop: 3 }}>
          {loading ? "Loading…" : `${connections.length} of ${PLATFORMS.length} platforms linked`}
        </p>
      </div>

      {/* Platform grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 40,
        }}
      >
        {loading
          ? PLATFORMS.map((p) => <SkeletonCard key={p.id} />)
          : PLATFORMS.map((p) => {
              const conn = connectedByPlatform[p.id];
              return (
                <div
                  key={p.id}
                  style={{
                    position: "relative",
                    background: conn
                      ? `rgba(8,12,24,0.7)`
                      : "var(--glass-bg)",
                    backgroundImage: conn ? p.gradient : undefined,
                    border: `1px solid ${conn ? `${p.color}25` : "var(--glass-border)"}`,
                    borderRadius: 16,
                    padding: 20,
                    overflow: "hidden",
                    transition: "border-color 0.25s, box-shadow 0.25s",
                    boxShadow: conn ? `0 0 32px ${p.color}12` : undefined,
                  }}
                >
                  {/* Ambient orb (connected only) */}
                  {conn && (
                    <div
                      style={{
                        position: "absolute", top: -20, right: -20,
                        width: 80, height: 80,
                        background: p.color,
                        borderRadius: "50%",
                        filter: "blur(35px)",
                        opacity: 0.2,
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Platform icon + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: conn ? 12 : 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}20`, border: `1px solid ${p.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {p.icon}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{p.label}</span>
                  </div>

                  {conn ? (
                    // ── Connected state ──
                    <>
                      {/* Avatar + handle */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        {conn.account_avatar_url ? (
                          <img src={conn.account_avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                            {p.icon}
                          </div>
                        )}
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>{conn.account_name}</p>
                          <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{conn.account_handle}</p>
                        </div>
                      </div>

                      {/* Connected badge */}
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "2px 8px", borderRadius: 20, marginBottom: 14, marginTop: 4 }}>
                        <CheckCircle2 style={{ width: 10, height: 10, color: "#10b981" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", letterSpacing: "0.3px" }}>Connected</span>
                      </div>

                      {/* Disconnect button */}
                      <div>
                        <button type="button"
                          onClick={() => setPendingDisconnect(conn)}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.7)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; }}
                        >
                          <Trash2 style={{ width: 11, height: 11 }} /> Disconnect
                        </button>
                      </div>
                    </>
                  ) : (
                    // ── Not connected state ──
                    <>
                      <p style={{ fontSize: 11.5, color: "var(--text-quaternary)", marginBottom: 16, lineHeight: 1.4 }}>
                        Not connected
                      </p>
                      <button type="button"
                        onClick={() => setConnectPlatform(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 14px",
                          borderRadius: 9,
                          background: `${p.color}18`,
                          border: `1px solid ${p.color}30`,
                          color: p.color,
                          fontSize: 12, fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${p.color}28`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = `${p.color}18`; }}
                      >
                        <Plus style={{ width: 12, height: 12 }} /> Connect
                      </button>
                    </>
                  )}
                </div>
              );
            })}
      </div>

      {/* Modals */}
      {connectPlatform && (
        <ConnectAccountModal
          platform={connectPlatform}
          onClose={() => setConnectPlatform(null)}
          onConnected={(conn) => updateConnections([conn, ...connections.filter((c) => c.platform !== conn.platform)])}
        />
      )}

      {pendingDisconnect && (
        <DisconnectDialog
          connection={pendingDisconnect}
          onConfirm={() => handleDisconnect(pendingDisconnect)}
          onCancel={() => setPendingDisconnect(null)}
        />
      )}

      {/* Sync row (refresh all) */}
      {connections.length > 0 && !loading && (
        <button type="button"
          onClick={fetchConnections}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-quaternary)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 40 }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} /> Refresh
        </button>
      )}
    </>
  );
}
