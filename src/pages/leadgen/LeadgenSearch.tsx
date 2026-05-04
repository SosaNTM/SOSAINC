import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useLeadgenSettings } from "@/hooks/leadgen/useLeadgenSettings";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { startGoogleMapsRun } from "@/lib/apifyClient";
import { CountryFlagSelect } from "@/components/leadgen/CountryFlagSelect";
import { usePortal } from "@/lib/portalContext";

function estimateCost(places: number, scrapeContacts: boolean): string {
  const cost = (places / 1000) * 4 + (scrapeContacts ? (places / 1000) * 2 : 0);
  return `~$${cost.toFixed(2)} credito Apify`;
}

export default function LeadgenSearch() {
  const { data: settings } = useLeadgenSettings();
  const { createSearch } = useLeadgenSearches();
  const { portal } = usePortal();
  const navigate = useNavigate();

  const [countryCode, setCountryCode] = useState("IT");
  const [postalCode, setPostalCode] = useState("");
  const [category, setCategory] = useState("");
  const [maxPlaces, setMaxPlaces] = useState(50);
  const [scrapeContacts, setScrapeContacts] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (settings) {
      setCountryCode(settings.default_country_code);
      setMaxPlaces(settings.default_max_places);
      setScrapeContacts(settings.scrape_contacts);
    }
  }, [settings]);

  const costEstimate = useMemo(() => estimateCost(maxPlaces, scrapeContacts), [maxPlaces, scrapeContacts]);
  const noToken = !settings?.apify_token;

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
    <div style={{ padding: "24px 32px", maxWidth: 520 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
        Nuova ricerca
      </h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)", marginBottom: 28 }}>
        Scraping aziende da Google Maps tramite Apify.
      </p>

      {noToken && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--color-error) 12%, transparent)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 20, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-error)" }}>
          <AlertTriangle size={14} />
          Token Apify mancante. Configuralo nelle <a href={`/${portal?.id ?? "redx"}/leadgen/settings`} style={{ color: "inherit", textDecoration: "underline" }}>impostazioni</a>.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Paese</label>
          <CountryFlagSelect value={countryCode} onChange={setCountryCode} disabled={running} />
        </div>

        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>CAP</label>
          <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="20121" className="glass-input" style={{ width: "100%" }} disabled={running} maxLength={10} />
        </div>

        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Categoria</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ristoranti, dentisti, palestre..." className="glass-input" style={{ width: "100%" }} disabled={running} />
        </div>

        <div>
          <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
            Massimo luoghi: <span style={{ color: "var(--accent-primary)" }}>{maxPlaces}</span>
          </label>
          <input type="range" min={10} max={200} step={10} value={maxPlaces} onChange={(e) => setMaxPlaces(Number(e.target.value))} style={{ width: "100%" }} disabled={running} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>Costo stimato: <strong style={{ color: "var(--accent-primary)" }}>{costEstimate}</strong></p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="scrape" checked={scrapeContacts} onChange={(e) => setScrapeContacts(e.target.checked)} disabled={running} style={{ width: 16, height: 16, cursor: "pointer" }} />
          <label htmlFor="scrape" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>Estrai email e contatti</label>
        </div>

        <button type="submit" disabled={running || noToken} className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {running && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {running ? "Avvio in corso..." : "→ Avvia ricerca"}
        </button>
      </form>
    </div>
  );
}
