import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";
import { LeadOutreachStatusBadge, STATUS_CONFIG } from "./LeadOutreachStatusBadge";
import { ChevronUp, ChevronDown } from "lucide-react";

const PAGE_SIZE = 25;
type SortKey = keyof LeadgenLead;

export interface Column {
  key: string;
  label: string;
  render: (lead: LeadgenLead) => React.ReactNode;
  sortKey?: SortKey;
}

interface Props {
  leads: LeadgenLead[];
  columns: Column[];
  onStatusChange?: (lead: LeadgenLead, status: OutreachStatus) => void;
  portalSlug: string;
}

function exportCsv(leads: LeadgenLead[], columns: Column[]) {
  const header = columns.map((c) => c.label).join(",");
  const rows = leads.map((l) =>
    columns.map((c) => {
      const raw = c.render(l);
      const text = typeof raw === "string" ? raw : String(l[c.key as SortKey] ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `leads-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function LeadTable({ leads, columns, onStatusChange, portalSlug }: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OutreachStatus>("contacted");

  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  }, [leads, sortKey, sortAsc]);

  const pageLeads = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(leads.length / PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyBulkStatus = () => {
    if (!onStatusChange) return;
    leads.filter((l) => selected.has(l.id)).forEach((l) => onStatusChange(l, bulkStatus));
    setSelected(new Set());
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
          {leads.length} lead
        </span>
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{selected.size} selezionati</span>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as OutreachStatus)} className="glass-input" style={{ width: "auto", fontSize: 11, padding: "4px 8px" }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={applyBulkStatus} className="btn-glass-ds" style={{ fontSize: 11 }}>Applica</button>
          </>
        )}
        <button onClick={() => exportCsv(leads, columns)} className="btn-glass-ds" style={{ fontSize: 11 }}>
          Esporta CSV
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
              <th style={{ padding: "8px 8px", width: 32 }}>
                <input type="checkbox"
                  checked={selected.size === pageLeads.length && pageLeads.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(pageLeads.map((l) => l.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              {columns.map((col) => (
                <th key={col.key} onClick={() => col.sortKey && toggleSort(col.sortKey)}
                  style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", cursor: col.sortKey ? "pointer" : "default", whiteSpace: "nowrap", userSelect: "none" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {col.sortKey && sortKey === col.sortKey && (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageLeads.map((lead) => (
              <tr key={lead.id}
                style={{ borderBottom: "1px solid var(--glass-border)", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sosa-bg-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => navigate(`/${portalSlug}/leadgen/lead/${lead.id}`)}
              >
                <td style={{ padding: "10px 8px" }} onClick={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}>
                  <input type="checkbox" checked={selected.has(lead.id)} readOnly />
                </td>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
                    {col.render(lead)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-glass-ds" style={{ padding: "4px 10px" }}>←</button>
          <span style={{ color: "var(--text-tertiary)" }}>{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn-glass-ds" style={{ padding: "4px 10px" }}>→</button>
        </div>
      )}
    </div>
  );
}
