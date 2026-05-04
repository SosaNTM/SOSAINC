import { useMemo } from "react";
import type { LeadgenLead, OutreachStatus } from "@/types/leadgen";

export interface LeadgenSummary {
  total: number;
  withWebsite: number;
  withoutWebsite: number;
  contactRate: number;
  byOutreachStatus: Record<OutreachStatus, number>;
  topCategories: { category: string; count: number }[];
}

const OUTREACH_STATUSES: OutreachStatus[] = [
  "new", "contacted", "replied", "qualified", "converted", "rejected",
];

export function useLeadgenSummary(leads: LeadgenLead[]): LeadgenSummary {
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

    return { total, withWebsite, withoutWebsite, contactRate, byOutreachStatus, topCategories };
  }, [leads]);
}
