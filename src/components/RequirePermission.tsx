import React from "react";
import { usePermission } from "@/lib/permissions";

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
