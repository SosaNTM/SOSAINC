import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { usePortal, getPortalById } from "@/lib/portalContext";
import { setActivePortal } from "@/lib/portalStoreManager";
import { useAuth, userCanAccessPortal } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { AppLayout } from "./AppLayout";

export function PortalLayout() {
  const { portalId } = useParams<{ portalId: string }>();
  const { setPortal } = usePortal();
  const { user } = useAuth();
  const { setCurrentPortalBySlug } = usePortalDB();

  const portal = portalId ? getPortalById(portalId) : undefined;
  const hasAccess = portal ? userCanAccessPortal(user, portal.id) : false;

  useEffect(() => {
    if (portal && hasAccess) {
      setPortal(portal);
      setActivePortal(portal.id);
      // Bridge static slug → Supabase portal UUID
      if (portalId) setCurrentPortalBySlug(portalId);
    }
    return () => setPortal(null);
  }, [portal?.id, hasAccess, portalId, setPortal, setCurrentPortalBySlug]);

  if (!portal || !hasAccess) {
    return <Navigate to="/hub" replace />;
  }

  return <AppLayout />;
}
