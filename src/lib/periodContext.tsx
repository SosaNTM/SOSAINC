import React, { createContext, useContext, useState, useEffect } from "react";

export type DashboardPeriod = "last-7-days" | "last-week" | "last-month" | "last-quarter" | "this-year" | "custom";

export interface CustomRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

interface PeriodContextType {
  period: DashboardPeriod;
  setPeriod: (period: DashboardPeriod) => void;
  customRange: CustomRange;
  setCustomRange: (range: CustomRange) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

const defaultCustomRange: CustomRange = { from: "2025-01-01", to: "2025-12-31" };

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<DashboardPeriod>(() => {
    const saved = localStorage.getItem("dashboardPeriod");
    return (saved as DashboardPeriod) || "this-year";
  });

  const [customRange, setCustomRangeState] = useState<CustomRange>(() => {
    try {
      const saved = localStorage.getItem("dashboardCustomRange");
      return saved ? JSON.parse(saved) : defaultCustomRange;
    } catch {
      return defaultCustomRange;
    }
  });

  useEffect(() => {
    localStorage.setItem("dashboardPeriod", period);
  }, [period]);

  useEffect(() => {
    localStorage.setItem("dashboardCustomRange", JSON.stringify(customRange));
  }, [customRange]);

  const setPeriod = (p: DashboardPeriod) => setPeriodState(p);
  const setCustomRange = (r: CustomRange) => setCustomRangeState(r);

  return (
    <PeriodContext.Provider value={{ period, setPeriod, customRange, setCustomRange }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error("usePeriod must be used within a PeriodProvider");
  }
  return context;
}
