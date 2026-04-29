import React from "react";
import { GrainOverlay }   from "./GrainOverlay";
import { LogoLockup }     from "./LogoLockup";
import { HashtagFooter }  from "./HashtagFooter";
import { StatusDot }      from "./StatusDot";

export const SHELL_HEADER_H = 56;
export const SHELL_FOOTER_H = 36;

interface PortalShellProps {
  workspace: string;
  children: React.ReactNode;
  /** Right section of the fixed top bar (search, notifications, user menu) */
  headerRight?: React.ReactNode;
  /** Left section after LogoLockup (sidebar toggle on mobile, extra nav) */
  headerLeft?: React.ReactNode;
  footerTags?: string[];
  /**
   * Set to false when an inner layout (AppLayout) supplies its own header.
   * PortalShell still provides grain, brackets, and footer.
   */
  showHeader?: boolean;
  className?: string;
}

export function PortalShell({
  workspace,
  children,
  headerRight,
  headerLeft,
  footerTags,
  showHeader = true,
  className,
}: PortalShellProps) {
  return (
    <div
      data-portal={workspace}
      className={className}
      style={{
        background:  "var(--sosa-bg)",
        minHeight:   "100dvh",
        position:    "relative",
        overflowX:   "hidden",
      }}
    >
      {/* Fixed overlays — pointer-events: none, highest z */}
      <GrainOverlay />

      {/* Fixed top bar — only when showHeader=true */}
      {showHeader && (
        <header
          style={{
            position:       "fixed",
            top:            0,
            left:           0,
            right:          0,
            zIndex:         100,
            height:         SHELL_HEADER_H,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "0 24px",
            borderBottom:   "1px solid var(--sosa-border)",
            background:     "var(--sosa-bg)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
            <LogoLockup workspace={workspace} />
            {headerLeft && <div style={{ display: "flex", alignItems: "center" }}>{headerLeft}</div>}
          </div>

          {headerRight && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {headerRight}
            </div>
          )}
        </header>
      )}

      {/* Main content — offset for fixed header/footer when showHeader=true */}
      <main
        style={{
          paddingTop:    showHeader ? SHELL_HEADER_H : 0,
          paddingBottom: SHELL_FOOTER_H,
          minHeight:     "100dvh",
          position:      "relative",
          zIndex:        1,
        }}
      >
        {children}
      </main>

      {/* Fixed bottom bar — hidden on mobile to avoid conflict with mobile nav bar */}
      <footer
        className="hidden md:flex"
        style={{
          position:       "fixed",
          bottom:         0,
          left:           0,
          right:          0,
          zIndex:         90,
          height:         SHELL_FOOTER_H,
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "0 24px",
          borderTop:      "1px solid var(--sosa-border)",
          background:     "var(--sosa-bg)",
        }}
      >
        <HashtagFooter tags={footerTags} />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily:    "var(--font-mono)",
              fontSize:      10,
              color:         "var(--sosa-white-20)",
              letterSpacing: "0.08em",
            }}
          >
            © {new Date().getFullYear()}
          </span>
          <StatusDot label="SYSTEM ACTIVE" tone="system" />
        </div>
      </footer>
    </div>
  );
}
