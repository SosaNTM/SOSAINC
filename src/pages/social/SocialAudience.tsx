import { useState } from "react";
import {
  mockSocialAccounts, getMetricsForPeriod, getDemographics,
  formatSocialNumber, PLATFORM_CONFIG,
} from "@/lib/socialStore";
import { SocialHeatmap } from "@/components/social/SocialHeatmap";
import { PlatformIcon } from "@/components/social/PlatformIcon";
import { SocialAudienceModal, type AudienceModalKey } from "@/components/social/SocialAudienceModal";
import { Expand } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

const TODAY = new Date("2026-03-05");

const PERIODS = [
  { label: "Last 7 days",  days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const GENDER_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6"];

// Audience active times: 7 days × 6 slots (Mon–Sun × 6am/9am/12pm/3pm/6pm/9pm)
// Values 0–1; higher = more active. Distinct from posting best times.
const AUDIENCE_ACTIVE_TIMES: number[][] = [
  [0.15, 0.55, 0.88, 0.65, 0.90, 0.70], // Mon
  [0.15, 0.62, 0.90, 0.72, 0.76, 0.66], // Tue
  [0.12, 0.50, 0.76, 0.88, 0.70, 0.45], // Wed
  [0.18, 0.65, 0.92, 0.70, 0.88, 0.72], // Thu
  [0.20, 0.70, 0.76, 0.76, 0.86, 0.90], // Fri
  [0.22, 0.30, 0.55, 0.88, 0.94, 0.82], // Sat
  [0.15, 0.25, 0.44, 0.82, 0.88, 0.75], // Sun
];

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,12,24,0.97)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 140 }}>
      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: i < payload.length - 1 ? 3 : 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: entry.color ?? entry.fill }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{entry.name}:</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            {typeof entry.value === "number" && Math.abs(entry.value) >= 1000
              ? formatSocialNumber(Math.abs(entry.value))
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Shared hover-card wrapper
function ClickCard({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        position: "relative",
        transition: "border-color 0.18s, box-shadow 0.18s",
        borderColor: hovered ? "rgba(255,255,255,0.12)" : undefined,
        boxShadow: hovered ? "0 0 0 1px rgba(255,255,255,0.08)" : undefined,
        ...style,
      }}
    >
      {hovered && (
        <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.45, pointerEvents: "none", zIndex: 2 }}>
          <Expand size={13} color="rgba(255,255,255,0.6)" />
        </div>
      )}
      {children}
    </div>
  );
}

export default function SocialAudience() {
  const [periodIdx, setPeriodIdx] = useState(2);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [activeModal, setActiveModal] = useState<AudienceModalKey | null>(null);

  const days = PERIODS[periodIdx].days;
  const demo = getDemographics();
  const clampedDays = Math.min(days, 90);
  const tickInterval = clampedDays <= 14 ? 1 : clampedDays <= 30 ? 4 : 9;

  const filteredAccounts = selectedPlatform === "all"
    ? mockSocialAccounts
    : mockSocialAccounts.filter((a) => a.platform === selectedPlatform);

  const activePlatform = mockSocialAccounts.find((a) => a.platform === selectedPlatform);
  const accentColor = activePlatform?.color ?? "#10b981";

  // Totals
  const totalFollowers = filteredAccounts.reduce((s, a) => s + a.followersCount, 0);
  const totalGained = filteredAccounts.reduce((s, a) => {
    return s + getMetricsForPeriod(a.id, days).reduce((ss, m) => ss + m.netFollowers, 0);
  }, 0);
  const gainPct = totalFollowers > 0
    ? ((totalGained / Math.max(totalFollowers - totalGained, 1)) * 100).toFixed(1)
    : "0";

  // Follower growth area chart with date labels
  const followerData = Array.from({ length: clampedDays }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - (clampedDays - 1 - i));
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const point: Record<string, any> = { date };
    filteredAccounts.forEach((a) => {
      const m = getMetricsForPeriod(a.id, clampedDays);
      point[a.platform] = m[i]?.followers ?? 0;
    });
    return point;
  });

  // Gained vs lost per week
  const weeksCount = Math.min(Math.ceil(days / 7), 13);
  const gainedLost = Array.from({ length: weeksCount }, (_, weekIdx) => {
    let gained = 0, lost = 0;
    filteredAccounts.forEach((a) => {
      const metrics = getMetricsForPeriod(a.id, days);
      const start = weekIdx * 7;
      const end   = Math.min(start + 7, metrics.length);
      for (let i = start; i < end; i++) {
        gained += metrics[i]?.followersGained ?? 0;
        lost   += metrics[i]?.followersLost   ?? 0;
      }
    });
    return { week: `W${weekIdx + 1}`, gained, lost: -lost };
  });

  // Net growth by platform
  const netGrowth = filteredAccounts.map((a) => {
    const net = getMetricsForPeriod(a.id, days).reduce((s, m) => s + m.netFollowers, 0);
    const p   = PLATFORM_CONFIG[a.platform];
    return { platform: p.label, net, color: a.color, platformId: a.platform };
  }).sort((a, b) => b.net - a.net);
  const maxNet = Math.max(...netGrowth.map((g) => g.net), 1);

  const maxAgePct = Math.max(...demo.age.map((a) => a.pct));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Audience</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>Follower demographics & growth analysis</p>
        </div>
        <select
          value={periodIdx}
          onChange={(e) => setPeriodIdx(Number(e.target.value))}
          style={{ padding: "8px 14px", borderRadius: 9, fontSize: 13, color: "var(--text-secondary)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", cursor: "pointer", outline: "none" }}
        >
          {PERIODS.map((p, i) => <option key={i} value={i} style={{ background: "#0d1117" }}>{p.label}</option>)}
        </select>
      </div>

      {/* Platform filter tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 28, padding: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12 }}>
        <button type="button"
          onClick={() => setSelectedPlatform("all")}
          style={{ padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: selectedPlatform === "all" ? "rgba(255,255,255,0.08)" : "transparent", border: "none", color: selectedPlatform === "all" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s" }}
        >
          All
        </button>
        {mockSocialAccounts.map((a) => {
          const p      = PLATFORM_CONFIG[a.platform];
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

      {/* ── Follower Growth ── */}
      <ClickCard onClick={() => setActiveModal("followerGrowth")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Follower Growth</p>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              Total:{" "}
              <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{formatSocialNumber(totalFollowers)}</span>
              <span
                onClick={(e) => { e.stopPropagation(); setActiveModal("growthAnalysis"); }}
                style={{ color: "#10b981", marginLeft: 8, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textDecorationColor: "rgba(16,185,129,0.4)" }}
              >
                +{formatSocialNumber(totalGained)} ({gainPct}%)
              </span>
            </p>
            {/* Inline legend */}
            <div style={{ display: "flex", gap: 10 }}>
              {filteredAccounts.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 12, height: 2, borderRadius: 1, background: a.color }} />
                  <PlatformIcon platform={a.platform} size={12} style={{ opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={followerData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                {filteredAccounts.map((a) => (
                  <linearGradient key={a.id} id={`aud-grad-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={a.color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={a.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} interval={tickInterval} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} width={50} tickFormatter={formatSocialNumber} />
              <Tooltip content={<GlassTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }} />
              {filteredAccounts.map((a) => (
                <Area
                  key={a.id}
                  type="monotone"
                  dataKey={a.platform}
                  stroke={a.color}
                  fill={`url(#aud-grad-${a.id})`}
                  strokeWidth={1.5}
                  dot={false}
                  stackId="1"
                  name={PLATFORM_CONFIG[a.platform].label}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ClickCard>

      {/* ── Growth breakdown 2-col ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Gained vs Lost */}
        <ClickCard onClick={() => setActiveModal("growthAnalysis")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Gained vs Lost</p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gainedLost} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => String(Math.abs(v))} />
                <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="gained" name="Gained" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="lost"   name="Lost"   fill="#ef4444" radius={[0, 0, 4, 4]} animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {gainedLost.map((w) => (
              <span key={w.week} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                {w.week}:{" "}
                <span style={{ color: "#10b981", fontWeight: 600 }}>+{w.gained}</span>
                {" / "}
                <span style={{ color: "#ef4444", fontWeight: 600 }}>{w.lost}</span>
              </span>
            ))}
          </div>
        </ClickCard>

        {/* Net growth by platform */}
        <ClickCard onClick={() => setActiveModal("growthAnalysis")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>Net Growth by Platform</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {netGrowth.map((g) => (
              <div key={g.platform}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                    <PlatformIcon platform={g.platformId} size={16} />
                    {g.platform}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: g.net >= 0 ? "#10b981" : "#ef4444" }}>
                    {g.net >= 0 ? "+" : ""}{formatSocialNumber(g.net)}
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: `${(g.net / maxNet) * 100}%`, background: g.color, opacity: 0.75, transition: "width 0.5s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </ClickCard>
      </div>

      {/* ── Demographics 3-col ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Age Distribution */}
        <ClickCard onClick={() => setActiveModal("demographics")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>Age Distribution</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {demo.age.map((a) => {
              const isTop = a.pct === maxAgePct;
              return (
                <div key={a.range}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: isTop ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.5)", fontWeight: isTop ? 700 : 400 }}>
                      {a.range}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isTop ? accentColor : "rgba(255,255,255,0.55)" }}>
                      {a.pct}%
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.04)" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${a.pct}%`,
                      background: isTop ? accentColor : "rgba(255,255,255,0.1)",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ClickCard>

        {/* Gender Donut */}
        <ClickCard onClick={() => setActiveModal("demographics")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Gender</p>
          <div style={{ position: "relative", height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demo.gender}
                  dataKey="pct"
                  nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={66}
                  paddingAngle={3}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {demo.gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.5px" }}>
                {formatSocialNumber(totalFollowers)}
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                followers
              </span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 10 }}>
            {demo.gender.map((g, i) => (
              <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: GENDER_COLORS[i] }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  {g.label}{" "}
                  <strong style={{ color: "rgba(255,255,255,0.75)" }}>{g.pct}%</strong>
                </span>
              </div>
            ))}
          </div>
        </ClickCard>

        {/* Top Locations */}
        <ClickCard onClick={() => setActiveModal("demographics")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>Top Locations</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {demo.locations.map((l, i) => (
              <div key={l.city} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, width: 14, flexShrink: 0, textAlign: "right",
                  color: i < 3 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)",
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{
                      fontSize: i < 3 ? 12 : 11,
                      fontWeight: i < 3 ? 600 : 400,
                      color: i < 3 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)",
                    }}>
                      {l.city}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: i < 3 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)" }}>
                      {l.pct}%
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.04)" }}>
                    <div style={{
                      height: "100%", borderRadius: 2,
                      width: `${(l.pct / demo.locations[0].pct) * 100}%`,
                      background: i < 3 ? accentColor : "rgba(255,255,255,0.09)",
                      opacity: i < 3 ? 0.65 : 1,
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ClickCard>
      </div>

      {/* ── Audience Active Times ── */}
      <ClickCard onClick={() => setActiveModal("audienceActivity")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>When Your Audience Is Most Active</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
            Based on follower activity patterns — use this to time your posts
          </p>
        </div>
        <SocialHeatmap data={AUDIENCE_ACTIVE_TIMES} accentColor="#3b82f6" />
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 14, textAlign: "center" }}>
          Peak:{" "}
          <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Weekdays 12pm & 6pm</span>
          {" · "}
          <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Weekends 3–6pm</span>
        </p>
      </ClickCard>

      {activeModal && (
        <SocialAudienceModal
          modal={activeModal}
          days={days}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
