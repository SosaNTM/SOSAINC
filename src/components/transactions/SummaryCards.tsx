import { useMemo } from "react";
import { fmtEur, fmtEurShort } from "@/lib/financialCalculations";
import { getCategoryColor, type Transaction } from "@/lib/transactionStore";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

type ActiveCard = "income" | "expenses" | "balance" | "count" | null;

interface Props {
  filtered: Transaction[];
  activeCard: ActiveCard;
  setActiveCard: (c: ActiveCard) => void;
}

export function SummaryCards({ filtered, activeCard, setActiveCard }: Props) {
  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const toggle = (c: ActiveCard) => setActiveCard(activeCard === c ? null : c);

  const cards: {
    key: ActiveCard;
    label: string;
    value: string | number;
    color: string;
    glowColor: string;
  }[] = [
    { key: "income", label: "Entrate Totali", value: fmtEur(totalIncome), color: "hsl(160 68% 43%)", glowColor: "hsl(160 68% 43% / 0.25)" },
    { key: "expenses", label: "Uscite Totali", value: fmtEur(totalExpenses), color: "hsl(350 70% 60%)", glowColor: "hsl(350 70% 60% / 0.25)" },
    { key: "balance", label: "Saldo", value: fmtEur(balance), color: "hsl(217 91% 60%)", glowColor: "hsl(217 91% 60% / 0.25)" },
    { key: "count", label: "N° Transazioni", value: String(filtered.length), color: "hsl(var(--muted-foreground))", glowColor: "hsl(var(--muted-foreground) / 0.2)" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {cards.map((c) => {
          const isActive = activeCard === c.key;
          return (
            <div
              key={c.key}
              className="glass-card p-3 sm:p-4 cursor-pointer transition-all duration-300"
              style={{
                borderColor: isActive ? c.glowColor : undefined,
                boxShadow: isActive
                  ? `0 0 20px ${c.glowColor}, var(--glass-shadow)`
                  : undefined,
                transform: isActive ? "scale(1.02)" : undefined,
              }}
              onClick={() => toggle(c.key)}
            >
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1 truncate">
                {c.label}
              </p>
              <p className="text-base sm:text-xl font-extrabold truncate" style={{ color: c.color }}>
                {c.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Drilldown panels */}
      {activeCard && (
        <div className="glass-card p-5" style={{ animation: "fadeInUp 0.3s ease-out" }}>
          {activeCard === "income" && <IncomeBreakdown txs={filtered} />}
          {activeCard === "expenses" && <ExpenseBreakdown txs={filtered} />}
          {activeCard === "balance" && <BalanceChart txs={filtered} />}
          {activeCard === "count" && <CountChart txs={filtered} />}
        </div>
      )}
    </>
  );
}

/* ─── Income breakdown ─── */
function IncomeBreakdown({ txs }: { txs: Transaction[] }) {
  const data = useMemo(() => {
    const incomeTxs = txs.filter((t) => t.type === "income");
    const total = incomeTxs.reduce((s, t) => s + t.amount, 0);
    const byCat: Record<string, number> = {};
    incomeTxs.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    return Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : "0",
        color: getCategoryColor(name),
      }));
  }, [txs]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground mb-2">Ripartizione Entrate per Categoria</p>
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-xs font-semibold w-28 truncate" style={{ color: d.color }}>{d.name}</span>
          <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${d.pct}%`, background: d.color, minWidth: 4, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 0 6px ${d.color}` }}
            />
          </div>
          <span className="text-xs font-bold text-foreground w-20 text-right">{fmtEurShort(d.value)}</span>
          <span className="text-xs text-muted-foreground w-12 text-right">{d.pct}%</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Expense breakdown ─── */
function ExpenseBreakdown({ txs }: { txs: Transaction[] }) {
  const { cogs, opex } = useMemo(() => {
    const expenses = txs.filter((t) => t.type === "expense");
    const cogsItems: Record<string, number> = {};
    const opexItems: Record<string, number> = {};
    expenses.forEach((t) => {
      const bucket = t.costType === "direct" ? cogsItems : opexItems;
      bucket[t.category] = (bucket[t.category] || 0) + t.amount;
    });
    const toArr = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }));
    return { cogs: toArr(cogsItems), opex: toArr(opexItems) };
  }, [txs]);

  const renderGroup = (label: string, items: { name: string; value: number; color: string }[], accentColor: string) => {
    const total = items.reduce((s, i) => s + i.value, 0);
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold" style={{ color: accentColor }}>{label} — {fmtEurShort(total)}</p>
        {items.map((d) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-xs font-semibold w-32 truncate" style={{ color: d.color }}>{d.name}</span>
              <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color, minWidth: 4, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: `0 0 6px ${d.color}` }} />
              </div>
              <span className="text-xs font-bold text-foreground w-16 text-right">{fmtEurShort(d.value)}</span>
              <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-xs font-bold text-muted-foreground">Ripartizione Uscite per Tipo</p>
      {renderGroup("COGS — Costi Diretti", cogs, "hsl(160 68% 43%)")}
      {renderGroup("OPEX — Costi Indiretti", opex, "hsl(38 92% 55%)")}
    </div>
  );
}

/* ─── Daily balance chart ─── */
function BalanceChart({ txs }: { txs: Transaction[] }) {
  const data = useMemo(() => {
    if (!txs.length) return [];
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    const byDay: Record<string, number> = {};
    sorted.forEach((t) => {
      const d = t.date;
      byDay[d] = (byDay[d] || 0) + (t.type === "income" ? t.amount : -t.amount);
    });
    const days = Object.keys(byDay).sort();
    let running = 0;
    return days.map((d) => {
      running += byDay[d];
      return { day: d.slice(5), balance: running };
    });
  }, [txs]);

  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground mb-3">Andamento Saldo Cumulativo</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => fmtEurShort(v)} />
          <RTooltip
            contentStyle={{
              background: "rgba(30,41,59,0.95)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v: number) => [fmtEur(v), "Saldo"]}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
          />
          <Line type="monotone" dataKey="balance" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false}
            activeDot={{ r: 5, fill: "hsl(217 91% 60%)", stroke: "#0d1117", strokeWidth: 2, style: { filter: "drop-shadow(0 0 4px hsl(217 91% 60%))" } }}
            animationDuration={800} animationEasing="ease-out" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Transaction count chart ─── */
function CountChart({ txs }: { txs: Transaction[] }) {
  const { data, avg, peakDay, peakCount } = useMemo(() => {
    const byDay: Record<string, { income: number; expense: number }> = {};
    txs.forEach((t) => {
      if (!byDay[t.date]) byDay[t.date] = { income: 0, expense: 0 };
      byDay[t.date][t.type]++;
    });
    const days = Object.keys(byDay).sort();
    const data = days.map((d) => ({ day: d.slice(5), ...byDay[d] }));
    const counts = days.map((d) => byDay[d].income + byDay[d].expense);
    const avg = counts.length ? (counts.reduce((s, c) => s + c, 0) / counts.length).toFixed(1) : "0";
    const peakIdx = counts.indexOf(Math.max(...counts));
    return {
      data,
      avg,
      peakDay: days[peakIdx]?.slice(5) || "—",
      peakCount: counts[peakIdx] || 0,
    };
  }, [txs]);

  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground mb-3">Transazioni per Giorno</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} allowDecimals={false} />
          <RTooltip
            contentStyle={{
              background: "rgba(30,41,59,0.95)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="income" stackId="a" fill="hsl(160 68% 43%)" radius={[2, 2, 0, 0]} name="Entrate"
            animationDuration={800} animationEasing="ease-out" />
          <Bar dataKey="expense" stackId="a" fill="hsl(350 70% 60%)" radius={[2, 2, 0, 0]} name="Uscite"
            animationDuration={800} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2">
        Media: <span className="font-bold text-foreground">{avg}</span> transazioni/giorno | Giorno più attivo:{" "}
        <span className="font-bold text-foreground">{peakDay}</span> ({peakCount})
      </p>
    </div>
  );
}
