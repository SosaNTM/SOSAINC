import React, { createContext, useContext, useState, useEffect } from "react";
import { STORAGE_PORTAL_LAST_ACCESSED_PREFIX } from "@/constants/storageKeys";

export interface PortalConfig {
  id: "sosa" | "keylo" | "redx" | "trustme";
  name: string;
  subtitle: string;
  accent: string;
  icon: string; // lucide icon name
  routePrefix: string;
  disabledFeatures?: string[]; // feature keys to hide for this portal
}

export const PORTALS: PortalConfig[] = [
  {
    id: "sosa",
    name: "SOSA INC.",
    subtitle: "Corporate management & operations",
    accent: "#4A9EFF",
    icon: "Building2",
    routePrefix: "/sosa",
    disabledFeatures: ["social"],
  },
  {
    id: "keylo",
    name: "KEYLO",
    subtitle: "Access control & security hub",
    accent: "#2ECC71",
    icon: "KeyRound",
    routePrefix: "/keylo",
  },
  {
    id: "redx",
    name: "REDX",
    subtitle: "Performance & growth operations",
    accent: "#FF5A5A",
    icon: "Zap",
    routePrefix: "/redx",
  },
  {
    id: "trustme",
    name: "TRUST ME",
    subtitle: "Compliance, legal & trust layer",
    accent: "#FF9F43",
    icon: "ShieldCheck",
    routePrefix: "/trustme",
  },
];

interface PortalContextType {
  portal: PortalConfig | null;
  setPortal: (portal: PortalConfig | null) => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [portal, setPortal] = useState<PortalConfig | null>(null);

  // Apply portal accent color as CSS variable
  useEffect(() => {
    if (portal) {
      document.documentElement.style.setProperty("--portal-accent", portal.accent);
      // Store last accessed time
      localStorage.setItem(`${STORAGE_PORTAL_LAST_ACCESSED_PREFIX}${portal.id}`, new Date().toISOString());
    } else {
      document.documentElement.style.removeProperty("--portal-accent");
    }
  }, [portal]);

  return (
    <PortalContext.Provider value={{ portal, setPortal }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}

export function getPortalById(id: string): PortalConfig | undefined {
  return PORTALS.find((p) => p.id === id);
}

export function getLastAccessed(portalId: string): string | null {
  return localStorage.getItem(`${STORAGE_PORTAL_LAST_ACCESSED_PREFIX}${portalId}`);
}
