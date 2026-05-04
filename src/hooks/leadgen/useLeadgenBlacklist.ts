import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { usePortalDB } from "@/lib/portalContextDB";
import type { LeadgenBlacklist, BlacklistRuleType } from "@/types/leadgen";

export function useLeadgenBlacklist() {
  const { currentPortalId } = usePortalDB();
  const [rules, setRules] = useState<LeadgenBlacklist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    if (!currentPortalId) { setLoading(false); return; }
    const { data } = await supabase
      .from("leadgen_blacklist")
      .select("*")
      .eq("portal_id", currentPortalId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    setRules((data ?? []) as LeadgenBlacklist[]);
    setLoading(false);
  }, [currentPortalId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = useCallback(
    async (rule_type: BlacklistRuleType, rule_value: string) => {
      if (!currentPortalId) return { error: "Nessun portale" };
      const { data, error } = await supabase
        .from("leadgen_blacklist")
        .insert({ portal_id: currentPortalId, rule_type, rule_value })
        .select()
        .single();
      if (!error && data) setRules((prev) => [...prev, data as LeadgenBlacklist]);
      return { error: error?.message ?? null };
    },
    [currentPortalId]
  );

  const removeRule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("leadgen_blacklist")
      .delete()
      .eq("id", id);
    if (!error) setRules((prev) => prev.filter((r) => r.id !== id));
    return { error: error?.message ?? null };
  }, []);

  const seedDefaults = useCallback(async () => {
    if (!currentPortalId) return;
    const count = await supabase
      .from("leadgen_blacklist")
      .select("id", { count: "exact", head: true })
      .eq("portal_id", currentPortalId);
    if ((count.count ?? 0) > 0) return; // already seeded

    const titleKeywords = [
      "Carrefour","Conad","Eurospin","Esselunga","Lidl","MD Discount",
      "Penny Market","Coop","Pam","Tigotà","Acqua&Sapone","McDonald",
      "Burger King","KFC","Subway","Starbucks","Old Wild West","Roadhouse",
      "H&M","Zara","Ovs","Decathlon","Mediaworld","Unieuro","Trony",
      "Euronics","Feltrinelli","Mondadori","IKEA","Leroy Merlin",
      "Bricoman","Bricocenter","Obi",
    ];
    const websiteDomains = [
      "carrefour.it","conad.it","esselunga.it","lidl.it","mcdonalds.it",
      "decathlon.it","ikea.com","mediaworld.it","unieuro.it","hm.com",
      "zara.com","leroymerlin.it",
    ];
    const categories = [
      "Supermarket","Hypermarket","Bank","ATM","Gas station",
      "Post office","Cinema","Hospital","Public school",
    ];

    const rows = [
      ...titleKeywords.map((v) => ({
        portal_id: currentPortalId,
        rule_type: "title_keyword" as const,
        rule_value: v,
      })),
      ...websiteDomains.map((v) => ({
        portal_id: currentPortalId,
        rule_type: "website_domain" as const,
        rule_value: v,
      })),
      ...categories.map((v) => ({
        portal_id: currentPortalId,
        rule_type: "category" as const,
        rule_value: v,
      })),
      {
        portal_id: currentPortalId,
        rule_type: "min_reviews" as const,
        rule_value: "5000",
      },
    ];

    await supabase.from("leadgen_blacklist").insert(rows);
    await fetchRules();
  }, [currentPortalId, fetchRules]);

  const byType = (type: BlacklistRuleType) =>
    rules.filter((r) => r.rule_type === type);

  return { rules, loading, addRule, removeRule, seedDefaults, refetch: fetchRules, byType };
}
