import React from "react";
import { ShieldX } from "lucide-react";
import { usePermission } from "@/lib/permissions";

interface ProtectedPageProps {
  permission: string;
  children: React.ReactNode;
}

export function ProtectedPage({ permission, children }: ProtectedPageProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldX className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
