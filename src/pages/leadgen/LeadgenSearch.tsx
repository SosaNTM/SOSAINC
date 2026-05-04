import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Search, SlidersHorizontal, Star, X as XIcon } from "lucide-react";
import { useLeadgenSettings } from "@/hooks/leadgen/useLeadgenSettings";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { startGoogleMapsRun } from "@/lib/apifyClient";
import { usePortal } from "@/lib/portalContext";
import { PMI_DEFAULT, PMI_EXTRA, MAX_CATEGORIES } from "@/lib/leadgenCategories";
import { countryName } from "@/lib/countries";

function flagEmoji(code: string): string {
  return code.toUpperCase().split("").map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join("");
}

const ALL_COUNTRIES: { code: string; label: string }[] = [
  { code: "AF", label: "Afghanistan" }, { code: "AL", label: "Albania" },
  { code: "DZ", label: "Algeria" }, { code: "AD", label: "Andorra" },
  { code: "AO", label: "Angola" }, { code: "AG", label: "Antigua e Barbuda" },
  { code: "AR", label: "Argentina" }, { code: "AM", label: "Armenia" },
  { code: "AU", label: "Australia" }, { code: "AT", label: "Austria" },
  { code: "AZ", label: "Azerbaigian" }, { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahrein" }, { code: "BD", label: "Bangladesh" },
  { code: "BB", label: "Barbados" }, { code: "BY", label: "Bielorussia" },
  { code: "BE", label: "Belgio" }, { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Benin" }, { code: "BT", label: "Bhutan" },
  { code: "BO", label: "Bolivia" }, { code: "BA", label: "Bosnia ed Erzegovina" },
  { code: "BW", label: "Botswana" }, { code: "BR", label: "Brasile" },
  { code: "BN", label: "Brunei" }, { code: "BG", label: "Bulgaria" },
  { code: "BF", label: "Burkina Faso" }, { code: "BI", label: "Burundi" },
  { code: "CV", label: "Capo Verde" }, { code: "KH", label: "Cambogia" },
  { code: "CM", label: "Camerun" }, { code: "CA", label: "Canada" },
  { code: "CF", label: "Repubblica Centrafricana" }, { code: "TD", label: "Ciad" },
  { code: "CL", label: "Cile" }, { code: "CN", label: "Cina" },
  { code: "CO", label: "Colombia" }, { code: "KM", label: "Comore" },
  { code: "CG", label: "Congo" }, { code: "CD", label: "Congo (RDC)" },
  { code: "CR", label: "Costa Rica" }, { code: "CI", label: "Costa d'Avorio" },
  { code: "HR", label: "Croazia" }, { code: "CU", label: "Cuba" },
  { code: "CY", label: "Cipro" }, { code: "CZ", label: "Repubblica Ceca" },
  { code: "DK", label: "Danimarca" }, { code: "DJ", label: "Gibuti" },
  { code: "DM", label: "Dominica" }, { code: "DO", label: "Repubblica Dominicana" },
  { code: "EC", label: "Ecuador" }, { code: "EG", label: "Egitto" },
  { code: "SV", label: "El Salvador" }, { code: "GQ", label: "Guinea Equatoriale" },
  { code: "ER", label: "Eritrea" }, { code: "EE", label: "Estonia" },
  { code: "SZ", label: "Eswatini" }, { code: "ET", label: "Etiopia" },
  { code: "FJ", label: "Figi" }, { code: "FI", label: "Finlandia" },
  { code: "FR", label: "Francia" }, { code: "GA", label: "Gabon" },
  { code: "GM", label: "Gambia" }, { code: "GE", label: "Georgia" },
  { code: "DE", label: "Germania" }, { code: "GH", label: "Ghana" },
  { code: "GR", label: "Grecia" }, { code: "GD", label: "Grenada" },
  { code: "GT", label: "Guatemala" }, { code: "GN", label: "Guinea" },
  { code: "GW", label: "Guinea-Bissau" }, { code: "GY", label: "Guyana" },
  { code: "HT", label: "Haiti" }, { code: "HN", label: "Honduras" },
  { code: "HU", label: "Ungheria" }, { code: "IS", label: "Islanda" },
  { code: "IN", label: "India" }, { code: "ID", label: "Indonesia" },
  { code: "IR", label: "Iran" }, { code: "IQ", label: "Iraq" },
  { code: "IE", label: "Irlanda" }, { code: "IL", label: "Israele" },
  { code: "IT", label: "Italia" }, { code: "JM", label: "Giamaica" },
  { code: "JP", label: "Giappone" }, { code: "JO", label: "Giordania" },
  { code: "KZ", label: "Kazakhstan" }, { code: "KE", label: "Kenya" },
  { code: "KI", label: "Kiribati" }, { code: "KP", label: "Corea del Nord" },
  { code: "KR", label: "Corea del Sud" }, { code: "KW", label: "Kuwait" },
  { code: "KG", label: "Kirghizistan" }, { code: "LA", label: "Laos" },
  { code: "LV", label: "Lettonia" }, { code: "LB", label: "Libano" },
  { code: "LS", label: "Lesotho" }, { code: "LR", label: "Liberia" },
  { code: "LY", label: "Libia" }, { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lituania" }, { code: "LU", label: "Lussemburgo" },
  { code: "MG", label: "Madagascar" }, { code: "MW", label: "Malawi" },
  { code: "MY", label: "Malaysia" }, { code: "MV", label: "Maldive" },
  { code: "ML", label: "Mali" }, { code: "MT", label: "Malta" },
  { code: "MH", label: "Isole Marshall" }, { code: "MR", label: "Mauritania" },
  { code: "MU", label: "Mauritius" }, { code: "MX", label: "Messico" },
  { code: "FM", label: "Micronesia" }, { code: "MD", label: "Moldavia" },
  { code: "MC", label: "Monaco" }, { code: "MN", label: "Mongolia" },
  { code: "ME", label: "Montenegro" }, { code: "MA", label: "Marocco" },
  { code: "MZ", label: "Mozambico" }, { code: "MM", label: "Myanmar" },
  { code: "NA", label: "Namibia" }, { code: "NR", label: "Nauru" },
  { code: "NP", label: "Nepal" }, { code: "NL", label: "Paesi Bassi" },
  { code: "NZ", label: "Nuova Zelanda" }, { code: "NI", label: "Nicaragua" },
  { code: "NE", label: "Niger" }, { code: "NG", label: "Nigeria" },
  { code: "MK", label: "Macedonia del Nord" }, { code: "NO", label: "Norvegia" },
  { code: "OM", label: "Oman" }, { code: "PK", label: "Pakistan" },
  { code: "PW", label: "Palau" }, { code: "PA", label: "Panama" },
  { code: "PG", label: "Papua Nuova Guinea" }, { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Perù" }, { code: "PH", label: "Filippine" },
  { code: "PL", label: "Polonia" }, { code: "PT", label: "Portogallo" },
  { code: "QA", label: "Qatar" }, { code: "RO", label: "Romania" },
  { code: "RU", label: "Russia" }, { code: "RW", label: "Ruanda" },
  { code: "KN", label: "Saint Kitts e Nevis" }, { code: "LC", label: "Saint Lucia" },
  { code: "VC", label: "Saint Vincent e Grenadine" }, { code: "WS", label: "Samoa" },
  { code: "SM", label: "San Marino" }, { code: "ST", label: "São Tomé e Príncipe" },
  { code: "SA", label: "Arabia Saudita" }, { code: "SN", label: "Senegal" },
  { code: "RS", label: "Serbia" }, { code: "SC", label: "Seychelles" },
  { code: "SL", label: "Sierra Leone" }, { code: "SG", label: "Singapore" },
  { code: "SK", label: "Slovacchia" }, { code: "SI", label: "Slovenia" },
  { code: "SB", label: "Isole Salomone" }, { code: "SO", label: "Somalia" },
  { code: "ZA", label: "Sudafrica" }, { code: "SS", label: "Sudan del Sud" },
  { code: "ES", label: "Spagna" }, { code: "LK", label: "Sri Lanka" },
  { code: "SD", label: "Sudan" }, { code: "SR", label: "Suriname" },
  { code: "SE", label: "Svezia" }, { code: "CH", label: "Svizzera" },
  { code: "SY", label: "Siria" }, { code: "TW", label: "Taiwan" },
  { code: "TJ", label: "Tagikistan" }, { code: "TZ", label: "Tanzania" },
  { code: "TH", label: "Tailandia" }, { code: "TL", label: "Timor Est" },
  { code: "TG", label: "Togo" }, { code: "TO", label: "Tonga" },
  { code: "TT", label: "Trinidad e Tobago" }, { code: "TN", label: "Tunisia" },
  { code: "TR", label: "Turchia" }, { code: "TM", label: "Turkmenistan" },
  { code: "TV", label: "Tuvalu" }, { code: "UG", label: "Uganda" },
  { code: "UA", label: "Ucraina" }, { code: "AE", label: "Emirati Arabi Uniti" },
  { code: "GB", label: "Regno Unito" }, { code: "US", label: "Stati Uniti" },
  { code: "UY", label: "Uruguay" }, { code: "UZ", label: "Uzbekistan" },
  { code: "VU", label: "Vanuatu" }, { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Vietnam" }, { code: "YE", label: "Yemen" },
  { code: "ZM", label: "Zambia" }, { code: "ZW", label: "Zimbabwe" },
];

const LANGUAGES = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
];

const FAV_KEY = "leadgen_country_favs";

const ALL_CHIPS = [...PMI_DEFAULT, ...PMI_EXTRA];

function loadFavs(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); } catch { return []; }
}
function saveFavs(favs: string[]) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function calcCost(numCategories: number, maxPlaces: number, scrapeContacts: boolean) {
  return numCategories * maxPlaces * (scrapeContacts ? 0.006 : 0.004);
}

function CostBadge({ total }: { total: number }) {
  let color: string;
  let text: string;
  if (total < 1) {
    color = "var(--color-success)";
    text = "Free tier";
  } else if (total < 3) {
    color = "var(--color-warning)";
    text = "Parte del free credit";
  } else if (total <= 5) {
    color = "color-mix(in srgb, var(--color-warning) 60%, var(--color-error) 40%)";
    text = "Tutto il free credit";
  } else {
    color = "var(--color-error)";
    text = "Supera il free credit";
  }
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "2px 8px",
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      border: `1px solid ${color}`,
      color,
    }}>
      {text}
    </span>
  );
}

interface CountryRowProps {
  c: { code: string; label: string };
  isFav: boolean;
  currentCode: string;
  onSelect: (code: string) => void;
  onToggleFav: (code: string, e: React.MouseEvent) => void;
}

function CountryRow({ c, isFav, currentCode, onSelect, onToggleFav }: CountryRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 14px",
        height: 40,
        background: c.code === currentCode ? "var(--sosa-bg-2)" : "transparent",
        borderBottom: "1px solid var(--glass-border)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { if (c.code !== currentCode) (e.currentTarget as HTMLDivElement).style.background = "var(--sosa-bg-2)"; }}
      onMouseLeave={(e) => { if (c.code !== currentCode) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
      onClick={() => onSelect(c.code)}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }}>{flagEmoji(c.code)}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600, flexShrink: 0, marginRight: 4 }}>{c.code}</span>
      <button
        type="button"
        onClick={(e) => onToggleFav(c.code, e)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", flexShrink: 0 }}
      >
        <Star
          size={12}
          fill={isFav ? "var(--accent-primary)" : "none"}
          color={isFav ? "var(--accent-primary)" : "var(--text-tertiary)"}
          strokeWidth={2}
        />
      </button>
    </div>
  );
}

export default function LeadgenSearch() {
  const { data: settings } = useLeadgenSettings();
  const { createSearch } = useLeadgenSearches();
  const { portal } = usePortal();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [countryCode, setCountryCode] = useState("IT");
  const [postalCode, setPostalCode] = useState("");
  const [categories, setCategories] = useState<string[]>([...PMI_DEFAULT]);
  const [customCatInput, setCustomCatInput] = useState("");
  const [scrapeContacts, setScrapeContacts] = useState(true);
  const [maxPlaces, setMaxPlaces] = useState(50);
  const [language, setLanguage] = useState("it");
  const [running, setRunning] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [favs, setFavs] = useState<string[]>(loadFavs);

  useEffect(() => {
    if (settings) {
      setCountryCode(settings.default_country_code);
      setScrapeContacts(settings.scrape_contacts);
      setMaxPlaces(settings.default_max_places);
      setLanguage(settings.default_language ?? "it");
    }
  }, [settings]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFlagOpen(false);
        setCountrySearch("");
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleFav = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavs((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      saveFavs(next);
      return next;
    });
  };

  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase();
    const list = q
      ? ALL_COUNTRIES.filter((c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      : ALL_COUNTRIES;
    const favSet = new Set(favs);
    const top = list.filter((c) => favSet.has(c.code));
    const rest = list.filter((c) => !favSet.has(c.code));
    return { top, rest };
  }, [countrySearch, favs]);

  const currentCountry = ALL_COUNTRIES.find((c) => c.code === countryCode) ?? ALL_COUNTRIES[0];
  const noToken = !settings?.apify_token;

  const isPMIDefault = useMemo(
    () => categories.length === PMI_DEFAULT.length && PMI_DEFAULT.every((c) => categories.includes(c)),
    [categories]
  );

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : prev.length >= MAX_CATEGORIES
        ? prev
        : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    const trimmed = customCatInput.trim().toLowerCase();
    if (!trimmed || categories.includes(trimmed) || categories.length >= MAX_CATEGORIES) return;
    setCategories((prev) => [...prev, trimmed]);
    setCustomCatInput("");
  };

  const removeCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.apify_token) { toast.error("Configura il token Apify nelle impostazioni"); return; }
    if (!postalCode.trim()) { toast.error("Il CAP è obbligatorio"); return; }
    if (categories.length === 0) { toast.error("Seleziona almeno una categoria"); return; }
    setRunning(true);
    try {
      const locName = countryName(countryCode);
      const locationQuery = `${postalCode.trim()}, ${locName}`;
      const { runId, defaultDatasetId } = await startGoogleMapsRun(settings.apify_token, {
        searchStringsArray: categories,
        locationQuery,
        language,
        maxCrawledPlacesPerSearch: maxPlaces,
        scrapeContacts,
        actorId: settings.actor_id,
      });
      const { data: search, error } = await createSearch({
        country_code: countryCode,
        postal_code: postalCode.trim(),
        categories,
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

  const hasNonDefaultSettings = !isPMIDefault
    || maxPlaces !== (settings?.default_max_places ?? 50)
    || !scrapeContacts
    || language !== (settings?.default_language ?? "it");

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      overflow: "hidden",
      padding: "0 24px",
    }}>
      <div style={{ transform: "translateY(-60px)", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Header */}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 16 }}>
          LEAD GENERATION
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 40, textAlign: "center", letterSpacing: "-0.02em" }}>
          Trova nuovi clienti
        </h1>

        {/* Token warning */}
        {noToken && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "color-mix(in srgb, var(--color-error) 10%, transparent)", border: "1px solid var(--color-error)", padding: "10px 16px", marginBottom: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-error)", width: "100%", maxWidth: 700 }}>
            <AlertTriangle size={14} />
            Token Apify mancante.{" "}
            <a href={`/${portal?.id ?? "redx"}/settings/leadgen/impostazioni`} style={{ color: "inherit", textDecoration: "underline" }}>
              Configuralo nelle impostazioni
            </a>
          </div>
        )}

        {/* Search bar + filter button row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%", maxWidth: 700 }}>
          <form onSubmit={handleSubmit} autoComplete="off" role="search" style={{ flex: 1 }}>
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
                  onClick={() => { setFlagOpen((p) => !p); setFilterOpen(false); }}
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
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{flagEmoji(currentCountry.code)}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em" }}>{currentCountry.code}</span>
                </button>

                {/* Country dropdown */}
                {flagOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 200,
                    background: "var(--sosa-bg)",
                    border: "1.5px solid var(--glass-border)",
                    width: 260,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--glass-border)", flexShrink: 0 }}>
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Cerca paese..."
                        autoComplete="off"
                        name="leadgen-paese-search"
                        autoFocus
                        style={{
                          width: "100%",
                          background: "var(--sosa-bg-2)",
                          border: "1px solid var(--glass-border)",
                          outline: "none",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--text-primary)",
                          padding: "6px 10px",
                        }}
                      />
                    </div>

                    <div style={{ overflowY: "auto", maxHeight: 320 }}>
                      {filteredCountries.top.length > 0 && (
                        <>
                          <div style={{ padding: "6px 14px 4px", display: "flex", alignItems: "center", gap: 5 }}>
                            <Star size={9} fill="var(--accent-primary)" color="var(--accent-primary)" />
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-primary)" }}>
                              Preferiti
                            </span>
                          </div>
                          {filteredCountries.top.map((c) => (
                            <CountryRow key={c.code} c={c} isFav={true} currentCode={countryCode} onSelect={(code) => { setCountryCode(code); setFlagOpen(false); setCountrySearch(""); }} onToggleFav={toggleFav} />
                          ))}
                          {filteredCountries.rest.length > 0 && (
                            <div style={{ padding: "6px 14px 4px", borderTop: "1px solid var(--glass-border)", marginTop: 2 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
                                Tutti i paesi
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {filteredCountries.rest.map((c) => (
                        <CountryRow key={c.code} c={c} isFav={false} currentCode={countryCode} onSelect={(code) => { setCountryCode(code); setFlagOpen(false); setCountrySearch(""); }} onToggleFav={toggleFav} />
                      ))}

                      {filteredCountries.top.length === 0 && filteredCountries.rest.length === 0 && (
                        <div style={{ padding: "20px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}>
                          Nessun risultato
                        </div>
                      )}
                    </div>
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
                autoComplete="off"
                name="leadgen-cap"
                style={{
                  flex: 1,
                  height: "100%",
                  background: "transparent",
                  border: "none",
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

              {/* Submit */}
              <button
                type="submit"
                disabled={running || noToken || categories.length === 0 || !postalCode.trim()}
                style={{
                  width: 56,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: (running || noToken || categories.length === 0 || !postalCode.trim()) ? "var(--sosa-bg-2)" : "var(--accent-primary)",
                  border: "none",
                  borderLeft: "1.5px solid var(--glass-border)",
                  cursor: (running || noToken || categories.length === 0 || !postalCode.trim()) ? "not-allowed" : "pointer",
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                {running
                  ? <Loader2 size={18} color="#000" style={{ animation: "spin 1s linear infinite" }} />
                  : <Search size={18} color={(noToken || categories.length === 0 || !postalCode.trim()) ? "var(--text-tertiary)" : "#000"} />
                }
              </button>
            </div>
          </form>

          {/* Settings + category panel button */}
          <div ref={filterRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setFilterOpen((p) => !p); setFlagOpen(false); setCountrySearch(""); }}
              title="Categorie e impostazioni"
              style={{
                width: 56,
                height: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: filterOpen ? "var(--sosa-bg-2)" : "var(--glass-bg)",
                border: filterOpen
                  ? "1.5px solid var(--accent-primary)"
                  : hasNonDefaultSettings
                  ? "1.5px solid color-mix(in srgb, var(--accent-primary) 50%, var(--glass-border))"
                  : "1.5px solid var(--glass-border)",
                cursor: "pointer",
                transition: "border-color 0.15s",
                position: "relative",
              }}
            >
              <SlidersHorizontal size={16} color={filterOpen ? "var(--accent-primary)" : hasNonDefaultSettings ? "var(--accent-primary)" : "var(--text-secondary)"} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, color: filterOpen || hasNonDefaultSettings ? "var(--accent-primary)" : "var(--text-tertiary)", letterSpacing: "0.06em" }}>
                {categories.length}/{MAX_CATEGORIES}
              </span>
              {hasNonDefaultSettings && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)" }} />
              )}
            </button>

            {/* Panel */}
            {filterOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 200,
                background: "var(--sosa-bg)",
                border: "1.5px solid var(--glass-border)",
                width: 380,
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                padding: "20px",
              }}>

                {/* ── Categorie ── */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", margin: 0 }}>
                      Categorie
                    </p>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setCategories([...PMI_DEFAULT])}
                        style={{
                          padding: "3px 10px",
                          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          background: isPMIDefault ? "var(--accent-primary)" : "transparent",
                          border: `1px solid ${isPMIDefault ? "var(--accent-primary)" : "var(--glass-border)"}`,
                          color: isPMIDefault ? "#000" : "var(--text-tertiary)",
                          cursor: "pointer",
                        }}
                      >
                        PMI
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategories([])}
                        style={{
                          padding: "3px 10px",
                          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
                          letterSpacing: "0.08em", textTransform: "uppercase",
                          background: "transparent",
                          border: "1px solid var(--glass-border)",
                          color: "var(--text-tertiary)",
                          cursor: "pointer",
                        }}
                      >
                        Reset
                      </button>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: categories.length >= MAX_CATEGORIES ? "var(--color-error)" : "var(--text-tertiary)" }}>
                        {categories.length}/{MAX_CATEGORIES}
                      </span>
                    </div>
                  </div>

                  {/* Chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                    {ALL_CHIPS.map((cat) => {
                      const selected = categories.includes(cat);
                      const disabled = !selected && categories.length >= MAX_CATEGORIES;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          disabled={disabled}
                          style={{
                            padding: "4px 10px",
                            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                            letterSpacing: "0.06em",
                            background: selected ? "var(--accent-primary)" : "transparent",
                            border: `1px solid ${selected ? "var(--accent-primary)" : "var(--glass-border)"}`,
                            color: selected ? "#000" : "var(--text-tertiary)",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.4 : 1,
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                    {categories.filter((c) => !ALL_CHIPS.includes(c)).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => removeCategory(cat)}
                        style={{
                          padding: "4px 10px",
                          fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
                          letterSpacing: "0.06em",
                          background: "var(--accent-primary)",
                          border: "1px solid var(--accent-primary)",
                          color: "#000",
                          cursor: "pointer",
                          display: "inline-flex", alignItems: "center", gap: 5,
                        }}
                      >
                        {cat} <XIcon size={9} />
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      value={customCatInput}
                      onChange={(e) => setCustomCatInput(e.target.value.slice(0, 40))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomCategory(); } }}
                      placeholder="Categoria custom..."
                      autoComplete="off"
                      name="leadgen-custom-cat"
                      className="glass-input"
                      style={{ flex: 1, fontSize: 11 }}
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      disabled={!customCatInput.trim() || categories.length >= MAX_CATEGORIES}
                      className="btn-glass-ds"
                      style={{ fontSize: 10, whiteSpace: "nowrap" }}
                    >
                      + Aggiungi
                    </button>
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--glass-border)", marginBottom: 18 }} />

                {/* ── Impostazioni ── */}
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 16 }}>
                  Impostazioni
                </p>

                {/* Max risultati */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Max risultati
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent-primary)" }}>
                      {maxPlaces}
                    </span>
                  </div>
                  <input
                    type="range" min={10} max={100} step={10} value={maxPlaces}
                    onChange={(e) => setMaxPlaces(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent-primary)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)" }}>10</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)" }}>100</span>
                  </div>
                </div>

                {/* Scrape contacts */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block" }}>
                        Estrai contatti
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginTop: 2, display: "block" }}>
                        Email, telefono, social
                      </span>
                    </div>
                    <input
                      type="checkbox" checked={scrapeContacts}
                      onChange={(e) => setScrapeContacts(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--accent-primary)", flexShrink: 0 }}
                    />
                  </label>
                </div>

                {/* Language */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                    Lingua ricerca
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLanguage(l.code)}
                        style={{
                          padding: "4px 10px",
                          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                          background: language === l.code ? "var(--accent-primary)" : "transparent",
                          color: language === l.code ? "#000" : "var(--text-tertiary)",
                          border: `1px solid ${language === l.code ? "var(--accent-primary)" : "var(--glass-border)"}`,
                          cursor: "pointer",
                        }}
                      >
                        {l.code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--glass-border)", marginBottom: 18 }} />

                {/* ── Costo stimato ── */}
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12 }}>
                  Costo stimato
                </p>
                {categories.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
                    Seleziona almeno una categoria
                  </p>
                ) : (() => {
                  const base = categories.length * maxPlaces * 0.004;
                  const contacts = scrapeContacts ? categories.length * maxPlaces * 0.002 : 0;
                  const total = base + contacts;
                  const estDedup = Math.round(categories.length * maxPlaces * 0.7);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>Scraping ({categories.length} cat. × {maxPlaces} ris.)</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>~${base.toFixed(2)}</span>
                      </div>
                      {scrapeContacts && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>Estrazione contatti</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>~${contacts.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ height: 1, background: "var(--glass-border)", margin: "2px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>Totale</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <CostBadge total={total} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--accent-primary)" }}>~${total.toFixed(2)}</span>
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginTop: 4, lineHeight: 1.6 }}>
                        ≈ {estDedup} attività dopo deduplica · Piano Free: $5/mese incluso
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Compact status line */}
        <div style={{ width: "100%", maxWidth: 700, marginTop: 10, minHeight: 18 }}>
          {categories.length === 0 ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-error)", margin: 0 }}>
              Nessuna categoria — apri il pannello a destra per selezionare
            </p>
          ) : postalCode.trim() ? (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
              {categories.length} categor{categories.length === 1 ? "ia" : "ie"} · {postalCode.trim()}, {currentCountry.label} · max {maxPlaces} per categoria · ~${calcCost(categories.length, maxPlaces, scrapeContacts).toFixed(2)}
            </p>
          ) : null}
        </div>

      </div>
    </div>
  );
}
