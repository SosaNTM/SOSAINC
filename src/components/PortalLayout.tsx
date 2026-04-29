import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { usePortal, getPortalById } from "@/lib/portalContext";
import { setActivePortal } from "@/lib/portalStoreManager";
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { AppLayout } from "./AppLayout";

export function PortalLayout() {
  const { portalId } = useParams<{ portalId: string }>();
  const { setPortal } = usePortal();
  const { isLoading } = useAuth();
  const { portals: dbPortals, loadingPortals, setCurrentPortalBySlug } = usePortalDB();

  // Source of truth for access: DB portals (RLS-filtered to portal_members rows for this user).
  const dbPortal = portalId ? dbPortals.find((p) => p.slug === portalId) : undefined;
  const hasAccess = !!dbPortal;
  // For known slugs, prefer hardcoded display config; otherwise build a minimal one from DB.
  const portal = portalId
    ? (getPortalById(portalId) ?? (dbPortal
        ? { id: dbPortal.slug as never, name: dbPortal.name, subtitle: dbPortal.description ?? "", accent: "#6b7280", icon: "Building2", routePrefix: `/${dbPortal.slug}` }
        : undefined))
    : undefined;

  useEffect(() => {
    if (portal && hasAccess) {
      setPortal(portal);
      setActivePortal(portal.id);
      if (portalId) setCurrentPortalBySlug(portalId);
    }
    return () => setPortal(null);
  }, [portal?.id, hasAccess, portalId, setPortal, setCurrentPortalBySlug]);

  // Wait for auth + portal list to resolve before evaluating access
  if (isLoading || loadingPortals) return null;

  if (!portal || !hasAccess) {
    return <Navigate to="/hub" replace />;
  }

  return <AppLayout />;
}
