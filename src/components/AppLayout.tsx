import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { PortalShell } from "./sosa/PortalShell";
import { usePortal } from "@/lib/portalContext";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { portal } = usePortal();
  const location = useLocation();
  const workspace = portal?.id ?? "sosa";
  const isCloud = location.pathname.endsWith("/cloud");
  const mainRef = useRef<HTMLElement>(null);

  useKeyboardShortcuts();

  // Reset scroll on route change without remounting the element
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <PortalShell workspace={workspace} showHeader={false}>
      <div style={{ display: "flex", height: "calc(100dvh - 36px)", overflow: "hidden" }}>
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          <main
            ref={mainRef}
            style={{
              flex:      1,
              padding:   "16px 24px 24px",
              overflowY: isCloud ? "hidden" : "auto",
              display:   isCloud ? "flex" : "block",
              flexDirection: isCloud ? "column" : undefined,
            }}
          >
            <Outlet />
            {!isCloud && <div style={{ height: 48 }} />}
          </main>
        </div>
      </div>
    </PortalShell>
  );
}
