import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  GiftCard, GiftCardBrand, EnrichedGiftCard, GiftCardFilter, GiftCardSort,
} from "../types/giftCards";
import {
  fetchGiftCards, fetchBrands, createGiftCard, updateGiftCard, deleteGiftCard, toggleFavorite,
  setGiftCardPortal,
} from "../services/giftCardService";
import { convertToEur, getDaysUntilExpiry } from "../utils/giftCardUtils";
import { usePortal } from "@/lib/portalContext";
import type { GiftCardCurrency } from "../types/giftCards";

export function useGiftCards() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  // Scope localStorage keys to current portal
  useEffect(() => { setGiftCardPortal(portalId); }, [portalId]);
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [brands, setBrands] = useState<GiftCardBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<GiftCardFilter>("all");
  const [sort, setSort] = useState<GiftCardSort>("remaining_desc");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [cardsData, brandsData] = await Promise.all([fetchGiftCards(), fetchBrands()]);
      setCards(cardsData);
      setBrands(brandsData);
    } catch (err) {
      console.error("Failed to load gift cards:", err);
      setError(err instanceof Error ? err.message : "Failed to load gift cards");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const enrichedCards: EnrichedGiftCard[] = useMemo(() => {
    return cards.map((card) => {
      const brandData = brands.find((b) => b.brand_key === card.brand_key) ?? null;
      const usedValue = card.initial_value - card.remaining_value;
      const usedPercent = card.initial_value > 0 ? (usedValue / card.initial_value) * 100 : 0;
      const remainingValueEur = convertToEur(card.remaining_value, card.currency);
      const daysUntilExpiry = getDaysUntilExpiry(card.expiry_date);
      const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      const isExpired = card.status === "expired" || (daysUntilExpiry !== null && daysUntilExpiry <= 0);

      return {
        ...card,
        brandData,
        usedValue,
        usedPercent,
        remainingValueEur,
        daysUntilExpiry,
        isExpiringSoon,
        isExpired,
        transactions: [],
      };
    });
  }, [cards, brands]);

  const filteredCards = useMemo(() => {
    let result = enrichedCards;

    // Filter
    if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      // Favorites always first
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;

      switch (sort) {
        case "remaining_desc": return b.remainingValueEur - a.remainingValueEur;
        case "remaining_asc": return a.remainingValueEur - b.remainingValueEur;
        case "expiry_asc": {
          const ae = a.daysUntilExpiry ?? Infinity;
          const be = b.daysUntilExpiry ?? Infinity;
          return ae - be;
        }
        case "recent": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "brand": return a.brand.localeCompare(b.brand);
        default: return 0;
      }
    });

    return result;
  }, [enrichedCards, filter, sort]);

  const handleCreate = useCallback(async (data: {
    brand: string;
    brand_key: string;
    initial_value: number;
    remaining_value: number;
    currency: GiftCardCurrency;
    card_code?: string;
    pin?: string;
    purchase_date?: string;
    expiry_date?: string;
    notes?: string;
  }) => {
    await createGiftCard(data);
    await loadData();
  }, [loadData]);

  const handleUpdate = useCallback(async (id: string, updates: Partial<GiftCard>) => {
    await updateGiftCard(id, updates);
    await loadData();
  }, [loadData]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteGiftCard(id);
    await loadData();
  }, [loadData]);

  const handleToggleFavorite = useCallback(async (id: string, isFav: boolean) => {
    await toggleFavorite(id, isFav);
    await loadData();
  }, [loadData]);

  return {
    cards: enrichedCards,
    brands,
    isLoading,
    error,
    createCard: handleCreate,
    updateCard: handleUpdate,
    deleteCard: handleDelete,
    toggleFavorite: handleToggleFavorite,
    refetch: loadData,
    filter,
    setFilter,
    sort,
    setSort,
    filteredCards,
  };
}
