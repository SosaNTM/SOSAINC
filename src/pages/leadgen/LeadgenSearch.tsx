import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Search } from "lucide-react";
import { useLeadgenSettings } from "@/hooks/leadgen/useLeadgenSettings";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { startGoogleMapsRun } from "@/lib/apifyClient";
import { usePortal } from "@/lib/portalContext";

const COUNTRIES = [
  { code: "IT", label: "Italia",      flag: "🇮🇹" },
  { code: "FR", label: "Francia",     flag: "🇫🇷" },
  { code: "DE", label: "Germania",    flag: "🇩🇪" },
  { code: "ES", label: "Spagna",      flag: "🇪🇸" },
  { code: "GB", label: "Regno Unito", flag: "🇬🇧" },
  { code: "US", label: "Stati Uniti", flag: "🇺🇸" },
  { code: "CH", label: "Svizzera",    flag: "🇨🇭" },
  { code: "NL", label: "Paesi Bassi", flag: "🇳🇱" },
  { code: "BE", label: "Belgio",      flag: "🇧🇪" },
  { code: "PT", label: "Portogallo",  flag: "🇵🇹" },
];

export default function LeadgenSearch() {
  const { data: settings } = useLeadgenSettings();
  const { createSearch } = useLeadgenSearches();
  const { portal } = usePortal();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [countryCode, setCountryCode] = useState("IT");
  const [postalCode, setPostalCode] = useState("");
  const [category, setCategory] = useState("");
  const [scrapeContacts, setScrapeContacts] = useState(true);
  const [running, setRunning] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setCountryCode(settings.default_country_code);
      setScrapeContacts(settings.scrape_contacts);
    }
  }, [settings]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFlagOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentCountry = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];
  const noToken = !settings?.apify_token;
  const maxPlaces = settings?.default_max_places ?? 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.apify_token) { toast.error("Configura il token Apify nelle impostazioni"); return; }
    if (!postalCode.trim() || !category.trim()) { toast.error("CAP e categoria sono obbligatori"); return; }
    setRunning(true);
    try {
      const locationQuery = `${postalCode.trim()}, ${countryCode}`;
      const { runId, defaultDatasetId } = await startGoogleMapsRun(settings.apify_token, {
        searchStringsArray: [category.trim()],
        locationQuery,
        maxCrawledPlacesPerSearch: maxPlaces,
        scrapeContacts,
      });
      const { data: search, error } = await createSearch({
        country_code: countryCode,
        postal_code: postalCode.trim(),
        category: category.trim(),
        apify_run_id: runId,
        apify_dataset_id: defaultDatasetId,
      });
      if (error || !search) throw new Error(error ?? "Errore creazione ricerca");
      toast.success("Ricerca avviata");
      navigate(`/${portal?.id ?? "redx"}/leadgen/searches?highlight=${search.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore avvio ricerca");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 120px)",
      padding: "40px 24px",
    }}>
      {/* Header */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 16 }}>
        LEAD GENERATION
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, textAlign: "center", letterSpacing: "-0.02em" }}>
        Trova nuovi clienti
      </h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-tertiary)", marginBottom: 40, textAlign: "center" }}>
        Scraping aziende da Google Maps tramite Apify
      </p>

      {/* Token warning */}
      {noToken && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "1px solid var(--color-error)", padding: "10px 16px", marginBottom: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-error)", width: "100%", maxWidth: 640 }}>
          <AlertTriangle size={14} />
          Token Apify mancante.{" "}
          <a href={`/${portal?.id ?? "redx"}/leadgen/settings`} style={{ color: "inherit", textDecoration: "underline" }}>
            Configuralo nelle impostazioni
          </a>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 640 }}>
        <div style={{
          display: "flex",
          alignItems: "stretch",
          border: "1.5px solid var(--glass-border)",
          background: "var(--glass-bg)",
          overflow: "visible",
          position: "relative",
          height: 56,
        }}>
          {/* Flag button */}
          <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setFlagOpen((p) => !p)}
              disabled={running}
              style={{
                width: 56,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                background: flagOpen ? "var(--sosa-bg-2)" : "transparent",
                border: "none",
                borderRight: "1.5px solid var(--glass-border)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{currentCountry.flag}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em" }}>{currentCountry.code}</span>
            </button>

            {/* Dropdown */}
            {flagOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 100,
                background: "var(--sosa-bg)",
                border: "1.5px solid var(--glass-border)",
                minWidth: 200,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}>
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCountryCode(c.code); setFlagOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 14px",
                      background: c.code === countryCode ? "var(--sosa-bg-2)" : "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--glass-border)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { if (c.code !== countryCode) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
                    onMouseLeave={(e) => { if (c.code !== countryCode) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 18 }}>{c.flag}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", flex: 1 }}>{c.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600 }}>{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CAP input */}
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="CAP"
            disabled={running}
            maxLength={10}
            style={{
              width: 80,
              height: "100%",
              background: "transparent",
              border: "none",
              borderRight: "1.5px solid var(--glass-border)",
              outline: "none",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              padding: "0 14px",
              letterSpacing: "0.04em",
            }}
            onFocus={(e) => e.currentTarget.parentElement!.style.borderColor = "var(--accent-primary)"}
            onBlur={(e) => e.currentTarget.parentElement!.style.borderColor = "var(--glass-border)"}
          />

          {/* Category input */}
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoria — ristoranti, dentisti, palestre..."
            disabled={running}
            style={{
              flex: 1,
              height: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              color: "var(--text-primary)",
              padding: "0 16px",
            }}
            onFocus={(e) => e.currentTarget.parentElement!.style.borderColor = "var(--accent-primary)"}
            onBlur={(e) => e.currentTarget.parentElement!.style.borderColor = "var(--glass-border)"}
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={running || noToken}
            style={{
              width: 56,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: running || noToken ? "var(--sosa-bg-2)" : "var(--accent-primary)",
              border: "none",
              borderLeft: "1.5px solid var(--glass-border)",
              cursor: running || noToken ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            {running
              ? <Loader2 size={18} color="#000" style={{ animation: "spin 1s linear infinite" }} />
              : <Search size={18} color={noToken ? "var(--text-tertiary)" : "#000"} />
            }
          </button>
        </div>

        {/* Below bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "0 4px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={scrapeContacts}
              onChange={(e) => setScrapeContacts(e.target.checked)}
              disabled={running}
              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "var(--accent-primary)" }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
              Estrai email e contatti
            </span>
          </label>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
            Max {maxPlaces} risultati · {scrapeContacts ? "con" : "senza"} contatti
          </span>
        </div>
      </form>
    </div>
  );
}
