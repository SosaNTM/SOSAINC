import { useState } from "react";
import { PlatformIcon } from "@/components/social/PlatformIcon";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  type SocialAccount,
  PLATFORM_CONFIG,
  formatSocialNumber,
  getMetricsForPeriod,
  mockSocialPosts,
} from "@/lib/socialStore";

type SortKey = "followers" | "gained" | "impressions" | "engRate" | "avgLikes" | "posts";

interface Props {
  accounts: SocialAccount[];
  days: number;
  onRowClick?: (platform: string) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ChevronsUpDown style={{ width: 11, height: 11, opacity: 0.3 }} />;
  return dir === "asc"
    ? <ChevronUp style={{ width: 11, height: 11, color: "#10b981" }} />
    : <ChevronDown style={{ width: 11, height: 11, color: "#10b981" }} />;
}

export function PlatformBreakdownTable({ accounts, days, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("followers");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const rows = accounts.map((a) => {
    const metrics      = getMetricsForPeriod(a.id, days);
    const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
    const totalEngagement  = metrics.reduce((s, m) => s + m.engagement,  0);
    const totalReach       = metrics.reduce((s, m) => s + m.reach,       0);
    const totalPosts       = metrics.reduce((s, m) => s + m.postsPublished, 0);
    const gained           = metrics.reduce((s, m) => s + m.netFollowers, 0);
    const growthPct        = a.followersCount > 0 ? ((gained / Math.max(a.followersCount - gained, 1)) * 100) : 0;
    const engRate          = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Avg likes from published posts for this platform
    const platformPosts = mockSocialPosts.filter((p) => p.platform === a.platform && p.status === "published");
    const avgLikes      = platformPosts.length > 0
      ? Math.round(platformPosts.reduce((s, p) => s + p.likes, 0) / platformPosts.length)
      : 0;

    return {
      ...a,
      totalImpressions,
      totalPosts,
      gained,
      growthPct: Number(growthPct.toFixed(1)),
      engRate:   Number(engRate.toFixed(1)),
      avgLikes,
    };
  });

  const sorted = [...rows].sort((a, b) => {
    const map: Record<SortKey, number> = {
      followers:   a.followersCount   - b.followersCount,
      gained:      a.gained           - b.gained,
      impressions: a.totalImpressions - b.totalImpressions,
      engRate:     a.engRate          - b.engRate,
      avgLikes:    a.avgLikes         - b.avgLikes,
      posts:       a.totalPosts       - b.totalPosts,
    };
    return sortDir === "desc" ? -map[sortKey] : map[sortKey];
  });

  const totalFollowers    = rows.reduce((s, r) => s + r.followersCount,    0);
  const totalGained       = rows.reduce((s, r) => s + r.gained,            0);
  const totalImpressions  = rows.reduce((s, r) => s + r.totalImpressions,  0);
  const totalPosts        = rows.reduce((s, r) => s + r.totalPosts,        0);
  const totalAvgLikes     = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.avgLikes, 0) / rows.length) : 0;
  const totalEngRate      = rows.length > 0 ? Number((rows.reduce((s, r) => s + r.engRate, 0) / rows.length).toFixed(1)) : 0;
  const totalGrowthPct    = totalFollowers > 0 ? Number(((totalGained / Math.max(totalFollowers - totalGained, 1)) * 100).toFixed(1)) : 0;

  const COLS: { label: string; key: SortKey; align: "left" | "right" }[] = [
    { label: "Followers",   key: "followers",   align: "right" },
    { label: "Growth",      key: "gained",      align: "right" },
    { label: "Impressions", key: "impressions", align: "right" },
    { label: "Eng Rate",    key: "engRate",     align: "right" },
    { label: "Avg Likes",   key: "avgLikes",    align: "right" },
    { label: "Posts",       key: "posts",       align: "right" },
  ];

  const thStyle = (key: SortKey): React.CSSProperties => ({
    textAlign: "right",
    padding: "12px 16px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.9px",
    color: sortKey === key ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    transition: "color 0.15s",
  });

  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>

      {/* Card header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>Platform Performance</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Click a row to open deep-dive analytics</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          <span>Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value as SortKey); setSortDir("desc"); }}
            style={{ padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer", outline: "none" }}
          >
            {COLS.map((c) => <option key={c.key} value={c.key} style={{ background: "#0d1117" }}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <th style={{ textAlign: "left", padding: "11px 20px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.9px", color: "rgba(255,255,255,0.22)" }}>
              Platform
            </th>
            {COLS.map((c) => (
              <th key={c.key} style={thStyle(c.key)} onClick={() => handleSort(c.key)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {c.label} <SortIcon active={sortKey === c.key} dir={sortDir} />
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sorted.map((r) => {
            const p           = PLATFORM_CONFIG[r.platform];
            const sharePct    = totalFollowers > 0 ? (r.followersCount / totalFollowers) * 100 : 0;
            const engHigh     = r.engRate >= 5;
            const growthColor = r.gained >= 0 ? "#10b981" : "#ef4444";

            return (
              <tr
                key={r.id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: onRowClick ? "pointer" : "default", transition: "background 0.15s" }}
                onClick={() => onRowClick?.(r.platform)}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
              >
                {/* Platform cell */}
                <td style={{ padding: "13px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <PlatformIcon platform={r.platform} size={20} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: p.color, marginBottom: 5 }}>{p.label}</p>
                      {/* Mini share bar */}
                      <div style={{ width: 110, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.05)" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${sharePct}%`, background: p.color, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Followers */}
                <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                  {formatSocialNumber(r.followersCount)}
                </td>

                {/* Growth */}
                <td style={{ padding: "13px 16px", textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: growthColor }}>
                    {r.gained >= 0 ? "+" : ""}{formatSocialNumber(r.gained)}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{r.growthPct}%</span>
                </td>

                {/* Impressions */}
                <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  {formatSocialNumber(r.totalImpressions)}
                </td>

                {/* Eng Rate */}
                <td style={{ padding: "13px 16px", textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: engHigh ? "#10b981" : "rgba(255,255,255,0.65)" }}>
                    {r.engRate}%
                  </span>
                  {engHigh && (
                    <span style={{ fontSize: 9, background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "1px 5px", borderRadius: 10, marginLeft: 5, fontWeight: 700 }}>↑</span>
                  )}
                </td>

                {/* Avg Likes */}
                <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  {formatSocialNumber(r.avgLikes)}
                </td>

                {/* Posts */}
                <td style={{ padding: "13px 16px", textAlign: "right", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  {r.totalPosts}
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Totals footer */}
        <tfoot>
          <tr style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <td style={{ padding: "12px 20px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.35)" }}>
              Total
            </td>
            <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
              {formatSocialNumber(totalFollowers)}
            </td>
            <td style={{ padding: "12px 16px", textAlign: "right" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>+{formatSocialNumber(totalGained)}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{totalGrowthPct}%</span>
            </td>
            <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {formatSocialNumber(totalImpressions)}
            </td>
            <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {totalEngRate}%
            </td>
            <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {formatSocialNumber(totalAvgLikes)}
            </td>
            <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {totalPosts}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
