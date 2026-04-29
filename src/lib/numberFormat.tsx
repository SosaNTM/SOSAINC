import React, { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_NUMBER_FORMAT } from "@/constants/storageKeys";

export type NumberFormat = "eu" | "us"; // eu: 1.000,00 | us: 1,000.00

interface NumberFormatContextType {
  format: NumberFormat;
  setFormat: (format: NumberFormat) => void;
  formatCurrency: (value: number, short?: boolean) => string;
}

const NumberFormatContext = createContext<NumberFormatContextType | undefined>(undefined);

export function NumberFormatProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormatState] = useState<NumberFormat>(() => {
    const saved = localStorage.getItem(STORAGE_NUMBER_FORMAT);
    return (saved as NumberFormat) || "eu";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_NUMBER_FORMAT, format);
  }, [format]);

  const setFormat = (f: NumberFormat) => setFormatState(f);

  const formatCurrency = (value: number, short = false) => {
    const locale = format === "eu" ? "de-DE" : "en-US";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);

    if (short) {
      if (abs >= 1_000_000) {
        return `${sign}€${(abs / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
      }
      if (abs >= 1_000) {
        return `${sign}€${(abs / 1_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
      }
    }

    return `${sign}€${abs.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <NumberFormatContext.Provider value={{ format, setFormat, formatCurrency }}>
      {children}
    </NumberFormatContext.Provider>
  );
}

export function useNumberFormat() {
  const context = useContext(NumberFormatContext);
  if (context === undefined) {
    throw new Error("useNumberFormat must be used within a NumberFormatProvider");
  }
  return context;
}
