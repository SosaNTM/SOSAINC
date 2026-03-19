import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { MorphingSquare } from "@/components/ui/morphing-square";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg-body)" }}>
        <MorphingSquare size={36} message="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
