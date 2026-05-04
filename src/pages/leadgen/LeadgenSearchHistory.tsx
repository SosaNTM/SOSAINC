import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLeadgenSearches } from "@/hooks/leadgen/useLeadgenSearches";
import { useLeadgenSettings } from "@/hooks/leadgen/useLeadgenSettings";
import { SearchProgressIndicator } from "@/components/leadgen/SearchProgressIndicator";
import { usePortal } from "@/lib/portalContext";
import type { LeadgenSearch } from "@/types/leadgen";

function duration(search: LeadgenSearch): string {
  if (!search.completed_at) return "—";
  const ms = new Date(search.completed_at).getTime() - new Date(search.started_at).getTime();
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.round(s / 60)}m ${s % 60}s`;
}

export default function LeadgenSearchHistory() {
  const { searches, loading, startPolling, stopPolling } = useLeadgenSearches();
  const { data: settings } = useLeadgenSettings();
  const { portal } = usePortal();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");

  useEffect(() => {
    const hasRunning = searches.some((s) => s.status === "running");
    if (hasRunning && settings?.apify_token) {
      startPolling(settings.apify_token);
    } else {
      stopPolling();
    }
  }, [searches, settings, startPolling, stopPolling]);

  if (loading) {
    return <div style={{ padding: 32, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: "24px 32px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>
        Storico ricerche
      </h1>

      {searches.length === 0 ? (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>Nessuna ricerca avviata.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                {["Paese", "CAP", "Categorie", "Status", "Salvate", "Escluse", "Con sito", "Senza sito", "Data", "Durata"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-tertiary)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {searches.flatMap((s) => {
                const rows = [
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: "1px solid var(--glass-border)",
                      background: s.id === highlight ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{s.country_code}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{s.postal_code}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>
                      {s.categories?.length > 0 ? s.categories.join(", ") : (s.category ?? "—")}
                    </td>
                    <td style={{ padding: "10px 12px" }}><SearchProgressIndicator status={s.status} /></td>
                    <td style={{ padding: "10px 12px", color: "var(--text-primary)", textAlign: "center" }}>{s.total_results}</td>
                    <td style={{ padding: "10px 12px", color: "var(--color-error)", textAlign: "center" }}>
                      {s.excluded_count ?? 0}
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--color-success)", textAlign: "center" }}>{s.with_website}</td>
                    <td style={{ padding: "10px 12px", color: "var(--color-error)", textAlign: "center" }}>{s.without_website}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>{new Date(s.started_at).toLocaleDateString("it-IT")}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-tertiary)" }}>{duration(s)}</td>
                  </tr>,
                ];

                if (s.status === "completed" && (s.excluded_count ?? 0) > 0) {
                  rows.push(
                    <tr key={`${s.id}-excl`} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <td colSpan={10} style={{ padding: "0 12px 8px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
                        {s.excluded_count ?? 0} attività escluse dalla blacklist (catene) —{" "}
                        <a href={`/${portal?.id ?? "redx"}/leadgen/settings`} style={{ color: "var(--accent-primary)", textDecoration: "none" }}>
                          Gestisci blacklist
                        </a>
                      </td>
                    </tr>
                  );
                }

                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
