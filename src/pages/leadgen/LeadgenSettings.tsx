import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLeadgenSettings } from "@/hooks/leadgen/useLeadgenSettings";
import { testConnection } from "@/lib/apifyClient";

const COUNTRIES = [
  { code: "IT", label: "IT — Italia" },
  { code: "FR", label: "FR — Francia" },
  { code: "DE", label: "DE — Germania" },
  { code: "ES", label: "ES — Spagna" },
  { code: "GB", label: "GB — Regno Unito" },
  { code: "US", label: "US — Stati Uniti" },
];

export default function LeadgenSettings() {
  const { data, loading, upsert } = useLeadgenSettings();

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [countryCode, setCountryCode] = useState("IT");
  const [language, setLanguage] = useState("it");
  const [maxPlaces, setMaxPlaces] = useState(50);
  const [scrapeContacts, setScrapeContacts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (data && !hydrated) {
      setToken(data.apify_token ?? "");
      setCountryCode(data.default_country_code);
      setLanguage(data.default_language);
      setMaxPlaces(data.default_max_places);
      setScrapeContacts(data.scrape_contacts);
      setHydrated(true);
    }
  }, [data, hydrated]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await upsert({
      apify_token: token || null,
      default_country_code: countryCode,
      default_language: language,
      default_max_places: maxPlaces,
      scrape_contacts: scrapeContacts,
    });
    setSaving(false);
    if (error) toast.error(error);
    else toast.success("Impostazioni salvate");
  };

  const handleTest = async () => {
    if (!token) { toast.error("Inserisci un token Apify prima di testare"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const { username } = await testConnection(token);
      setTestResult({ ok: true, message: `Connesso come @${username}` });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : "Connessione fallita" });
    }
    setTesting(false);
  };

  if (loading) {
    return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 560 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Impostazioni Lead Generation
      </h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)", marginBottom: 32 }}>
        Configura token Apify e valori predefiniti per le ricerche.
      </p>

      {/* Token */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Token Apify
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="apify_api_xxxxxxxxxxxxxxxx"
              className="glass-input"
              style={{ width: "100%", paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowToken((p) => !p)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 0 }}
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !token}
            className="btn-glass-ds"
            style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
          >
            {testing && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Test connessione
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: testResult.ok ? "var(--color-success)" : "var(--color-error)" }}>
            {testResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Paese default */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Paese predefinito
        </label>
        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="glass-input" style={{ width: "100%" }}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>

      {/* Language */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Lingua ricerca
        </label>
        <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} className="glass-input" style={{ width: "100%" }} placeholder="it" />
      </div>

      {/* Max places */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Max risultati per ricerca: <span style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>{maxPlaces}</span>
        </label>
        <input type="range" min={10} max={200} step={10} value={maxPlaces} onChange={(e) => setMaxPlaces(Number(e.target.value))} style={{ width: "100%" }} />
      </div>

      {/* Scrape contacts */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" id="scrape_contacts" checked={scrapeContacts} onChange={(e) => setScrapeContacts(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
        <label htmlFor="scrape_contacts" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
          Estrai email e contatti (costo extra: ~$2 / 1000 risultati)
        </label>
      </div>

      {/* Pricing info */}
      <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 32, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
        <strong style={{ color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Prezzi Apify (piano Free)</strong>
        Ricerca risultati: ~$4 / 1000 risultati<br />
        Estrazione contatti: ~$2 / 1000 risultati<br />
        Il piano Free include $5 di credito mensile.
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
        Salva impostazioni
      </button>
    </div>
  );
}
