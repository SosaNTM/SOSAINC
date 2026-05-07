import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalDB } from "@/lib/portalContextDB";
import { supabase } from "@/lib/supabase";
import { useLeadgenOverviewDashboard } from "@/hooks/leadgen/useLeadgenOverviewDashboard";
import type { LeadgenLead, LeadgenSearch } from "@/types/leadgen";

// ── Types ────────────────────────────────────────────────────────────────────

type DrilldownConfig =
  | { kind: "all_leads"; title: string }
  | { kind: "leads_by_status"; title: string; statuses: string[] }
  | { kind: "leads_by_website"; title: string; hasWebsite: boolean }
  | { kind: "member_leads"; title: string; userId: string }
  | { kind: "searches"; title: string }
  | { kind: "outreach"; title: string };

type OutreachRow = {
  id: string;
  channel: string;
  direction: string;
  occurred_at: string;
  lead_id: string;
  lead_name: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  new: "Nuovo", contacted: "Contattato", replied: "Risposto",
  qualified: "Qualificato", converted: "Convertito", rejected: "Rifiutato",
};

const STATUS_COLOR: Record<string, string> = {
  new: "var(--text-tertiary)",
  contacted: "var(--color-info)",
  replied: "var(--color-warning)",
  qualified: "var(--color-warning)",
  converted: "var(--color-success)",
  rejected: "var(--color-error)",
};

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, dim, onClick,
}: {
  label: string; value: string | number; dim?: boolean; onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { if (clickable) setHover(true); }}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(255,255,255,0.04)" : "var(--glass-bg)",
        border: `0.5px solid ${hover ? "var(--accent-primary)" : "var(--glass-border)"}`,
        padding: "18px 20px",
        cursor: clickable ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s",
        position: "relative",
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--text-tertiary)", margin: "0 0 8px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: dim ? "var(--text-tertiary)" : "var(--text-primary)", margin: 0 }}>
        {value}
      </p>
      {clickable && (
        <span style={{ position: "absolute", top: 10, right: 10, fontFamily: "var(--font-mono)", fontSize: 9, color: hover ? "var(--accent-primary)" : "var(--text-tertiary)", opacity: hover ? 1 : 0.4, transition: "opacity 0.15s, color 0.15s" }}>
          ↗
        </span>
      )}
    </div>
  );
}

// ── Drilldown Modal ───────────────────────────────────────────────────────────

interface DrilldownModalProps {
  config: DrilldownConfig;
  portalId: string;
  prefix: string;
  onClose: () => void;
}

function DrilldownModal({ config, portalId, prefix, onClose }: DrilldownModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadgenLead[]>([]);
  const [searches, setSearches] = useState<LeadgenSearch[]>([]);
  const [outreach, setOutreach] = useState<OutreachRow[]>([]);

  useEffect(() => {
    if (!portalId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (config.kind === "searches") {
        const { data } = await supabase
          .from("leadgen_searches")
          .select("*")
          .eq("portal_id", portalId)
          .order("started_at", { ascending: false });
        if (!cancelled) setSearches((data ?? []) as LeadgenSearch[]);
      } else if (config.kind === "outreach") {
        const { data } = await supabase
          .from("leadgen_outreach_events")
          .select("id, channel, direction, occurred_at, lead_id, leadgen_leads(name)")
          .eq("portal_id", portalId)
          .order("occurred_at", { ascending: false })
          .limit(100);
        if (!cancelled) {
          setOutreach(
            (data ?? []).map((e: any) => ({
              id: e.id,
              channel: e.channel,
              direction: e.direction,
              occurred_at: e.occurred_at,
              lead_id: e.lead_id,
              lead_name: e.leadgen_leads?.name ?? null,
            }))
          );
        }
      } else {
        let query = supabase
          .from("leadgen_leads")
          .select("*")
          .eq("portal_id", portalId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (config.kind === "leads_by_status") {
          query = query.in("outreach_status", config.statuses);
        } else if (config.kind === "leads_by_website") {
          query = query.eq("has_website", config.hasWebsite);
        } else if (config.kind === "member_leads") {
          query = query.eq("assigned_to", config.userId);
        }

        const { data } = await query;
        if (!cancelled) setLeads((data ?? []) as LeadgenLead[]);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [config, portalId]);

  const mono = { fontFamily: "var(--font-mono)", fontSize: 11 } as const;
  const header = {
    ...mono, fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.08em", color: "var(--text-tertiary)",
  };
  const rowBase = {
    borderBottom: "1px solid var(--glass-border)", alignItems: "center",
    cursor: "pointer" as const, transition: "background 0.1s",
  };

  const renderContent = () => {
    if (loading) {
      return (
        <p style={{ ...mono, color: "var(--text-tertiary)", padding: "24px 0" }}>Caricamento...</p>
      );
    }

    // ── Searches list ──────────────────────────────────────────────────────
    if (config.kind === "searches") {
      if (searches.length === 0) {
        return <p style={{ ...mono, color: "var(--text-tertiary)", padding: "16px 0" }}>Nessuna ricerca.</p>;
      }
      const cols = "2fr 140px 70px 70px 80px";
      return (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "4px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
            {["Keyword", "Data", "Salvati", "Scartati", "Stato"].map((h) => (
              <span key={h} style={header}>{h}</span>
            ))}
          </div>
          {searches.map((s) => (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 0", ...rowBase, cursor: "default" }}>
              <span style={{ ...mono, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.category ?? "—"}</span>
              <span style={{ ...mono, color: "var(--text-secondary)" }}>{fmt(s.started_at)}</span>
              <span style={{ ...mono, color: "var(--color-success)" }}>{s.total_results}</span>
              <span style={{ ...mono, color: "var(--text-tertiary)" }}>{s.discarded_no_contact_count}</span>
              <span style={{
                ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em",
                color: s.status === "completed" ? "var(--color-success)" : s.status === "failed" ? "var(--color-error)" : "var(--color-warning)",
              }}>{s.status}</span>
            </div>
          ))}
        </div>
      );
    }

    // ── Outreach events ────────────────────────────────────────────────────
    if (config.kind === "outreach") {
      if (outreach.length === 0) {
        return <p style={{ ...mono, color: "var(--text-tertiary)", padding: "16px 0" }}>Nessuna attività.</p>;
      }
      const cols = "2fr 110px 90px 140px";
      return (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "4px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
            {["Lead", "Canale", "Direzione", "Data"].map((h) => (
              <span key={h} style={header}>{h}</span>
            ))}
          </div>
          {outreach.map((e) => (
            <div
              key={e.id}
              onClick={() => { navigate(`${prefix}/leadgen/lead/${e.lead_id}`); onClose(); }}
              onMouseEnter={(ev) => { (ev.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLElement).style.background = "transparent"; }}
              style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 0", ...rowBase }}
            >
              <span style={{ ...mono, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.lead_name ?? `${e.lead_id.slice(0, 8)}…`}
              </span>
              <span style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-info)" }}>{e.channel}</span>
              <span style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>{e.direction}</span>
              <span style={{ ...mono, color: "var(--text-secondary)" }}>{fmt(e.occurred_at)}</span>
            </div>
          ))}
        </div>
      );
    }

    // ── Lead list (all other kinds) ────────────────────────────────────────
    if (leads.length === 0) {
      return <p style={{ ...mono, color: "var(--text-tertiary)", padding: "16px 0" }}>Nessun lead.</p>;
    }
    const cols = "2fr 150px 60px 70px 100px";
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "4px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
          {["Nome", "Categoria", "★", "Rec.", "Stato"].map((h) => (
            <span key={h} style={header}>{h}</span>
          ))}
        </div>
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => { navigate(`${prefix}/leadgen/lead/${lead.id}`); onClose(); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            style={{ display: "grid", gridTemplateColumns: cols, gap: 12, padding: "8px 0", ...rowBase }}
          >
            <span style={{ ...mono, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</span>
            <span style={{ ...mono, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.category ?? "—"}</span>
            <span style={{ ...mono, color: "var(--text-primary)" }}>{lead.rating?.toFixed(1) ?? "—"}</span>
            <span style={{ ...mono, color: "var(--text-tertiary)" }}>{lead.reviews_count ?? "—"}</span>
            <span style={{ ...mono, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: STATUS_COLOR[lead.outreach_status] ?? "var(--text-tertiary)" }}>
              {STATUS_LABEL[lead.outreach_status] ?? lead.outreach_status}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: "min(880px, 92vw)", maxHeight: "80vh",
        background: "var(--sosa-bg)", border: "1px solid var(--glass-border)",
        zIndex: 1001, display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {config.title}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadgenOverview() {
  const { currentPortalId, currentPortal } = usePortalDB();
  const dashboard = useLeadgenOverviewDashboard();
  const [drilldown, setDrilldown] = useState<DrilldownConfig | null>(null);

  const prefix = `/${currentPortal?.slug ?? ""}`;

  if (dashboard.loading) {
    return (
      <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Caricamento...
      </div>
    );
  }

  const row1: { label: string; value: string | number; config: DrilldownConfig }[] = [
    { label: "Lead Totali",    value: dashboard.totalLeads,    config: { kind: "all_leads",          title: "Tutti i Lead" } },
    { label: "Non Contattati", value: dashboard.notContacted,  config: { kind: "leads_by_status",    title: "Non Contattati",  statuses: ["new"] } },
    { label: "Contattati",     value: dashboard.contacted,     config: { kind: "leads_by_status",    title: "Contattati",      statuses: ["contacted"] } },
    { label: "In Trattativa",  value: dashboard.inNegotiation, config: { kind: "leads_by_status",    title: "In Trattativa",   statuses: ["replied", "qualified"] } },
    { label: "Convertiti",     value: dashboard.converted,     config: { kind: "leads_by_status",    title: "Convertiti",      statuses: ["converted"] } },
    { label: "Rifiutati",      value: dashboard.rejected,      config: { kind: "leads_by_status",    title: "Rifiutati",       statuses: ["rejected"] } },
  ];

  const row2: { label: string; value: string | number; dim?: boolean; config: DrilldownConfig }[] = [
    { label: "Ricerche Effettuate", value: dashboard.searchCount,          config: { kind: "searches", title: "Ricerche Effettuate" } },
    { label: "Lead Scartati",       value: dashboard.discardedTotal, dim: true, config: { kind: "searches", title: "Ricerche — Lead Scartati" } },
    { label: "Lead con Sito",       value: dashboard.withWebsite,           config: { kind: "leads_by_website", title: "Lead con Sito",    hasWebsite: true } },
    { label: "Lead senza Sito",     value: dashboard.withoutWebsite,        config: { kind: "leads_by_website", title: "Lead senza Sito",  hasWebsite: false } },
    { label: "Tasso Conversione",   value: `${dashboard.conversionRate.toFixed(1)}%`, config: { kind: "leads_by_status", title: "Lead Convertiti", statuses: ["converted"] } },
    { label: "Attività Outreach",   value: dashboard.outreachActivityCount, config: { kind: "outreach", title: "Attività Outreach" } },
  ];

  const tableHeaders = ["Nome", "Ruolo", "Assegnati", "Contattati", "Convertiti", "Ultima attività"];
  const gridCols = "2fr 80px 90px 90px 90px 140px";

  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 24px", letterSpacing: "0.02em" }}>
        Overview — Team Lead Generation
      </h1>

      {/* Row 1 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 10 }}>
        {row1.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} onClick={() => setDrilldown(kpi.config)} />
        ))}
      </div>

      {/* Row 2 KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
        {row2.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} dim={kpi.dim} onClick={() => setDrilldown(kpi.config)} />
        ))}
      </div>

      {/* Member activity table */}
      <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", padding: 20, marginBottom: 24 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 14px" }}>
          Attività per Membro
        </p>

        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12, padding: "4px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
          {tableHeaders.map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
              {h}
            </span>
          ))}
        </div>

        {dashboard.memberActivity.length === 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
            Nessun membro attivo.
          </p>
        )}

        {dashboard.memberActivity.map((m) => (
          <div
            key={m.userId}
            onClick={() => setDrilldown({ kind: "member_leads", title: `Lead di ${m.displayName}`, userId: m.userId })}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12, padding: "8px 0", borderBottom: "1px solid var(--glass-border)", alignItems: "center", cursor: "pointer" }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.displayName}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {m.role}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>{m.assignedLeads}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-info)" }}>{m.contacted}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-success)" }}>{m.converted}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>{fmt(m.lastActivityAt)}</span>
          </div>
        ))}
      </div>

      {/* Recent searches */}
      <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", padding: 20 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", margin: "0 0 14px" }}>
          Ricerche Recenti
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 90px 90px", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
          {["Keyword", "Data", "Salvati", "Scartati"].map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
              {h}
            </span>
          ))}
        </div>

        {dashboard.recentSearches.length === 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", padding: "10px 0" }}>
            Nessuna ricerca effettuata.
          </p>
        )}

        {dashboard.recentSearches.map((s) => (
          <div
            key={s.id}
            onClick={() => setDrilldown({ kind: "searches", title: "Tutte le Ricerche" })}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            style={{ display: "grid", gridTemplateColumns: "2fr 120px 90px 90px", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--glass-border)", alignItems: "center", cursor: "pointer" }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.category ?? "—"}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{fmt(s.started_at)}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-success)" }}>{s.total_results}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>{s.discarded_no_contact_count}</span>
          </div>
        ))}
      </div>

      {/* Drilldown modal */}
      {drilldown && currentPortalId && (
        <DrilldownModal
          config={drilldown}
          portalId={currentPortalId}
          prefix={prefix}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
