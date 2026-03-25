import { useState, useEffect } from "react";
import { usePortal } from "@/lib/portalContext";
import { useAuth } from "@/lib/authContext";
import { addAuditEntry } from "@/lib/adminStore";
import {
  type Investment,
  loadInvestments,
  saveInvestments,
  calcCurrentValue,
  calcCostBasis,
  calcPnL,
} from "@/lib/investmentStore";

export function useInvestments() {
  const { portal } = usePortal();
  const { user } = useAuth();
  const portalId = portal?.id ?? "sosa";

  const [investments, setInvestments] = useState<Investment[]>(() => loadInvestments(portalId));

  useEffect(() => {
    setInvestments(loadInvestments(portalId));
  }, [portalId]);

  useEffect(() => {
    saveInvestments(portalId, investments);
  }, [investments, portalId]);

  function addInvestment(data: Omit<Investment, "id">) {
    const inv: Investment = { ...data, id: crypto.randomUUID() };
    setInvestments((prev) => [...prev, inv]);
    if (user) addAuditEntry({ userId: user.id, action: `Added investment "${data.name}" — €${calcCurrentValue(inv).toLocaleString()}`, category: "finance", details: "", icon: data.emoji, portalId });
  }

  function updateInvestment(id: string, data: Omit<Investment, "id">) {
    setInvestments((prev) => prev.map((inv) => inv.id === id ? { ...data, id } : inv));
    if (user) addAuditEntry({ userId: user.id, action: `Updated investment "${data.name}"`, category: "finance", details: "", icon: data.emoji, portalId });
  }

  function deleteInvestment(id: string) {
    const inv = investments.find((i) => i.id === id);
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    if (user && inv) addAuditEntry({ userId: user.id, action: `Removed investment "${inv.name}"`, category: "finance", details: "", icon: "🗑️", portalId });
  }

  const totalValue    = investments.reduce((s, i) => s + calcCurrentValue(i), 0);
  const totalCost     = investments.reduce((s, i) => s + calcCostBasis(i), 0);
  const totalPnL      = investments.reduce((s, i) => s + calcPnL(i), 0);
  const totalROI      = totalCost > 0 ? ((totalPnL / totalCost) * 100) : 0;

  return { investments, totalValue, totalCost, totalPnL, totalROI, addInvestment, updateInvestment, deleteInvestment };
}
