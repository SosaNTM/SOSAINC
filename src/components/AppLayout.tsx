import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="h-screen w-full relative flex items-center justify-center p-2 md:p-4 overflow-hidden">
      {/* Ambient orbs background */}
      <div className="ambient-orbs">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <div className="ambient-orb-3" />
        <div className="ambient-orb-4" />
      </div>

      {/* Main glass container — fills viewport with small margin */}
      <div className="liquid-glass-container relative z-10 flex w-full h-full">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
          <main
            className={`flex-1 p-3 sm:p-4 md:p-5 lg:p-7 ${location.pathname.endsWith("/cloud") ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}
            key={location.pathname}
            style={{ animation: "fadeInUp 0.3s ease-out" }}
          >
            <Outlet />
            {!location.pathname.endsWith("/cloud") && <div className="h-10" />}
          </main>
        </div>
      </div>
    </div>
  );
}
