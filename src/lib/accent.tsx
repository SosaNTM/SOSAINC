import React, { createContext, useContext, useEffect, useState } from "react";

export type AccentColor = "emerald" | "ocean" | "night" | "rose" | "sunset" | "royal" | "grape" | "pink" | "amber" | "teal";

export interface AccentPreset {
  id: AccentColor;
  label: string;
  swatch: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "emerald", label: "Emerald", swatch: "#059669" },
  { id: "ocean",   label: "Ocean",   swatch: "#2563eb" },
  { id: "night",   label: "Night",   swatch: "#1e40af" },
  { id: "rose",    label: "Rose",    swatch: "#e11d48" },
  { id: "sunset",  label: "Sunset",  swatch: "#ea580c" },
  { id: "royal",   label: "Royal",   swatch: "#7c3aed" },
  { id: "grape",   label: "Grape",   swatch: "#5b21b6" },
  { id: "pink",    label: "Pink",    swatch: "#db2777" },
  { id: "amber",   label: "Amber",   swatch: "#92400e" },
  { id: "teal",    label: "Teal",    swatch: "#0d9488" },
];

interface AccentContextType {
  accent: AccentColor;
  setAccent: (a: AccentColor) => void;
}

const AccentContext = createContext<AccentContextType | undefined>(undefined);

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem("iconoff-accent");
    return (saved as AccentColor) || "emerald";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-color", accent);
    localStorage.setItem("iconoff-accent", accent);
  }, [accent]);

  const setAccent = (a: AccentColor) => setAccentState(a);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  const context = useContext(AccentContext);
  if (context === undefined) {
    throw new Error("useAccent must be used within an AccentProvider");
  }
  return context;
}
