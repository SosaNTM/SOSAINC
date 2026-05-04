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
    ...((item as ApifyPlaceResult & { categories?: string[] }).categories ?? []),
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
