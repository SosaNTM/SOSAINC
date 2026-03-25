import { useMemo } from "react";
import type { EnrichedGiftCard, GiftCardsSummary, GiftCardCategory } from "../types/giftCards";
import { convertToEur } from "../utils/giftCardUtils";

const ALL_CATEGORIES: GiftCardCategory[] = ["shopping", "entertainment", "gaming", "food", "travel", "other"];

export function useGiftCardsSummary(cards: EnrichedGiftCard[]) {
  const summary = useMemo<GiftCardsSummary>(() => {
    const relevantCards = cards.filter((c) => c.status !== "archived");

    let totalRemainingEur = 0;
    let totalInitialEur = 0;
    let activeCount = 0;
    let partiallyUsedCount = 0;
    let fullyUsedCount = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    const byCategory = {} as Record<GiftCardCategory, { count: number; remainingEur: number }>;
    for (const cat of ALL_CATEGORIES) {
      byCategory[cat] = { count: 0, remainingEur: 0 };
    }

    const brandMap = new Map<string, { brand: string; color: string | null; count: number; remainingEur: number }>();

    for (const card of relevantCards) {
      const initialEur = convertToEur(card.initial_value, card.currency);
      const remainingEur = card.remainingValueEur;
      totalInitialEur += initialEur;

      switch (card.status) {
        case "active":
          activeCount++;
          totalRemainingEur += remainingEur;
          break;
        case "partially_used":
          partiallyUsedCount++;
          totalRemainingEur += remainingEur;
          break;
        case "fully_used":
          fullyUsedCount++;
          break;
        case "expired":
          expiredCount++;
          break;
      }

      if (card.isExpiringSoon) expiringSoonCount++;

      // By category
      const cat = card.brandData?.category ?? "other";
      if (byCategory[cat]) {
        byCategory[cat].count++;
        byCategory[cat].remainingEur += remainingEur;
      }

      // By brand
      const existing = brandMap.get(card.brand_key);
      if (existing) {
        existing.count++;
        existing.remainingEur += remainingEur;
      } else {
        brandMap.set(card.brand_key, {
          brand: card.brand,
          color: card.brandData?.color ?? null,
          count: 1,
          remainingEur,
        });
      }
    }

    const totalUsedEur = totalInitialEur - totalRemainingEur;

    const byBrand = [...brandMap.entries()]
      .map(([brand_key, data]) => ({ brand_key, ...data }))
      .sort((a, b) => b.remainingEur - a.remainingEur);

    return {
      totalRemainingEur,
      totalInitialEur,
      totalUsedEur,
      activeCount,
      partiallyUsedCount,
      fullyUsedCount,
      expiredCount,
      expiringSoonCount,
      byCategory,
      byBrand,
    };
  }, [cards]);

  return { summary };
}
