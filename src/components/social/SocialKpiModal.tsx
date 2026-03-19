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

// ── Deterministic daily data generator ────────────────────────────────────────

function genDailyData(seed: number, base: number, amplitude: number, days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const noise = Math.sin(seed * 2.3 + i * 0.71) * amplitude;
    const trend = base + (i / days) * amplitude * 0.5;
    return {
      day: `Day ${i + 1}`,
      value: Math.max(0, Math.round((trend + noise) * 100) / 100),
    };
  });
}

// ── KPI config ─────────────────────────────────────────────────────────────────

type ChartType = "area" | "bar" | "line";

interface PlatformBreakdown {
  platform: string;
  value: number;
  formattedValue: string;
  change: number;
  changePct: number;
}

interface KpiConfig {
  title: string;
  currentValue: string;
  change: string;
  changePositive: boolean;
  chartType: ChartType;
  chartColor: string;
  chartData: { day: string; value: number }[];
  average: number;
  averageLabel?: string;
  platforms: PlatformBreakdown[];
  insights: string[];
}

function buildKpiConfigs(): Record<string, KpiConfig> {
  return {
    followers: {
      title: "Total Followers",
      currentValue: "24,832",
      change: "+1,247 (↑ 5.3%)",
      changePositive: true,
      chartType: "area",
      chartColor: "#10b981",
      chartData: genDailyData(1, 23200, 1600),
      average: 24100,
      platforms: [
        { platform: "instagram", value: 12450, formattedValue: "12,450", change: 580, changePct: 4.9 },
        { platform: "linkedin",  value: 8320,  formattedValue: "8,320",  change: 340, changePct: 4.3 },
        { platform: "twitter",   value: 2180,  formattedValue: "2,180",  change: 210, changePct: 10.7 },
        { platform: "youtube",   value: 1240,  formattedValue: "1,240",  change: 95,  changePct: 8.3 },
        { platform: "tiktok",    value: 642,   formattedValue: "642",    change: 22,  changePct: 3.5 },
      ],
      insights: [
        "Instagram holds 50.1% of your total audience",
        "Twitter is growing fastest at +10.7% this period",
        "You gained 1,247 net followers across all platforms",
      ],
    },
    impressions: {
      title: "Total Impressions",
      currentValue: "1.21M",
      change: "+180K (↑ 17.4%)",
      changePositive: true,
      chartType: "bar",
      chartColor: "#6366f1",
      chartData: genDailyData(2, 32000, 20000),
      average: 40362,
      platforms: [
        { platform: "instagram", value: 520000, formattedValue: "520K", change: 82000, changePct: 18.7 },
        { platform: "linkedin",  value: 380000, formattedValue: "380K", change: 45000, changePct: 13.4 },
        { platform: "twitter",   value: 180000, formattedValue: "180K", change: 28000, changePct: 18.4 },
        { platform: "youtube",   value: 89000,  formattedValue: "89K",  change: 15000, changePct: 20.2 },
        { platform: "tiktok",    value: 45000,  formattedValue: "45K",  change: 10000, changePct: 28.6 },
      ],
      insights: [
        "Your best day was Mar 12 with 68,200 impressions",
        "TikTok impressions grew fastest at +28.6%",
        "Average daily impressions: 41,152",
      ],
    },
    reach: {
      title: "Total Reach",
      currentValue: "892K",
      change: "+96K (↑ 12.1%)",
      changePositive: true,
      chartType: "area",
      chartColor: "#3b82f6",
      chartData: genDailyData(3, 25000, 16000),
      average: 29733,
      platforms: [
        { platform: "instagram", value: 380000, formattedValue: "380K", change: 42000, changePct: 12.4 },
        { platform: "linkedin",  value: 280000, formattedValue: "280K", change: 30000, changePct: 12.0 },
        { platform: "twitter",   value: 130000, formattedValue: "130K", change: 14000, changePct: 12.1 },
        { platform: "youtube",   value: 68000,  formattedValue: "68K",  change: 7000,  changePct: 11.5 },
        { platform: "tiktok",    value: 34000,  formattedValue: "34K",  change: 3000,  changePct: 9.7 },
      ],
      insights: [
        "You reached 892K unique people this period",
        "Reach-to-impression ratio: 72.3% (healthy)",
        "Peak reach day: Mar 1 (42,100 people)",
      ],
    },
    posts: {
      title: "Posts Published",
      currentValue: "64",
      change: "+16 (↑ 33.3%)",
      changePositive: true,
      chartType: "bar",
      chartColor: "#e879f9",
      chartData: genDailyData(4, 1, 3),
      average: 2.1,
      averageLabel: "2.1 avg/day",
      platforms: [
        { platform: "twitter",   value: 22, formattedValue: "22", change: 6, changePct: 37.5 },
        { platform: "instagram", value: 18, formattedValue: "18", change: 4, changePct: 28.6 },
        { platform: "linkedin",  value: 12, formattedValue: "12", change: 2, changePct: 20.0 },
        { platform: "tiktok",    value: 8,  formattedValue: "8",  change: 3, changePct: 60.0 },
        { platform: "youtube",   value: 4,  formattedValue: "4",  change: 1, changePct: 33.3 },
      ],
      insights: [
        "You posted 64 times across all platforms",
        "Twitter had the most posts this period (22)",
        "Most active day: Tuesdays (avg 2.8 posts)",
      ],
    },
    likes: {
      title: "Avg. Likes per Post",
      currentValue: "843",
      change: "+94 (↑ 11.8%)",
      changePositive: true,
      chartType: "line",
      chartColor: "#f43f5e",
      chartData: genDailyData(5, 760, 220),
      average: 843,
      platforms: [
        { platform: "instagram", value: 1040, formattedValue: "1,040", change: 120, changePct: 13.0 },
        { platform: "linkedin",  value: 742,  formattedValue: "742",   change: 88,  changePct: 13.5 },
        { platform: "tiktok",    value: 580,  formattedValue: "580",   change: 45,  changePct: 8.4 },
        { platform: "twitter",   value: 420,  formattedValue: "420",   change: 32,  changePct: 8.2 },
        { platform: "youtube",   value: 340,  formattedValue: "340",   change: 18,  changePct: 5.6 },
      ],
      insights: [
        "Instagram gets the most likes per post (1,040)",
        "Likes per post increased 11.8% vs previous period",
        "Carousel posts get 2.1\u00d7 more likes than single images",
      ],
    },
    comments: {
      title: "Avg. Comments per Post",
      currentValue: "72",
      change: "+15 (↑ 24.1%)",
      changePositive: true,
      chartType: "line",
      chartColor: "#3b82f6",
      chartData: genDailyData(6, 58, 30),
      average: 72,
      platforms: [
        { platform: "linkedin",  value: 124, formattedValue: "124", change: 28, changePct: 29.2 },
        { platform: "instagram", value: 89,  formattedValue: "89",  change: 12, changePct: 15.6 },
        { platform: "youtube",   value: 67,  formattedValue: "67",  change: 8,  changePct: 13.6 },
        { platform: "tiktok",    value: 42,  formattedValue: "42",  change: 4,  changePct: 10.5 },
        { platform: "twitter",   value: 38,  formattedValue: "38",  change: 5,  changePct: 15.2 },
      ],
      insights: [
        "LinkedIn drives the most comments per post (124)",
        "Comments grew 24.1% — your content is sparking more conversation",
        "Posts with questions get 3.2\u00d7 more comments",
      ],
    },
    engagementRate: {
      title: "Engagement Rate",
      currentValue: "5.4%",
      change: "+0.8 pts (↑ 17.4%)",
      changePositive: true,
      chartType: "line",
      chartColor: "#f59e0b",
      chartData: genDailyData(7, 430, 150).map(d => ({ ...d, value: parseFloat((d.value / 100).toFixed(2)) })),
      average: 4.7,
      averageLabel: "4.7% avg",
      platforms: [
        { platform: "tiktok",    value: 78, formattedValue: "7.8%", change: 12,  changePct: 18.2 },
        { platform: "linkedin",  value: 61, formattedValue: "6.1%", change: 5,   changePct: 8.9 },
        { platform: "instagram", value: 52, formattedValue: "5.2%", change: 8,   changePct: 18.2 },
        { platform: "youtube",   value: 42, formattedValue: "4.2%", change: 3,   changePct: 7.7 },
        { platform: "twitter",   value: 38, formattedValue: "3.8%", change: -1,  changePct: -2.6 },
      ],
      insights: [
        "TikTok has the highest engagement rate (7.8%)",
        "Overall engagement improved +0.8 percentage points",
        "Video content drives 2.4\u00d7 higher engagement than images",
      ],
    },
    shares: {
      title: "Avg. Shares per Post",
      currentValue: "168",
      change: "+28 (↑ 19.6%)",
      changePositive: true,
      chartType: "line",
      chartColor: "#10b981",
      chartData: genDailyData(8, 130, 75),
      average: 168,
      platforms: [
        { platform: "twitter",   value: 380, formattedValue: "380", change: 65, changePct: 20.6 },
        { platform: "tiktok",    value: 210, formattedValue: "210", change: 35, changePct: 20.0 },
        { platform: "instagram", value: 156, formattedValue: "156", change: 18, changePct: 13.0 },
        { platform: "linkedin",  value: 67,  formattedValue: "67",  change: 8,  changePct: 13.6 },
        { platform: "youtube",   value: 28,  formattedValue: "28",  change: 3,  changePct: 12.0 },
      ],
      insights: [
        "Twitter drives the most shares/retweets (380 avg)",
        "Thread-format posts get 4.1\u00d7 more shares on Twitter",
        "Shares grew 19.6% — your content is becoming more shareable",
      ],
    },
    profileVisits: {
      title: "Profile Visits",
      currentValue: "12,450",
      change: "+1,020 (↑ 8.9%)",
      changePositive: true,
      chartType: "area",
      chartColor: "#a78bfa",
      chartData: genDailyData(9, 360, 180),
      average: 415,
      platforms: [
        { platform: "instagram", value: 5800, formattedValue: "5,800", change: 520, changePct: 9.8 },
        { platform: "linkedin",  value: 3400, formattedValue: "3,400", change: 280, changePct: 9.0 },
        { platform: "twitter",   value: 1800, formattedValue: "1,800", change: 120, changePct: 7.1 },
        { platform: "youtube",   value: 950,  formattedValue: "950",   change: 60,  changePct: 6.7 },
        { platform: "tiktok",    value: 500,  formattedValue: "500",   change: 40,  changePct: 8.7 },
      ],
      insights: [
        "Instagram drives 46.6% of all profile visits",
        "Profile visits spike on days you post (avg +42%)",
        "Peak day: Mar 1 (892 visits) — coincides with product launch post",
      ],
    },
    websiteClicks: {
      title: "Website Clicks",
      currentValue: "3,210",
      change: "+420 (↑ 15.0%)",
      changePositive: true,
      chartType: "bar",
      chartColor: "#06b6d4",
      chartData: genDailyData(10, 88, 65),
      average: 107,
      platforms: [
        { platform: "instagram", value: 1280, formattedValue: "1,280", change: 180, changePct: 16.4 },
        { platform: "linkedin",  value: 980,  formattedValue: "980",   change: 140, changePct: 16.7 },
        { platform: "twitter",   value: 520,  formattedValue: "520",   change: 60,  changePct: 13.0 },
        { platform: "youtube",   value: 280,  formattedValue: "280",   change: 25,  changePct: 9.8 },
        { platform: "tiktok",    value: 150,  formattedValue: "150",   change: 15,  changePct: 11.1 },
      ],
      insights: [
        "Instagram and LinkedIn drive 70% of website clicks",
        "Posts with CTA in caption get 2.8\u00d7 more clicks",
        "Website click-through rate: 0.26% of total impressions",
      ],
    },
    saves: {
      title: "Avg. Saves per Post",
      currentValue: "275",
      change: "+60 (↑ 21.9%)",
      changePositive: true,
      chartType: "line",
      chartColor: "#f59e0b",
      chartData: genDailyData(11, 210, 110),
      average: 275,
      platforms: [
        { platform: "instagram", value: 320, formattedValue: "320", change: 48, changePct: 17.6 },
        { platform: "tiktok",    value: 95,  formattedValue: "95",  change: 12, changePct: 14.5 },
        { platform: "linkedin",  value: 95,  formattedValue: "95",  change: 10, changePct: 11.8 },
        { platform: "twitter",   value: 45,  formattedValue: "45",  change: 5,  changePct: 12.5 },
        { platform: "youtube",   value: 0,   formattedValue: "N/A", change: 0,  changePct: 0 },
      ],
      insights: [
        "Instagram drives 68% of all saves",
        "Educational/how-to content gets 3.5\u00d7 more saves",
        "Saves grew 21.9% — your content has high bookmark value",
      ],
    },
  };
}

// ── Platform Breakdown Row ─────────────────────────────────────────────────────

function PlatformBreakdownRow({
  item,
  maxValue,
  index,
  isEngRate,
}: {
  item: PlatformBreakdown;
  maxValue: number;
  index: number;
  isEngRate: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const meta = PLATFORM_META[item.platform];
  if (!meta) return null;

  const barPct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  const changeColor = item.change > 0 ? "#10b981" : item.change < 0 ? "#ef4444" : "rgba(255,255,255,0.3)";
  const changePrefix = item.change > 0 ? "+" : "";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 10,
        background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
        transition: "background 0.15s ease",
        cursor: "default",
      }}
    >
      {/* Platform icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 120, flexShrink: 0 }}>
        <span style={{ fontSize: 15 }}>{meta.emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{meta.name}</span>
      </div>

      {/* Value */}
      <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", width: 80, textAlign: "right", flexShrink: 0 }}>
        {item.formattedValue}
      </span>

      {/* Bar */}
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: mounted ? `${barPct}%` : "0%",
            borderRadius: 3,
            background: hovered ? meta.color : `${meta.color}80`,
            boxShadow: hovered ? `0 0 8px ${meta.color}40` : "none",
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease, box-shadow 0.2s ease",
          }}
        />
      </div>

      {/* Change */}
      <div style={{ width: 110, textAlign: "right", flexShrink: 0 }}>
        {item.value > 0 ? (
          <>
            <span style={{ fontSize: 12, fontWeight: 600, color: changeColor }}>
              {changePrefix}{isEngRate ? (item.change / 10).toFixed(1) + " pts" : formatSocialNumber(item.change)}
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>
              ({item.changePct > 0 ? "+" : ""}{item.changePct}%)
            </span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>N/A</span>
        )}
      </div>
    </div>
  );
}

// ── Main chart inside the modal ────────────────────────────────────────────────

function ModalChart({
  chartType,
  chartData,
  chartColor,
  average,
  averageLabel,
  isEngRate,
}: {
  chartType: ChartType;
  chartData: { day: string; value: number }[];
  chartColor: string;
  average: number;
  averageLabel?: string;
  isEngRate?: boolean;
}) {
  const gradId = `modal-grad-${chartColor.replace("#", "")}`;
  const tickFmt = isEngRate
    ? (v: number) => `${v.toFixed(1)}%`
    : (v: number) => formatSocialNumber(v);
  const tooltipFmt = (v: number) =>
    isEngRate ? `${v.toFixed(2)}%` : formatSocialNumber(v);

  const tooltipStyle = {
    contentStyle: {
      background: "rgba(8,12,24,0.97)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      fontSize: 12,
      color: "#fff",
    },
    labelStyle: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 4 },
    itemStyle: { color: chartColor, fontWeight: 700 },
  };

  const axisProps = {
    xAxis: {
      dataKey: "day",
      tick: { fontSize: 10, fill: "rgba(255,255,255,0.25)" },
      axisLine: { stroke: "rgba(255,255,255,0.06)" },
      tickLine: false as const,
      interval: 4 as number,
    },
    yAxis: {
      tick: { fontSize: 10, fill: "rgba(255,255,255,0.25)" },
      axisLine: false as const,
      tickLine: false as const,
      width: 52,
      tickFormatter: tickFmt,
    },
  };

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis {...axisProps.xAxis} />
          <YAxis {...axisProps.yAxis} />
          <Tooltip
            {...tooltipStyle}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
            formatter={(v: any) => [tooltipFmt(v as number), "Value"]}
          />
          <ReferenceLine
            y={average}
            stroke={chartColor}
            strokeDasharray="4 4"
            strokeOpacity={0.35}
            label={{ value: averageLabel ?? `avg ${formatSocialNumber(average)}`, position: "right", fill: chartColor, fontSize: 9, opacity: 0.5 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 5, fill: chartColor, stroke: "#0d1117", strokeWidth: 2, style: { filter: `drop-shadow(0 0 6px ${chartColor})` } }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis {...axisProps.xAxis} />
          <YAxis {...axisProps.yAxis} />
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            formatter={(v: any) => [tooltipFmt(v as number), "Value"]}
          />
          <ReferenceLine
            y={average}
            stroke={chartColor}
            strokeDasharray="4 4"
            strokeOpacity={0.35}
            label={{ value: averageLabel ?? `avg ${formatSocialNumber(average)}`, position: "right", fill: chartColor, fontSize: 9, opacity: 0.5 }}
          />
          <Bar
            dataKey="value"
            fill={chartColor}
            fillOpacity={0.75}
            radius={[3, 3, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // line
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis {...axisProps.xAxis} />
        <YAxis {...axisProps.yAxis} />
        <Tooltip
          {...tooltipStyle}
          cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
          formatter={(v: any) => [tooltipFmt(v as number), "Value"]}
        />
        <ReferenceLine
          y={average}
          stroke={chartColor}
          strokeDasharray="4 4"
          strokeOpacity={0.35}
          label={{ value: averageLabel ?? `avg ${formatSocialNumber(average)}`, position: "right", fill: chartColor, fontSize: 9, opacity: 0.5 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={chartColor}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: chartColor, stroke: "#0d1117", strokeWidth: 2, style: { filter: `drop-shadow(0 0 6px ${chartColor})` } }}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
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

interface SocialKpiModalProps {
  metric: string;
  onClose: () => void;
}

export function SocialKpiModal({ metric, onClose }: SocialKpiModalProps) {
  const configs = buildKpiConfigs();
  const config = configs[metric];
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  if (!config) return null;

  const maxPlatformValue = Math.max(...config.platforms.map(p => p.value));
  const isEngRate = metric === "engagementRate";

  function handlePeriodChange(v: string) {
    if (v !== "30d") {
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 2500);
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
        <div
          style={{
            padding: "22px 28px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
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
              <option value="7d"  style={{ background: "#0d1117" }}>Last 7 days</option>
              <option value="14d" style={{ background: "#0d1117" }}>Last 14 days</option>
              <option value="30d" style={{ background: "#0d1117" }}>Last 30 days</option>
              <option value="90d" style={{ background: "#0d1117" }}>Last 90 days</option>
              <option value="this_month" style={{ background: "#0d1117" }}>This month</option>
            </select>
            <button type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 28px" }}>

          {/* Main chart */}
          <ModalChart
            chartType={config.chartType}
            chartData={config.chartData}
            chartColor={config.chartColor}
            average={config.average}
            averageLabel={config.averageLabel}
            isEngRate={isEngRate}
          />

          {/* Platform breakdown */}
          <div style={{ marginTop: 28 }}>
            <h4
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "rgba(255,255,255,0.25)",
                marginBottom: 8,
              }}
            >
              Breakdown by Platform
            </h4>
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
              {/* Column headers */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "7px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <span style={{ width: 120, flexShrink: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Platform</span>
                <span style={{ width: 80, textAlign: "right", flexShrink: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Value</span>
                <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.8px", paddingLeft: 12 }}>Share</span>
                <span style={{ width: 110, textAlign: "right", flexShrink: 0, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Change</span>
              </div>
              {config.platforms.map((item, i) => (
                <div key={item.platform} style={{ borderBottom: i < config.platforms.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <PlatformBreakdownRow
                    item={item}
                    maxValue={maxPlatformValue}
                    index={i}
                    isEngRate={isEngRate}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <h4
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "rgba(255,255,255,0.25)",
                marginBottom: 14,
              }}
            >
              Insights
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {config.insights.map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>💡</span>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Toast visible={toastVisible} />
    </>
  );
}
