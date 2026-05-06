import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenMembers } from "@/hooks/leadgen/useLeadgenMembers";
import { usePersonalLeadgenSummary } from "@/hooks/leadgen/usePersonalLeadgenSummary";
import { usePersonalLeads, useArchivedLeads } from "@/hooks/leadgen/usePersonalLeads";
import {
  GROUP_LABELS, GROUP_COLOR, PERIOD_LABELS,
  type DashboardGroup, type DashboardPeriod,
} from "@/lib/leadgenStatusGroups";
import { STATUS_CONFIG } from "@/components/leadgen/LeadOutreachStatusBadge";
import { ChevronDown, ChevronUp, Search, Loader2 } from "lucide-react";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "meno di un'ora fa";
  if (h < 24) return `${h} ${h === 1 ? "ora" : "ore"} fa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "giorno" : "giorni"} fa`;
  return new Date(iso).toLocaleDateString("it-IT");
}

function DeltaBadge({ delta, goodWhenNegative, period }: {
  delta: number; goodWhenNegative: boolean; period: DashboardPeriod;
}) {
  if (period === "all" || delta === 0) return null;
  const isGood = goodWhenNegative ? delta < 0 : delta > 0;
  const color = Math.abs(delta) < 2 ? "var(--text-tertiary)" : isGood ? "var(--color-success)" : "var(--color-error)";
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color }}>
      {delta > 0 ? "+" : ""}{delta} rispetto al periodo precedente
    </span>
  );
}

const KPI_DEFS: {
  key: keyof import("@/hooks/leadgen/usePersonalLeadgenSummary").PersonalSummaryData;
  deltaKey: keyof import("@/hooks/leadgen/usePersonalLeadgenSummary").PersonalSummaryData;
  group: DashboardGroup;
  subline: string;
  goodWhenNegative: boolean;
}[] = [
  { key: "uncontacted", deltaKey: "deltaUncontacted", group: "uncontacted", subline: "lead in attesa di primo contatto", goodWhenNegative: true  },
  { key: "contacted",   deltaKey: "deltaContacted",   group: "contacted",   subline: "lead contattati, in attesa di risposta", goodWhenNegative: false },
  { key: "inProgress",  deltaKey: "deltaInProgress",  group: "in_progress", subline: "conversazioni attive", goodWhenNegative: false },
  { key: "completed",   deltaKey: "deltaCompleted",   group: "completed",   subline: "deal chiusi", goodWhenNegative: false },
];

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, subline, count, delta, deltaGoodWhenNegative, color, onClick, loading, period }: {
  label: string; subline: string; count: number; delta: number;
  deltaGoodWhenNegative: boolean; color: string;
  onClick: () => void; loading: boolean; period: DashboardPeriod;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--glass-bg)", border: `0.5px solid var(--glass-border)`,
        padding: "20px 22px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color, margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>
        {loading ? "—" : count}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>{subline}</p>
      <DeltaBadge delta={delta} goodWhenNegative={deltaGoodWhenNegative} period={period} />
    </div>
  );
}

function QuickStatsStrip({ summary }: {
  summary: ReturnType<typeof usePersonalLeadgenSummary>;
}) {
  const convPct = (summary.personalConversionRate * 100).toFixed(1) + "%";
  const teamPct = summary.teamAverageConversionRate;
  const convColor = summary.personalConversionRate > teamPct ? "var(--color-success)"
    : summary.personalConversionRate < teamPct ? "var(--color-error)"
    : "var(--text-secondary)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
      padding: "10px 16px", background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
      fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)",
      marginBottom: 32,
    }}>
      <span>◆ <strong style={{ color: "var(--text-primary)" }}>{summary.totalActive}</strong> lead totali assegnati</span>
      <span style={{ color: "var(--glass-border)" }}>●</span>
      <span>Ultima azione:{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          {summary.lastActionAt ? timeAgo(summary.lastActionAt) : "mai"}
        </strong>
      </span>
      <span style={{ color: "var(--glass-border)" }}>●</span>
      <span>Tasso conversione:{" "}
        <strong style={{ color: convColor }}>{convPct}</strong>
        {summary.teamAverageConversionRate > 0 && (
          <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
            (team: {(teamPct * 100).toFixed(1)}%)
          </span>
        )}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "2px 7px",
      background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
      border: `1px solid ${cfg.color}`, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function LeadRow({ lead, slug, navigate }: { lead: LeadgenLead; slug: string; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div
      onClick={() => navigate(`/${slug}/leadgen/lead/${lead.id}`)}
      style={{
        display: "grid", gridTemplateColumns: "1fr 120px 130px 100px",
        gap: 12, padding: "10px 0", borderBottom: "1px solid var(--glass-border)",
        cursor: "pointer", alignItems: "center",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.name}
        </span>
        {lead.category && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>{lead.category}</span>
        )}
      </div>
      <StatusBadge status={lead.outreach_status} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
        {lead.city ?? "—"}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
        {lead.updated_at ? timeAgo(lead.updated_at) : "—"}
      </span>
    </div>
  );
}

function ArchivedRow({ lead, onReopen, slug, navigate }: {
  lead: LeadgenLead; onReopen: (id: string) => Promise<void>;
  slug: string; navigate: ReturnType<typeof useNavigate>;
}) {
  const [reopening, setReopening] = useState(false);
  const handleReopen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReopening(true);
    await onReopen(lead.id);
    setReopening(false);
  };
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr 130px 130px auto",
        gap: 12, padding: "8px 0", borderBottom: "1px solid var(--glass-border)",
        cursor: "pointer", alignItems: "center", opacity: 0.7,
      }}
      onClick={() => navigate(`/${slug}/leadgen/lead/${lead.id}`)}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lead.name}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
        {lead.city ?? "—"}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lead.outreach_notes ? lead.outreach_notes.slice(0, 40) : "—"}
      </span>
      <button
        type="button"
        onClick={handleReopen}
        disabled={reopening}
        className="btn-glass-ds"
        style={{ fontSize: 10, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        {reopening ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : null}
        Riapri →
      </button>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const PERIOD_OPTS = (Object.entries(PERIOD_LABELS) as [DashboardPeriod, string][]);
const GROUP_FILTER_OPTS: { label: string; value: DashboardGroup | "all_active" }[] = [
  { label: "Tutti",           value: "all_active"  },
  { label: GROUP_LABELS.uncontacted, value: "uncontacted" },
  { label: GROUP_LABELS.contacted,   value: "contacted"   },
  { label: GROUP_LABELS.in_progress, value: "in_progress" },
  { label: GROUP_LABELS.completed,   value: "completed"   },
];
const PAGE_SIZE = 25;

export default function LeadgenDashboard() {
  const { portal } = usePortal();
  const navigate = useNavigate();
  const slug = portal?.id ?? "redx";
  const listRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [activeGroup, setActiveGroup] = useState<DashboardGroup | "all_active">("all_active");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "created" | "rating">("updated");
  const [page, setPage] = useState(0);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const { currentMember } = useLeadgenMembers();
  const summary = usePersonalLeadgenSummary(period);
  const { leads, totalCount, loading: leadsLoading } = usePersonalLeads({
    group: activeGroup,
    searchText,
    sortBy,
    sortDir: "desc",
    page,
    pageSize: PAGE_SIZE,
  });
  const { leads: archivedLeads, totalCount: archivedCount, reopen } = useArchivedLeads();

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [activeGroup, searchText, sortBy]);

  const greetName = currentMember?.display_name ?? "there";
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleKpiClick = (group: DashboardGroup) => {
    setActiveGroup(group);
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  // Empty state: no leads at all
  if (!summary.loading && summary.totalActive === 0 && summary.archived === 0) {
    return (
      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
          Benvenuto, {greetName}!
        </h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", marginBottom: 24, textAlign: "center" }}>
          Non hai ancora lead assegnati. Vai sul pool e prendine uno per iniziare.
        </p>
        <button
          onClick={() => navigate(`/${slug}/leadgen/today`)}
          className="btn-primary"
        >
          Vai al pool →
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Header + period selector */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}>
            Ciao {greetName}, ecco i tuoi lead.
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PERIOD_OPTS.map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              style={{
                padding: "5px 12px",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                background: period === val ? "var(--accent-primary)" : "transparent",
                border: `1px solid ${period === val ? "var(--accent-primary)" : "var(--glass-border)"}`,
                color: period === val ? "var(--sosa-bg)" : "var(--text-tertiary)",
                cursor: "pointer",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards — 4 col desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {KPI_DEFS.map((def) => (
          <KpiCard
            key={String(def.key)}
            label={GROUP_LABELS[def.group]}
            subline={def.subline}
            count={summary[def.key] as number}
            delta={summary[def.deltaKey] as number}
            deltaGoodWhenNegative={def.goodWhenNegative}
            color={GROUP_COLOR[def.group]}
            onClick={() => handleKpiClick(def.group)}
            loading={summary.loading}
            period={period}
          />
        ))}
      </div>

      {/* Quick stats strip */}
      <QuickStatsStrip summary={summary} />

      {/* Lead list section */}
      <div ref={listRef}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {/* Group pills */}
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {GROUP_FILTER_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveGroup(opt.value)}
                style={{
                  padding: "4px 10px",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                  background: activeGroup === opt.value ? "var(--glass-border)" : "transparent",
                  border: `1px solid ${activeGroup === opt.value ? "var(--text-tertiary)" : "var(--glass-border)"}`,
                  color: activeGroup === opt.value ? "var(--text-primary)" : "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", padding: "5px 10px" }}>
            <Search size={11} style={{ color: "var(--text-tertiary)" }} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Cerca..."
              style={{ background: "none", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)", width: 140 }}
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="glass-input"
            style={{ fontSize: 10, padding: "5px 8px" }}
          >
            <option value="updated">Ultima modifica</option>
            <option value="created">Data creazione</option>
            <option value="name">Nome</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 130px 100px", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
          {["Nome", "Stato", "Città", "Ultima azione"].map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {leadsLoading ? (
          <div style={{ padding: "32px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Caricamento...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 }}>
              {period !== "all" ? "Nessun lead in questo periodo." : "Nessun lead attivo."}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {period !== "all" && (
                <button onClick={() => setPeriod("all")} className="btn-glass-ds" style={{ fontSize: 11 }}>
                  Vedi tutti i miei lead
                </button>
              )}
              <button onClick={() => navigate(`/${slug}/leadgen/today`)} className="btn-primary" style={{ fontSize: 11 }}>
                Prendi nuovi lead dal pool →
              </button>
            </div>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} slug={slug} navigate={navigate} />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
            <span>{totalCount} lead · pagina {page + 1} di {totalPages}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-glass-ds" style={{ padding: "4px 10px", fontSize: 10 }}>← Prec</button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-glass-ds" style={{ padding: "4px 10px", fontSize: 10 }}>Succ →</button>
            </div>
          </div>
        )}
      </div>

      {/* Archived section */}
      <div style={{ marginTop: 40, borderTop: "1px solid var(--glass-border)", paddingTop: 20 }}>
        <button
          type="button"
          onClick={() => setArchivedExpanded((p) => !p)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
            Archiviati (rejected)
          </span>
          {archivedCount > 0 && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", background: "var(--glass-border)", padding: "1px 6px" }}>
              {archivedCount}
            </span>
          )}
          {archivedExpanded ? <ChevronUp size={13} style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown size={13} style={{ color: "var(--text-tertiary)" }} />}
        </button>

        {archivedExpanded && (
          <div style={{ marginTop: 12 }}>
            {archivedLeads.length === 0 ? (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", padding: "16px 0" }}>Nessun lead archiviato.</p>
            ) : (
              <>
                {/* Archived table header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px auto", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 2 }}>
                  {["Nome", "Città", "Note", ""].map((h, i) => (
                    <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
                      {h}
                    </span>
                  ))}
                </div>
                {archivedLeads.map((lead) => (
                  <ArchivedRow key={lead.id} lead={lead} onReopen={reopen} slug={slug} navigate={navigate} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
