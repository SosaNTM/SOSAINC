import type { ApifyPlaceResult } from "@/types/leadgen";

export interface BlacklistRules {
  titleKeywords: string[];
  websiteDomains: string[];
  categories: string[];
  minReviews: number | null;
}

export interface FilterResult {
  keep: boolean;
  reason?: string;
}

export function applyBlacklist(
  rules: BlacklistRules,
  item: ApifyPlaceResult
): FilterResult {
  const titleLower = (item.title || "").toLowerCase();

  if (rules.titleKeywords.some((kw) => titleLower.includes(kw.toLowerCase()))) {
    return { keep: false, reason: "chain_title_keyword" };
  }

  if (
    item.website &&
    rules.websiteDomains.some((d) => item.website!.includes(d))
  ) {
    return { keep: false, reason: "chain_website_domain" };
  }

  const allCats = [
    item.categoryName,
    ...(item.categories ?? []),
  ].filter(Boolean) as string[];

  if (allCats.some((c) => rules.categories.includes(c))) {
    return { keep: false, reason: "blacklist_category" };
  }

  if (
    rules.minReviews !== null &&
    (item.reviewsCount ?? 0) > rules.minReviews
  ) {
    return { keep: false, reason: "high_reviews_likely_chain" };
  }

  return { keep: true };
}

export function getValidEmails(item: ApifyPlaceResult): string[] {
  return (item.emails ?? []).filter((e) => e && e.includes("@") && e.length > 5);
}

export function shouldDiscardForNoContact(item: ApifyPlaceResult): boolean {
  const trimmedPhone = (item.phone ?? "").replace(/\D/g, "");
  const hasPhone = trimmedPhone.length >= 6;
  const hasEmail = getValidEmails(item).length > 0;
  return !hasPhone && !hasEmail;
}

// Blacklist check first, then no-contact check. A chain without contacts is
// counted as chain, not no_contact — no double-counting.
export function evaluateLead(
  rules: BlacklistRules,
  item: ApifyPlaceResult
): FilterResult {
  const blacklistResult = applyBlacklist(rules, item);
  if (!blacklistResult.keep) return blacklistResult;

  if (shouldDiscardForNoContact(item)) {
    return { keep: false, reason: "no_contact_info" };
  }

  return { keep: true };
}

export type OwnershipFilter = "mine" | "pool" | "all";

export function applyOwnershipFilter<Q extends { eq(col: string, val: string): Q; is(col: string, val: null): Q }>(
  query: Q,
  ownership: OwnershipFilter,
  currentUserId?: string
): Q {
  if (ownership === "mine" && currentUserId) return query.eq("assigned_to", currentUserId);
  if (ownership === "pool") return query.is("assigned_to", null);
  return query;
}
