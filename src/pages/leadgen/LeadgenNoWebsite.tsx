import { useState } from "react";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenLeads } from "@/hooks/leadgen/useLeadgenLeads";
import { LeadTable } from "@/components/leadgen/LeadTable";
import { LeadOutreachStatusBadge } from "@/components/leadgen/LeadOutreachStatusBadge";
import type { OutreachStatus, LeadgenLead } from "@/types/leadgen";
import { toast } from "sonner";
import type { Column } from "@/components/leadgen/LeadTable";

const STATUS_FILTERS = ["all", "new", "contacted", "replied", "qualified", "converted", "rejected"] as const;

export default function LeadgenNoWebsite() {
  const { portal } = usePortal();
  const [outreachFilter, setOutreachFilter] = useState<OutreachStatus | "all">("all");
  const [searchText, setSearchText] = useState("");

  const { leads, loading, updateLead } = useLeadgenLeads({
    hasWebsite: false,
    outreachStatus: outreachFilter === "all" ? undefined : outreachFilter,
    searchText,
  });

  const handleStatusChange = async (lead: LeadgenLead, status: OutreachStatus) => {
    const { error } = await updateLead(lead.id, {
      outreach_status: status,
      contacted_at: status !== "new" && !lead.contacted_at ? new Date().toISOString() : lead.contacted_at ?? undefined,
    });
    if (error) toast.error(error);
  };

  const columns: Column[] = [
    { key: "name",            label: "Nome",      sortKey: "name",     render: (l) => l.name },
    { key: "phone",           label: "Telefono",  sortKey: "phone",    render: (l) => l.phone ?? "—" },
    { key: "category",        label: "Categoria", sortKey: "category", render: (l) => l.category ?? "—" },
    { key: "rating",          label: "Rating",    sortKey: "rating",   render: (l) => l.rating != null ? `${l.rating}` : "—" },
    { key: "city",            label: "Città",     sortKey: "city",     render: (l) => l.city ?? "—" },
    {
      key: "outreach_status", label: "Status",
      render: (l) => (
        <LeadOutreachStatusBadge
          status={l.outreach_status}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
  ];

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Senza sito web
      </h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)", marginBottom: 24 }}>
        Lead senza sito — pitch: creazione sito web.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text" placeholder="Cerca nome, categoria, città..."
          value={searchText} onChange={(e) => setSearchText(e.target.value)}
          className="glass-input" style={{ width: 260 }}
        />
        <div style={{ display: "flex", gap: 0, border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setOutreachFilter(s)}
              style={{
                padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", border: "none",
                background: outreachFilter === s ? "var(--accent-primary)" : "transparent",
                color: outreachFilter === s ? "#000" : "var(--text-tertiary)",
              }}>
              {s === "all" ? "Tutti" : s}
            </button>
          ))}
        </div>
      </div>

      <LeadTable
        leads={leads}
        columns={columns}
        onStatusChange={handleStatusChange}
        portalSlug={portal?.id ?? "redx"}
      />
    </div>
  );
}
