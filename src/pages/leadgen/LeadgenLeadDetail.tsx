import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Phone, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { LeadOutreachStatusBadge, STATUS_CONFIG } from "@/components/leadgen/LeadOutreachStatusBadge";
import type { LeadgenLead, LeadgenOutreachEvent, OutreachStatus, OutreachChannel, OutreachDirection } from "@/types/leadgen";
import { broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";

const CHANNELS: OutreachChannel[] = ["email", "dm_instagram", "call", "pec"];
const DIRECTIONS: OutreachDirection[] = ["outbound", "inbound"];

export default function LeadgenLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentPortalId } = usePortalDB();
  const navigate = useNavigate();

  const [lead, setLead] = useState<LeadgenLead | null>(null);
  const [events, setEvents] = useState<LeadgenOutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [channel, setChannel] = useState<OutreachChannel>("email");
  const [direction, setDirection] = useState<OutreachDirection>("outbound");
  const [notes, setNotes] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  const [status, setStatus] = useState<OutreachStatus>("new");
  const [outreachNotes, setOutreachNotes] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    if (!id || !currentPortalId) return;
    (async () => {
      const [{ data: leadRow }, { data: eventsRows }] = await Promise.all([
        supabase.from("leadgen_leads").select("*").eq("id", id).eq("portal_id", currentPortalId).single(),
        supabase.from("leadgen_outreach_events").select("*").eq("lead_id", id).eq("portal_id", currentPortalId).order("occurred_at", { ascending: false }),
      ]);
      if (leadRow) {
        setLead(leadRow as LeadgenLead);
        setStatus((leadRow as LeadgenLead).outreach_status);
        setOutreachNotes((leadRow as LeadgenLead).outreach_notes ?? "");
      }
      setEvents((eventsRows ?? []) as LeadgenOutreachEvent[]);
      setLoading(false);
    })();
  }, [id, currentPortalId]);

  const handleSaveMeta = async () => {
    if (!lead || !currentPortalId) return;
    setSavingMeta(true);
    const { error } = await supabase
      .from("leadgen_leads")
      .update({ outreach_status: status, outreach_notes: outreachNotes, updated_at: new Date().toISOString() })
      .eq("id", lead.id)
      .eq("portal_id", currentPortalId);
    setSavingMeta(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Aggiornato");
      setLead((prev) => prev ? { ...prev, outreach_status: status, outreach_notes: outreachNotes } : prev);
      broadcastLeadgenUpdate("lead_updated", { leadId: lead.id });
    }
  };

  const handleAddEvent = async () => {
    if (!lead || !currentPortalId) return;
    setAddingEvent(true);
    const { data: row, error } = await supabase
      .from("leadgen_outreach_events")
      .insert({ portal_id: currentPortalId, lead_id: lead.id, channel, direction, notes: notes || null })
      .select()
      .single();
    setAddingEvent(false);
    if (error) { toast.error(error.message); return; }
    setEvents((prev) => [row as LeadgenOutreachEvent, ...prev]);
    setNotes("");
    toast.success("Evento aggiunto");
  };

  if (loading) return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;
  if (!lead) return <div style={{ padding: 32, color: "var(--color-error)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Lead non trovato.</div>;

  return (
    <div style={{ padding: "24px 32px" }}>
      <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 11, marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={13} /> Indietro
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
        {/* Left: lead info */}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{lead.name}</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)", marginBottom: 20 }}>
            {lead.category} · {lead.city} {lead.postal_code} · {lead.country_code}
          </p>

          {[
            { label: "Indirizzo", value: lead.address },
            { label: "Telefono", value: lead.phone },
            { label: "Rating", value: lead.rating ? `${lead.rating} (${lead.reviews_count ?? 0} recensioni)` : null },
            { label: "Email", value: lead.emails.length ? lead.emails.join(", ") : null },
          ].map(({ label, value }) => value && (
            <div key={label} style={{ marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 2 }}>{label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16, marginBottom: 24 }}>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="btn-glass-ds" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Phone size={13} /> Chiama
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="btn-glass-ds" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <ExternalLink size={13} /> Apri sito
              </a>
            )}
            <a href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(lead.name)}`} target="_blank" rel="noopener noreferrer" className="btn-glass-ds" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              → LinkedIn
            </a>
            <a href={`https://maps.google.com/?q=${encodeURIComponent(lead.name + " " + (lead.address ?? ""))}`} target="_blank" rel="noopener noreferrer" className="btn-glass-ds" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              → Maps
            </a>
          </div>

          <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <LeadOutreachStatusBadge status={lead.outreach_status} />
            </div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>Status outreach</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as OutreachStatus)} className="glass-input" style={{ width: "100%", marginBottom: 12 }}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 6 }}>Note libere</label>
            <textarea value={outreachNotes} onChange={(e) => setOutreachNotes(e.target.value)} className="glass-input" rows={4} style={{ width: "100%", resize: "vertical", marginBottom: 12 }} />
            <button onClick={handleSaveMeta} disabled={savingMeta} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {savingMeta && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Salva
            </button>
          </div>
        </div>

        {/* Right: outreach log */}
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Log outreach</h2>

          <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Canale</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value as OutreachChannel)} className="glass-input" style={{ width: "100%" }}>
                  {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Direzione</label>
                <select value={direction} onChange={(e) => setDirection(e.target.value as OutreachDirection)} className="glass-input" style={{ width: "100%" }}>
                  {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note sull'evento..." className="glass-input" rows={2} style={{ width: "100%", resize: "vertical", marginBottom: 10 }} />
            <button onClick={handleAddEvent} disabled={addingEvent} className="btn-glass-ds" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {addingEvent && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              + Aggiungi evento
            </button>
          </div>

          {events.length === 0 ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>Nessun evento ancora.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-primary)" }}>{ev.channel}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>{ev.direction}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>{new Date(ev.occurred_at).toLocaleString("it-IT")}</span>
                  </div>
                  {ev.notes && <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>{ev.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
