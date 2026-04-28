import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Database, Users, BarChart2, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { SocialConnection, SocialAnalyticsSnapshot, SocialPlatformDB } from "@/types/database";

// ── Platform styles ──────────────────────────────────────────────────────────

const P_STYLE: Record<SocialPlatformDB, { label: string; icon: string; color: string }> = {
  instagram: { label: "Instagram", icon: "📸", color: "#E1306C" },
  linkedin:  { label: "LinkedIn",  icon: "🔵", color: "#0A66C2" },
  twitter:   { label: "Twitter/X", icon: "🐦", color: "#1DA1F2" },
  facebook:  { label: "Facebook",  icon: "📘", color: "#1877F2" },
  tiktok:    { label: "TikTok",    icon: "🎵", color: "#FE2C55" },
  youtube:   { label: "YouTube",   icon: "🔴", color: "#FF0000" },
};

function fmtN(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeSince(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// NOTE: Custom tooltip — too specialized for GlassTooltip (extra color fallback prop + fmtN formatting)

function GlassTooltip({ active, payload, label, color }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,12,24,0.96)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 120 }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: entry.color ?? color }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{entry.name}:</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
            {typeof entry.value === "number" && entry.value > 999 ? fmtN(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  color: string;
}

function KpiCard({ icon, label, value, delta, deltaLabel, color }: KpiProps) {
  const pos = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const trendColor = pos === "up" ? "#10b981" : pos === "down" ? "#ef4444" : "rgba(255,255,255,0.3)";
  const TrendIcon = pos === "up" ? TrendingUp : pos === "down" ? TrendingDown : Minus;

  return (
    <div style={{ position: "relative", background: "rgba(8,12,24,0.6)", border: `1px solid ${color}20`, borderRadius: 16, padding: "18px 20px", overflow: "hidden" }}>
      {/* Ambient orb */}
      <div style={{ position: "absolute", top: -16, right: -16, width: 60, height: 60, background: color, borderRadius: "50%", filter: "blur(28px)", opacity: 0.18, pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.25)" }}>{label}</span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</p>
      {pos != null && deltaLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
          <TrendIcon style={{ width: 11, height: 11, color: trendColor }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton({ color }: { color: string }) {
  const bar = (w: string, h = 14) => (
    <div className="animate-pulse" style={{ width: w, height: h, borderRadius: 6, background: `${color}12` }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ background: "rgba(8,12,24,0.6)", border: `1px solid ${color}18`, borderRadius: 16, padding: "18px 20px", minHeight: 100 }}>
            {bar("40%", 10)}<div style={{ height: 12 }} />{bar("70%", 26)}<div style={{ height: 8 }} />{bar("50%", 10)}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ background: "rgba(8,12,24,0.6)", border: `1px solid ${color}18`, borderRadius: 16, padding: "18px 20px", height: 260 }}>
            {bar("40%", 13)}<div style={{ height: 14 }} />
            <div className="animate-pulse" style={{ height: 200, borderRadius: 10, background: `${color}08` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ color, onSync, syncing }: { color: string; onSync: () => void; syncing: boolean }) {
  return (
    <div style={{ background: "rgba(8,12,24,0.6)", border: `1px solid ${color}20`, borderRadius: 18, padding: "48px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
      {/* Pulsing orb */}
      <div className="animate-pulse" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 200, height: 200, background: color, borderRadius: "50%", filter: "blur(80px)", opacity: 0.06, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>
          <Database style={{ width: 22, height: 22, color }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>No data yet</p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, marginBottom: 28, maxWidth: 320, margin: "0 auto 28px" }}>
          Click Sync Now to fetch your first analytics snapshot for this account.
        </p>
        <button type="button"
          onClick={onSync}
          disabled={syncing}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 11, background: color, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: syncing ? 0.6 : 1, transition: "opacity 0.2s" }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync Now"}
        </button>
      </div>
    </div>
  );
}

// ── Per-connection analytics panel ───────────────────────────────────────────

function ConnectionAnalyticsPanel({ conn, color }: { conn: SocialConnection; color: string }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(conn.last_synced_at);
  const qc = useQueryClient();

  const { data: snapshots = [], isLoading, isError } = useQuery<SocialAnalyticsSnapshot[]>({
    queryKey: ["social-snapshots", conn.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_analytics_snapshots")
        .select("*")
        .eq("connection_id", conn.id)
        .order("snapshot_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60_000,
  });

  async function handleSync() {
    setSyncing(true);
    const { error } = await supabase.functions.invoke("sync-social-analytics", {
      body: { connection_id: conn.id },
    });
    setSyncing(false);
    if (error) {
      toast({ title: "Sync failed", description: error.message });
      return;
    }
    const now = new Date().toISOString();
    setLastSyncedAt(now);
    await qc.invalidateQueries({ queryKey: ["social-snapshots", conn.id] });
    toast({ title: "Synced", description: `${P_STYLE[conn.platform].label} analytics updated.` });
  }

  // ── Sync row ──
  const SyncRow = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <button type="button"
        onClick={handleSync}
        disabled={syncing}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, color, fontSize: 12, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: syncing ? 0.65 : 1, transition: "background 0.2s" }}
        onMouseEnter={(e) => !syncing && (e.currentTarget.style.background = `${color}28`)}
        onMouseLeave={(e) => (e.currentTarget.style.background = `${color}18`)}
      >
        <RefreshCw style={{ width: 12, height: 12 }} className={syncing ? "animate-spin" : ""} />
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
      {lastSyncedAt && (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Last synced: {timeSince(lastSyncedAt)}</span>
      )}
    </div>
  );

  if (isLoading) return <div>{SyncRow}<AnalyticsSkeleton color={color} /></div>;

  if (isError) return (
    <div>
      {SyncRow}
      <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 14, padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(239,68,68,0.8)" }}>Failed to load analytics. Try syncing again.</p>
      </div>
    </div>
  );

  if (snapshots.length === 0) {
    return <div>{SyncRow}<EmptyState color={color} onSync={handleSync} syncing={syncing} /></div>;
  }

  // ── Derive KPIs ──
  const latest = snapshots[snapshots.length - 1];
  const prev   = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const followersDelta = prev ? latest.followers_count - prev.followers_count : null;
  const engDelta       = prev ? Number((latest.engagement_rate - prev.engagement_rate).toFixed(2)) : null;
  const avgReach       = latest.posts_count > 0 && latest.reach != null
    ? Math.round(latest.reach / latest.posts_count)
    : latest.reach ?? 0;

  // ── Chart data ──
  const growthData = snapshots.map((s) => ({
    date: fmtDate(s.snapshot_date),
    followers: s.followers_count,
  }));

  // Use up to 14 most recent snapshots for engagement breakdown
  const engData = snapshots.slice(-14).map((s) => ({
    date: fmtDate(s.snapshot_date),
    Likes:    s.likes_total ?? 0,
    Comments: s.comments_total ?? 0,
    Shares:   s.shares_total ?? 0,
  }));

  const engBarColors = [
    { key: "Likes",    color },
    { key: "Comments", color: "rgba(255,255,255,0.35)" },
    { key: "Shares",   color: `${color}80` },
  ];

  return (
    <div>
      {SyncRow}

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard
          icon={<Users style={{ width: 14, height: 14 }} />}
          label="Followers"
          value={fmtN(latest.followers_count)}
          delta={followersDelta}
          deltaLabel={followersDelta != null ? `${followersDelta >= 0 ? "+" : ""}${fmtN(followersDelta)} vs prev` : undefined}
          color={color}
        />
        <KpiCard
          icon={<Activity style={{ width: 14, height: 14 }} />}
          label="Engagement Rate"
          value={`${Number(latest.engagement_rate).toFixed(2)}%`}
          delta={engDelta}
          deltaLabel={engDelta != null ? `${engDelta >= 0 ? "+" : ""}${engDelta}% pts` : undefined}
          color={color}
        />
        <KpiCard
          icon={<BarChart2 style={{ width: 14, height: 14 }} />}
          label="Total Posts"
          value={fmtN(latest.posts_count)}
          color={color}
        />
        <KpiCard
          icon={<TrendingUp style={{ width: 14, height: 14 }} />}
          label="Avg Reach / Post"
          value={fmtN(avgReach)}
          color={color}
        />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Followers Growth */}
        <div style={{ background: "rgba(8,12,24,0.6)", border: `1px solid ${color}18`, borderRadius: 16, padding: "18px 20px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.8px" }}>Follower Growth</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fg-${conn.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                  axisLine={false} tickLine={false}
                  width={40}
                  tickFormatter={fmtN}
                />
                <Tooltip content={<GlassTooltip color={color} />} cursor={{ stroke: color, strokeOpacity: 0.15, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="followers"
                  name="Followers"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#fg-${conn.id})`}
                  dot={false}
                  activeDot={{ r: 5, fill: color, stroke: "#0d1117", strokeWidth: 2, style: { filter: `drop-shadow(0 0 4px ${color})` } }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement Breakdown */}
        <div style={{ background: "rgba(8,12,24,0.6)", border: `1px solid ${color}18`, borderRadius: 16, padding: "18px 20px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px" }}>Engagement Breakdown</p>
          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
            {engBarColors.map(({ key, color: c }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{key}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 184 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                  axisLine={false} tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }}
                  axisLine={false} tickLine={false}
                  width={36}
                  tickFormatter={fmtN}
                />
                <Tooltip content={<GlassTooltip color={color} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                {engBarColors.map(({ key, color: c }) => (
                  <Bar key={key} dataKey={key} fill={c} radius={[3, 3, 0, 0]} maxBarSize={12} animationDuration={800} animationEasing="ease-out" />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

interface SocialAnalyticsDashboardProps {
  connections: SocialConnection[];
}

export function SocialAnalyticsDashboard({ connections }: SocialAnalyticsDashboardProps) {
  const [activeId, setActiveId] = useState<string>(() => connections[0]?.id ?? "");

  if (connections.length === 0) return null;

  // Ensure activeId is still valid after connections change
  const activeConn = connections.find((c) => c.id === activeId) ?? connections[0];
  const p = P_STYLE[activeConn.platform];

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.2)" }}>Analytics Dashboard</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.18)", marginTop: 3 }}>Per-account analytics from synced snapshots</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24, padding: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 13 }}>
        {connections.map((conn) => {
          const cp = P_STYLE[conn.platform];
          const isActive = conn.id === activeConn.id;
          return (
            <button type="button"
              key={conn.id}
              onClick={() => setActiveId(conn.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 14px",
                borderRadius: 9,
                border: "none",
                background: isActive ? `${cp.color}18` : "transparent",
                outline: isActive ? `1px solid ${cp.color}35` : "1px solid transparent",
                color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.18s",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 14 }}>{cp.icon}</span>
              <span>{conn.account_handle}</span>
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <ConnectionAnalyticsPanel key={activeConn.id} conn={activeConn} color={p.color} />
    </div>
  );
}
