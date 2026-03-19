import { useMemo, useState, useEffect } from "react";
import { X, BookOpen, Lightbulb, ChevronDown } from "lucide-react";
import { useRules } from "@/lib/rulesStore";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ReferenceLine,
} from "recharts";
import {
  monthlyRecords, computeMonth, computeAnnualTotals, previousYear,
  TAX_RATE, fmtEur, fmtEurShort,
  directCostCategories, indirectCostCategories,
  type ComputedMonth,
} from "@/lib/financialCalculations";

const cm = monthlyRecords.map(computeMonth);
const totals = computeAnnualTotals(monthlyRecords);

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-tooltip">
      <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, fontSize: 14 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontWeight: 600, color: p.color || p.stroke || p.fill, fontSize: 13 }}>
          {p.name}: {typeof p.value === "number" && p.value < 200 ? `${p.value.toFixed(1)}%` : fmtEur(p.value)}
        </p>
      ))}
    </div>
  );
};

const ax = { fill: "var(--text-quaternary)", fontSize: 10, fontWeight: 500 };
const grid = "var(--chart-grid)";

const SummaryStrip = ({ text }: { text: string }) => (
  <div className="mt-5 px-4 py-3" style={{ background: "var(--glass-bg-subtle)", borderRadius: "var(--radius-lg)", border: "0.5px solid var(--glass-border-subtle)", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.8 }}>
    {text}
  </div>
);

interface ExplanationProps {
  text: string;
  formula: string;
  formulaColor: string;
  tip: string;
}

function Explanation({ text, formula, formulaColor, tip }: ExplanationProps) {
  const [expanded, setExpanded] = useState(true);

  const renderText = (t: string) => {
    const parts = t.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <span key={i} style={{ fontWeight: 600, color: "var(--text-primary)" }}>{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div style={{
      marginTop: 20, background: "var(--glass-bg-subtle)", borderTop: "0.5px solid var(--divider-strong)",
      borderRadius: "var(--radius-xl)", padding: expanded ? "20px 24px" : "14px 24px", transition: "all 0.3s ease",
    }}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full" style={{ cursor: "pointer" }}>
        <div className="flex items-center gap-2">
          <BookOpen style={{ width: 16, height: 16, color: "var(--text-quaternary)", strokeWidth: 1.6 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-tertiary)" }}>Cosa significa?</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-quaternary)" }}>
          {expanded ? "Nascondi" : "Mostra"}
          <ChevronDown className="inline-block ml-1" style={{ width: 12, height: 12, strokeWidth: 2, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12, animation: "fadeInUp 0.2s ease-out" }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", fontWeight: 400 }}>{renderText(text)}</p>
          <div style={{ margin: "12px 0", background: "var(--surface-hover)", borderRadius: "var(--radius-xs)", padding: "10px 16px", fontFamily: "monospace", fontSize: 13, color: formulaColor, fontWeight: 600 }}>
            {formula}
          </div>
          <div className="flex items-start gap-2">
            <Lightbulb style={{ width: 14, height: 14, color: "var(--color-amber)", strokeWidth: 1.6, marginTop: 3, flexShrink: 0 }} />
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", fontWeight: 400 }}>{renderText(tip)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const cogsSubs = [
  { name: "Production Staff", pct: 0.393, color: "#6ee7b7" },
  { name: "Subcontractors", pct: 0.172, color: "#34d399" },
  { name: "Materials", pct: 0.147, color: "#10b981" },
  { name: "Software Licenses", pct: 0.115, color: "#a7f3d0" },
  { name: "Infrastructure", pct: 0.173, color: "#059669" },
];

const opexSubs = [
  { name: "Rent", pct: 0.192, color: "#f59e0b" },
  { name: "Marketing & Ads", pct: 0.247, color: "#fbbf24" },
  { name: "Admin & Management", pct: 0.155, color: "#d97706" },
  { name: "Taxes & Contributions", pct: 0.194, color: "#b45309" },
  { name: "Utilities & Insurance", pct: 0.072, color: "#fcd34d" },
  { name: "Other", pct: 0.140, color: "#92400e" },
];

const revSources = [
  { name: "Sales", pct: 0.45, color: "#6ee7b7" },
  { name: "Services", pct: 0.25, color: "#93c5fd" },
  { name: "Consulting", pct: 0.18, color: "#c4b5fd" },
  { name: "Licensing", pct: 0.12, color: "#fcd34d" },
];

const prevGP = previousYear.revenue - previousYear.directCosts;
const prevOP = prevGP - previousYear.indirectCosts;
const prevNP = prevOP * (1 - TAX_RATE);
const prevNM = previousYear.revenue > 0 ? (prevNP / previousYear.revenue) * 100 : 0;

function RevenueDetail() {
  const sorted = [...cm].sort((a, b) => b.revenue - a.revenue);
  const peak = sorted[0]; const lowest = sorted[sorted.length - 1];
  const avg = totals.totalRevenue / 12;
  const revBySrc = revSources.map(s => ({ ...s, value: totals.totalRevenue * s.pct })).sort((a, b) => b.value - a.value);
  return (<>
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cm}>
          <defs><linearGradient id="revG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.2} /><stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
          <XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} />
          <YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={fmtEurShort} />
          <Tooltip content={<Tip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6ee7b7" strokeWidth={2.5} fill="url(#revG)" dot={{ r: 3, fill: "#6ee7b7" }} activeDot={{ r: 5, fill: "#6ee7b7", stroke: "#0d1117", strokeWidth: 2, style: { filter: "drop-shadow(0 0 4px #6ee7b7)" } }} animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 20, marginBottom: 12 }}>Revenue by Source</h4>
    <div className="space-y-2">
      {revBySrc.map(s => (
        <div key={s.name} className="flex items-center gap-3">
          <span style={{ width: 100, fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{s.name}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
            <div className="h-full rounded-full" style={{ width: `${s.pct * 100}%`, background: s.color, opacity: 0.8 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: s.color, width: 80, textAlign: "right" }}>{fmtEurShort(s.value)}</span>
        </div>
      ))}
    </div>
    <SummaryStrip text={`Peak: ${peak.month} (${fmtEur(peak.revenue)}) | Lowest: ${lowest.month} (${fmtEur(lowest.revenue)}) | Avg: ${fmtEur(avg)}/mo`} />
    <Explanation text="Il **Fatturato** (Revenue) rappresenta il totale di tutti i ricavi generati dalla tua azienda attraverso vendite, servizi, consulenze e licenze. È la prima riga del tuo Conto Economico, chiamata anche **top line**. Non include ancora nessun costo — è semplicemente quanto denaro è entrato in azienda." formula="Fatturato = Vendite + Servizi + Consulenze + Licenze + Altro" formulaColor="#6ee7b7" tip="Un fatturato in crescita è positivo, ma da solo non basta: se i costi crescono più velocemente, il profitto diminuisce. Guarda sempre il fatturato insieme ai margini." />
  </>);
}

function COGSDetail() {
  const cogsData = cm.map(m => { const row: any = { month: m.month }; cogsSubs.forEach(s => { row[s.name] = m.directCosts * s.pct; }); return row; });
  const donutData = cogsSubs.map(s => ({ ...s, value: totals.totalDirectCosts * s.pct }));
  const largest = donutData.sort((a, b) => b.value - a.value)[0];
  const cogsPctRev = (totals.totalDirectCosts / totals.totalRevenue * 100).toFixed(1);
  return (<>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={cogsData}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={fmtEurShort} /><Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />{cogsSubs.map(s => <Bar key={s.name} dataKey={s.name} stackId="cogs" fill={s.color} opacity={0.8} radius={[0, 0, 0, 0]} animationDuration={800} />)}</BarChart></ResponsiveContainer>
      </div>
      <div className="relative" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none" animationDuration={800}>{donutData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{fmtEurShort(totals.totalDirectCosts)}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-quaternary)" }}>COGS</span>
        </div>
      </div>
    </div>
    <SummaryStrip text={`Largest: ${largest.name} (${fmtEur(largest.value)}, ${(largest.pct * 100).toFixed(0)}%) | COGS as % of Revenue: ${cogsPctRev}%`} />
    <Explanation text="I **Costi Diretti** (COGS - Cost of Goods Sold) sono tutti i costi direttamente collegati alla produzione del tuo prodotto o all'erogazione del tuo servizio. Includono stipendi del team operativo, subappaltatori, materie prime, licenze software e infrastruttura. Questi costi **aumentano proporzionalmente** alle vendite: più vendi, più spendi in COGS." formula="COGS = Staff Produzione + Subappaltatori + Materiali + Licenze Software + Infrastruttura" formulaColor="#f97316" tip="Se i COGS crescono più velocemente del fatturato, stai diventando meno efficiente. L'obiettivo è mantenere i COGS sotto controllo mentre il fatturato cresce." />
  </>);
}

function GrossProfitDetail() {
  const best = cm.reduce((a, b) => b.grossProfit > a.grossProfit ? b : a);
  const worst = cm.reduce((a, b) => b.grossProfit < a.grossProfit ? b : a);
  const avg = totals.totalGrossProfit / 12;
  const data = cm.map(m => ({ ...m, isBest: m.month === best.month, isWorst: m.month === worst.month }));
  return (<>
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={ax} axisLine={false} tickLine={false} tickFormatter={fmtEurShort} /><YAxis yAxisId="right" orientation="right" tick={ax} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} /><Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} /><Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)" }} /><Bar yAxisId="left" dataKey="grossProfit" name="Gross Profit" radius={[4, 4, 0, 0]} barSize={20} animationDuration={800}>{data.map((d, i) => <Cell key={i} fill={d.isBest ? "#6ee7b7" : d.isWorst ? "#fda4af" : "#6ee7b7"} opacity={d.isBest ? 1 : d.isWorst ? 0.9 : 0.6} />)}</Bar><Line yAxisId="right" type="monotone" dataKey="grossMargin" name="Gross Margin %" stroke="#67e8f9" strokeWidth={2} dot={{ r: 3, fill: "#67e8f9" }} activeDot={{ r: 5, fill: "#67e8f9", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /></ComposedChart></ResponsiveContainer>
    </div>
    <SummaryStrip text={`Best: ${best.month} (${fmtEur(best.grossProfit)}, ${best.grossMargin.toFixed(1)}%) | Worst: ${worst.month} (${fmtEur(worst.grossProfit)}, ${worst.grossMargin.toFixed(1)}%) | Avg: ${fmtEur(avg)}/mo`} />
    <Explanation text="L'**Utile Lordo** (Gross Profit) è ciò che resta del fatturato dopo aver sottratto i costi diretti di produzione. È l'indicatore più importante dell'**efficienza del tuo core business**: ti dice quanto valore crea la tua attività principale. Se l'Utile Lordo è basso o negativo, il tuo modello di business ha un problema fondamentale." formula="Utile Lordo = Fatturato − COGS" formulaColor="#6ee7b7" tip="Un Utile Lordo sano per un'azienda di servizi è tipicamente sopra il 50-60%. Per aziende di prodotto, il 30-40% è considerato buono. Confronta il tuo con la media del settore." />
  </>);
}

function MarginTrendDetail() {
  const latest = cm[cm.length - 1]; const first = cm[0];
  const trend = latest.grossMargin > first.grossMargin + 1 ? "Improving" : latest.grossMargin < first.grossMargin - 1 ? "Declining" : "Stable";
  const prevGM = previousYear.revenue > 0 ? ((previousYear.revenue - previousYear.directCosts) / previousYear.revenue * 100) : 0;
  const yoyChange = (totals.annualGrossMargin - prevGM).toFixed(1);
  return (<>
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%"><AreaChart data={cm}><defs><linearGradient id="gm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.1} /><stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} /></linearGradient><linearGradient id="om2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#93c5fd" stopOpacity={0.1} /><stop offset="100%" stopColor="#93c5fd" stopOpacity={0} /></linearGradient><linearGradient id="nm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.1} /><stop offset="100%" stopColor="#c4b5fd" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 70]} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)" }} /><ReferenceLine y={50} stroke="#6ee7b7" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: "Target 50%", fill: "#6ee7b7", fontSize: 10, position: "right" }} /><ReferenceLine y={30} stroke="#fcd34d" strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: "Warning 30%", fill: "#fcd34d", fontSize: 10, position: "right" }} /><ReferenceLine y={15} stroke="#fda4af" strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: "Critical 15%", fill: "#fda4af", fontSize: 10, position: "right" }} /><Area type="monotone" dataKey="grossMargin" name="Gross %" stroke="#6ee7b7" strokeWidth={2.5} fill="url(#gm2)" dot={{ r: 3, fill: "#6ee7b7" }} activeDot={{ r: 5, fill: "#6ee7b7", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /><Area type="monotone" dataKey="operatingMargin" name="Operating %" stroke="#93c5fd" strokeWidth={2} fill="url(#om2)" dot={{ r: 3, fill: "#93c5fd" }} activeDot={{ r: 5, fill: "#93c5fd", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /><Area type="monotone" dataKey="netMargin" name="Net %" stroke="#c4b5fd" strokeWidth={2} fill="url(#nm2)" dot={{ r: 3, fill: "#c4b5fd" }} activeDot={{ r: 5, fill: "#c4b5fd", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /></AreaChart></ResponsiveContainer>
    </div>
    <SummaryStrip text={`Current: ${latest.grossMargin.toFixed(1)}% | YoY Change: ${yoyChange}pp | Trend: ${trend}`} />
    <Explanation text="Il **Margine Lordo %** indica quanti centesimi di ogni euro di fatturato restano dopo aver pagato i costi diretti. Un margine del 65% significa che per ogni €100 di fatturato, €65 restano per coprire le spese generali e generare profitto. È il termometro della **scalabilità** del tuo business: margini lordi alti significano che puoi crescere senza che i costi esplodano." formula="Margine Lordo % = (Utile Lordo ÷ Fatturato) × 100" formulaColor="#67e8f9" tip="Monitora il trend mensile: se il margine lordo scende costantemente, significa che i costi di produzione stanno erodendo il tuo vantaggio. Cerca di capire quale categoria COGS sta crescendo troppo." />
  </>);
}

function OPEXDetail() {
  const opexData = cm.map(m => { const row: any = { month: m.month }; opexSubs.forEach(s => { row[s.name] = m.indirectCosts * s.pct; }); return row; });
  const donutData = opexSubs.map(s => ({ ...s, value: totals.totalIndirectCosts * s.pct }));
  const largest = [...donutData].sort((a, b) => b.value - a.value)[0];
  const opexPctRev = (totals.totalIndirectCosts / totals.totalRevenue * 100).toFixed(1);
  return (<>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={opexData}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={fmtEurShort} /><Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />{opexSubs.map(s => <Bar key={s.name} dataKey={s.name} stackId="opex" fill={s.color} opacity={0.8} animationDuration={800} />)}</BarChart></ResponsiveContainer>
      </div>
      <div className="relative" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none" animationDuration={800}>{donutData.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip content={<Tip />} /></PieChart></ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{fmtEurShort(totals.totalIndirectCosts)}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-quaternary)" }}>OPEX</span>
        </div>
      </div>
    </div>
    <SummaryStrip text={`Largest: ${largest.name} (${fmtEur(largest.value)}, ${(largest.pct * 100).toFixed(0)}%) | OPEX as % of Revenue: ${opexPctRev}%`} />
    <Explanation text="Le **Spese Operative** (OPEX) sono i costi indiretti che la tua azienda sostiene indipendentemente dal volume di vendite. Includono affitto, marketing, amministrazione, contributi e utenze. A differenza dei COGS, questi costi sono relativamente **fissi**: non cambiano molto se vendi di più o di meno." formula="OPEX = Affitto + Marketing + Amministrazione + Contributi + Utenze + Altro" formulaColor="#f59e0b" tip="L'OPEX ideale dovrebbe restare sotto il 25-30% del fatturato. Se supera il 40%, la struttura dei costi è probabilmente troppo pesante rispetto ai ricavi." />
  </>);
}

function EBITDetail() {
  const best = cm.reduce((a, b) => b.operatingProfit > a.operatingProfit ? b : a);
  const worst = cm.reduce((a, b) => b.operatingProfit < a.operatingProfit ? b : a);
  const avg = totals.totalOperatingProfit / 12;
  return (<>
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={cm}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={ax} axisLine={false} tickLine={false} tickFormatter={fmtEurShort} /><YAxis yAxisId="right" orientation="right" tick={ax} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)" }} /><Bar yAxisId="left" dataKey="operatingProfit" name="EBIT" fill="#93c5fd" opacity={0.7} radius={[4, 4, 0, 0]} barSize={20} animationDuration={800} /><Line yAxisId="right" type="monotone" dataKey="operatingMargin" name="EBIT %" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: "#60a5fa" }} activeDot={{ r: 5, fill: "#60a5fa", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /></ComposedChart></ResponsiveContainer>
    </div>
    <SummaryStrip text={`Best: ${best.month} (${fmtEur(best.operatingProfit)}) | Worst: ${worst.month} (${fmtEur(worst.operatingProfit)}) | Avg: ${fmtEur(avg)}/mo | Margin: ${totals.annualOperatingMargin.toFixed(1)}%`} />
    <Explanation text="L'**EBIT** (Earnings Before Interest & Taxes) è il profitto operativo — ciò che resta dopo aver pagato sia i costi diretti che quelli indiretti. È la misura più pura della **performance operativa** della tua azienda, perché esclude fattori finanziari (interessi) e fiscali (imposte) che non dipendono dalla gestione quotidiana." formula="EBIT = Utile Lordo − OPEX = Fatturato − COGS − OPEX" formulaColor="#93c5fd" tip="L'EBIT è il numero che gli investitori guardano per primo. Un EBIT margin superiore al 15% è generalmente considerato solido. Se è negativo, l'azienda sta perdendo denaro con le sue operazioni core." />
  </>);
}

function NetProfitDetail() {
  const rules = useRules();
  const taxRate = rules.taxRate / 100;
  const netData = cm.map(m => ({ month: m.month, ebit: m.operatingProfit, taxes: m.operatingProfit * taxRate, netProfit: m.operatingProfit * (1 - taxRate) }));
  return (<>
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={netData}><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={fmtEurShort} /><Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)" }} /><Bar dataKey="ebit" name="EBIT" fill="#93c5fd" opacity={0.3} radius={[4, 4, 0, 0]} barSize={24} animationDuration={800} /><Bar dataKey="taxes" name="Taxes" fill="#fda4af" opacity={0.6} radius={[4, 4, 0, 0]} barSize={24} animationDuration={800} /><Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#c4b5fd" strokeWidth={2.5} dot={{ r: 3, fill: "#c4b5fd" }} activeDot={{ r: 5, fill: "#c4b5fd", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /></ComposedChart></ResponsiveContainer>
    </div>
    <SummaryStrip text={`EBIT: ${fmtEur(totals.totalOperatingProfit)} | Taxes (${rules.taxRate}%): ${fmtEur(totals.totalTaxes)} | Net: ${fmtEur(totals.totalNetProfit)} | vs prev: ${prevNP > 0 ? fmtEur(prevNP) : "N/A"}`} />
    <Explanation text="L'**Utile Netto** (Net Profit) è il **bottom line** — il denaro che effettivamente resta in azienda dopo aver pagato tutto: costi diretti, costi indiretti e imposte. È l'indicatore definitivo della profittabilità. Da questo valore si calcolano i dividendi, si valuta la capacità di investimento e si misura il ritorno per gli azionisti." formula={`Utile Netto = EBIT − Imposte = EBIT × (1 − ${rules.taxRate}%)`} formulaColor="#c4b5fd" tip="L'utile netto dovrebbe crescere nel tempo. Se il fatturato cresce ma l'utile netto no, significa che i costi o le tasse stanno assorbendo tutta la crescita. Cerca di ottimizzare la struttura fiscale e controllare i costi." />
  </>);
}

function NetMarginDetail() {
  const data = cm.map(m => ({ month: m.month, netMargin: m.netMargin, netProfit: m.operatingProfit * (1 - TAX_RATE) }));
  const latest = data[data.length - 1];
  const avg = totals.annualNetMargin;
  const yoyChange = (avg - prevNM).toFixed(1);
  return (<>
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="nmDrill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.15} /><stop offset="100%" stopColor="#c4b5fd" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} /><XAxis dataKey="month" tick={ax} axisLine={false} tickLine={false} /><YAxis tick={ax} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} /><Tooltip content={<Tip />} /><ReferenceLine y={avg} stroke="#c4b5fd" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: `Avg ${avg.toFixed(1)}%`, fill: "#c4b5fd", fontSize: 10, position: "right" }} /><Area type="monotone" dataKey="netMargin" name="Net Margin %" stroke="#c4b5fd" strokeWidth={2.5} fill="url(#nmDrill)" dot={{ r: 3, fill: "#c4b5fd" }} activeDot={{ r: 5, fill: "#c4b5fd", stroke: "#0d1117", strokeWidth: 2 }} animationDuration={800} /></AreaChart></ResponsiveContainer>
    </div>
    <SummaryStrip text={`Current: ${latest.netMargin.toFixed(1)}% | Annual Avg: ${avg.toFixed(1)}% | YoY: ${yoyChange}pp | vs prev year: ${prevNM.toFixed(1)}%`} />
    <Explanation text="Il **Margine Netto %** è la percentuale di fatturato che si trasforma in utile netto. È la metrica di profittabilità più completa perché tiene conto di **tutti** i costi. Un margine netto del 10% significa che per ogni €100 di ricavi, €10 diventano profitto reale." formula="Margine Netto % = (Utile Netto ÷ Fatturato) × 100" formulaColor="#c4b5fd" tip="Margini netti variano molto per settore: il tech può arrivare al 20-30%, il retail spesso sotto il 5%. Il trend nel tempo conta più del valore assoluto: un margine netto in crescita indica che stai migliorando l'efficienza complessiva." />
  </>);
}

const detailRenderers: Record<string, { title: string; render: () => JSX.Element }> = {
  "Total Revenue": { title: "Revenue Breakdown", render: RevenueDetail },
  "Direct Costs (COGS)": { title: "Direct Costs Breakdown", render: COGSDetail },
  "Gross Profit": { title: "Gross Profit Analysis", render: GrossProfitDetail },
  "Gross Margin %": { title: "Margin Trend Analysis", render: MarginTrendDetail },
  "Indirect Costs (OPEX)": { title: "Operating Expenses Breakdown", render: OPEXDetail },
  "Operating Profit (EBIT)": { title: "EBIT Analysis", render: EBITDetail },
  "Net Profit": { title: "Net Profit Analysis", render: NetProfitDetail },
  "Net Margin %": { title: "Net Margin Deep Dive", render: NetMarginDetail },
};

interface Props { kpiLabel: string; onClose: () => void; }

export function KpiDrillDown({ kpiLabel, onClose }: Props) {
  const detail = detailRenderers[kpiLabel];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!detail) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}
        style={{ background: "var(--modal-overlay)", backdropFilter: "var(--modal-overlay-blur)", WebkitBackdropFilter: "var(--modal-overlay-blur)", animation: "fadeInUp 0.2s ease-out" }} />

      <div className="fixed top-0 right-0 h-full z-50 overflow-y-auto"
        style={{
          width: "min(580px, 90vw)", background: "var(--panel-bg)",
          backdropFilter: "var(--glass-blur-heavy)", WebkitBackdropFilter: "var(--glass-blur-heavy)",
          borderLeft: "0.5px solid var(--panel-border)", boxShadow: "var(--panel-shadow)",
          animation: "slide-in-right 0.35s cubic-bezier(0.16,1,0.3,1)",
        }}>
        <div className="p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>{detail.title}</h2>
            <button type="button" onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%", background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--glass-bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--glass-bg)"; }}>
              <X className="h-4 w-4" style={{ color: "var(--text-tertiary)", strokeWidth: 1.8 }} />
            </button>
          </div>
          <div style={{ animation: "fadeInUp 0.3s 0.1s ease-out both" }}>{detail.render()}</div>
        </div>
      </div>
    </>
  );
}

export function CashflowDetail({ monthIndex, onClose }: { monthIndex: number; onClose: () => void }) {
  const m = cm[monthIndex];
  if (!m) return null;
  return (
    <div className="glass-card p-5" style={{ animation: "fadeInUp 0.2s ease-out", marginTop: 12, cursor: "default" }}>
      <div className="flex items-center justify-between mb-4">
        <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{m.month} Detail</h4>
        <button type="button" onClick={onClose} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", cursor: "pointer" }}>✕ Close</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Revenue", value: fmtEur(m.revenue), color: "#6ee7b7" },
          { label: "COGS", value: fmtEur(m.directCosts), color: "#fda4af" },
          { label: "OPEX", value: fmtEur(m.indirectCosts), color: "#fcd34d" },
          { label: "Cashflow", value: fmtEur(m.operatingProfit), color: "#93c5fd" },
          { label: "Total Costs", value: fmtEur(m.totalCosts), color: "#fb7185" },
          { label: "Margin", value: `${m.operatingMargin.toFixed(1)}%`, color: "#67e8f9" },
        ].map(d => (
          <div key={d.label}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-quaternary)" }}>{d.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: d.color, fontVariantNumeric: "tabular-nums" }}>{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
