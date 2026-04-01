import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  mockSocialAccounts, mockSocialPosts, mockSocialGoals,
  getAggregatedMetrics, getAllSparklineData, formatSocialNumber,
  PLATFORM_CONFIG, getMetricsForPeriod,
  type SocialPost,
} from "@/lib/socialStore";
import { SocialKpiCard } from "@/components/social/SocialKpiCard";
import { SocialKpiModal } from "@/components/social/SocialKpiModal";
import { PlatformBreakdownTable } from "@/components/social/PlatformBreakdownTable";
import { TopPostCard } from "@/components/social/TopPostCard";
import { GoalsProgress } from "@/components/social/GoalsProgress";
import { PostDetailModal } from "@/components/social/PostDetailModal";
import {
  Area, AreaChart, Line, LineChart,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";

// ── Period logic ──────────────────────────────────────────────────────────────

const TODAY = new Date("2026-03-05");

function getPeriodDays(period: string): number {
  switch (period) {
    case "7d":   return 7;
    case "14d":  return 14;
    case "30d":  return 30;
    case "90d":  return 90;
    case "this_month": {
      const start = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
      return Math.max(1, Math.ceil((TODAY.getTime() - start.getTime()) / 86400000));
    }
    case "last_month": {
      const end = new Date(TODAY.getFullYear(), TODAY.getMonth(), 0);
      const start = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1);
      return Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    }
    case "quarter": {
      const q = Math.floor(TODAY.getMonth() / 3);
      const start = new Date(TODAY.getFullYear(), q * 3, 1);
      return Math.max(1, Math.ceil((TODAY.getTime() - start.getTime()) / 86400000));
    }
    default: return 30;
  }
}

const PERIODS = [
  { label: "Last 7 days",  value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "This month",   value: "this_month" },
  { label: "Last month",   value: "last_month" },
  { label: "This quarter", value: "quarter" },
];

// Local GlassTooltip removed — shared component available at @/components/ui/GlassTooltip
// The charts in this file use Recharts contentStyle/labelStyle/itemStyle props instead of content={}.

// ── Main component ────────────────────────────────────────────────────────────

export default function SocialOverview() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [hiddenPlatforms, setHiddenPlatforms] = useState<Set<string>>(new Set());
  const [activeKpi, setActiveKpi] = useState<string | null>(null);

  function togglePlatform(platform: string) {
    setHiddenPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  const days = getPeriodDays(period);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "Last 30 days";
  const accountIds = mockSocialAccounts.map((a) => a.id);
  const agg = getAggregatedMetrics(accountIds, days);

  const topPosts = [...mockSocialPosts]
    .filter((p) => p.status === "published")
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 3);

  // ── Per-post averages (current vs prev period) ────────────────────────────
  const periodStart = new Date(TODAY); periodStart.setDate(periodStart.getDate() - days);
  const prevStart   = new Date(periodStart); prevStart.setDate(prevStart.getDate() - days);

  const curPosts  = mockSocialPosts.filter((p) => p.status === "published" && p.publishedAt && new Date(p.publishedAt) >= periodStart);
  const prevPosts = mockSocialPosts.filter((p) => p.status === "published" && p.publishedAt && new Date(p.publishedAt) >= prevStart && new Date(p.publishedAt) < periodStart);

  function postAvg(arr: typeof mockSocialPosts, key: "likes"|"comments"|"shares"|"saves") {
    return arr.length === 0 ? 0 : Math.round(arr.reduce((s, p) => s + p[key], 0) / arr.length);
  }
  function pct(cur: number, prev: number) {
    return prev === 0 ? 0 : Number(((cur - prev) / prev * 100).toFixed(1));
  }

  const avgLikes    = postAvg(curPosts,  "likes");
  const avgComments = postAvg(curPosts,  "comments");
  const avgShares   = postAvg(curPosts,  "shares");
  const avgSaves    = postAvg(curPosts,  "saves");

  const prevAvgLikes    = postAvg(prevPosts, "likes");
  const prevAvgComments = postAvg(prevPosts, "comments");
  const prevAvgShares   = postAvg(prevPosts, "shares");
  const prevAvgSaves    = postAvg(prevPosts, "saves");

  const clampedDays = Math.min(days, 90);
  const tickInterval = clampedDays <= 14 ? 1 : clampedDays <= 30 ? 3 : 8;

  // Seeded growth curves per platform (deterministic, no random at render time)
  const GROWTH_RATES: Record<string, { base: number; daily: number }> = {
    instagram: { base: 11870, daily: 19.3 },
    linkedin:  { base: 7980,  daily: 11.3 },
    twitter:   { base: 1970,  daily: 7.0  },
    youtube:   { base: 1145,  daily: 3.2  },
    tiktok:    { base: 620,   daily: 0.7  },
  };

  const ENG_BASES: Record<string, number[]> = {
    instagram: [4.5,4.8,5.1,4.7,5.3,5.0,4.6,5.2,4.9,5.4,5.1,4.8,5.5,5.2,4.9,5.6,5.0,4.7,5.3,5.1,4.8,5.4,5.0,4.6,5.2,5.5,5.1,4.9,5.3,5.0],
    linkedin:  [5.2,5.8,6.1,5.5,6.3,5.9,5.4,6.0,5.7,6.4,5.8,5.3,6.5,5.9,5.6,6.2,5.7,5.3,6.0,5.8,5.5,6.3,5.9,5.4,6.1,6.5,5.8,5.6,6.0,5.7],
    twitter:   [3.0,3.4,3.8,3.2,3.9,3.5,3.1,3.7,3.4,3.8,3.3,3.1,3.9,3.6,3.2,3.8,3.4,3.0,3.7,3.5,3.2,3.8,3.4,3.1,3.6,3.9,3.5,3.3,3.7,3.4],
    youtube:   [3.5,3.9,4.2,3.7,4.4,3.8,3.6,4.1,3.8,4.2,3.7,3.4,4.3,3.9,3.6,4.1,3.7,3.4,4.0,3.8,3.5,4.2,3.8,3.5,4.0,4.3,3.9,3.7,4.1,3.8],
    tiktok:    [6.0,7.2,8.1,6.5,9.0,7.5,6.2,8.3,7.0,9.2,7.8,6.4,9.5,8.0,6.9,8.8,7.3,6.1,8.5,7.9,6.6,9.1,7.7,6.3,8.4,9.5,7.8,7.1,8.6,7.5],
  };

  const followerChartData = Array.from({ length: clampedDays }, (_, i) => {
    const dt = new Date(TODAY); dt.setDate(dt.getDate() - clampedDays + i + 1);
    const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const point: Record<string, any> = { date: label, _iso: dt.toISOString() };
    mockSocialAccounts.forEach((a) => {
      const g = GROWTH_RATES[a.platform];
      if (g) {
        // small sine wave for organic-looking growth
        const noise = Math.sin(i * 0.7 + a.id.charCodeAt(3)) * (g.daily * 0.3);
        point[a.platform] = Math.round(g.base + i * g.daily + noise);
      } else {
        point[a.platform] = getMetricsForPeriod(a.id, clampedDays)[i]?.followers ?? 0;
      }
    });
    return point;
  });

  const engRateChartData = Array.from({ length: clampedDays }, (_, i) => {
    const dt = new Date(TODAY); dt.setDate(dt.getDate() - clampedDays + i + 1);
    const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const point: Record<string, any> = { date: label };
    mockSocialAccounts.forEach((a) => {
      const arr = ENG_BASES[a.platform];
      point[a.platform] = arr ? arr[i % arr.length] : 4.0;
    });
    return point;
  });

  return (
    <ModuleErrorBoundary moduleName="Social Overview">
    <div style={{ paddingBottom: 40, maxWidth: 1400, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Social Media</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>Overview across all platforms</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", cursor: "pointer", outline: "none" }}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} style={{ background: "#0d1117" }}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* ── KPI Cards — Row 1: Primary ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <SocialKpiCard
          label="Total Followers"
          value={formatSocialNumber(agg.totalFollowers)}
          change={agg.followerChange}
          changePercent={agg.followerChangePct}
          sparkline={getAllSparklineData(accountIds, days, "followers")}
          accentColor="#10b981"
          icon="👥"
          onClick={() => setActiveKpi("followers")}
        />
        <SocialKpiCard
          label="Total Impressions"
          value={formatSocialNumber(agg.totalImpressions)}
          change={agg.impressionChange}
          changePercent={agg.impressionChangePct}
          sparkline={getAllSparklineData(accountIds, days, "impressions")}
          accentColor="#6366f1"
          icon="👁"
          onClick={() => setActiveKpi("impressions")}
        />
        <SocialKpiCard
          label="Total Reach"
          value={formatSocialNumber(agg.totalReach)}
          change={Math.round(agg.totalReach * 0.12)}
          changePercent={12.3}
          sparkline={getAllSparklineData(accountIds, days, "reach")}
          accentColor="#3b82f6"
          icon="📡"
          onClick={() => setActiveKpi("reach")}
        />
        <SocialKpiCard
          label="Posts Published"
          value={agg.totalPosts.toString()}
          change={agg.postsChange}
          changePercent={agg.postsChange > 0 ? Number(((agg.postsChange / Math.max(agg.totalPosts - agg.postsChange, 1)) * 100).toFixed(1)) : 0}
          sparkline={getAllSparklineData(accountIds, days, "postsPublished")}
          accentColor="#e879f9"
          icon="📝"
          onClick={() => setActiveKpi("posts")}
        />
      </div>

      {/* ── KPI Cards — Row 2: Engagement averages ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
        <SocialKpiCard
          label="Avg. Likes"
          sublabel="per post"
          value={formatSocialNumber(avgLikes)}
          change={avgLikes - prevAvgLikes}
          changePercent={pct(avgLikes, prevAvgLikes)}
          sparkline={getAllSparklineData(accountIds, days, "likes")}
          accentColor="#f43f5e"
          icon="❤️"
          onClick={() => setActiveKpi("likes")}
        />
        <SocialKpiCard
          label="Avg. Comments"
          sublabel="per post"
          value={formatSocialNumber(avgComments)}
          change={avgComments - prevAvgComments}
          changePercent={pct(avgComments, prevAvgComments)}
          sparkline={getAllSparklineData(accountIds, days, "comments")}
          accentColor="#3b82f6"
          icon="💬"
          onClick={() => setActiveKpi("comments")}
        />
        <SocialKpiCard
          label="Engagement Rate"
          sublabel="across platforms"
          value={`${agg.engagementRate}%`}
          change={Number((agg.engagementRate - 4).toFixed(1))}
          changePercent={Number((((agg.engagementRate - 4) / 4) * 100).toFixed(1))}
          changeSuffix=" pts"
          sparkline={getAllSparklineData(accountIds, days, "engagementRate")}
          accentColor="#f59e0b"
          icon="⚡"
          onClick={() => setActiveKpi("engagementRate")}
        />
        <SocialKpiCard
          label="Avg. Shares"
          sublabel="per post"
          value={formatSocialNumber(avgShares)}
          change={avgShares - prevAvgShares}
          changePercent={pct(avgShares, prevAvgShares)}
          sparkline={getAllSparklineData(accountIds, days, "shares")}
          accentColor="#10b981"
          icon="🔄"
          onClick={() => setActiveKpi("shares")}
        />
      </div>

      {/* ── KPI Cards — Row 3: Clicks & visits ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        <SocialKpiCard
          label="Profile Visits"
          value={formatSocialNumber(agg.totalProfileVisits)}
          change={Math.round(agg.totalProfileVisits * 0.089)}
          changePercent={8.9}
          sparkline={getAllSparklineData(accountIds, days, "profileVisits")}
          accentColor="#a78bfa"
          icon="🧑"
          onClick={() => setActiveKpi("profileVisits")}
        />
        <SocialKpiCard
          label="Website Clicks"
          value={formatSocialNumber(agg.totalWebsiteClicks)}
          change={Math.round(agg.totalWebsiteClicks * 0.15)}
          changePercent={15.0}
          sparkline={getAllSparklineData(accountIds, days, "websiteClicks")}
          accentColor="#06b6d4"
          icon="🔗"
          onClick={() => setActiveKpi("websiteClicks")}
        />
        <SocialKpiCard
          label="Avg. Saves"
          sublabel="per post"
          value={formatSocialNumber(avgSaves)}
          change={avgSaves - prevAvgSaves}
          changePercent={pct(avgSaves, prevAvgSaves)}
          sparkline={getAllSparklineData(accountIds, days, "saves")}
          accentColor="#f59e0b"
          icon="🔖"
          onClick={() => setActiveKpi("saves")}
        />
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>

        {/* ── Follower Growth ── */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Follower Growth</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Total audience by platform · {periodLabel}</p>
            </div>
          </div>

          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={followerChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {mockSocialAccounts.map((a) => (
                    <linearGradient key={a.id} id={`fg2-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={a.color} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={a.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={formatSocialNumber}
                />
                <Tooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                  labelStyle={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 6, fontWeight: 600 }}
                  itemStyle={{ color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "2px 0" }}
                  formatter={(v: any, name: string) => [formatSocialNumber(Number(v)), PLATFORM_CONFIG[name as keyof typeof PLATFORM_CONFIG]?.label ?? name]}
                  cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
                />
                {mockSocialAccounts.map((a) => (
                  <Area
                    key={a.id}
                    type="monotone"
                    dataKey={a.platform}
                    stackId="1"
                    stroke={a.color}
                    fill={`url(#fg2-${a.id})`}
                    strokeWidth={hiddenPlatforms.has(a.platform) ? 0 : 1.5}
                    fillOpacity={hiddenPlatforms.has(a.platform) ? 0 : 1}
                    dot={false}
                    name={a.platform}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {mockSocialAccounts.map((a) => {
              const hidden = hiddenPlatforms.has(a.platform);
              return (
                <button type="button"
                  key={a.id}
                  onClick={() => togglePlatform(a.platform)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: hidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: hidden ? "rgba(255,255,255,0.15)" : a.color, flexShrink: 0, transition: "background 0.15s" }} />
                  {PLATFORM_CONFIG[a.platform].label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Engagement Rate ── */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Engagement Rate</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Daily rate per platform · {periodLabel}</p>
            </div>
          </div>

          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engRateChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                  labelStyle={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginBottom: 6, fontWeight: 600 }}
                  itemStyle={{ color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "2px 0" }}
                  formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}%`, PLATFORM_CONFIG[name as keyof typeof PLATFORM_CONFIG]?.label ?? name]}
                  cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
                />
                {mockSocialAccounts.map((a) => (
                  <Line
                    key={a.id}
                    type="monotone"
                    dataKey={a.platform}
                    stroke={hiddenPlatforms.has(a.platform) ? "transparent" : a.color}
                    strokeWidth={2}
                    dot={false}
                    name={a.platform}
                    activeDot={hiddenPlatforms.has(a.platform) ? false : { r: 5, fill: a.color, stroke: "#0d1117", strokeWidth: 2, style: { filter: `drop-shadow(0 0 4px ${a.color})` } }}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {mockSocialAccounts.map((a) => {
              const hidden = hiddenPlatforms.has(a.platform);
              return (
                <button type="button"
                  key={a.id}
                  onClick={() => togglePlatform(a.platform)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: hidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
                >
                  <span style={{ width: 20, height: 2, borderRadius: 1, background: hidden ? "rgba(255,255,255,0.15)" : a.color, flexShrink: 0, transition: "background 0.15s" }} />
                  {PLATFORM_CONFIG[a.platform].label.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Platform Breakdown ── */}
      <div style={{ marginBottom: 32 }}>
        <PlatformBreakdownTable
          accounts={mockSocialAccounts}
          days={days}
          onRowClick={(platform) => navigate(`/social/analytics?platform=${platform}`)}
        />
      </div>

      {/* ── Bottom Row: Top Posts + Goals ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14, marginBottom: 40 }}>

        {/* ── Top Posts card ── */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🏆</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Top Performing Posts</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{periodLabel} · ranked by engagement rate</p>
              </div>
            </div>
            <button type="button"
              onClick={() => navigate("/social/content")}
              style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; }}
            >
              View all posts →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {topPosts.map((post, i) => (
              <TopPostCard key={post.id} post={post} rank={i + 1} onClick={() => setSelectedPost(post)} />
            ))}
          </div>
        </div>

        {/* ── Goals card ── */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🎯</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Goals</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>Monthly progress</p>
              </div>
            </div>
            <button type="button"
              style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: "4px 10px", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              + Add goal
            </button>
          </div>

          <GoalsProgress goals={mockSocialGoals} />
        </div>
      </div>

      {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {activeKpi && <SocialKpiModal metric={activeKpi} onClose={() => setActiveKpi(null)} />}
    </div>
    </ModuleErrorBoundary>
  );
}
