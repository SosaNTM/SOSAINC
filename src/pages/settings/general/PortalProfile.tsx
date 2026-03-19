import { useState, useEffect } from "react";
import { Globe, Upload, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePortalProfile } from "../../../hooks/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const TIMEZONES = [
  "Europe/Rome", "Europe/London", "America/New_York", "America/Los_Angeles",
  "Asia/Tokyo", "Asia/Shanghai", "Australia/Sydney", "Pacific/Auckland",
  "America/Chicago", "Europe/Berlin",
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

const defaultForm = {
  legal_name: "",
  phone: "",
  website: "",
  vat_number: "",
  address_line1: "",
  address_line2: "",
  city: "",
  zip: "",
  state: "",
  country: "IT",
  language: "Italiano",
  timezone: "Europe/Rome",
  date_format: "DD/MM/YYYY",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      color: TEXT_MUTED, paddingBottom: 10, borderBottom: `0.5px solid ${BORDER}`,
      marginBottom: 16, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

export default function PortalProfile() {
  const { data, loading, upsert } = usePortalProfile();
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  // Load DB data into form on mount / data change
  useEffect(() => {
    if (data) {
      setForm({
        legal_name: data.legal_name ?? "",
        phone: data.phone ?? "",
        website: data.website ?? "",
        vat_number: data.vat_number ?? "",
        address_line1: data.address_line1 ?? "",
        address_line2: data.address_line2 ?? "",
        city: data.city ?? "",
        zip: data.zip ?? "",
        state: data.state ?? "",
        country: data.country ?? "IT",
        language: data.language ?? "Italiano",
        timezone: data.timezone ?? "Europe/Rome",
        date_format: data.date_format ?? "DD/MM/YYYY",
      });
    }
  }, [data]);

  function set<K extends keyof typeof defaultForm>(field: K, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await upsert({
      legal_name: form.legal_name || null,
      phone: form.phone || null,
      website: form.website || null,
      vat_number: form.vat_number || null,
      address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null,
      city: form.city || null,
      zip: form.zip || null,
      state: form.state || null,
      country: form.country,
      language: form.language,
      timezone: form.timezone,
      date_format: form.date_format,
    });
    setSaving(false);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    toast({ title: "Modifiche salvate", description: "Il profilo portale è stato aggiornato." });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Profilo Portale
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Informazioni aziendali e impostazioni generali del portale
        </p>
      </div>

      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "24px 28px" }}>

        {/* General info */}
        <SectionTitle>Informazioni generali</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Legal name — full width */}
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Nome portale / Azienda</span>
            <input className="glass-input" value={form.legal_name} onChange={e => set("legal_name", e.target.value)} placeholder="Nome azienda" />
          </label>

          {/* Logo — full width */}
          <div style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Logo</span>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "22px 0", borderRadius: 8, cursor: "pointer",
              border: `1.5px dashed #d1d5db`, background: "#f9fafb",
              transition: "border-color 0.15s",
            }}>
              <Upload size={20} style={{ color: TEXT_MUTED }} />
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>Carica Logo</span>
              <span style={{ fontSize: 10, color: "#9ca3af" }}>PNG, SVG, JPG — max 2MB</span>
              <input type="file" accept="image/*" style={{ display: "none" }} />
            </label>
          </div>

          <label style={labelStyle}>
            <span style={labelText}>Telefono</span>
            <input className="glass-input" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+39 02 ..." />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Sito web</span>
            <input className="glass-input" type="url" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>P.IVA / Codice Fiscale</span>
            <input className="glass-input" value={form.vat_number} onChange={e => set("vat_number", e.target.value)} placeholder="IT12345678901" />
          </label>
        </div>

        {/* Address */}
        <SectionTitle>Indirizzo</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Via / Indirizzo</span>
            <input className="glass-input" value={form.address_line1} onChange={e => set("address_line1", e.target.value)} placeholder="Via ..." />
          </label>

          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Indirizzo 2 (opzionale)</span>
            <input className="glass-input" value={form.address_line2} onChange={e => set("address_line2", e.target.value)} placeholder="Interno, scala, ..." />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Città</span>
            <input className="glass-input" value={form.city} onChange={e => set("city", e.target.value)} placeholder="Città" />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>CAP</span>
            <input className="glass-input" value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="00000" />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Provincia / Stato</span>
            <input className="glass-input" value={form.state} onChange={e => set("state", e.target.value)} placeholder="MI" />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Paese</span>
            <select className="glass-input" value={form.country} onChange={e => set("country", e.target.value)}>
              <option value="IT">Italia</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
              <option value="ES">Spain</option>
              <option value="CH">Switzerland</option>
            </select>
          </label>
        </div>

        {/* Preferences */}
        <SectionTitle>Preferenze interfaccia</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <label style={labelStyle}>
            <span style={labelText}>Lingua interfaccia</span>
            <select className="glass-input" value={form.language} onChange={e => set("language", e.target.value)}>
              <option value="Italiano">Italiano</option>
              <option value="English">English</option>
            </select>
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Fuso orario</span>
            <select className="glass-input" value={form.timezone} onChange={e => set("timezone", e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>

          <div style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span style={labelText}>Formato data</span>
            <div style={{ display: "flex", gap: 8 }}>
              {DATE_FORMATS.map(fmt => (
                <button type="button"
                  key={fmt}
                  onClick={() => set("date_format", fmt)}
                  style={{
                    padding: "6px 14px", borderRadius: 7, border: `0.5px solid ${form.date_format === fmt ? GOLD + "88" : BORDER}`,
                    background: form.date_format === fmt ? "#fef9ee" : "#f9fafb",
                    color: form.date_format === fmt ? GOLD : TEXT_SECONDARY,
                    cursor: "pointer", fontSize: 12, fontWeight: form.date_format === fmt ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="glass-btn-primary" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Globe size={14} />}
            Salva Modifiche
          </button>
        </div>
      </div>
    </div>
  );
}
