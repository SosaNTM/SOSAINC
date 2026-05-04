import { useState, useRef, useMemo, useEffect } from "react";
import { Plus, Filter } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { useLeadgenLeads } from "@/hooks/leadgen/useLeadgenLeads";
import { usePortalMembers } from "@/hooks/leadgen/usePortalMembers";
import { LeadTable } from "@/components/leadgen/LeadTable";
import { LeadOutreachStatusBadge } from "@/components/leadgen/LeadOutreachStatusBadge";
import { AddLeadModal } from "@/components/leadgen/AddLeadModal";
import type { OutreachStatus, LeadgenLead } from "@/types/leadgen";
import { toast } from "sonner";
import type { Column } from "@/components/leadgen/LeadTable";

const STATUS_FILTERS = ["all", "new", "contacted", "replied", "qualified", "converted", "rejected"] as const;

export default function LeadgenNoWebsite() {
  const { portal } = usePortal();
  const [showAdd, setShowAdd] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const searchText = searchParams.get("q") ?? "";
  const outreachFilter = (searchParams.get("status") as OutreachStatus | "all") ?? "all";
  const filterCategories = searchParams.getAll("cat");
  const minRating = parseFloat(searchParams.get("minRating") ?? "0") || 0;
  const maxRating = parseFloat(searchParams.get("maxRating") ?? "5") || 5;
  const minReviews = parseInt(searchParams.get("minReviews") ?? "0", 10) || 0;
  const maxReviews = parseInt(searchParams.get("maxReviews") ?? "999999", 10) || 999999;
  const onlyWithEmail = searchParams.get("email") === "1";
  const onlyWithPhone = searchParams.get("phone") === "1";

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === "" || value === "0" || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  };

  const setMultiParam = (key: string, values: string[]) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      values.forEach((v) => next.append(key, v));
      return next;
    }, { replace: true });
  };

  const resetFilters = () => setSearchParams({}, { replace: true });

  const { leads: rawLeads, loading, updateLead, prependLead } = useLeadgenLeads({
    hasWebsite: false,
    outreachStatus: outreachFilter === "all" ? undefined : outreachFilter,
    searchText,
    categories: filterCategories.length > 0 ? filterCategories : undefined,
    minRating: minRating > 0 ? minRating : undefined,
  });
  const { members } = usePortalMembers();

  const leads = useMemo(() => {
    let result = rawLeads;
    if (minReviews > 0) result = result.filter((l) => (l.reviews_count ?? 0) >= minReviews);
    if (maxReviews < 999999) result = result.filter((l) => (l.reviews_count ?? 0) <= maxReviews);
    if (maxRating < 5) result = result.filter((l) => (l.rating ?? 0) <= maxRating);
    if (onlyWithEmail) result = result.filter((l) => l.emails?.length > 0);
    if (onlyWithPhone) result = result.filter((l) => !!l.phone);
    return result;
  }, [rawLeads, minReviews, maxReviews, maxRating, onlyWithEmail, onlyWithPhone]);

  const uniqueCategories = useMemo(
    () => [...new Set(rawLeads.map((l) => l.category).filter(Boolean) as string[])].sort(),
    [rawLeads]
  );

  const activeFilterCount = [
    outreachFilter !== "all",
    filterCategories.length > 0,
    minRating > 0,
    maxRating < 5,
    minReviews > 0,
    maxReviews < 999999,
    onlyWithEmail,
    onlyWithPhone,
  ].filter(Boolean).length;

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name ?? m.email]));

  const handleStatusChange = async (lead: LeadgenLead, status: OutreachStatus) => {
    const { error } = await updateLead(lead.id, {
      outreach_status: status,
      contacted_at: status !== "new" && !lead.contacted_at ? new Date().toISOString() : lead.contacted_at ?? undefined,
    });
    if (error) toast.error(error);
  };

  const columns: Column[] = [
    {
      key: "name", label: "Azienda", sortKey: "name",
      render: (l) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{l.name}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
            {[l.category, l.city].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    { key: "phone",    label: "Telefono",  sortKey: "phone",    render: (l) => l.phone ?? "—" },
    { key: "category", label: "Categoria", sortKey: "category", render: (l) => l.category ?? "—" },
    { key: "rating",   label: "Rating",    sortKey: "rating",   render: (l) => l.rating != null ? `${l.rating}` : "—" },
    { key: "city",     label: "Città",     sortKey: "city",     render: (l) => l.city ?? "—" },
    {
      key: "assigned_to", label: "Assegnato",
      render: (l) => l.assigned_to
        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{memberMap.get(l.assigned_to) ?? "—"}</span>
        : <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>—</span>,
    },
    {
      key: "outreach_status", label: "Status",
      render: (l) => <LeadOutreachStatusBadge status={l.outreach_status} onClick={(e) => e.stopPropagation()} />,
    },
  ];

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Senza sito web
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)" }}>
            Lead senza sito — pitch: creazione sito web.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}
        >
          <Plus size={14} /> Aggiungi lead
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text" placeholder="Cerca nome, categoria, città..."
          value={searchText} onChange={(e) => setParam("q", e.target.value)}
          className="glass-input" style={{ width: 260 }}
        />

        <div style={{ display: "flex", gap: 0, border: "0.5px solid var(--glass-border)", overflow: "hidden" }}>
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setParam("status", s)}
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

        <div ref={filterRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setFilterOpen((p) => !p)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              background: filterOpen ? "var(--glass-bg)" : "transparent",
              border: `1px solid ${filterOpen || activeFilterCount > 0 ? "var(--accent-primary)" : "var(--glass-border)"}`,
              color: filterOpen || activeFilterCount > 0 ? "var(--accent-primary)" : "var(--text-tertiary)",
              cursor: "pointer",
            }}
          >
            <Filter size={11} />
            Filtri{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>

          {filterOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
              background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)",
              width: 300, padding: 20,
              boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
            }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 16 }}>
                Filtri avanzati
              </p>

              {uniqueCategories.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
                    Categoria
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {uniqueCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const next = filterCategories.includes(cat)
                            ? filterCategories.filter((c) => c !== cat)
                            : [...filterCategories, cat];
                          setMultiParam("cat", next);
                        }}
                        style={{
                          padding: "3px 8px",
                          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                          background: filterCategories.includes(cat) ? "var(--accent-primary)" : "transparent",
                          border: `1px solid ${filterCategories.includes(cat) ? "var(--accent-primary)" : "var(--glass-border)"}`,
                          color: filterCategories.includes(cat) ? "#000" : "var(--text-tertiary)",
                          cursor: "pointer",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
                  Rating (min – max)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min={0} max={5} step={0.1}
                    value={minRating || ""}
                    onChange={(e) => setParam("minRating", e.target.value)}
                    placeholder="0.0" className="glass-input" style={{ width: 70, fontSize: 11 }}
                  />
                  <span style={{ alignSelf: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>—</span>
                  <input type="number" min={0} max={5} step={0.1}
                    value={maxRating === 5 ? "" : maxRating}
                    onChange={(e) => setParam("maxRating", e.target.value)}
                    placeholder="5.0" className="glass-input" style={{ width: 70, fontSize: 11 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>
                  N. recensioni (min – max)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min={0}
                    value={minReviews || ""}
                    onChange={(e) => setParam("minReviews", e.target.value)}
                    placeholder="0" className="glass-input" style={{ width: 80, fontSize: 11 }}
                  />
                  <span style={{ alignSelf: "center", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>—</span>
                  <input type="number" min={0}
                    value={maxReviews === 999999 ? "" : maxReviews}
                    onChange={(e) => setParam("maxReviews", e.target.value)}
                    placeholder="∞" className="glass-input" style={{ width: 80, fontSize: 11 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" checked={onlyWithEmail}
                    onChange={(e) => setParam("email", e.target.checked ? "1" : null)}
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>Solo con email</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={onlyWithPhone}
                    onChange={(e) => setParam("phone", e.target.checked ? "1" : null)}
                    style={{ accentColor: "var(--accent-primary)" }}
                  />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>Solo con telefono</span>
                </label>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button" onClick={resetFilters}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  Reset filtri
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <LeadTable leads={leads} columns={columns} onStatusChange={handleStatusChange} portalSlug={portal?.id ?? "redx"} />

      {showAdd && (
        <AddLeadModal
          defaultHasWebsite={false}
          onClose={() => setShowAdd(false)}
          onCreated={prependLead}
        />
      )}
    </div>
  );
}
