import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function AdminRoute() {
  const { user } = useAuth();
  const { portalId } = useParams<{ portalId: string }>();
  const toastShown = useRef(false);

  const role = user?.role;
  const isAllowed = role === "owner" || role === "admin";

  useEffect(() => {
    if (!isAllowed && !toastShown.current) {
      toastShown.current = true;
      toast.error("Accesso non autorizzato — Solo gli amministratori possono accedere alle impostazioni");
    }
  }, [isAllowed]);

  if (!isAllowed) {
    return <Navigate to={`/${portalId}/dashboard`} replace />;
  }

  return <Outlet />;
}
