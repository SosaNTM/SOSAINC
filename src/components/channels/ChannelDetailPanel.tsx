import { X } from "lucide-react";
import { Channel, getChannelTotalRevenue, getChannelNetRevenue, getMonthLabels } from "@/lib/channelStore";
import { fmtEur, fmtEurShort } from "@/lib/financialCalculations";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";

export function ChannelDetailPanel({ channel: ch, onClose }: { channel: Channel; onClose: () => void }) {
  const totalRev = getChannelTotalRevenue(ch);
  const netRev = getChannelNetRevenue(ch);
  const commission = totalRev - netRev;
  const avgOrder = ch.orders > 0 ? totalRev / ch.orders : 0;
  const months = getMonthLabels();

  const trendData = months.map((m, i) => ({ month: m, revenue: ch.monthlyRevenue[i] || 0 }));
  const bestMonth = trendData.reduce((b, d) => d.revenue > b.revenue ? d : b, trendData[0]);
  const worstMonth = trendData.reduce((w, d) => d.revenue < w.revenue ? d : w, trendData[0]);

  const kpis = [
    { label: "Revenue", value: fmtEur(totalRev), change: "+12.3%" },
    { label: "Net Revenue", value: fmtEur(netRev), change: "+11.8%" },
    { label: "Orders", value: ch.orders.toLocaleString(), change: "+8.5%" },
    { label: "Avg Order", value: fmtEur(avgOrder), change: "+3.4%" },
    { label: "Commission", value: fmtEur(commission), sub: `${ch.commissionRate}%` },
    { label: "Margin", value: `${((netRev / totalRev) * 100).toFixed(1)}%` },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)" }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1000, width: "min(460px, 92vw)",
        background: "var(--sosa-bg-3)",
        borderLeft: "1px solid var(--sosa-border)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: "20px 24px", borderBottom: "1px solid var(--divider)", flexShrink: 0 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{ch.icon} {ch.name} — Detail</h3>
          <button type="button" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--input-bg)",
            border: "1px solid var(--glass-border)", color: "var(--text-tertiary)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 24 }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: "var(--glass-bg)", border: "1px solid var(--divider)",
                borderRadius: 14, padding: "12px 14px", textAlign: "center",
              }}>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>{k.label}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{k.value}</p>
                {k.change && <span style={{
                  fontSize: 10, fontWeight: 600, color: "#22c55e",
                }}>↗ {k.change}</span>}
                {k.sub && <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{k.sub}</span>}
              </div>
            ))}
          </div>

          {/* Monthly trend */}
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Monthly Revenue</h4>
          <div style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id={`grad-${ch.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ch.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ch.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickFormatter={v => fmtEurShort(v)} />
                <Tooltip formatter={(v: number) => fmtEur(v)} contentStyle={{
                  background: "var(--sosa-bg-3)", border: "1px solid var(--sosa-border)", borderRadius: 0, fontSize: 12,
                }} cursor={{ stroke: "var(--glass-border)", strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="revenue" stroke={ch.color} strokeWidth={2} fill={`url(#grad-${ch.id})`}
                  activeDot={{ r: 5, fill: ch.color, stroke: "var(--glass-bg-elevated)", strokeWidth: 2, style: { filter: `drop-shadow(0 0 4px ${ch.color})` } }}
                  animationDuration={800} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="space-y-2" style={{ marginBottom: 24 }}>
            {[
              { label: "Best Month", value: `${bestMonth.month} (${fmtEur(bestMonth.revenue)})` },
              { label: "Worst Month", value: `${worstMonth.month} (${fmtEur(worstMonth.revenue)})` },
              { label: "Monthly Average", value: fmtEur(totalRev / 12) },
              { label: "Commission Rate", value: `${ch.commissionRate}%` },
              { label: "Status", value: ch.status.charAt(0).toUpperCase() + ch.status.slice(1) },
            ].map(s => (
              <div key={s.label} className="flex justify-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--divider)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* View transactions link */}
          <button type="button" style={{
            display: "flex", alignItems: "center", gap: 6, color: "#4A9EFF",
            fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: "8px 0",
          }}>
            View All Transactions →
          </button>
        </div>
      </div>
    </>
  );
}
