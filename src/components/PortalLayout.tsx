import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { usePortal, getPortalById } from "@/lib/portalContext";
import { setActivePortal } from "@/lib/portalStoreManager";
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { usePortalSecurity } from "@/hooks/settings";
import { AppLayout } from "./AppLayout";
import { PortalLockScreen } from "./PortalLockScreen";

export function PortalLayout() {
  const { portalId } = useParams<{ portalId: string }>();
  const { setPortal } = usePortal();
  const { isLoading } = useAuth();
  const { portals: dbPortals, loadingPortals, setCurrentPortalBySlug } = usePortalDB();
  const { data: security, loading: securityLoading } = usePortalSecurity();

  const [unlocked, setUnlocked] = useState<boolean>(() =>
    !!sessionStorage.getItem(`portal_unlocked_${portalId ?? ""}`),
  );

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
      document.body.setAttribute("data-portal", portal.id);
    }
    return () => {
      setPortal(null);
      document.body.removeAttribute("data-portal");
    };
  }, [portal?.id, hasAccess, portalId, setPortal, setCurrentPortalBySlug]);

  // Wait for auth + portal list + security config to resolve before rendering
  if (isLoading || loadingPortals || securityLoading) return null;

  if (!portal || !hasAccess) {
    return <Navigate to="/hub" replace />;
  }

  // Show lock screen if portal security is enabled and this session hasn't unlocked yet
  const isLocked = security?.is_enabled && !!security.password_hash && !unlocked;
  if (isLocked) {
    return (
      <PortalLockScreen
        portalName={portalId ?? ""}
        passwordHash={security.password_hash!}
        onUnlocked={() => setUnlocked(true)}
      />
    );
  }

  return <AppLayout />;
}
