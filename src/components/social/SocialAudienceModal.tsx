import { useState, useEffect, useCallback } from "react";
import {
  mockSocialAccounts, getMetricsForPeriod, getDemographics,
  formatSocialNumber, PLATFORM_CONFIG,
} from "@/lib/socialStore";
import { PlatformIcon } from "@/components/social/PlatformIcon";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine,
} from "recharts";
import { GlassTooltip } from "@/components/ui/GlassTooltip";

const TODAY = new Date("2026-03-05");
const GENDER_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6"];

// Expanded active times matrix: 7 days × 9 slots (6am–10pm)
const EXPANDED_ACTIVE_TIMES: number[][] = [
  [0.10, 0.30, 0.72, 0.88, 0.70, 0.76, 0.90, 0.68, 0.40], // Mon
  [0.10, 0.28, 0.76, 0.90, 0.72, 0.74, 0.76, 0.65, 0.38], // Tue
  [0.08, 0.25, 0.62, 0.76, 0.80, 0.88, 0.70, 0.45, 0.30], // Wed
  [0.12, 0.35, 0.74, 0.92, 0.75, 0.78, 0.88, 0.72, 0.42], // Thu
  [0.14, 0.38, 0.68, 0.76, 0.72, 0.82, 0.86, 0.90, 0.58], // Fri
  [0.18, 0.22, 0.44, 0.55, 0.80, 0.94, 0.88, 0.82, 0.60], // Sat
  [0.12, 0.18, 0.36, 0.44, 0.78, 0.88, 0.84, 0.75, 0.52], // Sun
];
const TIME_LABELS = ["6am","8am","10am","12pm","2pm","4pm","6pm","8pm","10pm"];
const DAY_LABELS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const fmtSocialTooltip = (v: number) =>
  typeof v === "number" && Math.abs(v) >= 1000 ? formatSocialNumber(Math.abs(v)) : String(v);

// ── Shell ────────────────────────────────────────────────────────────────────
interface ModalShellProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, subtitle, onClose, children }: ModalShellProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <style>{`@keyframes modalIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.97)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 500, backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 501, width: 900, maxWidth: "calc(100vw - 32px)",
        maxHeight: "calc(100vh - 48px)", overflowY: "auto",
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18,
        boxShadow: "0 32px 100px rgba(0,0,0,0.8)",
        animation: "modalIn 0.25s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.3px", margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </>
  );
}

// ── Section headers / panels ─────────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "rgba(255,255,255,0.25)", marginBottom: 14, marginTop: 24 }}>
      {children}
    </p>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 13px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 6 }}>
      <span style={{ fontSize: 13 }}>💡</span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

// ── B1: Follower Growth Modal ────────────────────────────────────────────────
function FollowerGrowthModal({ days }: { days: number }) {
  const [hiddenPlatforms, setHiddenPlatforms] = useState<Set<string>>(new Set());
  const clampedDays = Math.min(days, 90);
  const tickInterval = clampedDays <= 14 ? 1 : clampedDays <= 30 ? 4 : 9;

  const followerData = Array.from({ length: clampedDays }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - (clampedDays - 1 - i));
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const point: Record<string, any> = { date };
    mockSocialAccounts.forEach((a) => {
      const m = getMetricsForPeriod(a.id, clampedDays);
      point[a.platform] = m[i]?.followers ?? 0;
    });
    return point;
  });

  // Growth rate comparison: this period vs prev period
  const growthTable = mockSocialAccounts.map((a) => {
    const curr = getMetricsForPeriod(a.id, days).reduce((s, m) => s + m.netFollowers, 0);
    const prev = getMetricsForPeriod(a.id, days * 2).slice(0, days).reduce((s, m) => s + m.netFollowers, 0);
    const changePct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    const trend = changePct > 15 ? "accelerating" : changePct < -10 ? "slowing" : "steady";
    return { account: a, curr, prev, changePct, trend };
  }).sort((a, b) => b.curr - a.curr);

  const togglePlatform = (id: string) => {
    setHiddenPlatforms(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalFollowers = mockSocialAccounts.reduce((s, a) => s + a.followersCount, 0);
  const totalGained = mockSocialAccounts.reduce((s, a) =>
    s + getMetricsForPeriod(a.id, days).reduce((ss, m) => ss + m.netFollowers, 0), 0);

  return (
    <>
      {/* Legend toggle */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {mockSocialAccounts.map((a) => {
          const hidden = hiddenPlatforms.has(a.platform);
          return (
            <button type="button"
              key={a.id}
              onClick={() => togglePlatform(a.platform)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: hidden ? "rgba(255,255,255,0.04)" : `${a.color}18`,
                border: hidden ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${a.color}30`,
                color: hidden ? "rgba(255,255,255,0.25)" : a.color,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <PlatformIcon platform={a.platform} size={12} />
              {PLATFORM_CONFIG[a.platform].label}
            </button>
          );
        })}
      </div>

      {/* Large stacked area chart */}
      <div style={{ height: 320, marginBottom: 6 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={followerData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {mockSocialAccounts.map((a) => (
                <linearGradient key={a.id} id={`fgm-grad-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={a.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={a.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} interval={tickInterval} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} width={52} tickFormatter={formatSocialNumber} />
            <Tooltip content={<GlassTooltip formatter={fmtSocialTooltip} />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }} />
            {mockSocialAccounts.map((a) => (
              hiddenPlatforms.has(a.platform) ? null : (
                <Area
                  key={a.id}
                  type="monotone"
                  dataKey={a.platform}
                  stroke={a.color}
                  fill={`url(#fgm-grad-${a.id})`}
                  strokeWidth={1.8}
                  dot={false}
                  stackId="1"
                  name={PLATFORM_CONFIG[a.platform].label}
                  activeDot={{ r: 4, fill: a.color, stroke: "#0d1117", strokeWidth: 2 }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones */}
      <SectionHeader>Milestones</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
        {[
          { icon: "🎉", text: "Passed 12,000 Instagram followers on Mar 8" },
          { icon: "🎉", text: "Passed 8,000 LinkedIn followers on Feb 22" },
          { icon: "🎯", text: `Next milestone: 15,000 Instagram (need ${(15000 - 12450).toLocaleString()} more, ~${Math.round((15000 - 12450) / (580 / 30))} days at current pace)` },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 13px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 14 }}>{m.icon}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{m.text}</span>
          </div>
        ))}
      </div>

      {/* Growth rate table */}
      <SectionHeader>Growth Rate Comparison</SectionHeader>
      <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 100px", padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {["Platform","This Period","Prev Period","Change","Trend"].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
          ))}
        </div>
        {growthTable.map(({ account, curr, prev, changePct, trend }) => {
          const trendColor = trend === "accelerating" ? "#10b981" : trend === "slowing" ? "#ef4444" : "rgba(255,255,255,0.35)";
          const p = PLATFORM_CONFIG[account.platform];
          return (
            <div key={account.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 100px", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <PlatformIcon platform={account.platform} size={14} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{p.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>+{curr}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>+{prev}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: changePct >= 0 ? "#10b981" : "#ef4444" }}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(0)}% {changePct >= 0 ? "↑" : "↓"}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>{trend}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <InsightRow text={`Instagram growth ${growthTable.find(r => r.account.platform === "instagram")?.trend === "accelerating" ? "accelerated" : "is steady"} — likely driven by recent carousel posts`} />
        <InsightRow text="TikTok growth slowing — consider increasing video frequency to 4-5x per week" />
      </div>
    </>
  );
}

// ── B2: Growth Analysis Modal ────────────────────────────────────────────────
function GrowthAnalysisModal({ days }: { days: number }) {
  const [granularity, setGranularity] = useState<"weekly" | "daily">("weekly");

  const weeksCount = Math.min(Math.ceil(days / 7), 13);

  const weeklyData = Array.from({ length: weeksCount }, (_, wi) => {
    let gained = 0, lost = 0;
    mockSocialAccounts.forEach((a) => {
      const metrics = getMetricsForPeriod(a.id, days);
      const start = wi * 7, end = Math.min(start + 7, metrics.length);
      for (let i = start; i < end; i++) {
        gained += metrics[i]?.followersGained ?? 0;
        lost   += metrics[i]?.followersLost   ?? 0;
      }
    });
    return { label: `W${wi + 1}`, gained, lost: -lost, net: gained - lost };
  });

  const dailyData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - (Math.min(days, 30) - 1 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let gained = 0, lost = 0;
    mockSocialAccounts.forEach((a) => {
      const metrics = getMetricsForPeriod(a.id, Math.min(days, 30));
      gained += metrics[i]?.followersGained ?? 0;
      lost   += metrics[i]?.followersLost   ?? 0;
    });
    return { label, gained, lost: -lost, net: gained - lost };
  });

  const chartData = granularity === "weekly" ? weeklyData : dailyData;
  const totalGained = weeklyData.reduce((s, w) => s + w.gained, 0);
  const totalLost   = weeklyData.reduce((s, w) => s + Math.abs(w.lost), 0);
  const retentionPct = totalGained > 0 ? ((totalGained - totalLost) / totalGained * 100) : 76.5;

  // Churn by platform
  const churnByPlatform = mockSocialAccounts.map((a) => {
    const lost = getMetricsForPeriod(a.id, days).reduce((s, m) => s + m.followersLost, 0);
    return { account: a, lost };
  }).sort((a, b) => b.lost - a.lost);
  const maxChurn = Math.max(...churnByPlatform.map(c => c.lost), 1);

  return (
    <>
      {/* Granularity toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["weekly","daily"] as const).map((g) => (
            <button type="button"
              key={g}
              onClick={() => setGranularity(g)}
              style={{
                padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                background: granularity === g ? "rgba(255,255,255,0.1)" : "transparent",
                color: granularity === g ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                fontFamily: "inherit", textTransform: "capitalize",
              }}
            >
              By {g === "weekly" ? "Week" : "Day"}
            </button>
          ))}
        </div>
      </div>

      {/* Bidirectional bar chart */}
      <div style={{ height: 280, marginBottom: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => String(Math.abs(v))} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Tooltip content={<GlassTooltip formatter={fmtSocialTooltip} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="gained" name="Gained" fill="#10b981" radius={[4,4,0,0]} animationDuration={800} animationEasing="ease-out" />
            <Bar dataKey="lost"   name="Lost"   fill="#ef4444" radius={[0,0,4,4]} animationDuration={800} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column: retention donut + churn by platform */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        {/* Retention donut */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Retention Rate</p>
          <div style={{ position: "relative", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ name: "Retained", value: retentionPct }, { name: "Churned", value: 100 - retentionPct }]}
                  dataKey="value" cx="50%" cy="50%"
                  innerRadius={52} outerRadius={68}
                  paddingAngle={3} stroke="none"
                  startAngle={90} endAngle={-270}
                  animationDuration={800} animationEasing="ease-out"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" opacity={0.6} />
                </Pie>
                <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#10b981", letterSpacing: "-0.5px" }}>{retentionPct.toFixed(1)}%</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>retained</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 6 }}>
            You keep ~{Math.round(retentionPct / 25)} of every 4 followers you gain
          </p>
        </div>

        {/* Churn by platform */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Churn by Platform</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {churnByPlatform.map(({ account, lost }) => {
              const p = PLATFORM_CONFIG[account.platform];
              const pct = (lost / maxChurn) * 100;
              return (
                <div key={account.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <PlatformIcon platform={account.platform} size={13} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{p.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>-{lost}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: "#ef4444", opacity: 0.6, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <InsightRow text="Best growth day: Mar 1 (+82 net) — product launch post drove high follower acquisition" />
        <InsightRow text="Worst churn day: Mar 15 (-28 net) — no posts published that day" />
        <InsightRow text={`Follower retention rate improving: ${retentionPct.toFixed(1)}% vs 71.2% last period`} />
      </div>
    </>
  );
}

// ── B3: Demographics Modal ───────────────────────────────────────────────────
function DemographicsModal({ totalFollowers }: { totalFollowers: number }) {
  const [activePlatformTab, setActivePlatformTab] = useState("all");
  const demo = getDemographics();
  const maxAgePct = Math.max(...demo.age.map((a) => a.pct));
  const allLocations = [
    ...demo.locations,
    { city: "Amsterdam, NL", pct: 2 },
    { city: "Turin, IT", pct: 2 },
    { city: "Lisbon, PT", pct: 1 },
  ];

  // Per-platform demographics (mock variations)
  const platformDemoOverrides: Record<string, { ageNote: string; genderNote: string; topCity: string }> = {
    instagram: { ageNote: "25-34 dominant (52%)", genderNote: "58% Female", topCity: "Milan (32%)" },
    linkedin:  { ageNote: "35-44 dominant (38%)", genderNote: "48% Male",   topCity: "Milan (25%)" },
    twitter:   { ageNote: "18-24 dominant (35%)", genderNote: "55% Male",   topCity: "Rome (18%)" },
    youtube:   { ageNote: "25-34 dominant (44%)", genderNote: "62% Male",   topCity: "Milan (22%)" },
    tiktok:    { ageNote: "18-24 dominant (58%)", genderNote: "52% Female", topCity: "Rome (20%)" },
  };

  return (
    <>
      {/* Three-column demographics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Age */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Age Distribution</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {demo.age.map((a) => {
              const isTop = a.pct === maxAgePct;
              return (
                <div key={a.range} title={`${Math.round(totalFollowers * a.pct / 100).toLocaleString()} followers`}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: isTop ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)", fontWeight: isTop ? 700 : 400 }}>{a.range}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isTop ? "#10b981" : "rgba(255,255,255,0.4)" }}>{a.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${a.pct}%`, background: isTop ? "#10b981" : "rgba(255,255,255,0.12)", transition: "width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 14 }}>Median age: 29 · Peak: 25-34 (45%)</p>
        </div>

        {/* Gender donut */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>Gender</p>
          <div style={{ position: "relative", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demo.gender} dataKey="pct" nameKey="label"
                  cx="50%" cy="50%" innerRadius={52} outerRadius={68}
                  paddingAngle={3} stroke="none" startAngle={90} endAngle={-270}
                  animationDuration={800} animationEasing="ease-out"
                >
                  {demo.gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{formatSocialNumber(totalFollowers)}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.5px" }}>followers</span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {demo.gender.map((g, i) => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: GENDER_COLORS[i] }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{g.label} <strong style={{ color: "rgba(255,255,255,0.75)" }}>{g.pct}%</strong></span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>vs prev period: M44% F52% · <span style={{ color: "#10b981" }}>+2% Female shift</span></p>
          </div>
        </div>

        {/* Top 10 Locations */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>Top 10 Locations</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {allLocations.slice(0, 10).map((l, i) => (
              <div key={l.city} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, width: 14, flexShrink: 0, textAlign: "right", color: i < 3 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: i < 3 ? 11 : 10, fontWeight: i < 3 ? 600 : 400, color: i < 3 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}>{l.city}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)" }}>{l.pct}%</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${(l.pct / allLocations[0].pct) * 100}%`, background: i < 3 ? "#10b981" : "rgba(255,255,255,0.09)", opacity: i < 3 ? 0.65 : 1 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demographics by platform */}
      <SectionHeader>Demographics by Platform</SectionHeader>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button type="button"
          onClick={() => setActivePlatformTab("all")}
          style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: activePlatformTab === "all" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", color: activePlatformTab === "all" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", fontFamily: "inherit" }}
        >
          All
        </button>
        {mockSocialAccounts.map((a) => {
          const active = activePlatformTab === a.platform;
          return (
            <button type="button"
              key={a.id}
              onClick={() => setActivePlatformTab(a.platform)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: active ? `${a.color}18` : "rgba(255,255,255,0.04)", color: active ? a.color : "rgba(255,255,255,0.35)", fontFamily: "inherit", outline: active ? `1px solid ${a.color}30` : "none" }}
            >
              <PlatformIcon platform={a.platform} size={12} />
              {PLATFORM_CONFIG[a.platform].label}
            </button>
          );
        })}
      </div>

      {activePlatformTab !== "all" && platformDemoOverrides[activePlatformTab] ? (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(() => {
            const a = mockSocialAccounts.find(a => a.platform === activePlatformTab)!;
            const ov = platformDemoOverrides[activePlatformTab];
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <PlatformIcon platform={activePlatformTab} size={16} />
                <span style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{PLATFORM_CONFIG[activePlatformTab].label}:</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{ov.ageNote}</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{ov.genderNote}</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Top: {ov.topCity}</span>
              </div>
            );
          })()}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {mockSocialAccounts.map((a) => {
            const ov = platformDemoOverrides[a.platform];
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap" }}>
                <PlatformIcon platform={a.platform} size={14} />
                <span style={{ fontSize: 12, fontWeight: 700, color: a.color, minWidth: 80 }}>{PLATFORM_CONFIG[a.platform].label}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{ov.ageNote}</span>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{ov.genderNote}</span>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Top: {ov.topCity}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <InsightRow text="Your audience skews young — 67% are under 35. Consider trend-forward content." />
        <InsightRow text="Milan accounts for 28% of followers — consider Italian-language or local content." />
        <InsightRow text="LinkedIn has an older, more male audience than Instagram — tailor content accordingly." />
      </div>
    </>
  );
}

// ── B4: Audience Activity Modal ──────────────────────────────────────────────
function AudienceActivityModal() {
  const [selectedCell, setSelectedCell] = useState<{ day: number; slot: number } | null>(null);
  const [hoveredCell, setHoveredCell]   = useState<{ day: number; slot: number } | null>(null);

  // Flatten to find top 5 peaks
  const peaks: { day: number; slot: number; value: number }[] = [];
  EXPANDED_ACTIVE_TIMES.forEach((row, di) =>
    row.forEach((val, si) => peaks.push({ day: di, slot: si, value: val }))
  );
  peaks.sort((a, b) => b.value - a.value);
  const top5 = peaks.slice(0, 5);

  // Recommended posting: top slot per day
  const recommendations = DAY_LABELS.map((dayLabel, di) => {
    const row = EXPANDED_ACTIVE_TIMES[di];
    const bestSlotIdx = row.indexOf(Math.max(...row));
    return { day: dayLabel, time: TIME_LABELS[bestSlotIdx] };
  });

  const getColor = (value: number) => {
    if (value >= 0.85) return "#10b981";
    if (value >= 0.65) return "#3b82f6";
    if (value >= 0.40) return "#8b5cf6";
    if (value >= 0.20) return "#6b7280";
    return "#374151";
  };

  const medalEmojis = ["🥇","🥈","🥉","4.","5."];

  return (
    <>
      {/* Large heatmap */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 620 }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: `56px repeat(7, 1fr)`, gap: 4, marginBottom: 4 }}>
            <div />
            {DAY_LABELS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{d}</div>
            ))}
          </div>

          {/* Rows */}
          {TIME_LABELS.map((timeLabel, si) => (
            <div key={timeLabel} style={{ display: "grid", gridTemplateColumns: `56px repeat(7, 1fr)`, gap: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>{timeLabel}</div>
              {DAY_LABELS.map((_, di) => {
                const value = EXPANDED_ACTIVE_TIMES[di][si];
                const isHovered  = hoveredCell?.day === di && hoveredCell?.slot === si;
                const isSelected = selectedCell?.day === di && selectedCell?.slot === si;
                const color = getColor(value);
                return (
                  <div
                    key={di}
                    onMouseEnter={() => setHoveredCell({ day: di, slot: si })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => setSelectedCell(isSelected ? null : { day: di, slot: si })}
                    title={`${DAY_LABELS[di]} ${timeLabel} — ${Math.round(value * 100)}% audience active`}
                    style={{
                      height: 32, borderRadius: 6,
                      background: color,
                      opacity: isHovered || isSelected ? 1 : value < 0.15 ? 0.4 : 0.7,
                      cursor: "pointer",
                      transform: isHovered || isSelected ? "scale(1.12)" : "scale(1)",
                      boxShadow: isSelected ? `0 0 10px ${color}` : isHovered ? `0 0 6px ${color}80` : "none",
                      transition: "transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease",
                      outline: isSelected ? `2px solid ${color}` : "none",
                      outlineOffset: 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected cell detail */}
      {selectedCell && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            <strong style={{ color: "#10b981" }}>{DAY_LABELS[selectedCell.day]} {TIME_LABELS[selectedCell.slot]}</strong>
            {" — "}
            {Math.round(EXPANDED_ACTIVE_TIMES[selectedCell.day][selectedCell.slot] * 100)}% audience active
            {" · "}
            ~{Math.round(EXPANDED_ACTIVE_TIMES[selectedCell.day][selectedCell.slot] * 24832).toLocaleString()} users online
          </span>
        </div>
      )}

      {/* Color scale */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Low</span>
        {["#374151","#6b7280","#8b5cf6","#3b82f6","#10b981"].map((c) => (
          <div key={c} style={{ width: 28, height: 8, borderRadius: 4, background: c, opacity: 0.7 }} />
        ))}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Peak</span>
      </div>

      {/* Peak times */}
      <SectionHeader>Peak Times</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {top5.map(({ day, slot, value }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 14, minWidth: 22 }}>{medalEmojis[i]}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", minWidth: 130 }}>{DAY_LABELS[day]} {TIME_LABELS[slot]}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${value * 100}%`, background: getColor(value), opacity: 0.8 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: getColor(value), minWidth: 40, textAlign: "right" }}>{Math.round(value * 100)}%</span>
          </div>
        ))}
      </div>

      {/* Recommended schedule */}
      <SectionHeader>Recommended Posting Schedule</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {recommendations.map(({ day, time }) => (
          <div key={day} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>{day}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.3px" }}>{time}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <InsightRow text="Your audience is most active on weekday lunchtimes (12pm) and evenings (6-8pm)." />
        <InsightRow text="Weekend activity peaks later in the afternoon — best results at 4-6pm Saturday." />
        <InsightRow text="Consider scheduling posts 30-60 minutes before peak times for maximum reach." />
      </div>
    </>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export type AudienceModalKey = "followerGrowth" | "growthAnalysis" | "demographics" | "audienceActivity";

interface SocialAudienceModalProps {
  modal: AudienceModalKey;
  days: number;
  onClose: () => void;
}

export function SocialAudienceModal({ modal, days, onClose }: SocialAudienceModalProps) {
  const totalFollowers = mockSocialAccounts.reduce((s, a) => s + a.followersCount, 0);
  const totalGained = mockSocialAccounts.reduce((s, a) =>
    s + getMetricsForPeriod(a.id, days).reduce((ss, m) => ss + m.netFollowers, 0), 0);
  const gainPct = totalFollowers > 0 ? ((totalGained / Math.max(totalFollowers - totalGained, 1)) * 100).toFixed(1) : "0";

  const configs: Record<AudienceModalKey, { title: string; subtitle: string; body: React.ReactNode }> = {
    followerGrowth: {
      title: "Follower Growth",
      subtitle: `${formatSocialNumber(totalFollowers)} total · +${formatSocialNumber(totalGained)} this period (↑ ${gainPct}%)`,
      body: <FollowerGrowthModal days={days} />,
    },
    growthAnalysis: {
      title: "Growth Analysis",
      subtitle: `+${formatSocialNumber(totalGained)} net followers`,
      body: <GrowthAnalysisModal days={days} />,
    },
    demographics: {
      title: "Audience Demographics",
      subtitle: `Based on ${formatSocialNumber(totalFollowers)} followers`,
      body: <DemographicsModal totalFollowers={totalFollowers} />,
    },
    audienceActivity: {
      title: "Audience Activity Patterns",
      subtitle: "When your audience is most active",
      body: <AudienceActivityModal />,
    },
  };

  const cfg = configs[modal];

  return (
    <ModalShell title={cfg.title} subtitle={cfg.subtitle} onClose={onClose}>
      {cfg.body}
    </ModalShell>
  );
}
