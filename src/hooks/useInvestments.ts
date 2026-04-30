import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePortal } from "@/lib/portalContext";
import { useAuth } from "@/lib/authContext";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { addAuditEntry } from "@/lib/adminStore";
import {
  type Investment,
  loadInvestments,
  saveInvestments,
  calcCurrentValue,
  calcCostBasis,
  calcPnL,
} from "@/lib/investmentStore";
import {
  fetchInvestments,
  createInvestment as dbCreateInvestment,
  updateInvestment as dbUpdateInvestment,
  deleteInvestment as dbDeleteInvestment,
} from "@/lib/services/investmentService";
import type { DbInvestment } from "@/types/database";


function dbToInvestment(db: DbInvestment): Investment {
  return {
    id: db.id,
    name: db.name,
    ticker: db.ticker ?? "",
    type: db.type,
    units: db.units,
    avgBuyPrice: db.avg_buy_price,
    currentPrice: db.current_price ?? db.avg_buy_price,
    color: db.color ?? "#6b7280",
    emoji: db.emoji ?? "💼",
  };
}

export function useInvestments() {
  const { portal } = usePortal();
  const { user } = useAuth();
  const portalId = portal?.id ?? "sosa";

  const [investments, setInvestments] = useState<Investment[]>(() => loadInvestments(portalId));
  const [isLoading, setIsLoading] = useState(() => loadInvestments(portalId).length === 0);

  // Initial load from Supabase; fall back to localStorage cache
  useEffect(() => {
    fetchInvestments(portalId).then((dbInvs) => {
      if (dbInvs.length > 0) {
        const mapped = dbInvs.map(dbToInvestment);
        setInvestments(mapped);
        saveInvestments(portalId, mapped);
      } else {
        setInvestments(loadInvestments(portalId));
      }
    }).finally(() => setIsLoading(false));
  }, [portalId]);

  function addInvestment(data: Omit<Investment, "id">) {
    const tempId = crypto.randomUUID();
    const inv: Investment = { ...data, id: tempId };
    // Optimistic update
    setInvestments((prev) => [...prev, inv]);
    saveInvestments(portalId, [...investments, inv]);

    if (user) {
      void dbCreateInvestment(
        {
          user_id: user.id,
          name: data.name,
          ticker: data.ticker || null,
          type: data.type,
          units: data.units,
          avg_buy_price: data.avgBuyPrice,
          current_price: data.currentPrice,
          currency: "EUR",
          color: data.color,
          emoji: data.emoji,
          notes: null,
        },
        portalId,
      ).then((created) => {
        if (created) {
          setInvestments((prev) => prev.map((i) => i.id === tempId ? dbToInvestment(created) : i));
          toast.success(`Investment "${data.name}" added`);
        } else {
          toast.error(`Failed to save "${data.name}" to database`);
        }
      });
      addAuditEntry({ userId: user.id, action: `Added investment "${data.name}" — €${calcCurrentValue(inv).toLocaleString()}`, category: "finance", details: "", icon: data.emoji, portalId });
    }
  }

  function updateInvestment(id: string, data: Omit<Investment, "id">) {
    setInvestments((prev) => prev.map((inv) => inv.id === id ? { ...data, id } : inv));

    if (user) {
      void dbUpdateInvestment(
        id,
        {
          name: data.name,
          ticker: data.ticker || null,
          type: data.type,
          units: data.units,
          avg_buy_price: data.avgBuyPrice,
          current_price: data.currentPrice,
          color: data.color,
          emoji: data.emoji,
        },
        portalId,
      );
      addAuditEntry({ userId: user.id, action: `Updated investment "${data.name}"`, category: "finance", details: "", icon: data.emoji, portalId });
    }
  }

  function deleteInvestment(id: string) {
    const inv = investments.find((i) => i.id === id);
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    void dbDeleteInvestment(id, portalId).then((ok) => {
      if (!ok) {
        // Rollback optimistic delete
        if (inv) setInvestments((prev) => [inv, ...prev]);
        toast.error("Failed to delete investment");
      }
    });
    if (user && inv) addAuditEntry({ userId: user.id, action: `Removed investment "${inv.name}"`, category: "finance", details: "", icon: "🗑️", portalId });
  }

  // Real-time Postgres Changes
  const rtOnInsert = useCallback((row: DbInvestment) => {
    setInvestments((prev) => prev.some((i) => i.id === row.id) ? prev : [dbToInvestment(row), ...prev]);
  }, []);
  const rtOnUpdate = useCallback((row: DbInvestment) => {
    setInvestments((prev) => prev.map((i) => i.id === row.id ? dbToInvestment(row) : i));
  }, []);
  const rtOnDelete = useCallback((id: string) => {
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  }, []);
  useRealtimeTable<DbInvestment>("investments", portalId, { onInsert: rtOnInsert, onUpdate: rtOnUpdate, onDelete: rtOnDelete });

  const totalValue    = investments.reduce((s, i) => s + calcCurrentValue(i), 0);
  const totalCost     = investments.reduce((s, i) => s + calcCostBasis(i), 0);
  const totalPnL      = investments.reduce((s, i) => s + calcPnL(i), 0);
  const totalROI      = totalCost > 0 ? ((totalPnL / totalCost) * 100) : 0;

  return { investments, isLoading, totalValue, totalCost, totalPnL, totalROI, addInvestment, updateInvestment, deleteInvestment };
}
