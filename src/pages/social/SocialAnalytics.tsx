import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  mockSocialAccounts, getMetricsForPeriod, getAggregatedMetrics,
  getAllSparklineData, formatSocialNumber, getBestTimesHeatmap,
  getContentTypePerformance, PLATFORM_CONFIG,
} from "@/lib/socialStore";
import { SocialKpiCard } from "@/components/social/SocialKpiCard";
import { SocialAnalyticsModal } from "@/components/social/SocialAnalyticsModal";
import { PlatformIcon } from "@/components/social/PlatformIcon";
import { SocialHeatmap } from "@/components/social/SocialHeatmap";
import {
  Bar, BarChart, Area, AreaChart,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

// ── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(days: number, platformFilter: string) {
  const accounts = platformFilter === "all"
    ? mockSocialAccounts
    : mockSocialAccounts.filter((a) => a.platform === platformFilter);

  const rows = ["date,platform,impressions,reach,engagement,engagement_rate,likes,comments,shares,saves,clicks,profile_visits,website_clicks"];
  accounts.forEach((a) => {
    getMetricsForPeriod(a.id, days).forEach((m) => {
      rows.push([
        m.date, a.platform,
        m.impressions, m.reach, m.engagement, m.engagementRate,
        m.likes, m.comments, m.shares, m.saves, m.clicks,
        m.profileVisits, m.websiteClicks,
      ].join(","));
    });
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `social-analytics-${TODAY.toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast({ title: "Exported", description: `${rows.length - 1} rows downloaded.` });
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,12,24,0.97)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 130 }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: i < payload.length - 1 ? 3 : 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: entry.color ?? entry.fill }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{entry.name}:</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            {typeof entry.value === "number" && entry.value > 999
              ? formatSocialNumber(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SocialAnalytics() {
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState("30d");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  // Read ?platform= from URL on mount
  useEffect(() => {
    const p = searchParams.get("platform");
    if (p && mockSocialAccounts.some((a) => a.platform === p)) {
      setSelectedPlatform(p);
    }
  }, [searchParams]);

  const days = getPeriodDays(period);
  const filteredAccounts = selectedPlatform === "all"
    ? mockSocialAccounts
    : mockSocialAccounts.filter((a) => a.platform === selectedPlatform);
  const accountIds = filteredAccounts.map((a) => a.id);
  const agg = getAggregatedMetrics(accountIds, days);

  // Active platform color
  const activePlatform = mockSocialAccounts.find((a) => a.platform === selectedPlatform);
  const accentColor = activePlatform ? activePlatform.color : "#10b981";

  // Prev-period totals for reach / profileVisits / websiteClicks (not in agg)
  let prevReach = 0, prevProfileVisits = 0, prevWebsiteClicks = 0, prevEngagementTotal = 0, prevReachTotal = 0;
  accountIds.forEach((id) => {
    const metrics = getMetricsForPeriod(id, days * 2);
    const prev = metrics.slice(0, days);
    prev.forEach((m) => {
      prevReach          += m.reach;
      prevProfileVisits  += m.profileVisits;
      prevWebsiteClicks  += m.websiteClicks;
      prevEngagementTotal += m.engagement;
      prevReachTotal     += m.reach;
    });
  });

  function cpct(cur: number, prev: number) {
    return prev === 0 ? 0 : Number(((cur - prev) / prev * 100).toFixed(1));
  }

  const reachChange         = agg.totalReach - prevReach;
  const profileVisitsChange = agg.totalProfileVisits - prevProfileVisits;
  const websiteClicksChange = agg.totalWebsiteClicks - prevWebsiteClicks;
  const prevEngRate = prevReachTotal > 0 ? Number((prevEngagementTotal / prevReachTotal * 100).toFixed(1)) : 0;
  const engRatePtChange = Number((agg.engagementRate - prevEngRate).toFixed(1));

  // Engagement breakdown by week
  const weeksCount = Math.max(1, Math.ceil(days / 7));
  const engBreakdown = Array.from({ length: weeksCount }, (_, weekIdx) => {
    const wd = { week: `W${weekIdx + 1}`, Likes: 0, Comments: 0, Shares: 0, Saves: 0 };
    filteredAccounts.forEach((a) => {
      const metrics = getMetricsForPeriod(a.id, days);
      const start = weekIdx * 7;
      const end = Math.min(start + 7, metrics.length);
      for (let i = start; i < end; i++) {
        wd.Likes    += metrics[i]?.likes    ?? 0;
        wd.Comments += metrics[i]?.comments ?? 0;
        wd.Shares   += metrics[i]?.shares   ?? 0;
        wd.Saves    += metrics[i]?.saves    ?? 0;
      }
    });
    return wd;
  });

  // Impressions & reach over time (capped at 90 for display)
  const clampedDays = Math.min(days, 90);
  const tickInterval = clampedDays <= 14 ? 1 : clampedDays <= 30 ? 4 : 9;
  const impressionsData = Array.from({ length: clampedDays }, (_, i) => {
    let impressions = 0, reach = 0;
    filteredAccounts.forEach((a) => {
      const m = getMetricsForPeriod(a.id, clampedDays);
      impressions += m[i]?.impressions ?? 0;
      reach       += m[i]?.reach       ?? 0;
    });
    const d = new Date(TODAY);
    d.setDate(d.getDate() - (clampedDays - 1 - i));
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { date, Impressions: impressions, Reach: reach };
  });

  // Content type performance (sorted descending)
  const contentPerf = [...getContentTypePerformance()].sort((a, b) => b.avgEngRate - a.avgEngRate);
  const maxEngRate = contentPerf[0]?.avgEngRate ?? 1;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>Engagement breakdowns & performance insights</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, color: "var(--text-secondary)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", cursor: "pointer", outline: "none" }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value} style={{ background: "#0d1117" }}>{p.label}</option>
            ))}
          </select>
          <button type="button"
            onClick={() => exportCSV(days, selectedPlatform)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            <Download style={{ width: 13, height: 13 }} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Platform filter tabs ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 28, padding: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12 }}>
        <button type="button"
          onClick={() => setSelectedPlatform("all")}
          style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: selectedPlatform === "all" ? "rgba(255,255,255,0.08)" : "transparent", border: "none", color: selectedPlatform === "all" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s" }}
        >
          All
        </button>
        {mockSocialAccounts.map((a) => {
          const p = PLATFORM_CONFIG[a.platform];
          const active = selectedPlatform === a.platform;
          return (
            <button type="button"
              key={a.id}
              onClick={() => setSelectedPlatform(a.platform)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: active ? `${a.color}18` : "transparent", border: "none", color: active ? a.color : "rgba(255,255,255,0.35)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s", outline: active ? `1px solid ${a.color}35` : "1px solid transparent" }}
            >
              <PlatformIcon platform={a.platform} size={15} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── 6 KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <SocialKpiCard label="Impressions"     value={formatSocialNumber(agg.totalImpressions)}   change={agg.impressionChange}         changePercent={agg.impressionChangePct}                          sparkline={getAllSparklineData(accountIds, days, "impressions")}   accentColor="#6366f1" icon="👁"  onClick={() => setActiveMetric("impressions")} />
        <SocialKpiCard label="Reach"           value={formatSocialNumber(agg.totalReach)}         change={reachChange}                  changePercent={cpct(agg.totalReach, prevReach)}                  sparkline={getAllSparklineData(accountIds, days, "reach")}         accentColor="#8b5cf6" icon="📡" onClick={() => setActiveMetric("reach")} />
        <SocialKpiCard label="Engagement"      value={formatSocialNumber(agg.totalEngagement)}    change={agg.engagementChange}         changePercent={cpct(agg.totalEngagement, agg.totalEngagement - agg.engagementChange)} sparkline={getAllSparklineData(accountIds, days, "engagement")}    accentColor="#ec4899" icon="❤️" onClick={() => setActiveMetric("engagement")} />
        <SocialKpiCard label="Engagement Rate" value={`${agg.engagementRate}%`}                  change={engRatePtChange}              changePercent={cpct(agg.engagementRate, prevEngRate)}            sparkline={getAllSparklineData(accountIds, days, "engagementRate")} accentColor="#f59e0b" icon="⚡" changeSuffix=" pts" onClick={() => setActiveMetric("engagementRate")} />
        <SocialKpiCard label="Profile Visits"  value={formatSocialNumber(agg.totalProfileVisits)} change={profileVisitsChange}          changePercent={cpct(agg.totalProfileVisits, prevProfileVisits)}  sparkline={getAllSparklineData(accountIds, days, "profileVisits")}  accentColor="#10b981" icon="🧑" onClick={() => setActiveMetric("profileVisits")} />
        <SocialKpiCard label="Website Clicks"  value={formatSocialNumber(agg.totalWebsiteClicks)} change={websiteClicksChange}          changePercent={cpct(agg.totalWebsiteClicks, prevWebsiteClicks)}  sparkline={getAllSparklineData(accountIds, days, "websiteClicks")}  accentColor="#06b6d4" icon="🔗" onClick={() => setActiveMetric("websiteClicks")} />
      </div>

      {/* ── Engagement Breakdown ── */}
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Engagement Breakdown</p>
          {/* Legend */}
          <div style={{ display: "flex", gap: 14 }}>
            {[{ key: "Likes", c: "#f43f5e" }, { key: "Comments", c: "#3b82f6" }, { key: "Shares", c: "#10b981" }, { key: "Saves", c: "#f59e0b" }].map(({ key, c }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{key}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engBreakdown} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} width={40} tickFormatter={formatSocialNumber} />
              <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="Likes"    stackId="a" fill="#f43f5e" animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="Comments" stackId="a" fill="#3b82f6" animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="Shares"   stackId="a" fill="#10b981" animationDuration={800} animationEasing="ease-out" />
              <Bar dataKey="Saves"    stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} animationDuration={800} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Impressions & Reach ── */}
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Impressions & Reach Over Time</p>
          <div style={{ display: "flex", gap: 14 }}>
            {[{ label: "Impressions", c: "#6366f1" }, { label: "Reach", c: "rgba(255,255,255,0.5)" }].map(({ label, c }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 12, height: 2, borderRadius: 1, background: c }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={impressionsData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="imp-grad-analytics" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} interval={tickInterval} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} width={44} tickFormatter={formatSocialNumber} />
              <Tooltip content={<GlassTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="Impressions" stroke="#6366f1" strokeWidth={2} fill="url(#imp-grad-analytics)" dot={false} activeDot={{ r: 5, fill: "#6366f1", stroke: "#0d1117", strokeWidth: 2, style: { filter: "drop-shadow(0 0 4px #6366f1)" } }} animationDuration={800} animationEasing="ease-out" />
              <Area type="monotone" dataKey="Reach" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} fill="transparent" dot={false} activeDot={{ r: 4, fill: "rgba(255,255,255,0.5)", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row: Heatmap + Content Type ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Best Posting Times */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>Best Posting Times</p>
          <SocialHeatmap data={getBestTimesHeatmap()} accentColor={accentColor} />
        </div>

        {/* Content Type Performance */}
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>Content Type Performance</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {contentPerf.map((c) => {
              const pct = (c.avgEngRate / maxEngRate) * 100;
              return (
                <div key={c.type}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>{c.type}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{c.avgEngRate}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor}88)`,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {activeMetric && <SocialAnalyticsModal metric={activeMetric} onClose={() => setActiveMetric(null)} />}
    </div>
  );
}
