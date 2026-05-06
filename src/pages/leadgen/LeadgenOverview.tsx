import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenLeads } from "@/hooks/leadgen/useLeadgenLeads";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { useLeadgenSummary } from "@/hooks/leadgen/useLeadgenSummary";
import { useLeadgenOverviewStats } from "@/hooks/leadgen/useLeadgenOverviewStats";
import { SearchProgressIndicator } from "@/components/leadgen/SearchProgressIndicator";
import { X } from "lucide-react";
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

const DONUT_COLORS = ["#4ade80", "#f87171"];

function DiscardedInfoModal({ onClose, summary }: {
  onClose: () => void;
  summary: { discardedNoContact: number; totalRawResults: number; excludedChains: number; saved: number };
}) {
  const discardPct = summary.totalRawResults > 0
    ? ((summary.discardedNoContact / summary.totalRawResults) * 100).toFixed(1)
    : "0.0";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: 28, maxWidth: 460, width: "90%", fontFamily: "var(--font-mono)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            Lead scartati senza contatti
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "16px", background: "var(--sosa-bg-2)", border: "1px solid var(--glass-border)" }}>
          {[
            { label: "Lead grezzi trovati", value: summary.totalRawResults, color: "var(--text-primary)" },
            { label: "Catene escluse", value: summary.excludedChains, color: "var(--color-error)" },
            { label: "Senza contatti", value: `${summary.discardedNoContact} (${discardPct}%)`, color: "var(--text-tertiary)" },
            { label: "Salvati nel CRM", value: summary.saved, color: "var(--accent-primary)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.8, marginBottom: 20 }}>
          Apify trova attività su Google Maps senza telefono né email pubblici — vengono scartate
          perché non contattabili. Se la percentuale è alta, prova categorie diverse (es. "ristoranti"
          ha più contatti di "uffici postali") o aree con più PMI strutturate.
        </p>

        <button onClick={onClose} className="btn-primary" style={{ width: "100%" }}>
          Chiudi
        </button>
      </div>
    </div>
  );
}

export default function LeadgenOverview() {
  const { portal } = usePortal();
  const navigate = useNavigate();
  const slug = portal?.id ?? "redx";
  const { allLeads, loading } = useLeadgenLeads();
  const { searches } = useLeadgenSearches();
  const summary = useLeadgenSummary(allLeads, searches);
  const overviewStats = useLeadgenOverviewStats();
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const completedSearches = searches.filter((s) => s.status === "completed");
  const totalExcludedChains = completedSearches.reduce((sum, s) => sum + (s.excluded_count ?? 0), 0);

  const donutData = [
    { name: "Con sito",   value: summary.withWebsite    },
    { name: "Senza sito", value: summary.withoutWebsite },
  ];

  const barData = summary.topCategories.map((c) => ({ name: c.category, count: c.count }));

  const kpiCards = [
    { label: "Lead totali",         value: summary.total,                                              onClick: () => navigate(`/${slug}/leadgen/no-website`) },
    { label: "Con sito",            value: summary.withWebsite,                                        onClick: () => navigate(`/${slug}/leadgen/with-website`) },
    { label: "Senza sito",          value: summary.withoutWebsite,                                     onClick: () => navigate(`/${slug}/leadgen/no-website`) },
    { label: "Tasso contatto",      value: `${(summary.contactRate * 100).toFixed(1)}%`,               onClick: undefined as (() => void) | undefined },
    {
      label: "Scartati no-contatti",
      value: summary.discardedNoContact,
      sub: summary.totalRawResults > 0 ? `${(summary.discardRate * 100).toFixed(1)}% del totale grezzo` : "nessuna ricerca",
      onClick: () => setShowDiscardModal(true),
      dim: true,
    },
  ];

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Page title */}
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
        Overview — Team Lead Generation
      </h1>

      {/* Global KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Lead totali",        value: overviewStats.totalLeads,        dim: false },
          { label: "Lead attivi",        value: overviewStats.activeLeads,       dim: false },
          { label: "Pool libero",        value: overviewStats.poolSize,          dim: false },
          { label: "Convertiti (mese)",  value: overviewStats.convertedThisMonth, dim: false },
          { label: "Conv. rate team",    value: `${(overviewStats.teamConversionRate * 100).toFixed(1)}%`, dim: false },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
            borderRadius: "var(--radius-md)", padding: "16px 20px",
          }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 6px" }}>{kpi.label}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {overviewStats.loading ? "—" : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Member workload table */}
      {overviewStats.memberStats.length > 0 && (
        <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 20, marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 14px" }}>Workload team</p>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px 90px", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 4 }}>
            {["Membro", "Ruolo", "Totale", "Attivi", "Chiusi", "Conv.%"].map((h) => (
              <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>{h}</span>
            ))}
          </div>
          {overviewStats.memberStats.map((m) => (
            <div key={m.userId} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px 90px", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--glass-border)", alignItems: "center" }}>
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{m.displayName}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{m.role}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>{m.total}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-info)" }}>{m.active}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-success)" }}>{m.completed}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: m.conversionRate >= 0.5 ? "var(--color-success)" : m.conversionRate > 0 ? "var(--accent-primary)" : "var(--text-tertiary)" }}>
                {m.completed + m.rejected > 0 ? `${(m.conversionRate * 100).toFixed(1)}%` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards — 5 col desktop, 2 col mobile */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32 }}>
        {kpiCards.map((kpi) => (
          <div key={kpi.label}
            onClick={kpi.onClick}
            title={kpi.label === "Scartati no-contatti" ? "Lead trovati ma scartati perché senza email né telefono. Non sono salvati nel CRM." : undefined}
            style={{
              background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
              borderRadius: "var(--radius-md)", padding: "20px 24px",
              cursor: kpi.onClick ? "pointer" : "default",
            }}
            onMouseEnter={(e) => { if (kpi.onClick) e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 8px" }}>{kpi.label}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: kpi.dim ? "var(--text-tertiary)" : "var(--text-primary)", margin: 0 }}>{kpi.value}</p>
            {"sub" in kpi && kpi.sub && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", margin: "4px 0 0" }}>{kpi.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 32 }}>
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

      {showDiscardModal && (
        <DiscardedInfoModal
          onClose={() => setShowDiscardModal(false)}
          summary={{
            discardedNoContact: summary.discardedNoContact,
            totalRawResults: summary.totalRawResults,
            excludedChains: totalExcludedChains,
            saved: summary.total,
          }}
        />
      )}
    </div>
  );
}
