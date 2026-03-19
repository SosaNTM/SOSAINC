import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { month: string; revenue: number; expenses: number }[];
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>No revenue data yet</p>
        <button type="button" className="glass-btn-primary px-4 py-1.5 text-xs">Create First Invoice</button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{
              background: "rgba(13,17,23,0.95)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, fontSize: 12, color: "#fff",
            }}
            formatter={(value: number, name: string) => [`€${value.toLocaleString()}`, name === "revenue" ? "Revenue" : "Expenses"]}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#revGrad)" activeDot={{ r: 5, fill: "#34d399", stroke: "#0d1117", strokeWidth: 2, style: { filter: "drop-shadow(0 0 4px #34d399)" } }} animationDuration={800} animationEasing="ease-out" />
          <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={1.5} fill="url(#expGrad)" activeDot={{ r: 4, fill: "#f87171", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
