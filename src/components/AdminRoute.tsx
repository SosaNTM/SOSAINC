import { Navigate, Outlet, useParams } from "react-router-dom";
import { usePermission } from "@/lib/permissions";
import { usePortalDB } from "@/lib/portalContextDB";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function AdminRoute() {
  const { portalId } = useParams<{ portalId: string }>();
  const { loadingRole, loadingPortals } = usePortalDB();
  const toastShown = useRef(false);

  const isAllowed = usePermission("admin:access");

  useEffect(() => {
    if (!loadingRole && !loadingPortals && !isAllowed && !toastShown.current) {
      toastShown.current = true;
      toast.error("Accesso non autorizzato — Solo gli amministratori possono accedere alle impostazioni");
    }
  }, [isAllowed, loadingRole, loadingPortals]);

  if (loadingRole || loadingPortals) return null;

  if (!isAllowed) {
    return <Navigate to={`/${portalId}/dashboard`} replace />;
  }

  return <Outlet />;
}
