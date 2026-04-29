import { useState, useMemo } from "react";
import { MoreVertical, Plus, X } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import {
  useChannels, addChannel, updateChannel, deleteChannel,
  getChannelTotalRevenue, getChannelNetRevenue, getMonthLabels,
  platformPresets, channelColors, Channel,
} from "@/lib/channelStore";
import { fmtEur, fmtEurShort } from "@/lib/financialCalculations";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { ChannelDetailPanel } from "./ChannelDetailPanel";
import { GlassTooltip } from "@/components/ui/GlassTooltip";

/* ── Add/Edit Modal ── */
function ChannelModal({ channel, onClose }: { channel?: Channel; onClose: () => void }) {
  const isEdit = !!channel;
  const [platform, setPlatform] = useState(channel?.platform || "");
  const [name, setName] = useState(channel?.name || "");
  const [color, setColor] = useState(channel?.color || channelColors[0]);
  const [commission, setCommission] = useState(channel?.commissionRate ?? 0);
  const [currency, setCurrency] = useState(channel?.currency || "EUR");
  const [taxRate, setTaxRate] = useState(channel?.taxRate ?? 22);
  const [notes, setNotes] = useState(channel?.notes || "");
  const [icon, setIcon] = useState(channel?.icon || "➕");

  const selectPreset = (p: typeof platformPresets[0]) => {
    setPlatform(p.id);
    if (!name || platformPresets.some(pr => pr.label === name)) setName(p.label);
    setColor(p.color);
    setCommission(p.commission);
    setIcon(p.icon);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const data = {
      name, platform, color, commissionRate: commission, currency, taxRate,
      status: channel?.status || "active" as const, notes, icon,
      monthlyRevenue: channel?.monthlyRevenue || Array(12).fill(0),
      orders: channel?.orders || 0,
    };
    if (isEdit) updateChannel(channel.id, data);
    else addChannel(data);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)" }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 1000,
        width: "min(520px, 92vw)", maxHeight: "85vh", overflowY: "auto",
        background: "var(--sosa-bg-3)",
        border: "1px solid var(--sosa-border)", borderRadius: 0,
        padding: 28,
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
            {isEdit ? "Edit Channel" : "+ Add Sales Channel"}
          </h3>
          <button type="button" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--input-bg)",
            border: "1px solid var(--glass-border)", color: "var(--text-tertiary)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        {/* Platform presets */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Platform Type</label>
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>
          {platformPresets.map(p => (
            <button type="button" key={p.id} onClick={() => selectPreset(p)} style={{
              padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: platform === p.id ? "var(--glass-bg)" : "var(--input-bg)",
              border: platform === p.id ? "1px solid #4A9EFF" : "1px solid var(--glass-border)",
              color: platform === p.id ? "var(--text-primary)" : "var(--text-tertiary)",
              display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
            }}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        {/* Name */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Channel Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amazon IT"
          className="glass-input" style={{
            width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14, marginBottom: 16,
            background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)",
            outline: "none",
          }} />

        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
          {/* Color */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {channelColors.map(c => (
                <button type="button" key={c} onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }} />
              ))}
            </div>
          </div>
          {/* Currency */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)",
            }}>
              <option>EUR</option><option>USD</option><option>GBP</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Commission Rate (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={commission} onChange={e => setCommission(Math.min(100, +e.target.value))} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", outline: "none",
            }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Tax Rate (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(Math.min(100, +e.target.value))} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", outline: "none",
            }} />
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{
          width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14, resize: "vertical",
          background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)",
          outline: "none", marginBottom: 20,
        }} />

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={!name.trim()} style={{
            padding: "10px 24px", borderRadius: 0, fontSize: 13, fontWeight: 700,
            background: "var(--sosa-yellow)", color: "#000", border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5, transition: "opacity 0.15s",
            fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
          }}>
            {isEdit ? "Update Channel" : "Save Channel"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Channel Card ── */
function ChannelCard({ ch, totalRevAll, onClick }: { ch: Channel; totalRevAll: number; onClick: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const total = getChannelTotalRevenue(ch);
  const pct = totalRevAll > 0 ? (total / totalRevAll) * 100 : 0;
  const prevTotal = ch.monthlyRevenue.slice(0, 6).reduce((s, v) => s + v, 0);
  const curTotal = ch.monthlyRevenue.slice(6).reduce((s, v) => s + v, 0);
  const change = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0;

  return (
    <>
      <div onClick={onClick} style={{
        background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)",
        borderLeft: `3px solid ${ch.color}`, borderRadius: 0,
        padding: 18, cursor: "pointer", transition: "background 0.15s", position: "relative",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--sosa-bg-3)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <div className="flex items-center gap-2">
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: ch.status === "active" ? "#22c55e" : ch.status === "paused" ? "#9ca3af" : "#ef4444",
            }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{ch.icon} {ch.name}</span>
          </div>
          <ActionMenu
            trigger={<MoreVertical size={16} />}
            items={[
              { id: "edit", label: "Edit", onClick: () => setEditOpen(true) },
              { id: "toggle", label: ch.status === "paused" ? "Resume" : "Pause", onClick: () => updateChannel(ch.id, { status: ch.status === "paused" ? "active" : "paused" }) },
              { type: "divider" },
              { id: "delete", label: "Delete", onClick: () => deleteChannel(ch.id), destructive: true },
            ]}
          />
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: "var(--glass-bg-subtle)", borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: ch.color, borderRadius: 3, transition: "width 0.5s ease" }} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{fmtEurShort(total)}</span>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 8 }}>{pct.toFixed(1)}% of revenue</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
              background: change >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: change >= 0 ? "#22c55e" : "#ef4444",
            }}>
              {change >= 0 ? "↗" : "↘"} {change >= 0 ? "+" : ""}{change.toFixed(1)}%
            </span>
          </div>
        </div>
        {editOpen && <ChannelModal channel={ch} onClose={() => setEditOpen(false)} />}
    </>
  );
}

const fmtChannelTooltip = (v: number) => fmtEurShort(v);

/* ── CHANNELS TAB ── */
export function ChannelsTab() {
  const channels = useChannels();
  const [addOpen, setAddOpen] = useState(false);
  const [detailChannel, setDetailChannel] = useState<Channel | null>(null);

  const totalRev = useMemo(() => channels.reduce((s, c) => s + getChannelTotalRevenue(c), 0), [channels]);
  const months = getMonthLabels();

  // Stacked bar data
  const stackedData = useMemo(() => months.map((m, i) => {
    const row: any = { month: m };
    channels.forEach(c => { row[c.name] = c.monthlyRevenue[i] || 0; });
    return row;
  }), [channels]);

  // Donut data
  const donutData = useMemo(() => channels.map(c => ({
    name: c.name, value: getChannelTotalRevenue(c), color: c.color,
  })), [channels]);

  // Trend line data
  const trendData = useMemo(() => months.map((m, i) => {
    const row: any = { month: m };
    channels.forEach(c => { row[c.name] = c.monthlyRevenue[i] || 0; });
    return row;
  }), [channels]);

  // Gross vs Net data
  const grossNetData = useMemo(() =>
    [...channels].sort((a, b) => getChannelNetRevenue(b) - getChannelNetRevenue(a)).map(c => ({
      name: c.name, gross: getChannelTotalRevenue(c), net: getChannelNetRevenue(c),
      commission: getChannelTotalRevenue(c) - getChannelNetRevenue(c),
      color: c.color, commPct: c.commissionRate,
    }))
  , [channels]);

  const chartCard = (title: string, children: React.ReactNode) => (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: 16, padding: 20, backdropFilter: "blur(16px)",
      boxShadow: "var(--glass-shadow)",
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Channel cards */}
      {chartCard("Sales Channels", (
        <>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: -8, marginBottom: 16 }}>Manage your sales platforms and marketplaces</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map(ch => (
              <ChannelCard key={ch.id} ch={ch} totalRevAll={totalRev} onClick={() => setDetailChannel(ch)} />
            ))}
            {/* Add card */}
            <button type="button" onClick={() => setAddOpen(true)} style={{
              background: "transparent", border: "2px dashed var(--glass-border)",
              borderRadius: 18, padding: 18, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, color: "var(--text-tertiary)", fontSize: 14, fontWeight: 500,
              transition: "all 0.2s ease", minHeight: 110,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#4A9EFF"; e.currentTarget.style.color = "#4A9EFF"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--glass-border)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            >
              <Plus size={22} /> Add Channel
            </button>
          </div>
        </>
      ))}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Bar */}
        {chartCard("Revenue by Channel — Monthly", (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={v => fmtEurShort(v)} />
              <Tooltip content={<GlassTooltip formatter={fmtChannelTooltip} />} cursor={{ fill: "var(--row-hover)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {channels.map(c => (
                <Bar key={c.id} dataKey={c.name} stackId="a" fill={c.color} cursor="pointer"
                  onClick={(_, idx) => setDetailChannel(c)} radius={[0, 0, 0, 0]}
                  animationDuration={800} animationEasing="ease-out" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ))}

        {/* Donut */}
        {chartCard("Channel Revenue Share", (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                dataKey="value" cursor="pointer"
                animationDuration={800} animationEasing="ease-out"
                onClick={(data) => {
                  const ch = channels.find(c => c.name === data.name);
                  if (ch) setDetailChannel(ch);
                }}
              >
                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<GlassTooltip formatter={fmtChannelTooltip} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Lines */}
        {chartCard("Channel Performance Trend", (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickFormatter={v => fmtEurShort(v)} />
              <Tooltip content={<GlassTooltip formatter={fmtChannelTooltip} />} cursor={{ stroke: "var(--glass-border)", strokeDasharray: "4 4" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {channels.map(c => (
                <Line key={c.id} type="monotone" dataKey={c.name} stroke={c.color} strokeWidth={2}
                  dot={{ r: 3, cursor: "pointer" }} activeDot={{ r: 6, cursor: "pointer", fill: c.color, stroke: "var(--glass-bg-elevated)", strokeWidth: 2, onClick: () => setDetailChannel(c), style: { filter: `drop-shadow(0 0 4px ${c.color})` } }}
                  animationDuration={800} animationEasing="ease-out" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ))}

        {/* Gross vs Net */}
        {chartCard("Gross vs Net Revenue by Channel", (
          <div className="space-y-4" style={{ paddingTop: 4 }}>
            {grossNetData.map(d => (
              <div key={d.name}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {fmtEurShort(d.gross)} gross → {fmtEurShort(d.net)} net ({d.commPct}% comm.)
                  </span>
                </div>
                <div style={{ height: 10, background: "var(--glass-bg-subtle)", borderRadius: 5, overflow: "hidden", position: "relative" }} title={`Gross: ${fmtEurShort(d.gross)} · Net: ${fmtEurShort(d.net)}`}>
                  <div style={{ height: "100%", width: `${(d.gross / (grossNetData[0]?.gross || 1)) * 100}%`, background: `${d.color}40`, borderRadius: 5, position: "absolute", transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                  <div style={{ height: "100%", width: `${(d.net / (grossNetData[0]?.gross || 1)) * 100}%`, background: d.color, borderRadius: 5, position: "absolute", transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 0 8px ${d.color}` }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {addOpen && <ChannelModal onClose={() => setAddOpen(false)} />}
      {detailChannel && <ChannelDetailPanel channel={detailChannel} onClose={() => setDetailChannel(null)} />}
    </div>
  );
}
