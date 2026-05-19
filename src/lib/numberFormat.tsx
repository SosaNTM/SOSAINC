import React, { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_NUMBER_FORMAT, STORAGE_CURRENCY } from "@/constants/storageKeys";

export type NumberFormat = "eu" | "us"; // eu: 1.000,00 | us: 1,000.00
export type Currency = "EUR" | "USD" | "GBP" | "CHF";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "CHF ",
};

interface NumberFormatContextType {
  format: NumberFormat;
  setFormat: (format: NumberFormat) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number, short?: boolean) => string;
}

const NumberFormatContext = createContext<NumberFormatContextType | undefined>(undefined);

export function NumberFormatProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormatState] = useState<NumberFormat>(() => {
    const saved = localStorage.getItem(STORAGE_NUMBER_FORMAT);
    return (saved as NumberFormat) || "eu";
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(STORAGE_CURRENCY);
    return (saved as Currency) || "EUR";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_NUMBER_FORMAT, format);
  }, [format]);

  useEffect(() => {
    localStorage.setItem(STORAGE_CURRENCY, currency);
  }, [currency]);

  const setFormat = (f: NumberFormat) => setFormatState(f);
  const setCurrency = (c: Currency) => setCurrencyState(c);

  const formatCurrency = (value: number, short = false) => {
    const locale = format === "eu" ? "de-DE" : "en-US";
    const symbol = CURRENCY_SYMBOLS[currency] ?? "€";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);

    if (short) {
      if (abs >= 1_000_000) {
        return `${sign}${symbol}${(abs / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
      }
      if (abs >= 1_000) {
        return `${sign}${symbol}${(abs / 1_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
      }
    }

    return `${sign}${symbol}${abs.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <NumberFormatContext.Provider value={{ format, setFormat, currency, setCurrency, formatCurrency }}>
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
