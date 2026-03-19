import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";
import type { Portal, PortalMember } from "../types/settings";

interface PortalContextValue {
  portals: Portal[];
  currentPortal: Portal | null;
  currentPortalId: string | null;
  userRole: PortalMember["role"] | null;
  isAdmin: boolean;
  isOwner: boolean;
  loadingPortals: boolean;
  setCurrentPortalBySlug: (slug: string) => void;
  setCurrentPortal: (portal: Portal) => void;
  refreshPortals: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalDBProvider({ children }: { children: ReactNode }) {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [currentPortal, setCurrentPortalState] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const currentPortalRef = useRef<Portal | null>(null);
  const portalsRef = useRef<Portal[]>([]);
  const pendingSlugRef = useRef<string | null>(null);

  const fetchPortals = useCallback(async () => {
    const { data: portalData } = await supabase
      .from("portals")
      .select("*")
      .order("created_at");

    if (portalData?.length) {
      setPortals(portalData);
      portalsRef.current = portalData;
      // Refresh current portal data if already selected
      if (currentPortalRef.current) {
        const refreshed = portalData.find(p => p.id === currentPortalRef.current!.id);
        if (refreshed) {
          setCurrentPortalState(refreshed);
          currentPortalRef.current = refreshed;
        }
      }
      // Resolve any pending slug that was requested before portals loaded
      if (pendingSlugRef.current && !currentPortalRef.current) {
        const match = portalData.find(p => p.slug === pendingSlugRef.current);
        if (match) {
          setCurrentPortalState(match);
          currentPortalRef.current = match;
        }
        pendingSlugRef.current = null;
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPortals(); }, [fetchPortals]);

  const setCurrentPortal = useCallback((portal: Portal) => {
    setCurrentPortalState(portal);
    currentPortalRef.current = portal;
  }, []);

  const setCurrentPortalBySlug = useCallback((slug: string) => {
    const match = portalsRef.current.find(p => p.slug === slug);
    if (match && match.id !== currentPortalRef.current?.id) {
      setCurrentPortalState(match);
      currentPortalRef.current = match;
    } else if (!match) {
      // Portals not loaded yet — store slug to resolve when they arrive
      pendingSlugRef.current = slug;
    }
  }, []);

  return (
    <PortalContext.Provider value={{
      portals,
      currentPortal,
      currentPortalId: currentPortal?.id ?? null,
      userRole: "owner",
      isAdmin: true,
      isOwner: true,
      loadingPortals: loading,
      setCurrentPortal,
      setCurrentPortalBySlug,
      refreshPortals: fetchPortals,
    }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalDB() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortalDB must be used within PortalDBProvider");
  return ctx;
}
