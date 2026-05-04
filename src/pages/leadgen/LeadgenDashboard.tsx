import { useNavigate } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenLeads } from "@/hooks/leadgen/useLeadgenLeads";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { useLeadgenSummary } from "@/hooks/leadgen/useLeadgenSummary";
import { SearchProgressIndicator } from "@/components/leadgen/SearchProgressIndicator";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const OUTREACH_FUNNEL = [
  { key: "new",       label: "Nuovi" },
  { key: "contacted", label: "Contattati" },
  { key: "replied",   label: "Risposto" },
  { key: "qualified", label: "Qualificati" },
  { key: "converted", label: "Convertiti" },
];

// Hardcoded hex for SVG fill — CSS variables don't work in SVG attributes
const DONUT_COLORS = ["#4ade80", "#f87171"];

export default function LeadgenDashboard() {
  const { portal } = usePortal();
  const navigate = useNavigate();
  const slug = portal?.id ?? "redx";
  const { allLeads, loading } = useLeadgenLeads();
  const { searches } = useLeadgenSearches();
  const summary = useLeadgenSummary(allLeads);

  const donutData = [
    { name: "Con sito",   value: summary.withWebsite    },
    { name: "Senza sito", value: summary.withoutWebsite },
  ];

  const barData = summary.topCategories.map((c) => ({ name: c.category, count: c.count }));

  const kpiCards = [
    { label: "Lead totali",    value: summary.total,          onClick: () => navigate(`/${slug}/leadgen/no-website`) },
    { label: "Con sito",       value: summary.withWebsite,    onClick: () => navigate(`/${slug}/leadgen/with-website`) },
    { label: "Senza sito",     value: summary.withoutWebsite, onClick: () => navigate(`/${slug}/leadgen/no-website`) },
    { label: "Tasso contatto", value: `${(summary.contactRate * 100).toFixed(1)}%`, onClick: undefined as (() => void) | undefined },
  ];

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        Lead Generation
      </h1>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {kpiCards.map((kpi) => (
          <div key={kpi.label}
            onClick={kpi.onClick}
            style={{
              background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
              borderRadius: "var(--radius-md)", padding: "20px 24px",
              cursor: kpi.onClick ? "pointer" : "default",
            }}
            onMouseEnter={(e) => { if (kpi.onClick) e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 8px" }}>{kpi.label}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 32 }}>
        {/* Donut */}
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Distribuzione sito</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {donutData.map((_entry, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [val, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
            {donutData.map((d, i) => (
              <span key={d.name} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Top categorie</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#666" }} />
              <YAxis tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "#666" }} />
              <Tooltip />
              <Bar dataKey="count" fill="#d4ff00" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Last 5 searches */}
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Ultime ricerche</p>
          {searches.slice(0, 5).map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", flex: 1 }}>{s.category} · {s.postal_code}</span>
              <SearchProgressIndicator status={s.status} />
            </div>
          ))}
          {searches.length === 0 && <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>Nessuna ricerca.</p>}
        </div>

        {/* Outreach funnel */}
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 16px" }}>Funnel outreach</p>
          {OUTREACH_FUNNEL.map(({ key, label }) => {
            const count = summary.byOutreachStatus[key as keyof typeof summary.byOutreachStatus] ?? 0;
            const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
            return (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)" }}>{count}</span>
                </div>
                <div style={{ height: 4, background: "var(--glass-border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent-primary)", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
