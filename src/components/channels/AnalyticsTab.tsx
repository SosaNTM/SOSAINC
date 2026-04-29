import { useMemo, useState } from "react";
import { useChannels, getChannelTotalRevenue, getChannelNetRevenue, Channel } from "@/lib/channelStore";
import { fmtEur, fmtEurShort } from "@/lib/financialCalculations";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ChannelDetailPanel } from "./ChannelDetailPanel";

/* â”€â”€ KPI Card â”€â”€ */
function KpiCard({ ch, onClick }: { ch: Channel; onClick: () => void }) {
  const total = getChannelTotalRevenue(ch);
  const h1 = ch.monthlyRevenue.slice(0, 6).reduce((s, v) => s + v, 0);
  const h2 = ch.monthlyRevenue.slice(6).reduce((s, v) => s + v, 0);
  const change = h1 > 0 ? ((h2 - h1) / h1) * 100 : 0;

  return (
    <div onClick={onClick} style={{
      background: "var(--sosa-bg-2)", border: "1px solid var(--glass-border)",
      borderRadius: 0, padding: "16px 18px", cursor: "pointer",
      borderLeft: `3px solid ${ch.color}`, transition: "all 0.2s",
      flex: "1 1 180px", minWidth: 160,
      boxShadow: "var(--glass-shadow)",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = ""; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--glass-shadow)"; }}
    >
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{ch.icon} {ch.name}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{fmtEurShort(total)}</p>
      <div className="flex items-center gap-3" style={{ marginTop: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "1px 8px", borderRadius: 20,
          background: change >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: change >= 0 ? "#22c55e" : "#ef4444",
        }}>
          {change >= 0 ? "â†—" : "â†˜"} {change >= 0 ? "+" : ""}{change.toFixed(0)}%
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{ch.orders} orders</span>
      </div>
    </div>
  );
}

// NOTE: Custom tooltip â€” too specialized for GlassTooltip (multi-field layout: revenue, margin, orders)
function GlassTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "var(--sosa-bg-3)", border: "1px solid var(--sosa-border)",
      borderRadius: 0, padding: "10px 14px",
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{d.name}</p>
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Revenue: {fmtEur(d.revenue)}</p>
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Margin: {d.margin.toFixed(1)}%</p>
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Orders: {d.orders}</p>
    </div>
  );
}

/* â”€â”€ ANALYTICS TAB â”€â”€ */
export function AnalyticsTab() {
  const channels = useChannels();
  const [detailChannel, setDetailChannel] = useState<Channel | null>(null);
  const [sortKey, setSortKey] = useState<"net" | "revenue" | "margin" | "orders">("net");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const tableData = useMemo(() => {
    const data = channels.map(c => {
      const rev = getChannelTotalRevenue(c);
      const net = getChannelNetRevenue(c);
      const h1 = c.monthlyRevenue.slice(0, 6).reduce((s, v) => s + v, 0);
      const h2 = c.monthlyRevenue.slice(6).reduce((s, v) => s + v, 0);
      return { ch: c, revenue: rev, net, margin: rev > 0 ? (net / rev) * 100 : 0, orders: c.orders, change: h1 > 0 ? ((h2 - h1) / h1) * 100 : 0 };
    });
    const sorters: Record<string, (a: typeof data[0], b: typeof data[0]) => number> = {
      net: (a, b) => a.net - b.net,
      revenue: (a, b) => a.revenue - b.revenue,
      margin: (a, b) => a.margin - b.margin,
      orders: (a, b) => a.orders - b.orders,
    };
    data.sort(sorters[sortKey]);
    if (sortDir === "desc") data.reverse();
    return data;
  }, [channels, sortKey, sortDir]);

  // Scatter data
  const scatterData = useMemo(() => channels.map(c => {
    const rev = getChannelTotalRevenue(c);
    const net = getChannelNetRevenue(c);
    return { name: c.name, revenue: rev, margin: rev > 0 ? (net / rev) * 100 : 0, orders: c.orders, color: c.color, ch: c };
  }), [channels]);

  const headerStyle = (key: typeof sortKey): React.CSSProperties => ({
    padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)",
    textAlign: key === "revenue" || key === "net" || key === "margin" || key === "orders" ? "right" : "left",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
  });

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="flex flex-wrap gap-4">
        {channels.map(c => <KpiCard key={c.id} ch={c} onClick={() => setDetailChannel(c)} />)}
      </div>

      {/* Ranking Table */}
      <div style={{
        background: "var(--sosa-bg-2)", border: "1px solid var(--glass-border)",
        borderRadius: 0, overflow: "hidden",
        boxShadow: "var(--glass-shadow)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", padding: "18px 20px 0" }}>Performance Ranking</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--divider)" }}>
                <th style={{ ...headerStyle("net"), textAlign: "left", width: 40 }}>#</th>
                <th style={{ ...headerStyle("net"), textAlign: "left" }}>Channel</th>
                <th onClick={() => toggleSort("revenue")} style={headerStyle("revenue")}>
                  Revenue {sortKey === "revenue" ? (sortDir === "desc" ? "â†“" : "â†‘") : ""}
                </th>
                <th onClick={() => toggleSort("net")} style={headerStyle("net")}>
                  Net Rev. {sortKey === "net" ? (sortDir === "desc" ? "â†“" : "â†‘") : ""}
                </th>
                <th onClick={() => toggleSort("margin")} style={headerStyle("margin")}>
                  Margin {sortKey === "margin" ? (sortDir === "desc" ? "â†“" : "â†‘") : ""}
                </th>
                <th onClick={() => toggleSort("orders")} style={headerStyle("orders")}>
                  Orders {sortKey === "orders" ? (sortDir === "desc" ? "â†“" : "â†‘") : ""}
                </th>
                <th style={{ ...headerStyle("net"), textAlign: "right" }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((d, i) => (
                <tr key={d.ch.id} onClick={() => setDetailChannel(d.ch)} style={{
                  borderBottom: "1px solid var(--divider)", cursor: "pointer", transition: "background 0.15s",
                  background: i === 0 ? "rgba(74, 158, 255, 0.06)" : "transparent",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = i === 0 ? "rgba(74, 158, 255, 0.06)" : "transparent"}
                >
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "var(--text-tertiary)" }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.ch.color }} />
                      {d.ch.icon} {d.ch.name}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "right" }}>{fmtEur(d.revenue)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textAlign: "right" }}>{fmtEur(d.net)}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, textAlign: "right", color: d.margin > 90 ? "#22c55e" : "var(--text-primary)" }}>{d.margin.toFixed(1)}%</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-secondary)", textAlign: "right" }}>{d.orders.toLocaleString()}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: d.change >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: d.change >= 0 ? "#22c55e" : "#ef4444",
                    }}>
                      {d.change >= 0 ? "â†—" : "â†˜"} {d.change >= 0 ? "+" : ""}{d.change.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profitability Scatter */}
      <div style={{
        background: "var(--sosa-bg-2)", border: "1px solid var(--glass-border)",
        borderRadius: 0, padding: 20,
        boxShadow: "var(--glass-shadow)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Profitability Matrix</h3>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: -10, marginBottom: 16 }}>
          X = Revenue volume Â· Y = Net margin % Â· Bubble size = Orders
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis type="number" dataKey="revenue" name="Revenue" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={v => fmtEurShort(v)} />
            <YAxis type="number" dataKey="margin" name="Margin" unit="%" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} domain={[80, 100]} />
            <ZAxis type="number" dataKey="orders" range={[200, 800]} name="Orders" />
            <Tooltip content={<GlassTooltip />} />
            <Scatter data={scatterData} cursor="pointer" onClick={(d: any) => { if (d?.ch) setDetailChannel(d.ch); }}>
              {scatterData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center" style={{ marginTop: 12 }}>
          {scatterData.map(d => (
            <span key={d.name} className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} /> {d.name}
            </span>
          ))}
        </div>
      </div>

      {detailChannel && <ChannelDetailPanel channel={detailChannel} onClose={() => setDetailChannel(null)} />}
    </div>
  );
}
