import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import { toast } from "sonner";
import type { LeadgenLead } from "@/types/leadgen";

interface Props {
  defaultHasWebsite?: boolean;
  onClose: () => void;
  onCreated: (lead: LeadgenLead) => void;
}

export function AddLeadModal({ defaultHasWebsite = false, onClose, onCreated }: Props) {
  const { currentPortalId } = usePortalDB();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    website: "",
    category: "",
    city: "",
    address: "",
    postal_code: "",
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Il nome è obbligatorio"); return; }
    if (!currentPortalId) return;
    setSaving(true);
    const hasWebsite = !!form.website.trim();
    const { data, error } = await supabase
      .from("leadgen_leads")
      .insert({
        portal_id: currentPortalId,
        place_id: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        emails: form.email.trim() ? [form.email.trim()] : [],
        website: form.website.trim() || null,
        category: form.category.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        has_website: hasWebsite,
        social_media: {},
        outreach_status: "new",
      })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead aggiunto");
    onCreated(data as LeadgenLead);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div
        style={{ background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)", width: "100%", maxWidth: 480, padding: 28, position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
          <X size={16} />
        </button>

        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>
          Lead Generation
        </p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
          Aggiungi lead manualmente
        </h2>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Nome azienda *</label>
              <input value={form.name} onChange={set("name")} className="glass-input" style={{ width: "100%" }} placeholder="Es. Pizzeria Roma" autoComplete="off" name="lead-name" />
            </div>
            <div>
              <label style={labelStyle}>Telefono</label>
              <input value={form.phone} onChange={set("phone")} className="glass-input" style={{ width: "100%" }} placeholder="+39 02 1234567" autoComplete="off" name="lead-phone" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input value={form.email} onChange={set("email")} className="glass-input" style={{ width: "100%" }} placeholder="info@azienda.it" autoComplete="off" name="lead-email" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Sito web</label>
              <input value={form.website} onChange={set("website")} className="glass-input" style={{ width: "100%" }} placeholder="https://..." autoComplete="off" name="lead-website" />
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <input value={form.category} onChange={set("category")} className="glass-input" style={{ width: "100%" }} placeholder="Ristorante, Dentista..." autoComplete="off" name="lead-cat" />
            </div>
            <div>
              <label style={labelStyle}>Città</label>
              <input value={form.city} onChange={set("city")} className="glass-input" style={{ width: "100%" }} placeholder="Milano" autoComplete="off" name="lead-city" />
            </div>
            <div>
              <label style={labelStyle}>Indirizzo</label>
              <input value={form.address} onChange={set("address")} className="glass-input" style={{ width: "100%" }} placeholder="Via Roma 1" autoComplete="off" name="lead-addr" />
            </div>
            <div>
              <label style={labelStyle}>CAP</label>
              <input value={form.postal_code} onChange={set("postal_code")} className="glass-input" style={{ width: "100%" }} placeholder="20100" autoComplete="off" name="lead-cap" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-glass-ds">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Aggiungi lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--text-tertiary)",
  display: "block",
  marginBottom: 5,
};
