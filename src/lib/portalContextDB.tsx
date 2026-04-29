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
  const [userRole, setUserRole] = useState<PortalMember["role"] | null>(null);
  const currentPortalRef = useRef<Portal | null>(null);
  const portalsRef = useRef<Portal[]>([]);
  const pendingSlugRef = useRef<string | null>(null);

  // Recompute userRole whenever currentPortal changes by reading portal_members
  useEffect(() => {
    if (!currentPortal) { setUserRole(null); return; }
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) { if (!cancelled) setUserRole(null); return; }
      const { data: row } = await supabase
        .from("portal_members")
        .select("role")
        .eq("portal_id", currentPortal.id)
        .eq("user_id", uid)
        .maybeSingle();
      if (!cancelled) setUserRole((row?.role as PortalMember["role"] | undefined) ?? null);
    })();
    return () => { cancelled = true; };
  }, [currentPortal]);

  const fetchPortals = useCallback(async () => {
    const { data: portalData, error: portalsError } = await supabase
      .from("portals")
      .select("*")
      .order("created_at");

    if (portalsError) {
      console.warn("[portalContextDB] Failed to load portals:", portalsError.message);
      setLoading(false);
      return;
    }

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
      userRole,
      isAdmin: userRole === "owner" || userRole === "admin",
      isOwner: userRole === "owner",
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
