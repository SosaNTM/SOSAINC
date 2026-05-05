import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenSearch, ApifyPlaceResult } from "@/types/leadgen";
import { broadcastLeadgenUpdate } from "@/lib/leadgenRealtime";
import { getRunStatus, getDatasetItems } from "@/lib/apifyClient";
import { applyBlacklist } from "@/lib/leadgenFilter";

const POLL_INTERVAL_MS = 5000;

export function useLeadgenSearches() {
  const { currentPortalId } = usePortalDB();
  const [searches, setSearches] = useState<LeadgenSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSearches = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    const { data } = await supabase
      .from("leadgen_searches")
      .select("*")
      .eq("portal_id", currentPortalId)
      .order("started_at", { ascending: false });
    setSearches((data ?? []) as LeadgenSearch[]);
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchSearches(); }, [fetchSearches]);

  const pollRunning = useCallback(async (apifyToken: string) => {
    const running = searches.filter((s) => s.status === "running" && s.apify_run_id);
    if (!running.length || !currentPortalId) return;

    for (const search of running) {
      try {
        const { status, defaultDatasetId } = await getRunStatus(apifyToken, search.apify_run_id!);

        if (status === "SUCCEEDED") {
          const items = await getDatasetItems<ApifyPlaceResult>(apifyToken, defaultDatasetId);

          // Load blacklist rules for this portal
          const { data: blacklistRows } = await supabase
            .from("leadgen_blacklist")
            .select("rule_type, rule_value")
            .eq("portal_id", currentPortalId)
            .eq("active", true);

          const bRows = (blacklistRows ?? []) as { rule_type: string; rule_value: string }[];
          const blacklistRules = {
            titleKeywords: bRows.filter((r) => r.rule_type === "title_keyword").map((r) => r.rule_value),
            websiteDomains: bRows.filter((r) => r.rule_type === "website_domain").map((r) => r.rule_value),
            categories: bRows.filter((r) => r.rule_type === "category").map((r) => r.rule_value),
            minReviews: (() => {
              const row = bRows.find((r) => r.rule_type === "min_reviews");
              if (!row) return null;
              const n = parseInt(row.rule_value, 10);
              return isNaN(n) || n === 0 ? null : n;
            })(),
          };

          const kept: typeof items = [];
          let excludedCount = 0;
          for (const item of items) {
            const { keep } = applyBlacklist(blacklistRules, item);
            if (keep) kept.push(item);
            else excludedCount++;
          }

          const leadsToInsert = kept.map((item) => ({
            portal_id: currentPortalId,
            search_id: search.id,
            place_id: item.placeId,
            name: item.title,
            address: item.address ?? null,
            postal_code: item.zip ?? null,
            city: item.city ?? null,
            country_code: item.countryCode ?? null,
            phone: item.phone ?? null,
            website: item.website ?? null,
            category: item.categoryName ?? null,
            rating: item.totalScore ?? null,
            reviews_count: item.reviewsCount ?? null,
            emails: item.emails ?? [],
            social_media: {
              ...(item.instagram ? { instagram: item.instagram } : {}),
              ...(item.facebook ? { facebook: item.facebook } : {}),
              ...(item.twitter ? { twitter: item.twitter } : {}),
              ...(item.linkedin ? { linkedin: item.linkedin } : {}),
            },
            outreach_status: "new" as const,
            outreach_notes: null,
            contacted_at: null,
            created_at: new Date().toISOString(),
          }));

          const { error: upsertErr } = await supabase
            .from("leadgen_leads")
            .upsert(leadsToInsert, { onConflict: "portal_id,place_id", ignoreDuplicates: true });

          if (upsertErr) {
            await supabase
              .from("leadgen_searches")
              .update({ status: "failed", error_message: `Upsert leads failed: ${upsertErr.message}`, completed_at: new Date().toISOString() })
              .eq("portal_id", currentPortalId)
              .eq("id", search.id);
            broadcastLeadgenUpdate("search_failed", { searchId: search.id });
            await fetchSearches();
            continue;
          }

          const withWebsite = leadsToInsert.filter((l) => !!l.website).length;
          const withoutWebsite = leadsToInsert.length - withWebsite;

          await supabase
            .from("leadgen_searches")
            .update({
              status: "completed",
              apify_dataset_id: defaultDatasetId,
              total_results: leadsToInsert.length,
              with_website: withWebsite,
              without_website: withoutWebsite,
              excluded_count: excludedCount,
              completed_at: new Date().toISOString(),
            })
            .eq("portal_id", currentPortalId)
            .eq("id", search.id);

          broadcastLeadgenUpdate("search_completed", { searchId: search.id });
          await fetchSearches();

        } else if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
          await supabase
            .from("leadgen_searches")
            .update({ status: "failed", error_message: `Apify run ${status}`, completed_at: new Date().toISOString() })
            .eq("portal_id", currentPortalId)
            .eq("id", search.id);
          broadcastLeadgenUpdate("search_failed", { searchId: search.id });
          await fetchSearches();
        }
      } catch (err) {
        console.warn("[leadgen poll]", err);
      }
    }
  }, [searches, currentPortalId, fetchSearches]);

  const pollRunningRef = useRef(pollRunning);
  useEffect(() => { pollRunningRef.current = pollRunning; }, [pollRunning]);

  const startPolling = useCallback((apifyToken: string) => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(() => pollRunningRef.current(apifyToken), POLL_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const createSearch = useCallback(async (payload: {
    country_code: string;
    postal_code: string;
    categories: string[];
    apify_run_id: string;
    apify_dataset_id: string;
  }) => {
    if (!currentPortalId) return { error: "Nessun portale selezionato", data: null };
    const { data: row, error } = await supabase
      .from("leadgen_searches")
      .insert({
        ...payload,
        portal_id: currentPortalId,
        status: "running",
        category: payload.categories[0] ?? null,
      })
      .select()
      .single();
    if (!error && row) {
      setSearches((prev) => [row as LeadgenSearch, ...prev]);
      broadcastLeadgenUpdate("search_started", { searchId: row.id });
    }
    return { data: row as LeadgenSearch | null, error: error?.message ?? null };
  }, [currentPortalId]);

  return { searches, loading, refetch: fetchSearches, createSearch, startPolling, stopPolling };
}
