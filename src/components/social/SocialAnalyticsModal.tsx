import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatSocialNumber } from "@/lib/socialStore";

// ── Platform metadata ──────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { emoji: string; name: string; color: string }> = {
  instagram: { emoji: "📸", name: "Instagram", color: "#e1306c" },
  linkedin:  { emoji: "💼", name: "LinkedIn",  color: "#0a66c2" },
  twitter:   { emoji: "🐦", name: "Twitter",   color: "#1d9bf0" },
  youtube:   { emoji: "🔴", name: "YouTube",   color: "#ff0000" },
  tiktok:    { emoji: "🎵", name: "TikTok",    color: "#69c9d0" },
};

// ── Deterministic data generators ─────────────────────────────────────────────

function genDaily(seed: number, base: number, amp: number, days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const v = base + (i / days) * amp * 0.4 + Math.sin(seed * 2.3 + i * 0.71) * amp * 0.6;
    return { day: `Day ${i + 1}`, value: Math.max(0, Math.round(v)) };
  });
}

function genDailyMulti(seeds: number[], bases: number[], amps: number[], keys: string[], days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const point: Record<string, any> = { day: `Day ${i + 1}` };
    keys.forEach((k, j) => {
      const v = bases[j] + (i / days) * amps[j] * 0.4 + Math.sin(seeds[j] * 2.3 + i * 0.71) * amps[j] * 0.6;
      point[k] = Math.max(0, Math.round(v * 100) / 100);
    });
    return point;
  });
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function HBar({ label, value, maxValue, color, suffix = "", index = 0 }: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  suffix?: string;
  index?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 55 + 80);
    return () => clearTimeout(t);
  }, [index]);

  const display = suffix
    ? `${value}${suffix}`
    : value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(0)}K`
    : String(value);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 8px",
        borderRadius: 8,
        background: hovered ? "rgba(255,255,255,0.025)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.6)", width: 96, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: mounted ? `${pct}%` : "0%",
            borderRadius: 3,
            background: hovered ? color : `${color}80`,
            boxShadow: hovered ? `0 0 8px ${color}40` : "none",
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", width: 56, textAlign: "right", flexShrink: 0 }}>{display}</span>
    </div>
  );
}

function PlatformRow({ platform, value, maxValue, change, changePct, index = 0, suffix = "" }: {
  platform: string;
  value: number;
  maxValue: number;
  change: number;
  changePct: number;
  index?: number;
  suffix?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const meta = PLATFORM_META[platform];
  if (!meta) return null;
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const isPos = change >= 0;
  const changeColor = isPos ? "#10b981" : "#ef4444";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const display = suffix
    ? `${value}${suffix}`
    : value >= 1000000
    ? `${(value / 1000000).toFixed(1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(0)}K`
    : String(value);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 8px",
        borderRadius: 9,
        background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 110, flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>{meta.emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{meta.name}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)", width: 68, textAlign: "right", flexShrink: 0 }}>{display}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: mounted ? `${pct}%` : "0%",
            borderRadius: 3,
            background: hovered ? meta.color : `${meta.color}70`,
            boxShadow: hovered ? `0 0 8px ${meta.color}40` : "none",
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s, box-shadow 0.2s",
          }}
        />
      </div>
      <div style={{ width: 96, textAlign: "right", flexShrink: 0 }}>
        {value > 0 ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: changeColor }}>
            {isPos ? "+" : ""}{formatSocialNumber(change)}{suffix} ({isPos ? "+" : ""}{changePct}%)
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>N/A</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>
      {title}
    </h4>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden", padding: "6px 4px" }}>
      {children}
    </div>
  );
}

function InsightRow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>💡</span>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>{text}</p>
    </div>
  );
}

// ── Tooltip style ──────────────────────────────────────────────────────────────

const tooltipContentStyle = {
  background: "rgba(8,12,24,0.97)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  fontSize: 12,
  color: "#fff",
};
const tooltipLabelStyle = { color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 4 };

// ── Per-metric modal bodies ────────────────────────────────────────────────────

function ImpressionsModal() {
  const daily = genDaily(2, 32000, 28000);
  const avg = Math.round(daily.reduce((s, d) => s + d.value, 0) / daily.length);
  const peak = daily.reduce((b, d) => d.value > b.value ? d : b, daily[0]);

  const platforms = [
    { platform: "instagram", value: 520000, change: 82000, changePct: 18.7 },
    { platform: "linkedin",  value: 380000, change: 45000, changePct: 13.4 },
    { platform: "twitter",   value: 180000, change: 28000, changePct: 18.4 },
    { platform: "youtube",   value: 89000,  change: 15000, changePct: 20.2 },
    { platform: "tiktok",    value: 45000,  change: 10000, changePct: 28.6 },
  ];
  const maxP = Math.max(...platforms.map(p => p.value));

  const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const dowValues = [38400, 45200, 42100, 48900, 52600, 31000, 22400];
  const maxDow = Math.max(...dowValues);

  return (
    <>
      {/* Main chart */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} width={48} tickFormatter={formatSocialNumber} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(v: any) => [formatSocialNumber(v as number), "Impressions"]}
          />
          <ReferenceLine y={avg} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity={0.4}
            label={{ value: `avg ${formatSocialNumber(avg)}`, position: "right", fill: "#6366f1", fontSize: 9, opacity: 0.5 }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} animationDuration={800} animationEasing="ease-out"
            fill="#6366f1" fillOpacity={0.75} />
        </BarChart>
      </ResponsiveContainer>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <SectionHeader title="By Platform" />
          <Panel>
            {platforms.map((p, i) => (
              <PlatformRow key={p.platform} platform={p.platform} value={p.value} maxValue={maxP} change={p.change} changePct={p.changePct} index={i} />
            ))}
          </Panel>
        </div>
        <div>
          <SectionHeader title="Daily Distribution (avg per weekday)" />
          <Panel>
            {DOW.map((d, i) => (
              <HBar key={d} label={d} value={dowValues[i]} maxValue={maxDow} color="#6366f1" index={i} />
            ))}
          </Panel>
        </div>
      </div>

      {/* Insights */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
        <SectionHeader title="Insights" />
        <InsightRow text={`Best day: ${peak.day} (${formatSocialNumber(peak.value)} impressions)`} />
        <InsightRow text={`Daily average: ${formatSocialNumber(avg)} impressions`} />
        <InsightRow text="Fridays consistently outperform other days by 28%" />
      </div>
    </>
  );
}

function ReachModal() {
  const daily = genDailyMulti([3, 2], [25000, 33000], [14000, 18000], ["reach", "impressions"]);
  const avgReach = Math.round(daily.reduce((s, d) => s + d.reach, 0) / daily.length);

  const platforms = [
    { platform: "instagram", value: 380000, change: 42000, changePct: 12.4 },
    { platform: "linkedin",  value: 280000, change: 30000, changePct: 12.0 },
    { platform: "twitter",   value: 130000, change: 14000, changePct: 12.1 },
    { platform: "youtube",   value: 68000,  change: 7000,  changePct: 11.5 },
    { platform: "tiktok",    value: 34000,  change: 3000,  changePct: 9.7 },
  ];
  const maxP = Math.max(...platforms.map(p => p.value));

  const ratios = [
    { platform: "instagram", ratio: 72.1 },
    { platform: "linkedin",  ratio: 68.4 },
    { platform: "twitter",   ratio: 76.2 },
    { platform: "youtube",   ratio: 60.5 },
    { platform: "tiktok",    ratio: 84.4 },
  ].sort((a, b) => b.ratio - a.ratio);
  const maxRatio = Math.max(...ratios.map(r => r.ratio));

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="reach-grad-am" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} width={48} tickFormatter={formatSocialNumber} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
            formatter={(v: any, name: string) => [formatSocialNumber(v as number), name === "reach" ? "Reach" : "Impressions"]}
          />
          <ReferenceLine y={avgReach} stroke="#8b5cf6" strokeDasharray="4 4" strokeOpacity={0.4}
            label={{ value: `avg ${formatSocialNumber(avgReach)}`, position: "right", fill: "#8b5cf6", fontSize: 9, opacity: 0.5 }} />
          <Area type="monotone" dataKey="impressions" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" dot={false}
            activeDot={{ r: 4, fill: "rgba(255,255,255,0.5)", stroke: "#0d1117", strokeWidth: 1.5 }} animationDuration={800} />
          <Area type="monotone" dataKey="reach" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#reach-grad-am)" dot={false}
            activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#0d1117", strokeWidth: 2, style: { filter: "drop-shadow(0 0 6px #8b5cf6)" } }}
            animationDuration={800} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <SectionHeader title="By Platform" />
          <Panel>
            {platforms.map((p, i) => (
              <PlatformRow key={p.platform} platform={p.platform} value={p.value} maxValue={maxP} change={p.change} changePct={p.changePct} index={i} />
            ))}
          </Panel>
        </div>
        <div>
          <SectionHeader title="Reach-to-Impression Ratio" />
          <Panel>
            {ratios.map((r, i) => {
              const meta = PLATFORM_META[r.platform];
              return (
                <HBar key={r.platform} label={meta?.name ?? r.platform} value={r.ratio} maxValue={maxRatio} color={meta?.color ?? "#8b5cf6"} suffix="%" index={i} />
              );
            })}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
        <SectionHeader title="Insights" />
        <InsightRow text="TikTok has the best reach ratio at 84.4% — highest unique audience efficiency" />
        <InsightRow text="Overall reach-to-impression ratio: 72.3% (industry avg: ~65%)" />
        <InsightRow text="YouTube has lowest ratio (60.5%) — content sees high repeat viewership" />
      </div>
    </>
  );
}

function EngagementModal() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const daily = genDailyMulti([5,6,7,8], [1200,95,180,155], [700,55,110,95], ["likes","comments","shares","saves"]);

  const types = [
    { key: "likes",    label: "❤ Likes",    color: "#f43f5e", total: 42180, change: 4680, changePct: 12.5 },
    { key: "comments", label: "💬 Comments", color: "#3b82f6", total: 3640,  change: 720,  changePct: 24.6 },
    { key: "shares",   label: "🔄 Shares",   color: "#10b981", total: 6820,  change: 880,  changePct: 14.8 },
    { key: "saves",    label: "📌 Saves",    color: "#f59e0b", total: 5780,  change: 620,  changePct: 12.0 },
  ];
  const totalEng = types.reduce((s, t) => s + t.total, 0);
  const maxType = Math.max(...types.map(t => t.total));

  const platforms = [
    { platform: "instagram", value: 32400, change: 3600, changePct: 12.5 },
    { platform: "tiktok",    value: 18200, change: 2800, changePct: 18.2 },
    { platform: "linkedin",  value: 12800, change: 1800, changePct: 16.4 },
    { platform: "twitter",   value: 8600,  change: 720,  changePct: 9.1 },
    { platform: "youtube",   value: 6420,  change: 480,  changePct: 8.1 },
  ];
  const maxP = Math.max(...platforms.map(p => p.value));

  return (
    <>
      <div style={{ marginBottom: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {types.map(t => {
          const isHidden = hidden.has(t.key);
          return (
            <button type="button"
              key={t.key}
              onClick={() => setHidden(prev => { const n = new Set(prev); isHidden ? n.delete(t.key) : n.add(t.key); return n; })}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 11, fontWeight: 600,
                color: isHidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.65)",
                background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s",
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 2, background: isHidden ? "rgba(255,255,255,0.12)" : t.color, flexShrink: 0, transition: "background 0.15s" }} />
              {t.label.replace(/^\S+ /, "")}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {types.map(t => (
              <linearGradient key={t.key} id={`eng-grad-${t.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={t.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} width={44} tickFormatter={formatSocialNumber} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
            formatter={(v: any, name: string) => {
              const t = types.find(x => x.key === name);
              return [formatSocialNumber(v as number), t?.label ?? name];
            }}
          />
          {types.map(t => (
            <Area
              key={t.key} type="monotone" dataKey={t.key} stackId="1"
              stroke={hidden.has(t.key) ? "transparent" : t.color}
              strokeWidth={1.5}
              fill={hidden.has(t.key) ? "transparent" : `url(#eng-grad-${t.key})`}
              fillOpacity={hidden.has(t.key) ? 0 : 1}
              dot={false}
              activeDot={hidden.has(t.key) ? false : { r: 4, fill: t.color, stroke: "#0d1117", strokeWidth: 2, style: { filter: `drop-shadow(0 0 5px ${t.color})` } }}
              animationDuration={800} animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <SectionHeader title="Interaction Types" />
          <Panel>
            {types.map((t, i) => (
              <HBar key={t.key} label={t.label} value={t.total} maxValue={maxType} color={t.color} index={i} />
            ))}
            <div style={{ padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 2 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>Total: {formatSocialNumber(totalEng)} interactions</span>
            </div>
          </Panel>
        </div>
        <div>
          <SectionHeader title="By Platform" />
          <Panel>
            {platforms.map((p, i) => (
              <PlatformRow key={p.platform} platform={p.platform} value={p.value} maxValue={maxP} change={p.change} changePct={p.changePct} index={i} />
            ))}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
        <SectionHeader title="Insights" />
        <InsightRow text={`Likes make up ${((types[0].total / totalEng) * 100).toFixed(0)}% of all engagement this period`} />
        <InsightRow text="Comments grew fastest at +24.6% — your content is sparking more conversation" />
        <InsightRow text="Instagram accounts for 42% of total engagement across all platforms" />
      </div>
    </>
  );
}

function EngagementRateModal() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const ENG_SEEDS: Record<string, [number, number]> = {
    tiktok:    [7, 430, 200],
    linkedin:  [6, 580, 150],
    instagram: [5, 490, 130],
    youtube:   [4, 390, 110],
    twitter:   [3, 360,  90],
  } as any;

  // Build daily multi for all platforms (values as %, e.g. 7.8)
  const daily = Array.from({ length: 30 }, (_, i) => {
    const point: Record<string, any> = { day: `Day ${i + 1}` };
    const CONFIGS: Array<[string, number, number]> = [
      ["tiktok",    7.8, 1.2],
      ["linkedin",  6.1, 0.9],
      ["instagram", 5.2, 0.8],
      ["youtube",   4.2, 0.6],
      ["twitter",   3.8, 0.5],
    ];
    CONFIGS.forEach(([platform, base, amp]) => {
      const noise = Math.sin(ENG_SEEDS[platform][0] * 2.3 + i * 0.71) * amp;
      point[platform] = Math.max(0, parseFloat((base + noise).toFixed(2)));
    });
    return point;
  });

  const platforms = [
    { platform: "tiktok",    value: 78,  color: "#69c9d0", change: 12,  changePct: 18.2 },
    { platform: "linkedin",  value: 61,  color: "#0a66c2", change: 5,   changePct: 8.9 },
    { platform: "instagram", value: 52,  color: "#e1306c", change: 8,   changePct: 18.2 },
    { platform: "youtube",   value: 42,  color: "#ff0000", change: 3,   changePct: 7.7 },
    { platform: "twitter",   value: 38,  color: "#1d9bf0", change: -1,  changePct: -2.6 },
  ];

  const contentTypes = [
    { label: "🎬 Reels",    value: 7.2, color: "#e879f9" },
    { label: "📸 Carousel", value: 5.8, color: "#a78bfa" },
    { label: "🖼 Image",    value: 4.3, color: "#6366f1" },
    { label: "📝 Text",     value: 2.4, color: "#94a3b8" },
  ];
  const maxCT = Math.max(...contentTypes.map(c => c.value));

  const PLATFORM_COLORS: Record<string, string> = {
    tiktok: "#69c9d0", linkedin: "#0a66c2", instagram: "#e1306c", youtube: "#ff0000", twitter: "#1d9bf0",
  };

  return (
    <>
      <div style={{ marginBottom: 8, display: "flex", gap: 14, flexWrap: "wrap" }}>
        {platforms.map(p => {
          const meta = PLATFORM_META[p.platform];
          const isHidden = hidden.has(p.platform);
          return (
            <button type="button"
              key={p.platform}
              onClick={() => setHidden(prev => { const n = new Set(prev); isHidden ? n.delete(p.platform) : n.add(p.platform); return n; })}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 11, fontWeight: 600,
                color: isHidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.65)",
                background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s",
              }}
            >
              <span style={{ width: 16, height: 2, borderRadius: 1, background: isHidden ? "rgba(255,255,255,0.12)" : p.color, flexShrink: 0 }} />
              {meta?.name}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} width={42} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
            formatter={(v: any, name: string) => {
              const meta = PLATFORM_META[name];
              return [`${Number(v).toFixed(1)}%`, meta?.name ?? name];
            }}
          />
          <ReferenceLine y={4.7} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4"
            label={{ value: "avg 4.7%", position: "right", fill: "rgba(255,255,255,0.25)", fontSize: 9 }} />
          {platforms.map(p => (
            <Line
              key={p.platform} type="monotone" dataKey={p.platform}
              stroke={hidden.has(p.platform) ? "transparent" : p.color}
              strokeWidth={2} dot={false}
              activeDot={hidden.has(p.platform) ? false : { r: 5, fill: p.color, stroke: "#0d1117", strokeWidth: 2, style: { filter: `drop-shadow(0 0 5px ${p.color})` } }}
              animationDuration={800} animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <SectionHeader title="By Platform (sorted by rate)" />
          <Panel>
            {platforms.map((p, i) => {
              const meta = PLATFORM_META[p.platform];
              return (
                <HBar key={p.platform} label={meta?.name ?? p.platform} value={p.value / 10} maxValue={7.8} color={p.color} suffix="%" index={i} />
              );
            })}
          </Panel>
        </div>
        <div>
          <SectionHeader title="By Content Type" />
          <Panel>
            {contentTypes.map((c, i) => (
              <HBar key={c.label} label={c.label} value={c.value} maxValue={maxCT} color={c.color} suffix="%" index={i} />
            ))}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
        <SectionHeader title="Insights" />
        <InsightRow text="TikTok leads at 7.8% — 65% above your cross-platform average" />
        <InsightRow text="Reels get 3.0× the engagement rate of text-only posts" />
        <InsightRow text="Overall engagement improved +0.8 percentage points vs prior period" />
      </div>
    </>
  );
}

function ProfileVisitsModal() {
  const daily = genDaily(9, 360, 280);
  const avg = Math.round(daily.reduce((s, d) => s + d.value, 0) / daily.length);
  const peak = daily.reduce((b, d) => d.value > b.value ? d : b, daily[0]);

  const platforms = [
    { platform: "instagram", value: 5800, change: 520, changePct: 9.8 },
    { platform: "linkedin",  value: 3400, change: 280, changePct: 9.0 },
    { platform: "twitter",   value: 1800, change: 120, changePct: 7.1 },
    { platform: "youtube",   value: 950,  change: 60,  changePct: 6.7 },
    { platform: "tiktok",    value: 500,  change: 40,  changePct: 8.7 },
  ];
  const maxP = Math.max(...platforms.map(p => p.value));

  const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const dowVals = [415, 468, 392, 502, 480, 298, 195];
  const maxDow = Math.max(...dowVals);

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pv-grad-am" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} width={44} tickFormatter={formatSocialNumber} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
            formatter={(v: any) => [formatSocialNumber(v as number), "Profile Visits"]}
          />
          <ReferenceLine y={avg} stroke="#a78bfa" strokeDasharray="4 4" strokeOpacity={0.4}
            label={{ value: `avg ${formatSocialNumber(avg)}`, position: "right", fill: "#a78bfa", fontSize: 9, opacity: 0.5 }} />
          <Area type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2.5} fill="url(#pv-grad-am)" dot={false}
            activeDot={{ r: 5, fill: "#a78bfa", stroke: "#0d1117", strokeWidth: 2, style: { filter: "drop-shadow(0 0 6px #a78bfa)" } }}
            animationDuration={800} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <SectionHeader title="By Platform" />
          <Panel>
            {platforms.map((p, i) => (
              <PlatformRow key={p.platform} platform={p.platform} value={p.value} maxValue={maxP} change={p.change} changePct={p.changePct} index={i} />
            ))}
          </Panel>
        </div>
        <div>
          <SectionHeader title="Visits by Day of Week (avg)" />
          <Panel>
            {DOW.map((d, i) => (
              <HBar key={d} label={d} value={dowVals[i]} maxValue={maxDow} color="#a78bfa" index={i} />
            ))}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
        <SectionHeader title="Insights" />
        <InsightRow text="Profile visits spike +42% on days you publish new posts" />
        <InsightRow text={`Peak day: ${peak.day} (${formatSocialNumber(peak.value)} visits) — coincides with product launch post`} />
        <InsightRow text="Instagram drives 46.6% of all profile visits across platforms" />
      </div>
    </>
  );
}

function WebsiteClicksModal() {
  const daily = genDaily(10, 88, 90);
  const avg = Math.round(daily.reduce((s, d) => s + d.value, 0) / daily.length);

  const platforms = [
    { platform: "instagram", value: 1280, change: 180, changePct: 16.4 },
    { platform: "linkedin",  value: 980,  change: 140, changePct: 16.7 },
    { platform: "twitter",   value: 520,  change: 60,  changePct: 13.0 },
    { platform: "youtube",   value: 280,  change: 25,  changePct: 9.8 },
    { platform: "tiktok",    value: 150,  change: 15,  changePct: 11.1 },
  ];
  const maxP = Math.max(...platforms.map(p => p.value));

  const ctrs = [
    { platform: "tiktok",    ctr: 0.33, color: "#69c9d0" },
    { platform: "youtube",   ctr: 0.31, color: "#ff0000" },
    { platform: "twitter",   ctr: 0.29, color: "#1d9bf0" },
    { platform: "linkedin",  ctr: 0.26, color: "#0a66c2" },
    { platform: "instagram", ctr: 0.25, color: "#e1306c" },
  ];
  const maxCtr = Math.max(...ctrs.map(c => c.ctr));

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.22)" }} axisLine={false} tickLine={false} width={40} tickFormatter={formatSocialNumber} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(v: any) => [formatSocialNumber(v as number), "Clicks"]}
          />
          <ReferenceLine y={avg} stroke="#06b6d4" strokeDasharray="4 4" strokeOpacity={0.4}
            label={{ value: `avg ${avg}`, position: "right", fill: "#06b6d4", fontSize: 9, opacity: 0.5 }} />
          <Bar dataKey="value" fill="#06b6d4" fillOpacity={0.75} radius={[3, 3, 0, 0]} animationDuration={800} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
        <div>
          <SectionHeader title="By Platform" />
          <Panel>
            {platforms.map((p, i) => (
              <PlatformRow key={p.platform} platform={p.platform} value={p.value} maxValue={maxP} change={p.change} changePct={p.changePct} index={i} />
            ))}
          </Panel>
        </div>
        <div>
          <SectionHeader title="Click-Through Rate by Platform" />
          <Panel>
            {ctrs.map((c, i) => {
              const meta = PLATFORM_META[c.platform];
              return (
                <HBar key={c.platform} label={meta?.name ?? c.platform} value={c.ctr} maxValue={maxCtr} color={c.color} suffix="%" index={i} />
              );
            })}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 9 }}>
        <SectionHeader title="Insights" />
        <InsightRow text="TikTok has the highest CTR at 0.33% — short-form video drives traffic efficiently" />
        <InsightRow text="Instagram and LinkedIn together drive 70% of total website clicks" />
        <InsightRow text="Posts with a CTA in the caption get 2.8× more clicks on average" />
      </div>
    </>
  );
}

// ── Modal shell config ─────────────────────────────────────────────────────────

interface ModalConfig {
  title: string;
  currentValue: string;
  change: string;
  changePositive: boolean;
  body: React.ReactNode;
}

function getModalConfig(metric: string): ModalConfig | null {
  switch (metric) {
    case "impressions":
      return { title: "Impressions", currentValue: "1.21M", change: "+180K (↑ 17.4%)", changePositive: true, body: <ImpressionsModal /> };
    case "reach":
      return { title: "Total Reach", currentValue: "892K", change: "+96K (↑ 12.1%)", changePositive: true, body: <ReachModal /> };
    case "engagement":
      return { title: "Total Engagement", currentValue: "58,420", change: "+6,540 (↑ 12.6%)", changePositive: true, body: <EngagementModal /> };
    case "engagementRate":
      return { title: "Engagement Rate", currentValue: "5.4%", change: "+0.8 pts (↑ 17.4%)", changePositive: true, body: <EngagementRateModal /> };
    case "profileVisits":
      return { title: "Profile Visits", currentValue: "12,450", change: "+1,020 (↑ 8.9%)", changePositive: true, body: <ProfileVisitsModal /> };
    case "websiteClicks":
      return { title: "Website Clicks", currentValue: "3,210", change: "+420 (↑ 15.0%)", changePositive: true, body: <WebsiteClicksModal /> };
    default:
      return null;
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0,
        transition: "all 0.25s ease",
        pointerEvents: "none",
        zIndex: 9999,
        background: "rgba(20,24,36,0.97)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "10px 18px",
        fontSize: 13,
        fontWeight: 600,
        color: "rgba(255,255,255,0.75)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
      }}
    >
      Period data available for Last 30 days only in demo
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

interface SocialAnalyticsModalProps {
  metric: string;
  onClose: () => void;
}

export function SocialAnalyticsModal({ metric, onClose }: SocialAnalyticsModalProps) {
  const config = getModalConfig(metric);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  if (!config) return null;

  function handlePeriodChange(v: string) {
    if (v !== "30d") {
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 500,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 501,
          width: "min(900px, 95vw)",
          maxHeight: "88vh",
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "22px 28px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.3px", marginBottom: 6 }}>
              {config.title}
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.8px", lineHeight: 1 }}>
                {config.currentValue}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: config.changePositive ? "#10b981" : "#ef4444" }}>
                {config.change}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <select
              defaultValue="30d"
              onChange={e => handlePeriodChange(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 9,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(255,255,255,0.55)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="7d"         style={{ background: "#0d1117" }}>Last 7 days</option>
              <option value="14d"        style={{ background: "#0d1117" }}>Last 14 days</option>
              <option value="30d"        style={{ background: "#0d1117" }}>Last 30 days</option>
              <option value="90d"        style={{ background: "#0d1117" }}>Last 90 days</option>
              <option value="this_month" style={{ background: "#0d1117" }}>This month</option>
            </select>
            <button type="button"
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 28px" }}>
          {config.body}
        </div>
      </div>

      <Toast visible={toastVisible} />
    </>
  );
}
