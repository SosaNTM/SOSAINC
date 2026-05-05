import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ExternalLink, UserCheck, SkipForward, Star, Send, EyeOff,
  Phone, Mail, MoreHorizontal, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePortal } from "@/lib/portalContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";
import { useColdLeads, type ColdLeadsFilters } from "@/hooks/leadgen/useColdLeads";
import { useFollowUpLeads } from "@/hooks/leadgen/useFollowUpLeads";
import { useHotLeads, type HotLead } from "@/hooks/leadgen/useHotLeads";
import type { LeadgenLead, OutreachChannel, OutreachDirection } from "@/types/leadgen";
import { useLeadgenMembers, type LeadgenMemberWithProfile } from "@/hooks/leadgen/useLeadgenMembers";
import { useAutoRelease } from "@/hooks/leadgen/useAutoRelease";
import type { FollowUpFilters } from "@/hooks/leadgen/useFollowUpLeads";
import type { HotLeadsFilters } from "@/hooks/leadgen/useHotLeads";

// ─── shared helpers ───────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={10} strokeWidth={1.5}
          fill={r >= i ? "#facc15" : "none"}
          color={r >= i ? "#facc15" : "var(--text-tertiary)"}
        />
      ))}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", marginLeft: 3 }}>
        {r.toFixed(1)}
      </span>
    </span>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em",
      padding: "1px 6px",
      background: accent ? "var(--accent-primary)" : "var(--glass-border)",
      color: accent ? "#000" : "var(--text-tertiary)",
    }}>
      {children}
    </span>
  );
}

function OwnerChip({ lead, members, currentUserId }: {
  lead: LeadgenLead;
  members: LeadgenMemberWithProfile[];
  currentUserId: string | null;
}) {
  if (!lead.assigned_to) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", padding: "1px 6px", background: "var(--glass-border)", color: "var(--text-tertiary)" }}>
        POOL
      </span>
    );
  }
  if (lead.assigned_to === currentUserId) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", padding: "1px 6px", background: "var(--accent-primary)", color: "var(--sosa-bg)" }}>
        MIO
      </span>
    );
  }
  const owner = members.find((m) => m.user_id === lead.assigned_to);
  const label = owner ? (owner.display_name ?? owner.email).split(" ")[0].substring(0, 8).toUpperCase() : "ALTRO";
  return (
    <span title={owner?.email} style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.06em", padding: "1px 6px", background: "var(--glass-border)", color: "var(--text-secondary)" }}>
      {label}
    </span>
  );
}

function AutoReleaseBanner({ count, leadNames, onDismiss }: {
  count: number;
  leadNames: string[];
  onDismiss: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "1px solid var(--color-warning)", marginBottom: 20 }}>
      <AlertTriangle size={14} style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
          {count} {count === 1 ? "tuo lead è tornato" : "tuoi lead sono tornati"} nel pool per inattività (&gt;14 giorni)
        </p>
        {leadNames.length > 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
            {leadNames.join(", ")}{count > leadNames.length ? ` e altri ${count - leadNames.length}` : ""}
          </p>
        )}
      </div>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0, padding: 0 }}>
        Chiudi
      </button>
    </div>
  );
}

function PillGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.05em",
            padding: "3px 10px",
            border: `1px solid ${value === o.value ? "var(--accent-primary)" : "var(--glass-border)"}`,
            background: value === o.value ? "var(--accent-primary)" : "transparent",
            color: value === o.value ? "#000" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CHANNELS: { value: OutreachChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "call", label: "Telefono" },
  { value: "dm_instagram", label: "DM Instagram" },
  { value: "pec", label: "PEC" },
];

// ─── Tab 1: Cold ─────────────────────────────────────────────────────────────

const TYPE_OPTS = [
  { value: "no_website" as const,  label: "Senza sito" },
  { value: "with_website" as const, label: "Con sito" },
  { value: "all" as const,          label: "Tutti" },
];
const RATING_OPTS = [
  { value: "any" as const, label: "Qualsiasi" },
  { value: "4.0" as const, label: "★4.0" },
  { value: "4.5" as const, label: "★4.5" },
];
const REVIEWS_OPTS = [
  { value: "any" as const,  label: "Qualsiasi" },
  { value: "20" as const,   label: "20+" },
  { value: "50" as const,   label: "50+" },
  { value: "100" as const,  label: "100+" },
];
const ORDER_OPTS = [
  { value: "score" as const,   label: "Score" },
  { value: "recent" as const,  label: "Più recenti" },
  { value: "reviews" as const, label: "Più recensioni" },
  { value: "rating" as const,  label: "Rating" },
];

const PAGE_SIZE = 24;

function ColdCard({
  lead, prefix, onMarked, onSkipped, isPool, members, currentUserId,
}: {
  lead: LeadgenLead;
  prefix: string;
  onMarked: (id: string) => void;
  onSkipped: (id: string) => void;
  isPool: boolean;
  members: LeadgenMemberWithProfile[];
  currentUserId: string | null;
}) {
  const navigate = useNavigate();
  const { currentPortalId } = usePortalDB();
  const [marking, setMarking] = useState(false);

  const handleContacted = useCallback(async () => {
    if (!currentPortalId || marking) return;
    setMarking(true);
    const now = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    if (isPool && user) {
      // Claim from pool — optimistic lock: only update if still unassigned
      const { data: updated } = await supabase
        .from("leadgen_leads")
        .update({
          outreach_status: "contacted",
          contacted_at: now,
          assigned_to: user.id,
          assigned_at: now,
          assigned_by: user.id,
          last_activity_at: now,
          updated_at: now,
        })
        .eq("portal_id", currentPortalId)
        .eq("id", lead.id)
        .is("assigned_to", null)
        .select("id");

      if (!updated?.length) {
        setMarking(false);
        toast.error("Lead già preso da qualcun altro");
        return;
      }

      await supabase.from("leadgen_outreach_events").insert({
        portal_id: currentPortalId, lead_id: lead.id,
        channel: "call", direction: "outbound" as const,
        notes: "Preso dal pool", occurred_at: now, user_id: user.id,
      });
    } else {
      await Promise.all([
        supabase.from("leadgen_leads")
          .update({ outreach_status: "contacted", contacted_at: now, last_activity_at: now, updated_at: now })
          .eq("portal_id", currentPortalId).eq("id", lead.id),
        supabase.from("leadgen_outreach_events")
          .insert({ portal_id: currentPortalId, lead_id: lead.id, channel: "call", direction: "outbound" as const, occurred_at: now, user_id: user?.id ?? null }),
      ]);
    }

    broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    toast.success(isPool ? `${lead.name} preso — ora è tuo` : `${lead.name} segnato come contattato`);
    onMarked(lead.id);
  }, [currentPortalId, lead.id, lead.name, marking, onMarked, isPool]);

  return (
    <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", display: "flex", flexDirection: "column" }}>
      {/* Hero placeholder */}
      <div style={{ height: 80, background: "var(--sosa-bg-2)", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color: "var(--text-tertiary)", letterSpacing: "0.05em", opacity: 0.3 }}>
          {lead.name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Name + chips row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}>
          <span title={lead.name}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>
            {lead.name}
          </span>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <OwnerChip lead={lead} members={members} currentUserId={currentUserId} />
            {!lead.has_website && <Chip accent>NO SITO</Chip>}
          </div>
        </div>

        {/* Stars + reviews */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Stars rating={lead.rating} />
          {lead.reviews_count != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
              ({lead.reviews_count} rec.)
            </span>
          )}
        </div>

        {/* Category + city */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {lead.category && <Chip>{lead.category}</Chip>}
          {lead.city && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
              {lead.city}
            </span>
          )}
        </div>

        {/* Contact info */}
        {(lead.phone || lead.emails?.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {lead.phone && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <Phone size={10} /> {lead.phone}
              </span>
            )}
            {lead.emails?.[0] && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <Mail size={10} /> {lead.emails[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", borderTop: "1px solid var(--glass-border)" }}>
        <button onClick={() => navigate(`${prefix}/leadgen/lead/${lead.id}`)}
          style={{ flex: 1, padding: "9px 0", background: "none", border: "none", borderRight: "1px solid var(--glass-border)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ExternalLink size={11} /> Apri
        </button>
        <button onClick={handleContacted} disabled={marking}
          style={{ flex: 2, padding: "9px 0", background: marking ? "rgba(212,255,0,0.3)" : "var(--accent-primary)", border: "none", borderRight: "1px solid var(--glass-border)", cursor: marking ? "default" : "pointer", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--sosa-bg)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <UserCheck size={11} />
          {marking ? "..." : isPool ? "Prendilo →" : "Contattato ✓"}
        </button>
        <button onClick={() => onSkipped(lead.id)} title="Salta per 24h"
          style={{ flex: 1, padding: "9px 0", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SkipForward size={12} />
        </button>
      </div>
    </div>
  );
}

function ColdTab({ prefix, ownership, members, currentUserId }: {
  prefix: string;
  ownership: "mine" | "pool" | "all";
  members: LeadgenMemberWithProfile[];
  currentUserId: string | null;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const dtType     = (searchParams.get("type") as "no_website" | "with_website" | "all") ?? "no_website";
  const dtRating   = searchParams.get("minrating") ?? "4.0";
  const dtReviews  = searchParams.get("minreviews") ?? "20";
  const dtOrder    = (searchParams.get("order") as ColdLeadsFilters["orderBy"]) ?? "score";

  function setParam(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    }, { replace: true });
  }

  const filters = useMemo((): ColdLeadsFilters => ({
    hasWebsite: dtType === "with_website" ? true : dtType === "no_website" ? false : undefined,
    minRating: dtRating === "any" ? 0 : parseFloat(dtRating),
    minReviews: dtReviews === "any" ? 0 : parseInt(dtReviews, 10),
    orderBy: dtOrder,
    ownership,
  }), [dtType, dtRating, dtReviews, dtOrder, ownership]);

  const { leads, totalEligibleCount, loading, skipLead, removeLead } = useColdLeads(filters);

  const handleSkip = useCallback((id: string) => {
    const lead = leads.find((l) => l.id === id);
    skipLead(id);
    if (lead) toast.success(`${lead.name} saltato per 24h`);
  }, [leads, skipLead]);

  const visible = leads.slice(0, visibleCount);
  const hasMore = leads.length > visibleCount;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Sito</span>
          <PillGroup options={TYPE_OPTS} value={dtType} onChange={(v) => { setParam("type", v); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Min ★</span>
          <PillGroup options={RATING_OPTS} value={dtRating as typeof RATING_OPTS[number]["value"]} onChange={(v) => { setParam("minrating", v); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Rec.</span>
          <PillGroup options={REVIEWS_OPTS} value={dtReviews as typeof REVIEWS_OPTS[number]["value"]} onChange={(v) => { setParam("minreviews", v); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>Ordine</span>
          <select value={dtOrder} onChange={(e) => setParam("order", e.target.value)}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", padding: "3px 8px", cursor: "pointer" }}>
            {ORDER_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginLeft: "auto" }}>
          {loading ? "..." : `${leads.length} lead${totalEligibleCount !== leads.length ? ` di ${totalEligibleCount}` : ""}`}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", padding: "40px 0", textAlign: "center" }}>Caricamento...</div>
      ) : leads.length === 0 ? (
        <EmptyState tab="cold" totalEligible={totalEligibleCount} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 24 }}>
            <AnimatePresence mode="popLayout">
              {visible.map((lead) => (
                <motion.div key={lead.id} layout exit={{ x: 80, opacity: 0, transition: { duration: 0.2 } }}>
                  <ColdCard
                    lead={lead}
                    prefix={prefix}
                    isPool={ownership === "pool"}
                    members={members}
                    currentUserId={currentUserId}
                    onMarked={(id) => { removeLead(id); if (visibleCount > PAGE_SIZE) setVisibleCount((v) => Math.max(PAGE_SIZE, v - 1)); }}
                    onSkipped={(id) => { handleSkip(id); }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {hasMore && (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <button onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, padding: "9px 28px", border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", letterSpacing: "0.06em" }}>
                Mostra altri {Math.min(PAGE_SIZE, leads.length - visibleCount)}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Follow-up ─────────────────────────────────────────────────────────

type FollowUpOutcome = "contacted" | "no_answer" | "rejected";

function FollowUpPopover({ lead, onClose, onSaved }: {
  lead: LeadgenLead;
  onClose: () => void;
  onSaved: (leadId: string) => void;
}) {
  const { currentPortalId } = usePortalDB();
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [outcome, setOutcome] = useState<FollowUpOutcome>("contacted");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPortalId || saving) return;
    setSaving(true);
    const now = new Date().toISOString();

    const eventInsert = supabase.from("leadgen_outreach_events").insert({
      portal_id: currentPortalId, lead_id: lead.id, channel,
      direction: "outbound" as OutreachDirection,
      notes: notes.trim() || null, occurred_at: now,
    });

    const ops: Promise<unknown>[] = [eventInsert];
    if (outcome === "rejected") {
      ops.push(supabase.from("leadgen_leads")
        .update({ outreach_status: "rejected", updated_at: now })
        .eq("portal_id", currentPortalId).eq("id", lead.id));
    }

    await Promise.all(ops);
    broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    toast.success("Follow-up registrato");
    setSaving(false);
    onSaved(lead.id);
    onClose();
  };

  return (
    <div
      style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200, background: "var(--sosa-bg)", border: "1px solid var(--glass-border)", padding: 16, width: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", marginBottom: 12 }}>
        Manda follow-up — {lead.name}
      </p>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginBottom: 6 }}>Canale</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHANNELS.map((c) => (
            <button key={c.value} onClick={() => setChannel(c.value)}
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 8px", border: `1px solid ${channel === c.value ? "var(--accent-primary)" : "var(--glass-border)"}`, background: channel === c.value ? "var(--accent-primary)" : "transparent", color: channel === c.value ? "#000" : "var(--text-secondary)", cursor: "pointer" }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginBottom: 6 }}>Esito</p>
        {([ ["contacted", "Ho contattato"], ["no_answer", "Segreteria / no risposta"], ["rejected", "Ha rifiutato"] ] as const).map(([v, label]) => (
          <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: outcome === v ? "var(--text-primary)" : "var(--text-secondary)", cursor: "pointer", marginBottom: 4 }}>
            <input type="radio" checked={outcome === v} onChange={() => setOutcome(v)} />
            {label}
          </label>
        ))}
      </div>

      <textarea
        value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Note opzionali..."
        rows={3}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-mono)", fontSize: 11, background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-primary)", padding: "6px 8px", resize: "none", marginBottom: 10 }}
      />

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "6px", background: "var(--accent-primary)", border: "none", color: "#000", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "..." : "Salva"}
        </button>
        <button onClick={onClose}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "6px 12px", background: "none", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
          Annulla
        </button>
      </div>
    </div>
  );
}

function FollowUpRow({ lead, prefix, onSkip, onSaved, agingDays, severity }: {
  lead: LeadgenLead;
  prefix: string;
  onSkip: (id: string) => void;
  onSaved: (id: string) => void;
  agingDays: number;
  severity: "stale" | "critical";
}) {
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentPortalId } = usePortalDB();

  const severityColor = severity === "critical" ? "var(--color-error)" : "var(--color-warning)";

  const handleStatusChange = async (newStatus: string) => {
    if (!currentPortalId) return;
    setMenuOpen(false);
    await supabase.from("leadgen_leads")
      .update({ outreach_status: newStatus, updated_at: new Date().toISOString() })
      .eq("portal_id", currentPortalId).eq("id", lead.id);
    broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    toast.success(`Stato aggiornato`);
    onSaved(lead.id);
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--glass-border)", position: "relative" }}
      onMouseDown={(e) => { if (popoverOpen && !(e.target as HTMLElement).closest("[data-popover]")) setPopoverOpen(false); }}
    >
      {/* Aging indicator */}
      <div style={{ width: 3, height: 40, background: severityColor, flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {lead.name}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
          {lead.outreach_status === "contacted" ? "contattato" : "qualificato"} {agingDays} giorni fa
          {lead.city ? ` · ${lead.city}` : ""}
          {lead.phone ? ` · ${lead.phone}` : ""}
        </div>
      </div>

      {/* Aging badge */}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, padding: "2px 6px", border: `1px solid ${severityColor}`, color: severityColor, flexShrink: 0 }}>
        {agingDays}g
      </span>

      {/* Actions */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        <div style={{ position: "relative" }} data-popover>
          <button
            onClick={() => setPopoverOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1px solid var(--accent-primary)", background: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--accent-primary)" }}
          >
            <Send size={9} />
            Follow-up
          </button>
          {popoverOpen && (
            <FollowUpPopover lead={lead} onClose={() => setPopoverOpen(false)} onSaved={onSaved} />
          )}
        </div>

        <button onClick={() => navigate(`${prefix}/leadgen/lead/${lead.id}`)}
          style={{ padding: "4px 8px", border: "1px solid var(--glass-border)", background: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
          <ExternalLink size={10} />
        </button>

        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)}
            style={{ padding: "4px 8px", border: "1px solid var(--glass-border)", background: "none", cursor: "pointer", color: "var(--text-tertiary)", display: "flex", alignItems: "center" }}>
            <MoreHorizontal size={12} />
          </button>
          {menuOpen && (
            <div
              style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200, background: "var(--sosa-bg)", border: "1px solid var(--glass-border)", minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {lead.outreach_status !== "qualified" && (
                <button onClick={() => handleStatusChange("qualified")}
                  style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", textAlign: "left" }}>
                  Promuovi a Qualified
                </button>
              )}
              <button onClick={() => handleStatusChange("converted")}
                style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-primary)", textAlign: "left" }}>
                Segna Convertito
              </button>
              <button onClick={() => handleStatusChange("rejected")}
                style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-error)", textAlign: "left" }}>
                Segna Rejected
              </button>
              <div style={{ height: 1, background: "var(--glass-border)", margin: "2px 0" }} />
              <button onClick={() => { setMenuOpen(false); onSkip(lead.id); toast.success(`${lead.name} ignorato per 7 giorni`); }}
                style={{ width: "100%", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
                <EyeOff size={10} /> Ignora 7 giorni
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FollowUpSection({ title, leads, prefix, onSkip, onSaved, agingRef }: {
  title: string;
  leads: LeadgenLead[];
  prefix: string;
  onSkip: (id: string) => void;
  onSaved: (id: string) => void;
  agingRef: (lead: LeadgenLead) => { agingDays: number; severity: "stale" | "critical" };
}) {
  const [open, setOpen] = useState(true);
  if (!leads.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 4 }}
      >
        {open ? <ChevronUp size={12} color="var(--text-tertiary)" /> : <ChevronDown size={12} color="var(--text-tertiary)" />}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", flex: 1, textAlign: "left" }}>
          {title}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
          {leads.length}
        </span>
      </button>
      {open && leads.map((lead) => {
        const { agingDays, severity } = agingRef(lead);
        return (
          <FollowUpRow
            key={lead.id} lead={lead} prefix={prefix}
            onSkip={onSkip} onSaved={onSaved}
            agingDays={agingDays} severity={severity}
          />
        );
      })}
    </div>
  );
}

function FollowUpTab({ prefix, ownership }: { prefix: string; ownership: "mine" | "pool" | "all" }) {
  const { contactedAging, qualifiedAging, total, loading, skipLead, removeLead } = useFollowUpLeads({ ownership });

  const contactedAgingRef = useCallback((lead: LeadgenLead) => {
    const refTs = lead.contacted_at ? new Date(lead.contacted_at).getTime() : new Date(lead.updated_at).getTime();
    const agingDays = Math.floor((Date.now() - refTs) / 86_400_000);
    return { agingDays, severity: (agingDays >= 14 ? "critical" : "stale") as "stale" | "critical" };
  }, []);

  const qualifiedAgingRef = useCallback((lead: LeadgenLead) => {
    const agingDays = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86_400_000);
    return { agingDays, severity: (agingDays >= 10 ? "critical" : "stale") as "stale" | "critical" };
  }, []);

  if (loading) return <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", padding: "40px 0", textAlign: "center" }}>Caricamento...</div>;
  if (total === 0) return <EmptyState tab="followup" />;

  return (
    <div>
      <FollowUpSection
        title="Contattati senza risposta" leads={contactedAging}
        prefix={prefix} onSkip={skipLead} onSaved={removeLead} agingRef={contactedAgingRef}
      />
      <FollowUpSection
        title="Qualificati da spingere" leads={qualifiedAging}
        prefix={prefix} onSkip={skipLead} onSaved={removeLead} agingRef={qualifiedAgingRef}
      />
    </div>
  );
}

// ─── Tab 3: Hot ───────────────────────────────────────────────────────────────

type QuickActionType = "reply" | "call" | null;

function HotQuickAction({ lead, type, onClose, onSaved }: {
  lead: HotLead;
  type: "reply" | "call";
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { currentPortalId } = usePortalDB();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const channel: OutreachChannel = type === "reply" ? "email" : "call";
  const title = type === "reply" ? `Rispondi a ${lead.name}` : `Chiama ${lead.name}`;
  const label = type === "reply" ? "Salva risposta inviata" : "Salva chiamata";

  const handleSave = async () => {
    if (!currentPortalId || saving) return;
    setSaving(true);
    await supabase.from("leadgen_outreach_events").insert({
      portal_id: currentPortalId, lead_id: lead.id, channel,
      direction: "outbound" as OutreachDirection,
      notes: notes.trim() || null,
      occurred_at: new Date().toISOString(),
    });
    broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    toast.success(type === "reply" ? "Risposta registrata" : "Chiamata registrata");
    setSaving(false);
    onSaved(lead.id);
    onClose();
  };

  return (
    <div style={{ background: "var(--sosa-bg-2)", border: "1px solid var(--glass-border)", padding: "14px 16px", marginTop: 10 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{title}</p>
      {type === "reply" && lead.emails?.[0] && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-primary)", marginBottom: 8 }}>
          {lead.emails[0]}
        </p>
      )}
      {type === "call" && lead.phone && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-primary)", marginBottom: 8 }}>
          {lead.phone}
        </p>
      )}
      <textarea
        value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Note interne..."
        rows={3}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-mono)", fontSize: 11, background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-primary)", padding: "6px 8px", resize: "none", marginBottom: 6 }}
      />
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.6 }}>
        Questo registra solo che hai risposto. Manda l&apos;email dal tuo client preferito.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "7px", background: "var(--accent-primary)", border: "none", color: "#000", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "..." : label}
        </button>
        <button onClick={onClose}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "7px 14px", background: "none", border: "1px solid var(--glass-border)", color: "var(--text-tertiary)", cursor: "pointer" }}>
          Annulla
        </button>
      </div>
    </div>
  );
}

function HotCard({ lead, prefix, onSaved }: { lead: HotLead; prefix: string; onSaved: (id: string) => void }) {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<QuickActionType>(null);

  return (
    <div style={{ background: "var(--glass-bg)", border: `1px solid var(--color-warning)`, padding: "18px 20px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            ◆ {lead.name}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-warning)" }}>
            Ti ha risposto {lead.daysAgo} giorni fa
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--color-warning)", border: "1px solid var(--color-warning)", padding: "2px 8px", flexShrink: 0 }}>
          {lead.daysAgo}g senza risposta
        </span>
      </div>

      {lead.lastInboundNotes && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", padding: "8px 12px", background: "var(--sosa-bg-2)", borderLeft: "2px solid var(--color-warning)", marginBottom: 12, lineHeight: 1.6 }}>
          "{lead.lastInboundNotes.slice(0, 160)}{lead.lastInboundNotes.length > 160 ? "..." : ""}"
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {lead.phone && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <Phone size={10} /> {lead.phone}
          </span>
        )}
        {lead.emails?.[0] && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <Mail size={10} /> {lead.emails[0]}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setActiveAction(activeAction === "reply" ? null : "reply")}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, padding: "6px 14px", background: "var(--color-warning)", border: "none", color: "#000", cursor: "pointer" }}
        >
          Rispondi via email
        </button>
        <button
          onClick={() => setActiveAction(activeAction === "call" ? null : "call")}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "6px 14px", border: "1px solid var(--glass-border)", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}
        >
          Chiama
        </button>
        <button
          onClick={() => navigate(`${prefix}/leadgen/lead/${lead.id}`)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "6px 14px", border: "1px solid var(--glass-border)", background: "none", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
        >
          <ExternalLink size={10} /> Apri scheda
        </button>
      </div>

      {activeAction && (
        <HotQuickAction
          lead={lead} type={activeAction}
          onClose={() => setActiveAction(null)}
          onSaved={(id) => { setActiveAction(null); onSaved(id); }}
        />
      )}
    </div>
  );
}

function HotTab({ prefix, ownership }: { prefix: string; ownership: "mine" | "pool" | "all" }) {
  const { hotLeads, total, loading, removeLead } = useHotLeads({ ownership });

  if (loading) return <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", padding: "40px 0", textAlign: "center" }}>Caricamento...</div>;
  if (total === 0) return <EmptyState tab="hot" />;

  return (
    <div>
      <AnimatePresence>
        {hotLeads.map((lead) => (
          <motion.div key={lead.id} layout exit={{ x: 80, opacity: 0, transition: { duration: 0.2 } }}>
            <HotCard lead={lead} prefix={prefix} onSaved={removeLead} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Empty states ────────────────────────────────────────────────────────────

function EmptyState({ tab, totalEligible }: { tab: "cold" | "followup" | "hot"; totalEligible?: number }) {
  const navigate = useNavigate();
  const { portal } = usePortal();
  const prefix = portal?.id ? `/${portal.id}` : "";
  const [, setSearchParams] = useSearchParams();

  const msgs = {
    cold: { title: "Nessun lead da contattare", body: totalEligible ? `${totalEligible} lead presenti ma esclusi dai filtri. Prova a ridurre il rating minimo.` : "Lancia una ricerca per trovare nuovi lead." },
    followup: { title: "Nessun follow-up in coda", body: "Ottimo lavoro. Nessun lead in attesa da troppo tempo." },
    hot: { title: "Nessun lead caldo", body: "Nessuno ha risposto in attesa di risposta. Tutto gestito!" },
  };
  const { title, body } = msgs[tab];

  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--text-tertiary)", marginBottom: 16 }}>◆</div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{title}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>{body}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => navigate(`${prefix}/leadgen/dashboard`)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "7px 16px", border: "1px solid var(--glass-border)", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
          Vai alla dashboard →
        </button>
        <button onClick={() => navigate(`${prefix}/leadgen/search`)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "7px 16px", border: "1px solid var(--accent-primary)", background: "var(--accent-primary)", color: "#000", fontWeight: 700, cursor: "pointer" }}>
          Lancia nuova ricerca →
        </button>
        {tab === "cold" && (
          <button onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set("tab", "followup"); return n; })}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "7px 16px", border: "1px solid var(--glass-border)", background: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
            Vai a Follow-up →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

const VIEW_OPTS = [
  { value: "mine" as const,  label: "I miei"  },
  { value: "pool" as const,  label: "Pool"    },
  { value: "all"  as const,  label: "Tutti"   },
];

export default function LeadgenToday() {
  const { portal } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = portal?.id ? `/${portal.id}` : "";

  const lastHotVisitRef = useRef<number>(0);

  const { members, currentMember } = useLeadgenMembers();
  const { notification, dismissNotification } = useAutoRelease();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const isLeadgenAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  const view = (searchParams.get("view") as "mine" | "pool" | "all") ?? "all";

  function setView(v: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", v);
      return next;
    }, { replace: true });
  }

  const ownershipFilter: "mine" | "pool" | "all" = view;
  const followUpFilters: FollowUpFilters = { ownership: ownershipFilter };
  const hotFilters: HotLeadsFilters = { ownership: ownershipFilter };

  const { hotLeads } = useHotLeads(hotFilters);
  const { total: followupTotal } = useFollowUpLeads(followUpFilters);
  const coldFilters = useMemo((): ColdLeadsFilters => {
    const dtType = (searchParams.get("type") as "no_website" | "with_website" | "all") ?? "no_website";
    const dtRating = searchParams.get("minrating") ?? "4.0";
    const dtReviews = searchParams.get("minreviews") ?? "20";
    return {
      hasWebsite: dtType === "with_website" ? true : dtType === "no_website" ? false : undefined,
      minRating: dtRating === "any" ? 0 : parseFloat(dtRating),
      minReviews: dtReviews === "any" ? 0 : parseInt(dtReviews, 10),
      orderBy: (searchParams.get("order") as ColdLeadsFilters["orderBy"]) ?? "score",
      ownership: ownershipFilter,
    };
  }, [searchParams, ownershipFilter]);
  const { leads: coldLeads } = useColdLeads(coldFilters);

  const activeTab = (searchParams.get("tab") as "cold" | "followup" | "hot") ?? "cold";

  function setTab(tab: string) {
    if (tab === "hot") lastHotVisitRef.current = Date.now();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }

  const hotCount = hotLeads.length;
  const showHotPulse = hotCount > 0 && activeTab !== "hot" && Date.now() - lastHotVisitRef.current > 3_600_000;

  const tabs = [
    { id: "cold",     label: "Da contattare", count: coldLeads.length },
    { id: "followup", label: "Follow-up",      count: followupTotal },
    { id: "hot",      label: "Caldi",          count: hotCount, urgent: hotCount > 0 },
  ];

  const totalActions = coldLeads.length + followupTotal + hotCount;

  return (
    <div style={{ padding: "20px 24px" }}>
      {/* Auto-release notification */}
      {notification && (
        <AutoReleaseBanner
          count={notification.count}
          leadNames={notification.leadNames}
          onDismiss={dismissNotification}
        />
      )}

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Da Fare Oggi
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
          {totalActions > 0 ? `${totalActions} azioni in coda` : "Nessuna azione in coda — ottimo lavoro."}
        </p>
      </div>

      {/* View filter bar */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--glass-border)", marginBottom: 0 }}>
        <PillGroup options={VIEW_OPTS} value={view} onChange={setView} />
        {isLeadgenAdmin && members.length > 1 && (
          <select
            defaultValue=""
            onChange={(e) => {
              const uid = e.target.value;
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (uid) next.set("member", uid); else next.delete("member");
                return next;
              }, { replace: true });
            }}
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", padding: "3px 8px", cursor: "pointer" }}>
            <option value="">Membro: Tutti</option>
            {members.filter((m) => m.active).map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.display_name ?? m.email}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--glass-border)", marginBottom: 24 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: isActive ? 700 : 400, padding: "10px 20px", border: "none", borderBottom: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent", background: "transparent", color: isActive ? "var(--text-primary)" : "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, letterSpacing: "0.04em", position: "relative" }}>
              {tab.label}
              {tab.count > 0 && (
                <span className={showHotPulse && tab.id === "hot" ? "animate-pulse" : ""}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, padding: "1px 6px", background: tab.urgent ? "var(--color-warning)" : "var(--glass-border)", color: tab.urgent ? "#000" : "var(--text-primary)" }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content — all mounted, CSS hidden */}
      <div style={{ display: activeTab === "cold" ? "block" : "none" }}>
        <ColdTab
          prefix={prefix}
          ownership={ownershipFilter}
          members={members}
          currentUserId={currentUserId}
        />
      </div>
      <div style={{ display: activeTab === "followup" ? "block" : "none" }}>
        <FollowUpTab prefix={prefix} ownership={ownershipFilter} />
      </div>
      <div style={{ display: activeTab === "hot" ? "block" : "none" }}>
        <HotTab prefix={prefix} ownership={ownershipFilter} />
      </div>
    </div>
  );
}
