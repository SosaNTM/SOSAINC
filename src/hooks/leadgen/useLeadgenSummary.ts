import { useMemo } from "react";
import type { LeadgenLead, LeadgenSearch, OutreachStatus } from "@/types/leadgen";

export interface LeadgenSummary {
  total: number;
  withWebsite: number;
  withoutWebsite: number;
  contactRate: number;
  byOutreachStatus: Record<OutreachStatus, number>;
  topCategories: { category: string; count: number }[];
  discardedNoContact: number;
  totalRawResults: number;
  discardRate: number;
}

const OUTREACH_STATUSES: OutreachStatus[] = [
  "new", "contacted", "replied", "qualified", "converted", "rejected",
];

export function useLeadgenSummary(leads: LeadgenLead[], searches?: LeadgenSearch[]): LeadgenSummary {
  return useMemo(() => {
    const total = leads.length;
    const withWebsite = leads.filter((l) => l.has_website).length;
    const withoutWebsite = total - withWebsite;
    const contacted = leads.filter(
      (l) => l.outreach_status !== "new" && l.outreach_status !== "rejected"
    ).length;
    const contactRate = total > 0 ? contacted / total : 0;

    const byOutreachStatus = Object.fromEntries(
      OUTREACH_STATUSES.map((s) => [s, leads.filter((l) => l.outreach_status === s).length])
    ) as Record<OutreachStatus, number>;

    const categoryCounts: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.category) categoryCounts[l.category] = (categoryCounts[l.category] ?? 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const completedSearches = (searches ?? []).filter((s) => s.status === "completed");
    const totalRawResults = completedSearches.reduce((sum, s) => sum + (s.total_results ?? 0), 0);
    const discardedNoContact = completedSearches.reduce((sum, s) => sum + (s.discarded_no_contact_count ?? 0), 0);
    const discardRate = totalRawResults > 0 ? discardedNoContact / totalRawResults : 0;

    return { total, withWebsite, withoutWebsite, contactRate, byOutreachStatus, topCategories, discardedNoContact, totalRawResults, discardRate };
  }, [leads, searches]);
}
