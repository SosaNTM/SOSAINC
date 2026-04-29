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
}> = [
  { id: "instagram", label: "Instagram",   icon: "IG", color: "#E1306C" },
  { id: "linkedin",  label: "LinkedIn",    icon: "LI", color: "#0A66C2" },
  { id: "twitter",   label: "Twitter / X", icon: "TW", color: "#1DA1F2" },
  { id: "facebook",  label: "Facebook",    icon: "FB", color: "#1877F2" },
  { id: "tiktok",    label: "TikTok",      icon: "TT", color: "#FE2C55" },
  { id: "youtube",   label: "YouTube",     icon: "YT", color: "#FF0000" },
];

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", borderRadius: 0, padding: 20, minHeight: 170 }}>
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
      style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ width: "100%", maxWidth: 360, background: "var(--sosa-bg-3)", border: "1px solid var(--color-error)", borderRadius: 0, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <AlertCircle style={{ width: 18, height: 18, color: "#ef4444" }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Disconnect {p.label}?</p>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 20 }}>
          <strong style={{ color: "var(--text-secondary)" }}>{connection.account_handle}</strong> will be removed. Analytics history will be preserved.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, padding: "9px 0", background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", color: "var(--sosa-white-40)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={{ flex: 1, padding: "9px 0", background: "var(--color-error)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
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
      <div style={{ background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", borderRadius: 0, padding: "28px 24px", marginBottom: 32, textAlign: "center" }}>
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
                    background: "var(--sosa-bg-2)",
                    borderLeft: conn ? `3px solid ${p.color}` : "3px solid var(--sosa-border)",
                    border: "1px solid var(--sosa-border)",
                    borderRadius: 0,
                    padding: 20,
                    overflow: "hidden",
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* Platform icon + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: conn ? 12 : 14 }}>
                    <div style={{ width: 36, height: 36, background: "var(--sosa-bg-3)", border: `1px solid ${conn ? p.color : "var(--sosa-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: conn ? p.color : "var(--sosa-white-20)", letterSpacing: "0.08em", flexShrink: 0 }}>
                      {p.icon}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{p.label}</span>
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
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--sosa-bg-3)", border: "1px solid var(--color-success)", padding: "2px 8px", marginBottom: 14, marginTop: 4 }}>
                        <CheckCircle2 style={{ width: 10, height: 10, color: "var(--color-success)" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-success)", letterSpacing: "0.08em", fontFamily: "var(--font-mono)" }}>Connected</span>
                      </div>

                      {/* Disconnect button */}
                      <div>
                        <button type="button"
                          onClick={() => setPendingDisconnect(conn)}
                          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "var(--sosa-bg-3)", border: "1px solid var(--color-error)", color: "var(--color-error)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
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
                          background: "var(--sosa-yellow)",
                          border: "none",
                          color: "#000",
                          fontSize: 12, fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
                        }}
                      >
                        <Plus style={{ width: 12, height: 12 }} /> Connect ↗
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
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", color: "var(--sosa-white-40)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 40 }}
        >
          <RefreshCw style={{ width: 11, height: 11 }} /> Refresh
        </button>
      )}
    </>
  );
}
