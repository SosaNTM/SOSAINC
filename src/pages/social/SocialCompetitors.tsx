import { Plus } from "lucide-react";
import { mockCompetitors, mockSocialAccounts, formatSocialNumber } from "@/lib/socialStore";
import { toast } from "@/hooks/use-toast";

export default function SocialCompetitors() {
  const us = {
    accountName: "@iconoff_official",
    followersCount: mockSocialAccounts.reduce((s, a) => s + a.followersCount, 0),
    engagementRate: 4.7,
    postsPerWeek: 12,
    growthRate: 5.3,
  };

  const allRows = [
    { ...us, displayName: "Us", isUs: true },
    ...mockCompetitors.map((c) => ({ ...c, isUs: false })),
  ];

  const betterCell = (ourVal: number, theirVal: number, higherIsBetter = true) => {
    if (higherIsBetter) return ourVal >= theirVal;
    return ourVal <= theirVal;
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Competitors</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>Benchmark your performance against competitors</p>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontWeight: 700 }}>Phase 2</span>
          <button type="button" onClick={() => toast({ title: "Add Competitor", description: "Coming in Phase 2" })} className="glass-btn flex items-center gap-2" style={{ padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            <Plus style={{ width: 16, height: 16 }} /> Add Competitor
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, overflow: "hidden" }}>
        <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--divider)" }}>
              {["", "Account", "Followers", "Eng Rate", "Posts/wk", "Growth/mo"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "14px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-quaternary)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < allRows.length - 1 ? "1px solid var(--divider)" : "none", borderLeft: row.isUs ? "3px solid var(--accent-color)" : "3px solid transparent" }}>
                <td style={{ padding: "14px 16px", fontSize: 14 }}>
                  {row.isUs ? "🏠" : i === 1 ? "🥇" : i === 2 ? "🥈" : "🥉"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: 13, fontWeight: row.isUs ? 700 : 500, color: row.isUs ? "var(--accent-color)" : "var(--text-primary)" }}>
                    {row.accountName}
                  </span>
                  {!row.isUs && (
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 2 }}>{(row as any).displayName}</p>
                  )}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatSocialNumber(row.followersCount)}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: "var(--text-primary)",
                    padding: "2px 8px", borderRadius: 6,
                    background: !row.isUs ? (betterCell(us.engagementRate, row.engagementRate) ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)") : "transparent",
                  }}>
                    {row.engagementRate}%
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-secondary)" }}>
                  {row.postsPerWeek}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>+{row.growthRate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Notes */}
      {mockCompetitors.filter((c) => c.notes).length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Notes</h2>
          <div className="space-y-2">
            {mockCompetitors.filter((c) => c.notes).map((c) => (
              <div key={c.id} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "12px 16px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{c.accountName}</span>
                <span style={{ color: "var(--text-quaternary)", margin: "0 6px" }}>·</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{c.notes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
