import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Plus, ExternalLink, Filter } from "lucide-react";
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

export default function LeadgenWithWebsite() {
  const { portal } = usePortal();
  const [showAdd, setShowAdd] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const searchText = searchParams.get("q") ?? "";
  const rawStatus = searchParams.get("status");
  const outreachFilter = (STATUS_FILTERS.includes(rawStatus as typeof STATUS_FILTERS[number]) ? rawStatus : "all") as OutreachStatus | "all";
  const filterCategories = searchParams.getAll("cat");
  const minRating = parseFloat(searchParams.get("minRating") ?? "0") || 0;
  const maxRating = parseFloat(searchParams.get("maxRating") ?? "5") || 5;
  const minReviews = parseInt(searchParams.get("minReviews") ?? "0", 10) || 0;
  const maxReviews = parseInt(searchParams.get("maxReviews") ?? "999999", 10) || 999999;
  const onlyWithEmail = searchParams.get("email") === "1";
  const onlyWithPhone = searchParams.get("phone") === "1";

  const setParam = useCallback((key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === "" || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setMultiParam = useCallback((key: string, values: string[]) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      values.forEach((v) => next.append(key, v));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const resetFilters = () => setSearchParams({}, { replace: true });

  const { leads: rawLeads, loading, updateLead, prependLead } = useLeadgenLeads({
    hasWebsite: true,
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

  const activeFilterCount = useMemo(() => [
    outreachFilter !== "all",
    filterCategories.length > 0,
    minRating > 0,
    maxRating < 5,
    minReviews > 0,
    maxReviews < 999999,
    onlyWithEmail,
    onlyWithPhone,
  ].filter(Boolean).length, [outreachFilter, filterCategories, minRating, maxRating, minReviews, maxReviews, onlyWithEmail, onlyWithPhone]);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.display_name ?? m.email])),
    [members]
  );

  const handleStatusChange = useCallback(async (lead: LeadgenLead, status: OutreachStatus) => {
    const { error } = await updateLead(lead.id, {
      outreach_status: status,
      contacted_at: status !== "new" && !lead.contacted_at ? new Date().toISOString() : lead.contacted_at ?? undefined,
    });
    if (error) toast.error(error);
  }, [updateLead]);

  const columns = useMemo<Column[]>(() => [
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
    {
      key: "website", label: "Sito", sortKey: "website",
      render: (l) => {
        if (!l.website) return "—";
        try {
          return (
            <a href={l.website} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: "var(--accent-primary)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "var(--font-mono)" }}>
              <ExternalLink size={11} /> {new URL(l.website).hostname}
            </a>
          );
        } catch {
          return l.website;
        }
      },
    },
    {
      key: "emails", label: "Email",
      render: (l) => l.emails?.length > 0 ? (
        <span style={{ background: "color-mix(in srgb, var(--color-success) 15%, transparent)", color: "var(--color-success)", padding: "2px 6px", fontFamily: "var(--font-mono)", fontSize: 10 }}>
          {l.emails.length} email
        </span>
      ) : "—",
    },
    { key: "phone",    label: "Telefono",  sortKey: "phone",    render: (l) => l.phone ?? "—" },
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
  ], [memberMap]);

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Con sito web
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)" }}>
            Lead con sito — pitch: redesign, SEO, ads, automation.
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
          defaultHasWebsite={true}
          onClose={() => setShowAdd(false)}
          onCreated={prependLead}
        />
      )}
    </div>
  );
}
