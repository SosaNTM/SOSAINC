import { useState, useEffect } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePortalProfile } from "../../../hooks/settings";
import {
  SettingsPageHeader,
  SettingsCard,
  SettingsFormField,
} from "@/components/settings";

const TIMEZONES = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const COUNTRIES = [
  { value: "IT", label: "Italia" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "CH", label: "Switzerland" },
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY"] as const;

interface FormState {
  legal_name: string;
  vat_number: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  website: string;
  language: string;
  timezone: string;
  date_format: string;
}

const defaultForm: FormState = {
  legal_name: "",
  vat_number: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip: "",
  country: "IT",
  phone: "",
  website: "",
  language: "Italiano",
  timezone: "Europe/Rome",
  date_format: "DD/MM/YYYY",
};

export default function PortalProfile() {
  const { data, loading, upsert } = usePortalProfile();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        legal_name: data.legal_name ?? "",
        vat_number: data.vat_number ?? "",
        address_line1: data.address_line1 ?? "",
        address_line2: data.address_line2 ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        zip: data.zip ?? "",
        country: data.country ?? "IT",
        phone: data.phone ?? "",
        website: data.website ?? "",
        language: data.language ?? "Italiano",
        timezone: data.timezone ?? "Europe/Rome",
        date_format: data.date_format ?? "DD/MM/YYYY",
      });
    }
  }, [data]);

  function set<K extends keyof FormState>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await upsert({
      legal_name: form.legal_name || null,
      vat_number: form.vat_number || null,
      address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      country: form.country,
      phone: form.phone || null,
      website: form.website || null,
      language: form.language,
      timezone: form.timezone,
      date_format: form.date_format,
    });
    setSaving(false);

    if (error) {
      toast.error("Errore nel salvataggio", { description: error });
      return;
    }
    toast.success("Modifiche salvate", {
      description: "Il profilo portale e stato aggiornato.",
    });
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        <Loader2
          size={24}
          style={{
            color: "var(--accent-primary)",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Building2}
        title="Profilo Portale"
        description="Informazioni legali e configurazione del portale"
      />

      {/* ── Card 1: Informazioni Azienda ── */}
      <SettingsCard title="Informazioni Azienda">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            columnGap: 16,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <SettingsFormField label="Ragione Sociale">
              <input
                className="glass-input"
                value={form.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
                placeholder="Nome azienda o ragione sociale"
              />
            </SettingsFormField>
          </div>

          <SettingsFormField label="Partita IVA">
            <input
              className="glass-input"
              value={form.vat_number}
              onChange={(e) => set("vat_number", e.target.value)}
              placeholder="IT12345678901"
            />
          </SettingsFormField>

          <div style={{ gridColumn: "1 / -1" }}>
            <SettingsFormField label="Indirizzo">
              <input
                className="glass-input"
                value={form.address_line1}
                onChange={(e) => set("address_line1", e.target.value)}
                placeholder="Via, numero civico"
              />
            </SettingsFormField>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <SettingsFormField label="Indirizzo 2" description="Interno, piano, scala (opzionale)">
              <input
                className="glass-input"
                value={form.address_line2}
                onChange={(e) => set("address_line2", e.target.value)}
                placeholder="Es. Interno 3, Piano 2"
              />
            </SettingsFormField>
          </div>

          <SettingsFormField label="Città">
            <input
              className="glass-input"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Milano"
            />
          </SettingsFormField>

          <SettingsFormField label="Provincia / Stato">
            <input
              className="glass-input"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="MI"
            />
          </SettingsFormField>

          <SettingsFormField label="CAP">
            <input
              className="glass-input"
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
              placeholder="20100"
            />
          </SettingsFormField>

          <SettingsFormField label="Paese">
            <select
              className="glass-input"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </SettingsFormField>

          <SettingsFormField label="Telefono">
            <input
              className="glass-input"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+39 02 1234567"
            />
          </SettingsFormField>

          <div style={{ gridColumn: "1 / -1" }}>
            <SettingsFormField label="Sito Web">
              <input
                className="glass-input"
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://www.esempio.it"
              />
            </SettingsFormField>
          </div>
        </div>
      </SettingsCard>

      {/* ── Card 2: Preferenze Regionali ── */}
      <SettingsCard title="Preferenze Regionali">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            columnGap: 16,
          }}
        >
          <SettingsFormField label="Lingua">
            <select
              className="glass-input"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
            >
              <option value="Italiano">Italiano</option>
              <option value="English">English</option>
            </select>
          </SettingsFormField>

          <SettingsFormField label="Fuso Orario">
            <select
              className="glass-input"
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </SettingsFormField>

          <div style={{ gridColumn: "1 / -1" }}>
            <SettingsFormField label="Formato Data">
              <div className="glass-segment">
                {DATE_FORMATS.map((fmt) => (
                  <button
                    type="button"
                    key={fmt}
                    className="glass-segment-item"
                    data-active={form.date_format === fmt}
                    onClick={() => set("date_format", fmt)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </SettingsFormField>
          </div>
        </div>
      </SettingsCard>

      {/* ── Save / Cancel Buttons ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          className="btn-glass-ds"
          onClick={() => {
            if (data) {
              setForm({
                legal_name: data.legal_name ?? "",
                vat_number: data.vat_number ?? "",
                address_line1: data.address_line1 ?? "",
                address_line2: data.address_line2 ?? "",
                city: data.city ?? "",
                state: data.state ?? "",
                zip: data.zip ?? "",
                country: data.country ?? "IT",
                phone: data.phone ?? "",
                website: data.website ?? "",
                language: data.language ?? "Italiano",
                timezone: data.timezone ?? "Europe/Rome",
                date_format: data.date_format ?? "DD/MM/YYYY",
              });
            } else {
              setForm(defaultForm);
            }
          }}
          disabled={saving}
          style={{ cursor: saving ? "not-allowed" : "pointer" }}
        >
          Annulla
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving && (
            <Loader2
              size={15}
              style={{ animation: "spin 1s linear infinite" }}
            />
          )}
          Salva Modifiche
        </button>
      </div>
    </div>
  );
}
